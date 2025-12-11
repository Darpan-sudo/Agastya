/**
 * Converters Module - Node.js conversion functions
 * Replaces Python Flask backend with direct tool execution
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get the tools directory path
 */
function getToolsDir() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'tools');
    }
    return path.join(__dirname, 'tools');
}

/**
 * Get path to a specific tool executable
 */
function getToolPath(toolName) {
    const toolsDir = getToolsDir();

    const toolPaths = {
        pandoc: path.join(toolsDir, 'pandoc', 'pandoc.exe'),
        java: path.join(toolsDir, 'java', 'jdk-17.0.13+11-jre', 'bin', 'java.exe'),
        asciidoctor: path.join(toolsDir, 'ruby', 'bin', 'asciidoctor.bat'),
        python: path.join(toolsDir, 'python', 'python.exe'),
    };

    return toolPaths[toolName] || toolName;
}

/**
 * Get path to Saxon JAR and XSL files
 */
function getSaxonPaths() {
    const toolsDir = getToolsDir();
    return {
        jar: path.join(toolsDir, 'saxon', 'saxon9he.jar'),
        xsl: path.join(toolsDir, 'saxon', 'demo3-1.xsl'),
    };
}

// ============================================================================
// Command Execution Helper
// ============================================================================

/**
 * Execute a command and return output
 */
function execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        // Use shell mode for .bat files on Windows to handle paths with spaces
        const useShell = command.endsWith('.bat') || command.endsWith('.cmd');

        let proc;
        if (useShell) {
            // When using shell, quote the command and arguments that have spaces
            const quotedCommand = command.includes(' ') ? `"${command}"` : command;
            const quotedArgs = args.map(arg => {
                // Quote arguments that contain spaces
                return (typeof arg === 'string' && arg.includes(' ')) ? `"${arg}"` : arg;
            });
            const cmdLine = [quotedCommand, ...quotedArgs].join(' ');
            proc = spawn(cmdLine, [], {
                ...options,
                windowsHide: true,
                shell: true,
            });
        } else {
            proc = spawn(command, args, {
                ...options,
                windowsHide: true,
            });
        }

        let stdout = '';
        let stderr = '';

        if (proc.stdout) {
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }

        if (proc.stderr) {
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
        }

        proc.on('error', (error) => {
            reject(new Error(`Failed to execute ${command}: ${error.message}`));
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
            }
        });
    });
}

// ============================================================================
// File Helpers
// ============================================================================

/**
 * Create a temporary directory
 */
