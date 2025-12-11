# Document Tools - S1000D Suite

A comprehensive desktop application for S1000D documentation workflows, built with Electron and featuring 17 powerful tools for document processing, conversion, and management.

## Features

### 🎯 17 Integrated Tools

#### Document Processing (4 tools)
- **Doc Splitter** - Split DOCX documents by headings with images and tables preserved
- **Doc Splitter V2** - Enhanced document splitting with improved error handling
- **File Renamer** - Batch rename files by replacing text patterns
- **PDF to DOCX** - Convert PDF documents to editable DOCX format

#### Excel Tools (2 tools)
- **Excel Generator** - Generate Excel templates from filenames for easy mapping
- **Excel Renamer** - Batch rename DOCX files based on Excel mapping with DMC codes

#### ICN Tools (4 tools)
- **ICN Generator** - Create ICN-tagged images from bulk image uploads
- **ICN Extractor** - Extract ICN-tagged images from DOCX documents
- **ICN Validator** - Validate and audit ICN references in DOCX files
- **Auto ICN** ⭐ - Automatically move ICN codes from captions to image attributes in AsciiDoc files

#### Conversion Tools (4 tools)
- **DOCX to ADOC** - Convert Word documents to AsciiDoc format
- **ADOC to XML** - Convert AsciiDoc to S1000D XML
- **XML to HTML** - Convert S1000D XML to HTML preview
- **S1000D to DataIndex** - Extract data from S1000D HTML to JSON

#### Builder Tools (3 tools)
- **PMC Builder** - Build Publication Module Content lists
- **TOC Builder** - Generate Table of Contents from PM files
- **DMC Generator** ⭐ - Generate Data Module Codes with advanced features

## 🌟 Key Highlights

### DMC Generator Features
- IPC-based data loading (no server required)
- Interactive System Hierarchy tree with tooltips
- Per-unit Info Code and Info Code Variant customization
- Support for multiple data sources (ATA, GSV, SNS)
- Batch DMC code generation with DOCX export

### Auto ICN Features
- Automatic ICN code detection in AsciiDoc files
- Batch processing of multiple files
- Moves ICN codes from captions to image attributes
- ZIP download of processed files

## 🚀 Technology Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Electron (Node.js)
- **Processing**: Python, Ruby, Java
- **Dependencies**: Pandoc, Asciidoctor, Saxon XSLT

## 📦 Installation

### Portable Version (Recommended)
1. Download the latest release from the `dist/win-unpacked` folder
2. Extract to your desired location
3. Run `Document Tools.exe`
4. No installation required!

### Development Setup
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run in development mode
npm start

# Build portable executable
npm run pack
```

## 🛠️ Architecture

### IPC-Based Design
- **Zero HTTP dependencies** - All communication via Electron IPC
- **Fully standalone** - No backend server required
- **Portable** - All dependencies bundled

### Tool Integration
- Python scripts for complex processing
- Ruby/Asciidoctor for AsciiDoc conversion
- Java/Saxon for XSLT transformations
- Pandoc for document conversion

## 📋 Requirements

### Bundled (No Installation Needed)
- Python 3.x
- Ruby with Asciidoctor
- Java Runtime (for Saxon)
- Pandoc
- All required Python packages (pandas, openpyxl, etc.)

## 🎨 User Interface

- Modern, dark-themed UI
- Responsive design
- Real-time progress tracking
- Comprehensive logging system
- Drag & drop file upload

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and feature requests, please use the GitHub Issues page.

## 🔄 Version History

### v1.0.0 (Current)
- ✅ 17 fully functional tools
- ✅ IPC-based architecture
- ✅ DMC Generator with advanced features
- ✅ Auto ICN tool
- ✅ Portable executable build
- ✅ All dependencies bundled

## 🏗️ Project Structure

```
electron-app/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── pages/    # Tool pages
│   │   └── components/
│   └── public/       # Static assets & data
├── scripts/          # Python processing scripts
├── tools/            # Bundled tools (Python, Ruby, Java)
├── converters.js     # Node.js conversion logic
├── main.js           # Electron main process
└── preload.js        # IPC bridge
```

## 🎯 Use Cases

- S1000D documentation creation and management
- Batch document processing and conversion
- ICN (Illustration Control Number) management
- DMC (Data Module Code) generation
- Document splitting and organization
- File renaming and organization

---

**Built with ❤️ for S1000D documentation workflows**
