import { useState, useCallback } from 'react'
import apiClient from '@/api/apiClient'
import { useLogs } from '@/context/LogsContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import FileDropzone from '@/components/shared/FileDropzone'
import { FileSpreadsheet, FileText, Eye, Download, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ExcelRenamerPage() {
  const [excelFile, setExcelFile] = useState(null)
  const [docxFiles, setDocxFiles] = useState([])
  const [previewData, setPreviewData] = useState(null)
  const [excelData, setExcelData] = useState(null)
  const [tempDir, setTempDir] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const { addLog } = useLogs()

  const onDropExcel = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setExcelFile(acceptedFiles[0])
      setError(null)
      setPreviewData(null)
      addLog(`Excel file selected: ${acceptedFiles[0].name}`, 'info')
    }
  }, [addLog])

  const onDropDocx = useCallback((acceptedFiles) => {
    setDocxFiles(acceptedFiles)
    setError(null)
    setPreviewData(null)
    addLog(`${acceptedFiles.length} DOCX files selected`, 'info')
  }, [addLog])

  const handlePreview = async () => {
    if (!excelFile || docxFiles.length === 0) {
      setError('Please select both Excel file and DOCX files')
      return
    }

    setLoading(true)
    setError(null)
    addLog('Generating preview...', 'info')

    try {
      // Convert files to ArrayBuffer format for IPC
      const excelFileData = {
        name: excelFile.name,
        data: await excelFile.arrayBuffer()
      }

      const docxFilesData = await Promise.all(
        docxFiles.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      // Call IPC
      const result = await window.electronAPI.excelRenamePreview(excelFileData, docxFilesData)

      if (result.success) {
        setPreviewData(result.preview)
        setExcelData(result.excelData)
        setTempDir('ipc') // Not needed for IPC but kept for compatibility
        setShowModal(true)
        addLog('Preview generated successfully', 'success')
      } else {
        throw new Error(result.error || 'Preview generation failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Preview generation failed'
      setError(errorMsg)
      addLog(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!previewData) return

    setLoading(true)
    setError(null)
    addLog('Executing rename operation...', 'info')

    try {
      // Convert DOCX files to ArrayBuffer format for IPC
      const docxFilesData = await Promise.all(
        docxFiles.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      // Call IPC
      const result = await window.electronAPI.excelRenameExecute(docxFilesData, previewData)

      if (result.success) {
        // Download ZIP file
        const blob = new Blob([result.data], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'renamed_files.zip'
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)

        setExcelFile(null)
        setDocxFiles([])
        setPreviewData(null)
        setTempDir(null)
        addLog(`Successfully renamed ${result.renamed} file(s)`, 'success')
      } else {
        throw new Error(result.error || 'Rename execution failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Rename execution failed'
      setError(errorMsg)
      addLog(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    if (status.includes('✓')) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status.includes('⚠')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (status.includes('✗')) return <AlertCircle className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8" />
          Excel-Based File Renamer
        </h2>
        <p className="text-muted-foreground">
          Rename DOCX files based on an Excel mapping file. The Excel file should contain
          <strong> "Doc Name"</strong> (original filename without extension) and
          <strong> "DMC Code"</strong> (new filename). Preview changes before executing.
        </p>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <strong>Error:</strong> {error}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Step 1: Upload Excel Mapping File (.xlsx or .xls)
          </CardTitle>
          <CardDescription>
            Excel file should contain: <strong>"Doc Name"</strong> (original filename without .docx)
            and <strong>"DMC Code"</strong> (new filename)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!excelFile ? (
            <FileDropzone
              onDrop={onDropExcel}
              accept={{
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls']
              }}
              multiple={false}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground font-medium">
                Drag & drop Excel file here, or click to select
              </p>
            </FileDropzone>
          ) : (
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{excelFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(excelFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExcelFile(null)
                  setPreviewData(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Step 2: Upload DOCX Files to Rename
          </CardTitle>
          <CardDescription>
            Select all Word documents that you want to rename based on the Excel mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docxFiles.length === 0 ? (
            <FileDropzone
              onDrop={onDropDocx}
              accept={{
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
              }}
              multiple={true}
            >
              <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground font-medium">
                Drag & drop DOCX files here, or click to select
              </p>
            </FileDropzone>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Selected Documents: <span className="text-primary">{docxFiles.length}</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDocxFiles([])
                    setPreviewData(null)
                  }}
                >
                  Clear All
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {docxFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary rounded-md border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted-foreground font-medium">{index + 1}.</span>
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground ml-3 whitespace-nowrap">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handlePreview}
          disabled={!excelFile || docxFiles.length === 0 || loading}
          size="lg"
          className="flex-1"
        >
          <Eye className="h-5 w-5 mr-2" />
          {loading && !previewData ? 'Generating Preview...' : 'Generate Preview'}
        </Button>
      </div>

      {/* Preview Modal */}
      {showModal && excelData && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-5">
          <Card className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Excel Mapping & Files Preview</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Mapping Preview
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Showing Excel mapping entries aligned with uploaded files
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-auto max-h-[60vh]">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary sticky top-0 z-10">
                          <tr>
                            <th className="p-3 text-left w-12">#</th>
                            <th className="p-3 text-left w-1/3">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Excel: Doc Name
                              </div>
                            </th>
                            <th className="p-3 text-center w-12">↔</th>
                            <th className="p-3 text-left w-1/3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Uploaded File
                              </div>
                            </th>
                            <th className="p-3 text-left w-1/3">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Excel: DMC Code
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const maxRows = Math.max(excelData.length, docxFiles.length)
                            return Array.from({ length: maxRows }).map((_, index) => {
                              const excelEntry = excelData[index]
                              const docxFile = docxFiles[index]
                              const docxNameWithoutExt = docxFile?.name.replace(/\.docx$/i, '').trim()
                              const excelDocName = excelEntry?.doc_name?.trim()

                              // Check exact match
                              const isExactMatch = excelEntry && docxFile && docxNameWithoutExt === excelDocName

                              // Check case-insensitive match
                              const isCaseInsensitiveMatch = excelEntry && docxFile &&
                                docxNameWithoutExt.toLowerCase() === excelDocName.toLowerCase()

                              // Find if this file matches any Excel entry (not just by position)
                              const matchesAnyExcel = docxFile && excelData.some(e =>
                                e.doc_name?.trim().toLowerCase() === docxNameWithoutExt.toLowerCase()
                              )

                              return (
                                <tr
                                  key={index}
                                  className={cn(
                                    index % 2 === 0 && "bg-accent/30",
                                    isExactMatch && "bg-green-500/10 border-l-4 border-green-500",
                                    !isExactMatch && isCaseInsensitiveMatch && "bg-yellow-500/10 border-l-4 border-yellow-500"
                                  )}
                                >
                                  <td className="p-3 text-muted-foreground font-medium">{index + 1}</td>
                                  <td className="p-3">
                                    {excelEntry ? (
                                      <div>
                                        <div className="font-mono text-xs break-all">
                                          {excelEntry.doc_name}
                                        </div>
                                        {docxFile && !isExactMatch && matchesAnyExcel && (
                                          <div className="text-xs text-yellow-500 mt-1">
                                            ⚠ Position mismatch
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isExactMatch ? (
                                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" title="Exact match" />
                                    ) : isCaseInsensitiveMatch ? (
                                      <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" title="Case mismatch" />
                                    ) : (
                                      <span className="text-muted-foreground">↔</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {docxFile ? (
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                          <span className="font-mono text-xs break-all">
                                            {docxFile.name}
                                          </span>
                                        </div>
                                        {excelEntry && !isExactMatch && !isCaseInsensitiveMatch && (
                                          <div className="text-xs text-red-500 mt-1">
                                            ✗ No match at this position
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {excelEntry ? (
                                      <div className="font-mono text-xs break-all text-primary font-semibold">
                                        {excelEntry.dmc_code}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/50 p-4 rounded-lg border border-border">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-semibold mb-1">Excel Entries:</div>
                      <div className="text-2xl font-bold text-primary">{excelData.length}</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Uploaded Files:</div>
                      <div className="text-2xl font-bold text-primary">{docxFiles.length}</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-1 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Exact Matches:
                      </div>
                      <div className="text-2xl font-bold text-green-500">
                        {(() => {
                          let matches = 0
                          excelData.forEach((entry, i) => {
                            const file = docxFiles[i]
                            if (file) {
                              const fileName = file.name.replace(/\.docx$/i, '').trim()
                              const excelName = entry.doc_name?.trim()
                              if (fileName === excelName) matches++
                            }
                          })
                          return matches
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Case Issues:
                      </div>
                      <div className="text-2xl font-bold text-yellow-500">
                        {(() => {
                          let caseIssues = 0
                          excelData.forEach((entry, i) => {
                            const file = docxFiles[i]
                            if (file) {
                              const fileName = file.name.replace(/\.docx$/i, '').trim()
                              const excelName = entry.doc_name?.trim()
                              if (fileName !== excelName && fileName.toLowerCase() === excelName.toLowerCase()) {
                                caseIssues++
                              }
                            }
                          })
                          return caseIssues
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500/10 border-l-4 border-green-500 rounded"></div>
                      <span>Green = Exact match (will rename successfully)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded"></div>
                      <span>Yellow = Case mismatch (may need adjustment)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center border-t pt-4">
                <Button onClick={() => setShowModal(false)} size="lg">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirm and Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Rename Preview Summary</CardTitle>
            <div className="flex gap-5 text-sm">
              <div><strong>Total Files:</strong> {previewData.length}</div>
              <div><strong>Will be Renamed:</strong> <span className="text-green-500">{previewData.filter(item => item.status.includes('✓')).length}</span></div>
              <div><strong>Warnings:</strong> <span className="text-yellow-500">{previewData.filter(item => item.status.includes('⚠')).length}</span></div>
              <div><strong>Errors:</strong> <span className="text-red-500">{previewData.filter(item => item.status.includes('✗')).length}</span></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="p-3 text-left w-12">#</th>
                      <th className="p-3 text-left">Original Document</th>
                      <th className="p-3 text-center w-12">→</th>
                      <th className="p-3 text-left">New Name (from Excel)</th>
                      <th className="p-3 text-center w-32">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, index) => {
                      const isSuccess = item.status.includes('✓')
                      const isWarning = item.status.includes('⚠')
                      const isError = item.status.includes('✗')

                      return (
                        <tr key={index} className={cn(
                          isSuccess && "bg-green-950/20",
                          isWarning && "bg-yellow-950/20",
                          isError && "bg-red-950/20"
                        )}>
                          <td className="p-3 text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="font-mono text-xs break-all">
                                {item.original_name || item.original || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-lg">
                            {isSuccess ? '✓' : '→'}
                          </td>
                          <td className="p-3">
                            <span className={cn(
                              "font-mono text-xs break-all",
                              item.new_name !== item.original_name && "text-primary font-semibold"
                            )}>
                              {item.new_name}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {getStatusIcon(item.status)}
                              <span className="text-xs">{item.status.replace(/[✓✗⚠]/g, '').trim()}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleExecute}
                disabled={loading || previewData.filter(item => item.status.includes('✓')).length === 0}
                size="lg"
                className="flex-1"
              >
                <Download className="h-5 w-5 mr-2" />
                {loading ? 'Executing Rename...' : `Execute Rename (${previewData.filter(item => item.status.includes('✓')).length} files)`}
              </Button>
            </div>

            {previewData.filter(item => item.status.includes('✓')).length === 0 && (
              <p className="text-center text-destructive text-sm mt-3 flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No files can be renamed. Please check the mapping.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-4">Processing...</div>
            <Progress value={undefined} className="w-full" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