async function createTempDir(prefix = 'electron-converter-') {
    const tmpDir = path.join(os.tmpdir(), `${prefix}${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    return tmpDir;
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDir(dirPath) {
    try {
        await fs.rm(dirPath, { recursive: true, force: true });
    } catch (err) {
        console.error('Failed to cleanup temp dir:', err);
    }
}

/**
 * Save uploaded file buffer to disk
 */
async function saveUploadedFile(fileData, outputPath) {
    await fs.writeFile(outputPath, Buffer.from(fileData));
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert DOCX to S1000D AsciiDoc using Pandoc
 */
async function convertDocxToAdoc(inputPath, outputPath, options = {}) {
    try {
        const pandoc = getToolPath('pandoc');

        // Check if Pandoc exists
        if (!fsSync.existsSync(pandoc)) {
            throw new Error(`Pandoc not found at: ${pandoc}`);
        }

        // Get docType from options, default to 'descript'
        const { docType = 'descript' } = options;
        console.log('[DOCX to ADOC] Converting with docType:', docType);

        // Run Pandoc conversion
        const result = await execCommand(pandoc, [
            inputPath,
            '-t', 'asciidoc',
            '-o', outputPath
        ]);

        // Read the generated content
        let content = await fs.readFile(outputPath, 'utf-8');

        // Get DMC from filename
        const filename = path.basename(inputPath, path.extname(inputPath));
        const baseCode = filename.replace('DMC-', '');

        // Convert to 11-part DMC if needed
        const { dmc } = processDMC(baseCode);

        // Add S1000D header
        const header = createS1000DHeader(dmc, docType);
        const cleanedContent = cleanupAdocContent(content);

        const finalContent = docType === 'proced'
            ? header + cleanedContent + createProceduralFooter()
            : header + cleanedContent;

        // Write final content
        await fs.writeFile(outputPath, finalContent, 'utf-8');

        console.log('[DOCX to ADOC] Success:', docType);
        return { success: true, message: `Converted to ${docType} format` };
    } catch (error) {
        console.error('[DOCX to ADOC] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Convert XML to HTML using Saxon XSLT processor
 */
async function convertXmlToHtml(inputPath, outputPath) {
    try {
        const java = getToolPath('java');
        const { jar, xsl } = getSaxonPaths();

        // Check if Java and Saxon exist
        if (!fsSync.existsSync(java)) {
            throw new Error(`Java not found at: ${java}`);
        }
        if (!fsSync.existsSync(jar)) {
            throw new Error(`Saxon JAR not found at: ${jar}`);
        }
        if (!fsSync.existsSync(xsl)) {
            throw new Error(`XSL stylesheet not found at: ${xsl}`);
        }

        // Run Saxon transformation
        await execCommand(java, [
            '-jar', jar,
            `-s:${inputPath}`,
            `-xsl:${xsl}`,
            `-o:${outputPath}`
        ]);

        return { success: true, message: 'Conversion successful' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Convert AsciiDoc to S1000D XML using Asciidoctor + Saxon
 */
async function convertAdocToXml(inputPath, outputPath, options = {}) {
    try {
        const asciidoctor = getToolPath('asciidoctor');
        const { docType = 'descript' } = options;

        console.log('[ADOC to XML] Converting with docType:', docType);

        // Select Ruby backend based on document type
        const toolsDir = getToolsDir();
        let rubyBackend;

        switch (docType) {
            case 'proced':
                rubyBackend = path.join(toolsDir, 'ruby', 'pro.rb');
                break;
            case 'fault':
                rubyBackend = path.join(toolsDir, 'ruby', 'fault.rb');
                break;
            case 'ipd':
                rubyBackend = path.join(toolsDir, 'ruby', 'ipd.rb');
                break;
            case 'descript':
            default:
                rubyBackend = path.join(toolsDir, 'ruby', 's1000d1.rb');
                break;
        }

        console.log('[ADOC to XML] Using Ruby backend:', rubyBackend);

        // Verify Ruby backend exists
        if (!fsSync.existsSync(rubyBackend)) {
            throw new Error(`Ruby backend not found: ${rubyBackend}`);
        }

        // Convert ADOC to S1000D XML using Ruby backend
        // spawn() handles spaces in arguments automatically
        await execCommand(asciidoctor, [
            '-r', rubyBackend,
            '-b', 's1000d',
            '-a', 'allow-uri-read',
            '-a', 'source-highlighter=none',
            '-o', outputPath,
            inputPath
        ]);

        console.log('[ADOC to XML] Success:', docType);
        return { success: true, message: `Conversion successful (${docType})` };
    } catch (error) {
        console.error('[ADOC to XML] Error:', error.message);
        console.error('[ADOC to XML] Full error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Convert PDF to DOCX using Python script
 */
async function convertPdfToDocx(inputPath, outputPath) {
    try {
        const python = getToolPath('python');
        const scriptPath = path.join(__dirname, 'scripts', 'pdf_to_docx.py');

        if (!fsSync.existsSync(scriptPath)) {
            throw new Error('PDF to DOCX converter script not found');
        }

        await execCommand(python, [scriptPath, inputPath, outputPath]);

        return { success: true, message: 'Conversion successful' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Split DOCX by heading using Python script
 */
async function splitDocx(inputPath, outputDir, headingStyle = 'Heading 1') {
    try {
        const python = getToolPath('python');
        const scriptPath = path.join(__dirname, 'scripts', 'docx_splitter.py');

        if (!fsSync.existsSync(scriptPath)) {
            throw new Error('DOCX splitter script not found');
        }

        await fs.mkdir(outputDir, { recursive: true });

        await execCommand(python, [
            scriptPath,
            inputPath,
            outputDir,
            headingStyle
        ]);

        // Count output files
        const files = await fs.readdir(outputDir);
        const docxFiles = files.filter(f => f.endsWith('.docx'));

        return {
            success: true,
            message: `Split into ${docxFiles.length} files`,
            count: docxFiles.length
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Batch rename files in a folder
 */
async function renameFiles(folderPath, oldText, newText) {
    try {
        const files = await fs.readdir(folderPath);
        let count = 0;

        for (const filename of files) {
            if (filename.includes(oldText)) {
                const oldPath = path.join(folderPath, filename);
                const newFilename = filename.replace(new RegExp(oldText, 'g'), newText);
                const newPath = path.join(folderPath, newFilename);

                await fs.rename(oldPath, newPath);
                count++;
            }
        }

        return {
            success: true,
            message: `Renamed ${count} files`,
            count
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// Helper Functions for DOCX to ADOC
// ============================================================================

function processDMC(baseCode) {
    const parts = baseCode.split('-');

    // Convert 9-part to 11-part DMC
    if (parts.length === 9) {
        const [p1, p2, p3, p4, p5, p6, p7, p8, p9] = parts;
        const subSystemCode = p4[0] || '';
        const subSubSystemCode = p4[1] || '';
        const disassyCode = p7.slice(0, -1) || '';
        const disassyCodeVariant = p7.slice(-1) || '';
        const infoCode = p8.slice(0, -1) || '';
        const infoCodeVariant = p8.slice(-1) || '';

        const dmc = `${p1}-${p2}-${p3}-${subSystemCode}-${subSubSystemCode}-${p5}-${p6}-${disassyCode}-${disassyCodeVariant}-${infoCode}-${infoCodeVariant}-${p9}`;
        const docType = infoCode === '000' ? 'proced' : 'descript';

        return { dmc, docType };
    }

    return { dmc: baseCode, docType: 'descript' };
}

function createS1000DHeader(dmc, docType) {
    if (docType === 'proced') {
        return `= My Procedural Data Module
:dmc: DMC-${dmc}
:dm-type: procedural
:issue-number: 001
:issue-date: 2023-10-26
:tech-name: Comprehensive Converter Test Procedure
:dm-title: Step-by-Step Guide
:revdate: 2025-09-02
:in-work: 00
:lang: en
:country-code: IN
:security-classification: 01
:responsible-partner-company: LNTDEFENCE
:enterprise-code-rpc: 1671Y
:originator-enterprise: LNTDEFENCE
:enterprise-code-originator: 1671Y
:applicability: All applicable units and serial numbers.
:brex-dmc: DMC-GSV-H-041-1-0-0301-00-A-022-A-D
:reason-for-update: Initial draft for demonstration purposes.
:s1000d-schema-base-path: http://www.s1000d.org/S1000D_4-2/xml_schema_flat/

[[prelim_reqs]]
== Preliminary Requirements

[[required_conditions_pr]]
=== Required Conditions

[[required_persons_pr]]
=== Required Persons

[[required_tech_info_pr]]
=== Required Technical Information

[[required_equip_pr]]
=== Required Support Equipment

[[required_supplies_pr]]
=== Required Supplies

[[required_spares_pr]]
=== Required Spares

[[required_safety_pr]]
=== Required Safety

[[main_proc_steps]]
== Main Procedure

`;
    } else {
        return `:dmc: DMC-${dmc}
:dm-type: descript
:issue-number: 001
:dm-title: Sample Descriptive Module
:revdate: 2025-09-02
:in-work: 00
:lang: en
:country-code: IN
:security-classification: 01
:responsible-partner-company: LNTDEFENCE
:enterprise-code-rpc: 1671Y
:originator-enterprise: LNTDEFENCE
:enterprise-code-originator: 1671Y
:applicability: All applicable units and serial numbers.
:brex-dmc: DMC-GSV-H-041-1-0-0301-00-A-022-A-D
:reason-for-update: Initial draft for demonstration purposes.

`;
    }
}

function createProceduralFooter() {
    return `

[[closeout_reqs]]
== Closeout Requirements

[[closeout_conds_after]]
=== Required Conditions After Job Completion

`;
}

function cleanupAdocContent(content) {
    // Remove trailing '+' at end of lines
    content = content.replace(/(.+?)\s*\+\s*$/gm, '$1');

    // Replace standalone "{plus}" with "+"
    content = content.replace(/^\s*\{plus\}\s*$/gm, '+');

    // Remove blank lines inside fault blocks
    content = content.replace(/(--\n)\s+/g, '$1');
    content = content.replace(/\s+(\n--)/g, '$1');

    // Normalize thematic breaks
    content = content.replace(/\s*^\s*-{3,}\s*$\s*/gm, '\n\n---\n\n');

    return content;
}

// ============================================================================
// ICN Tools
// ============================================================================

/**
 * Extract ICN from DOCX files
 */
async function extractIcn(inputDir, outputDir) {
    const python = getToolPath('python');
    const script = path.join(__dirname, 'scripts', 'icn_extractor.py');

    try {
        const result = await execCommand(python, [script, inputDir, outputDir]);

        // Parse statistics from stderr
        const stderr = result.stderr || '';
        const filesMatch = stderr.match(/Files processed: (\d+)/);
        const imagesMatch = stderr.match(/Total images extracted: (\d+)/);

        const stats = {
            filesProcessed: filesMatch ? parseInt(filesMatch[1]) : 0,
            imagesExtracted: imagesMatch ? parseInt(imagesMatch[1]) : 0
        };

        return {
            success: true,
            message: 'ICN extraction successful',
            stats
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Generate ICN labels for images in DOCX files
 */
async function generateIcn(inputDir, outputDir, params) {
    const python = getToolPath('python');
    const script = path.join(__dirname, 'scripts', 'icn_maker.py');

    const args = [
        script,
        inputDir,
        outputDir,
        params.kpc || '1',
        params.xyz || '1671Y',
        params.sq_start || '00005',
        params.icv || 'A',
        params.issue || '001',
        params.sec || '01'
    ];

    try {
        const result = await execCommand(python, args);

        // Parse statistics from stderr
        const stderr = result.stderr || '';
        const filesMatch = stderr.match(/Files processed: (\d+)/);
        const icnsMatch = stderr.match(/Total ICNs generated: (\d+)/);

        const stats = {
            filesProcessed: filesMatch ? parseInt(filesMatch[1]) : 0,
            icnsGenerated: icnsMatch ? parseInt(icnsMatch[1]) : 0
        };

        return {
            success: true,
            message: 'ICN generation successful',
            stats
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Validate ADOC image references
 */
async function validateIcn(adocDir, imagesDir) {
    const python = getToolPath('python');
    const script = path.join(__dirname, 'scripts', 'icn_validator.py');

    try {
        const result = await execCommand(python, [script, adocDir, imagesDir]);
        const results = JSON.parse(result.stdout);
        return { success: true, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Convert HTML files to JSON/JS data index
 */
async function htmlToJson(inputDir, outputFormat = 'js') {
    try {
        const cheerio = require('cheerio');
        const dataCollection = [];

        const files = await fs.promises.readdir(inputDir);

        for (const filename of files) {
            if (!filename.toLowerCase().endsWith('.html') && !filename.toLowerCase().endsWith('.htm')) {
                continue;
            }

            const filePath = path.join(inputDir, filename);
            const htmlContent = await fs.promises.readFile(filePath, 'utf-8');
            const $ = cheerio.load(htmlContent);

            // Extract DMC ID from filename
            const baseName = path.parse(filename).name;
            const lastUnderscoreIndex = baseName.lastIndexOf('_');
            const dmcId = lastUnderscoreIndex !== -1 ? baseName.substring(0, lastUnderscoreIndex) : baseName;

            // Extract title and body content
            const pageTitle = $('title').text().trim();
            const bodyContent = $('body').html() || '';

            dataCollection.push({
                id: dmcId,
                title: pageTitle,
                type: 'data_module',
                data: bodyContent.trim()
            });
        }

        if (dataCollection.length === 0) {
            return { success: false, error: 'No valid HTML files were processed' };
        }

        return {
            success: true,
            data: dataCollection,
            format: outputFormat
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Convert PM XML files to TOC JavaScript using Saxon XSLT
 */
async function pmToToc(inputDir, outputDir) {
    try {
        const { saxonJar, xslDir } = getSaxonPaths();
        const xslStylesheet = path.join(xslDir, 'PMtoTOC02.xsl');

        // Check if stylesheet exists
        if (!await fs.promises.access(xslStylesheet).then(() => true).catch(() => false)) {
            return { success: false, error: 'PMtoTOC02.xsl stylesheet not found in tools/saxon/' };
        }

        await fs.promises.mkdir(outputDir, { recursive: true });

        const files = await fs.promises.readdir(inputDir);
        const xmlFiles = files.filter(f => f.toLowerCase().endsWith('.xml'));

        if (xmlFiles.length === 0) {
            return { success: false, error: 'No valid XML files found' };
        }

        const results = [];

        for (const filename of xmlFiles) {
            const inputPath = path.join(inputDir, filename);
            const baseName = path.parse(filename).name;
            const outputFilename = `${baseName}_toc.js`;
            const outputPath = path.join(outputDir, outputFilename);

            try {
                // Run Saxon transformation
                await execCommand('java', [
                    '-jar', saxonJar,
                    `-s:${inputPath}`,
                    `-xsl:${xslStylesheet}`,
                    `-o:${outputPath}`
                ]);

                // Read the generated file
                const content = await fs.promises.readFile(outputPath, 'utf-8');

                results.push({
                    filename,
                    output_filename: outputFilename,
                    content,
                    success: true
                });
            } catch (error) {
                results.push({
                    filename,
                    output_filename: outputFilename,
                    error: error.message,
                    success: false
                });
            }
        }

        return {
            success: true,
            results,
            filesProcessed: xmlFiles.length,
            filesSucceeded: results.filter(r => r.success).length
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Excel Renamer - Generate preview of file renames
 */
async function excelRenamePreview(excelPath, docxDir) {
    const python = getToolPath('python');
    const script = path.join(__dirname, 'scripts', 'excel_renamer.py');

    try {
        const result = await execCommand(python, [script, 'preview', excelPath, docxDir]);
        const data = JSON.parse(result.stdout);

        if (data.error) {
            return { success: false, error: data.error };
        }

        return {
            success: true,
            preview: data.preview,
            excelData: data.excel_data
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Excel Renamer - Execute file renames based on preview
 */
async function excelRenameExecute(docxDir, previewData) {
    const python = getToolPath('python');
    const script = path.join(__dirname, 'scripts', 'excel_renamer.py');

    try {
        const previewJson = JSON.stringify(previewData);
        const result = await execCommand(python, [script, 'execute', docxDir, previewJson]);
        const data = JSON.parse(result.stdout);

        if (data.error) {
            return { success: false, error: data.error };
        }

        return {
            success: true,
            renamed: data.renamed,
            errors: data.errors
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Auto ICN - Move ICN codes from captions to image attributes
 */
async function autoIcn(adocDir) {
    const python = getToolPath('python');
    const script = path.join(__dirname, 'scripts', 'auto_icn.py');

    try {
        const result = await execCommand(python, [script, adocDir]);
        const data = JSON.parse(result.stdout);

        if (data.error) {
            return { success: false, error: data.error };
        }

        return {
            success: true,
            filesProcessed: data.filesProcessed,
            totalChanges: data.totalChanges,
            results: data.results
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
    // Tool helpers
    getToolPath,
    getToolsDir,
    getSaxonPaths,

    // File helpers
    createTempDir,
    cleanupTempDir,
    saveUploadedFile,

    // Converters
    convertDocxToAdoc,
    convertXmlToHtml,
    convertAdocToXml,
    convertPdfToDocx,
    splitDocx,
    renameFiles,

    // ICN Tools
    extractIcn,
    generateIcn,
    validateIcn,

    // Builder Tools
    htmlToJson,
    pmToToc,

    // Excel Tools
    excelRenamePreview,
    excelRenameExecute,

    // Auto ICN
    autoIcn,
};
