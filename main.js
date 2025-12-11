/**
 * Electron Main Process
 * - License validation with HWID binding
 * - Spawns Python backend
 * - Serves React frontend
 */

const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const LicenseManager = require('./license');
const url = require('url');
const converters = require('./converters');

// Paths - Handle both dev and packaged scenarios
const isDev = !app.isPackaged;

// In packaged app, __dirname points to app.asar, we need the unpacked resources
const getAppPath = () => {
  if (isDev) {
    return __dirname;
  }
  // For portable exe, files are in the same directory as the executable
  return path.dirname(process.execPath);
};

const appBasePath = getAppPath();
const frontendPath = isDev
  ? path.join(__dirname, 'frontend/dist')
  : path.join(appBasePath, 'resources', 'app', 'frontend', 'dist');
const backendPath = isDev
  ? path.join(__dirname, 'backend')
  : path.join(appBasePath, 'resources', 'app', 'backend');

// Globals
let mainWindow = null;
let activationWindow = null;
let licenseManager = null;

const FRONTEND_PORT = 3456;

// ============================================================================
// Icon Path Helper
// ============================================================================

// Get icon path for windows (works in both dev and production)
function getIconPath() {
  if (isDev) {
    return path.join(__dirname, 'logo.ico');
  }
  // In production, icon is in resources/app directory
  return path.join(appBasePath, 'resources', 'app', 'logo.ico');
}

// ============================================================================
// No Backend Process - Using Direct IPC
// ============================================================================
// Backend functionality moved to converters.js and IPC handlers

// ============================================================================
// Window Management
// ============================================================================

function createActivationWindow() {
  activationWindow = new BrowserWindow({
    width: 450,
    height: 350,
    resizable: false,
    frame: true,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  activationWindow.setMenu(null);
  activationWindow.loadFile(path.join(__dirname, 'activation.html'));

  activationWindow.on('closed', () => {
    activationWindow = null;
    // If activation window closed without successful activation, quit
    if (!licenseManager.checkLicense()) {
      app.quit();
    }
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  // Intercept requests for static files and serve from correct location
  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const requestUrl = details.url;

    // Handle version2.0 static files (DMC mapper data, libraries, etc.)
    if (requestUrl.includes('/version2.0/')) {
      // Extract the path after /version2.0/
      const parts = requestUrl.split('/version2.0/');
      if (parts.length > 1) {
        const relativePath = parts[1].split('?')[0]; // Remove query params if any
        const staticFilePath = path.join(frontendPath, 'version2.0', relativePath);

        if (fs.existsSync(staticFilePath)) {
          // Use proper file:// URL format with forward slashes
          const fileUrl = `file:///${staticFilePath.replace(/\\/g, '/')}`;
          callback({ redirectURL: fileUrl });
          return;
        }
      }
    }

    callback({});
  });

  // Maximize window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Check if frontend dist exists
  const indexPath = path.join(frontendPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    // Load built frontend
    mainWindow.loadFile(indexPath);
  } else if (isDev) {
    // In dev mode, load from Vite dev server
    mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);
  } else {
    dialog.showErrorBox('Error', 'Frontend files not found. Please rebuild the application.');
    app.quit();
    return;
  }

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// IPC Handlers
// ============================================================================

/**
 * Helper function: Return single file or ZIP based on count
 * @param {string} outputDir - Directory containing output files
 * @param {string} fileExtension - File extension to filter (e.g., '.docx', '.png')
 * @param {string} tempDir - Temp directory to cleanup
 * @param {string} zipName - Name for ZIP file if multiple files
 * @param {object} extraData - Extra data to include in response (e.g., stats)
 * @returns {Promise<object>} Response with file data or ZIP data
 */
async function smartDownload(outputDir, fileExtension, tempDir, zipName = 'files.zip', extraData = {}) {
  const archiver = require('archiver');
  const files = await fs.promises.readdir(outputDir);
  const matchingFiles = files.filter(f => f.endsWith(fileExtension));

  if (matchingFiles.length === 1) {
    // Single file - return directly
    const fileData = await fs.promises.readFile(path.join(outputDir, matchingFiles[0]));
    await converters.cleanupTempDir(tempDir);
    return {
      success: true,
      singleFile: true,
      filename: matchingFiles[0],
      data: fileData,
      ...extraData
    };
  }

  // Multiple files - create ZIP
  const zipPath = path.join(tempDir, zipName);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', async () => {
      try {
        const zipData = await fs.promises.readFile(zipPath);
        await converters.cleanupTempDir(tempDir);
        resolve({
          success: true,
          singleFile: false,
          data: zipData,
          ...extraData
        });
      } catch (err) {
        await converters.cleanupTempDir(tempDir);
        reject(err);
      }
    });

    archive.on('error', async (err) => {
      await converters.cleanupTempDir(tempDir);
      reject(err);
    });

    archive.pipe(output);

    // Add all matching files to ZIP
    for (const filename of matchingFiles) {
      const filePath = path.join(outputDir, filename);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: filename });
      }
    }

    archive.finalize();
  });
}

