/**
 * Preload script – exposes safe IPC bridge to renderer
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // License functions
  license: {
    activate: (key) => ipcRenderer.invoke('activate-key', key),
    check: () => ipcRenderer.invoke('check-license'),
    getInfo: () => ipcRenderer.invoke('get-license-info'),
    deactivate: () => ipcRenderer.invoke('deactivate-license'),
    getHWID: () => ipcRenderer.invoke('get-hwid')
  },

  // Document Conversions
  convertDocxToAdoc: (files, options) => ipcRenderer.invoke('convert-docx-to-adoc', files, options),
  convertXmlToHtml: (files) => ipcRenderer.invoke('convert-xml-to-html', files),
  convertAdocToXml: (files, options) => ipcRenderer.invoke('convert-adoc-to-xml', files, options),
  convertPdfToDocx: (files) => ipcRenderer.invoke('convert-pdf-to-docx', files),

  // Document Processing
  splitDocx: (file, options) => ipcRenderer.invoke('split-docx', file, options),
  splitDocxV2: (file, options) => ipcRenderer.invoke('split-docx-v2', file, options),
  renameFiles: (files, oldText, newText) => ipcRenderer.invoke('rename-files', files, oldText, newText),

  // ICN Tools
  extractIcn: (files) => ipcRenderer.invoke('extract-icn', files),
  generateIcn: (files, params) => ipcRenderer.invoke('generate-icn', files, params),
  validateIcn: (adocFiles, imageFiles) => ipcRenderer.invoke('validate-icn', adocFiles, imageFiles),

  // Builder Tools
  htmlToJson: (files, format) => ipcRenderer.invoke('html-to-json', files, format),
  pmToToc: (files) => ipcRenderer.invoke('pm-to-toc', files),

  // Excel Tools
  excelRenamePreview: (excelFile, docxFiles) => ipcRenderer.invoke('excel-rename-preview', excelFile, docxFiles),
  excelRenameExecute: (docxFiles, previewData) => ipcRenderer.invoke('excel-rename-execute', docxFiles, previewData),

  // DMC Generator
  loadDmcData: (filename) => ipcRenderer.invoke('load-dmc-data', filename),
  loadInfoCodes: () => ipcRenderer.invoke('load-info-codes'),

  // Auto ICN
  autoIcn: (files) => ipcRenderer.invoke('auto-icn', files),

  // Progress events
  onProgress: (callback) => ipcRenderer.on('conversion-progress', (event, data) => callback(data)),
  removeProgressListener: () => ipcRenderer.removeAllListeners('conversion-progress'),

  // Operations control
  cancelOperations: () => ipcRenderer.invoke('cancel-operations'),

  // App info
  isElectron: true
});
