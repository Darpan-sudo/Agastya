import { HashRouter, BrowserRouter, Routes, Route } from 'react-router-dom'
import { LogsProvider } from '@/context/LogsContext'
import MainLayout from '@/layouts/MainLayout'
import HomePage from '@/pages/HomePage'
import DocSplitterPage from '@/pages/DocSplitterPage'
import DocSplitter2Page from '@/pages/DocSplitter2Page'
import ExcelRenamerPage from '@/pages/ExcelRenamerPage'
import ExcelGeneratorPage from '@/pages/ExcelGeneratorPage'
import FileRenamerPage from '@/pages/FileRenamerPage'
import IcnMakerPage from '@/pages/IcnMakerPage'
import IcnExtractorPage from '@/pages/IcnExtractorPage'
import IcnValidatorPage from '@/pages/IcnValidatorPage'
import AutoIcnPage from '@/pages/AutoIcnPage'
import DocxToAdocPage from '@/pages/DocxToAdocPage'
import AdocToXmlPage from '@/pages/AdocToXmlPage'
import XmlToHtmlPage from '@/pages/XmlToHtmlPage'
import HtmlToJsonPage from '@/pages/HtmlToJsonPage'
import PmcBuilderPage from '@/pages/PmcBuilderPage'
import TocBuilderPage from '@/pages/TocBuilderPage'
import DmcGeneratorPage from '@/pages/DmcGeneratorPage'
import PdfToDocxPage from '@/pages/PdfToDocxPage'
import AdminPage from '@/pages/AdminPage'

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const isElectron = window.electronAPI?.isElectron || window.location.protocol === 'file:'
const Router = isElectron ? HashRouter : BrowserRouter

// License expiration date: February 15, 2027
const LICENSE_EXPIRY = new Date('2027-02-15T00:00:00')

function isLicenseExpired() {
  return new Date() > LICENSE_EXPIRY
}

// Expired License Screen
function ExpiredLicense() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md text-center border border-red-500">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-500 mb-4">License Expired</h1>
        <p className="text-gray-300 mb-4">
          Your Agastya license has expired on <strong>February 15, 2027</strong>.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Please contact the developers to renew your license.
        </p>
      </div>
    </div>
  )
}

function App() {
  // Check license expiration
  if (isLicenseExpired()) {
    return <ExpiredLicense />
  }

  return (
    <LogsProvider>
      <Router>
        <Routes>
          {/* Full-page routes (no MainLayout wrapper) */}
          <Route path="/pmc-builder" element={<PmcBuilderPage />} />
          <Route path="/toc-builder" element={<TocBuilderPage />} />
          <Route path="/dmc-generator" element={<DmcGeneratorPage />} />

          {/* Standard routes with MainLayout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="doc-splitter" element={<DocSplitterPage />} />
            <Route path="doc-splitter-v2" element={<DocSplitter2Page />} />
            <Route path="excel-generator" element={<ExcelGeneratorPage />} />
            <Route path="excel-renamer" element={<ExcelRenamerPage />} />
            <Route path="file-renamer" element={<FileRenamerPage />} />
            <Route path="icn-maker" element={<IcnMakerPage />} />
            <Route path="icn-extractor" element={<IcnExtractorPage />} />
            <Route path="icn-validator" element={<IcnValidatorPage />} />
            <Route path="auto-icn" element={<AutoIcnPage />} />
            <Route path="docx-to-adoc" element={<DocxToAdocPage />} />
            <Route path="adoc-to-xml" element={<AdocToXmlPage />} />
            <Route path="xml-to-html" element={<XmlToHtmlPage />} />
            <Route path="html-to-json" element={<HtmlToJsonPage />} />
            <Route path="pdf-to-docx" element={<PdfToDocxPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </Router>
    </LogsProvider>
  )
}

export default App