function setupIPCHandlers() {
  // License activation
  ipcMain.handle('activate-key', async (_event, key) => {
    const result = licenseManager.activate(key);
    if (result.success) {
      setTimeout(async () => {
        if (activationWindow) {
          activationWindow.close();
          activationWindow = null;
        }
        await createMainWindow();
      }, 800);
    }
    return result;
  });

  // Get HWID
  ipcMain.handle('get-hwid', () => {
    return licenseManager.getHWID();
  });

  // Get license info
  ipcMain.handle('get-license-info', () => {
    return licenseManager.getLicenseInfo();
  });

  // Deactivate license
  ipcMain.handle('deactivate-license', () => {
    return licenseManager.deactivate();
  });

  // Check license status
  ipcMain.handle('check-license', () => {
    return licenseManager.checkLicense();
  });

  // Cancel all operations
  ipcMain.handle('cancel-operations', async () => {
    console.log('Canceling all operations...');
    // TODO: Implement process cancellation if needed
    return { success: true, message: 'All operations cancelled' };
  });

  // ============================================================================
  // Conversion IPC Handlers
  // ============================================================================

  // DOCX to AsciiDoc conversion
  ipcMain.handle('convert-docx-to-adoc', async (event, files, options) => {
    const results = [];
    const tempDir = await converters.createTempDir('docx-to-adoc-');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = path.join(tempDir, file.name);
        const outputPath = path.join(tempDir, file.name.replace(/\.docx$/i, '.adoc'));

        // Save uploaded file
        await converters.saveUploadedFile(file.data, inputPath);

        // Send progress
        event.sender.send('conversion-progress', {
          type: 'progress',
          current: i + 1,
          total: files.length,
          filename: file.name,
          status: 'converting'
        });

        // Convert with options
        const result = await converters.convertDocxToAdoc(inputPath, outputPath, options);

        if (result.success) {
          const outputData = await fs.promises.readFile(outputPath);
          results.push({
            name: path.basename(outputPath),
            data: outputData,
            success: true
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'completed'
          });
        } else {
          results.push({
            name: file.name,
            success: false,
            error: result.error
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'failed',
            error: result.error
          });
        }
      }

      return { success: true, results };
    } finally {
      await converters.cleanupTempDir(tempDir);
    }
  });

  // XML to HTML conversion
  ipcMain.handle('convert-xml-to-html', async (event, files) => {
    const results = [];
    const tempDir = await converters.createTempDir('xml-to-html-');

    console.log('XML to HTML conversion started for', files.length, 'files');
    console.log('Temp directory:', tempDir);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = path.join(tempDir, file.name);
        const outputPath = path.join(tempDir, file.name.replace(/\.xml$/i, '.html'));

        console.log(`Processing file ${i + 1}/${files.length}:`, file.name);

        await converters.saveUploadedFile(file.data, inputPath);

        event.sender.send('conversion-progress', {
          type: 'progress',
          current: i + 1,
          total: files.length,
          filename: file.name,
          status: 'converting'
        });

        const result = await converters.convertXmlToHtml(inputPath, outputPath);

        console.log('Conversion result:', result);

        if (result.success) {
          const outputData = await fs.promises.readFile(outputPath);
          results.push({
            name: path.basename(outputPath),
            data: outputData,
            success: true
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'completed'
          });
        } else {
          console.error('Conversion failed for', file.name, ':', result.error);
          results.push({
            name: file.name,
            success: false,
            error: result.error
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'failed',
            error: result.error
          });
        }
      }

      console.log('All conversions complete. Success:', results.filter(r => r.success).length, 'Failed:', results.filter(r => !r.success).length);
      return { success: true, results };
    } catch (err) {
      console.error('XML to HTML conversion error:', err);
      throw err;
    } finally {
      await converters.cleanupTempDir(tempDir);
    }
  });

  // AsciiDoc to XML conversion
  ipcMain.handle('convert-adoc-to-xml', async (event, files, options) => {
    const results = [];
    const tempDir = await converters.createTempDir('adoc-to-xml-');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = path.join(tempDir, file.name);
        const outputPath = path.join(tempDir, file.name.replace(/\.adoc$/i, '.xml'));

        await converters.saveUploadedFile(file.data, inputPath);

        event.sender.send('conversion-progress', {
          type: 'progress',
          current: i + 1,
          total: files.length,
          filename: file.name,
          status: 'converting'
        });

        const result = await converters.convertAdocToXml(inputPath, outputPath, options);

        if (result.success) {
          const outputData = await fs.promises.readFile(outputPath);
          results.push({
            name: path.basename(outputPath),
            data: outputData,
            success: true
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'completed'
          });
        } else {
          results.push({
            name: file.name,
            success: false,
            error: result.error
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'failed',
            error: result.error
          });
        }
      }

      return { success: true, results };
    } finally {
      await converters.cleanupTempDir(tempDir);
    }
  });

  // PDF to DOCX conversion
  ipcMain.handle('convert-pdf-to-docx', async (event, files) => {
    const results = [];
    const tempDir = await converters.createTempDir('pdf-to-docx-');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = path.join(tempDir, file.name);
        const outputPath = path.join(tempDir, file.name.replace(/\.pdf$/i, '.docx'));

        await converters.saveUploadedFile(file.data, inputPath);

        event.sender.send('conversion-progress', {
          type: 'progress',
          current: i + 1,
          total: files.length,
          filename: file.name,
          status: 'converting'
        });

        const result = await converters.convertPdfToDocx(inputPath, outputPath);

        if (result.success) {
          const outputData = await fs.promises.readFile(outputPath);
          results.push({
            name: path.basename(outputPath),
            data: outputData,
            success: true
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'completed'
          });
        } else {
          results.push({
            name: file.name,
            success: false,
            error: result.error
          });

          event.sender.send('conversion-progress', {
            type: 'progress',
            current: i + 1,
            total: files.length,
            filename: file.name,
            status: 'failed',
            error: result.error
          });
        }
      }

      return { success: true, results };
    } finally {
      await converters.cleanupTempDir(tempDir);
    }
  });

  // DOCX Splitter
  ipcMain.handle('split-docx', async (event, file, options) => {
    const tempDir = await converters.createTempDir('split-docx-');
    const archiver = require('archiver');

    try {
      const inputPath = path.join(tempDir, file.name);
      const outputDir = path.join(tempDir, 'output');

      await converters.saveUploadedFile(file.data, inputPath);

      const result = await converters.splitDocx(inputPath, outputDir, options?.headingStyle);

      if (result.success) {
        // Get list of files before creating ZIP
        const files = await fs.promises.readdir(outputDir);
        console.log('Files in output directory:', files);

        // Create ZIP file
        const zipPath = path.join(tempDir, 'split_files.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);

              // Clean up temp directory AFTER reading ZIP
              await converters.cleanupTempDir(tempDir);

              resolve({
                success: true,
                zipData,
                zipName: `${file.name.replace('.docx', '')}_split.zip`,
                count: result.count
              });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            console.error('Archive error:', err);
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);

          // Add all DOCX files to ZIP
          for (const filename of files) {
            if (filename.endsWith('.docx')) {
              const filePath = path.join(outputDir, filename);
              console.log('Adding file to ZIP:', filePath);

              // Check if file exists before adding
              if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: filename });
              } else {
                console.error('File not found:', filePath);
              }
            }
          }

          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Split DOCX error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // DOCX Splitter V2 (Enhanced)
  ipcMain.handle('split-docx-v2', async (event, file, options) => {
    const tempDir = await converters.createTempDir('split-docx-v2-');
    const archiver = require('archiver');

    try {
      const inputPath = path.join(tempDir, file.name);
      const outputDir = path.join(tempDir, 'output');

      await converters.saveUploadedFile(file.data, inputPath);

      // Use same splitter - it already has enhanced features
      const result = await converters.splitDocx(inputPath, outputDir, options?.headingStyle);

      if (result.success) {
        const files = await fs.promises.readdir(outputDir);

        // Create ZIP file
        const zipPath = path.join(tempDir, 'split_files_v2.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);
              await converters.cleanupTempDir(tempDir);

              resolve({
                success: true,
                data: zipData,
                count: result.count
              });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);

          for (const filename of files) {
            if (filename.endsWith('.docx')) {
              const filePath = path.join(outputDir, filename);
              if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: filename });
              }
            }
          }

          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Split DOCX V2 error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });


  // File Renamer
  ipcMain.handle('rename-files', async (event, files, oldText, newText) => {
    const tempDir = await converters.createTempDir('rename-files-');

    try {
      const renamedFiles = [];

      for (const file of files) {
        const inputPath = path.join(tempDir, file.name);
        await converters.saveUploadedFile(file.data, inputPath);

        // Rename the file
        const newName = file.name.replace(new RegExp(oldText, 'g'), newText);
        const outputPath = path.join(tempDir, newName);

        if (newName !== file.name) {
          await fs.promises.rename(inputPath, outputPath);
          const data = await fs.promises.readFile(outputPath);
          renamedFiles.push({ name: newName, data });
        } else {
          const data = await fs.promises.readFile(inputPath);
          renamedFiles.push({ name: file.name, data });
        }
      }

      return {
        success: true,
        count: renamedFiles.filter((f, i) => f.name !== files[i].name).length,
        files: renamedFiles
      };
    } catch (err) {
      console.error('File rename error:', err);
      return { success: false, error: err.message };
    } finally {
      await converters.cleanupTempDir(tempDir);
    }
  });

  // ICN Extractor
  ipcMain.handle('extract-icn', async (event, files) => {
    const tempDir = await converters.createTempDir('icn-extract-');
    const archiver = require('archiver');

    try {
      const inputDir = path.join(tempDir, 'input');
      const outputDir = path.join(tempDir, 'output');
      await fs.promises.mkdir(inputDir, { recursive: true });

      // Save uploaded files
      for (const file of files) {
        const inputPath = path.join(inputDir, file.name);
        await converters.saveUploadedFile(file.data, inputPath);
      }

      // Extract ICN
      const result = await converters.extractIcn(inputDir, outputDir);

      if (result.success) {
        // Create ZIP file
        const zipPath = path.join(tempDir, 'extracted_icn.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);
              await converters.cleanupTempDir(tempDir);
              resolve({ success: true, data: zipData, stats: result.stats });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);
          archive.directory(outputDir, false);
          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('ICN Extract error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // ICN Maker
  ipcMain.handle('generate-icn', async (event, files, params) => {
    const tempDir = await converters.createTempDir('icn-generate-');
    const archiver = require('archiver');

    try {
      const inputDir = path.join(tempDir, 'input');
      const outputDir = path.join(tempDir, 'output');
      await fs.promises.mkdir(inputDir, { recursive: true });

      // Save uploaded files
      for (const file of files) {
        const inputPath = path.join(inputDir, file.name);
        await converters.saveUploadedFile(file.data, inputPath);
      }

      // Generate ICN labels
      const result = await converters.generateIcn(inputDir, outputDir, params);

      if (result.success) {
        // Create ZIP file
        const zipPath = path.join(tempDir, 'generated_icn.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);
              await converters.cleanupTempDir(tempDir);
              resolve({ success: true, data: zipData, stats: result.stats });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);
          archive.directory(outputDir, false);
          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('ICN Generate error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // ICN Validator
  ipcMain.handle('validate-icn', async (event, adocFiles, imageFiles) => {
    const tempDir = await converters.createTempDir('icn-validate-');

    try {
      const adocDir = path.join(tempDir, 'adoc');
      const imagesDir = path.join(tempDir, 'images');
      await fs.promises.mkdir(adocDir, { recursive: true });
      await fs.promises.mkdir(imagesDir, { recursive: true });

      // Save ADOC files
      for (const file of adocFiles) {
        const filePath = path.join(adocDir, file.name);
        await converters.saveUploadedFile(file.data, filePath);
      }

      // Save image files
      for (const file of imageFiles) {
        const filePath = path.join(imagesDir, file.name);
        await converters.saveUploadedFile(file.data, filePath);
      }

      // Validate
      const result = await converters.validateIcn(adocDir, imagesDir);

      await converters.cleanupTempDir(tempDir);
      return result;
    } catch (err) {
      console.error('ICN Validate error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // HtmlToJson Converter
  ipcMain.handle('html-to-json', async (event, files, format) => {
    const tempDir = await converters.createTempDir('html-to-json-');

    try {
      const inputDir = path.join(tempDir, 'input');
      await fs.promises.mkdir(inputDir, { recursive: true });

      // Save uploaded files
      for (const file of files) {
        const inputPath = path.join(inputDir, file.name);
        await converters.saveUploadedFile(file.data, inputPath);
      }

      // Convert HTML to JSON
      const result = await converters.htmlToJson(inputDir, format);

      if (result.success) {
        // Create output file
        const outputFilename = format === 'json' ? 'dataIndex.json' : 'dataIndex.js';
        const outputPath = path.join(tempDir, outputFilename);

        if (format === 'json') {
          await fs.promises.writeFile(outputPath, JSON.stringify(result.data, null, 2), 'utf-8');
        } else {
          const jsContent = `const htmlDataSource = ${JSON.stringify(result.data, null, 2)};\n\nmodule.exports = htmlDataSource;\n`;
          await fs.promises.writeFile(outputPath, jsContent, 'utf-8');
        }

        const fileData = await fs.promises.readFile(outputPath);
        await converters.cleanupTempDir(tempDir);

        return {
          success: true,
          data: fileData,
          filename: outputFilename,
          filesProcessed: result.data.length
        };
      } else {
        await converters.cleanupTempDir(tempDir);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('HtmlToJson error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // TocBuilder
  ipcMain.handle('pm-to-toc', async (event, files) => {
    const tempDir = await converters.createTempDir('pm-to-toc-');
    const archiver = require('archiver');

    try {
      const inputDir = path.join(tempDir, 'input');
      const outputDir = path.join(tempDir, 'output');
      await fs.promises.mkdir(inputDir, { recursive: true });

      // Save uploaded files
      for (const file of files) {
        const inputPath = path.join(inputDir, file.name);
        await converters.saveUploadedFile(file.data, inputPath);
      }

      // Convert PM to TOC
      const result = await converters.pmToToc(inputDir, outputDir);

      if (result.success) {
        // Create ZIP file
        const zipPath = path.join(tempDir, 'toc_files.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);
              await converters.cleanupTempDir(tempDir);
              resolve({
                success: true,
                data: zipData,
                filesProcessed: result.filesProcessed,
                filesSucceeded: result.filesSucceeded
              });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);
          archive.directory(outputDir, false);
          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('TocBuilder error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // DMC Generator - Load JSON data files
  ipcMain.handle('load-dmc-data', async (event, filename) => {
    try {
      const dataPath = path.join(__dirname, 'frontend', 'dist', 'version2.0', 'data2', filename);
      const data = await fs.promises.readFile(dataPath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      console.error('Load DMC data error:', err);
      return { success: false, error: err.message };
    }
  });

  // DMC Generator - Load info codes
  ipcMain.handle('load-info-codes', async () => {
    try {
      const dataPath = path.join(__dirname, 'frontend', 'dist', 'version2.0', 'data', 'info_codes.json');
      const data = await fs.promises.readFile(dataPath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      console.error('Load info codes error:', err);
      return { success: false, error: err.message };
    }
  });

  // Auto ICN - Process AsciiDoc files
  ipcMain.handle('auto-icn', async (event, files) => {
    const tempDir = await converters.createTempDir('auto-icn-');

    try {
      // Save ADOC files
      const adocDir = path.join(tempDir, 'adoc');
      await fs.promises.mkdir(adocDir, { recursive: true });

      for (const file of files) {
        const adocPath = path.join(adocDir, file.name);
        await converters.saveUploadedFile(file.data, adocPath);
      }

      // Process files
      const result = await converters.autoIcn(adocDir);

      if (result.success) {
        // Create ZIP of processed files
        const zipPath = path.join(tempDir, 'auto_icn_processed.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);
              await converters.cleanupTempDir(tempDir);
              resolve({
                success: true,
                data: zipData,
                filesProcessed: result.filesProcessed,
                totalChanges: result.totalChanges,
                results: result.results
              });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);
          archive.directory(adocDir, false);
          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return result;
      }
    } catch (err) {
      console.error('Auto ICN error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // Excel Renamer - Preview
  ipcMain.handle('excel-rename-preview', async (event, excelFile, docxFiles) => {
    const tempDir = await converters.createTempDir('excel-rename-');

    try {
      // Save Excel file
      const excelPath = path.join(tempDir, excelFile.name);
      await converters.saveUploadedFile(excelFile.data, excelPath);

      // Save DOCX files
      const docxDir = path.join(tempDir, 'docx');
      await fs.promises.mkdir(docxDir, { recursive: true });

      for (const file of docxFiles) {
        const docxPath = path.join(docxDir, file.name);
        await converters.saveUploadedFile(file.data, docxPath);
      }

      // Generate preview
      const result = await converters.excelRenamePreview(excelPath, docxDir);

      await converters.cleanupTempDir(tempDir);

      return result;
    } catch (err) {
      console.error('Excel Rename Preview error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });

  // Excel Renamer - Execute
  ipcMain.handle('excel-rename-execute', async (event, docxFiles, previewData) => {
    const tempDir = await converters.createTempDir('excel-execute-');
    const archiver = require('archiver');

    try {
      // Save DOCX files
      const docxDir = path.join(tempDir, 'docx');
      await fs.promises.mkdir(docxDir, { recursive: true });

      for (const file of docxFiles) {
        const docxPath = path.join(docxDir, file.name);
        await converters.saveUploadedFile(file.data, docxPath);
      }

      // Execute rename
      const result = await converters.excelRenameExecute(docxDir, previewData);

      if (result.success) {
        // Create ZIP of renamed files
        const zipPath = path.join(tempDir, 'renamed_files.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
          output.on('close', async () => {
            try {
              const zipData = await fs.promises.readFile(zipPath);
              await converters.cleanupTempDir(tempDir);
              resolve({
                success: true,
                data: zipData,
                renamed: result.renamed,
                errors: result.errors
              });
            } catch (err) {
              await converters.cleanupTempDir(tempDir);
              reject(err);
            }
          });

          archive.on('error', async (err) => {
            await converters.cleanupTempDir(tempDir);
            reject(err);
          });

          archive.pipe(output);
          archive.directory(docxDir, false);
          archive.finalize();
        });
      } else {
        await converters.cleanupTempDir(tempDir);
        return result;
      }
    } catch (err) {
      console.error('Excel Rename Execute error:', err);
      await converters.cleanupTempDir(tempDir);
      return { success: false, error: err.message };
    }
  });
}

// ============================================================================
// App Lifecycle
// ============================================================================

// Register custom protocol for serving static files
app.whenReady().then(() => {
  // Register protocol to serve local files
  protocol.registerFileProtocol('app-file', (request, callback) => {
    const filePath = request.url.replace('app-file://', '');
    const decodedPath = decodeURIComponent(filePath);
    callback({ path: decodedPath });
  });

  licenseManager = new LicenseManager(app);
  setupIPCHandlers();

  if (licenseManager.checkLicense()) {
    createMainWindow();
  } else {
    createActivationWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (licenseManager && licenseManager.checkLicense()) {
      createMainWindow();
    } else {
      createActivationWindow();
    }
  }
});

app.on('before-quit', () => {
  stopBackend();
});
