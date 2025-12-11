import { useState, useCallback } from 'react'
import { useLogs } from '@/context/LogsContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import FileDropzone from '@/components/shared/FileDropzone'
import { FileSpreadsheet, FileText, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ExcelGeneratorPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const { addLog } = useLogs()

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles)
    addLog(`${acceptedFiles.length} files selected`, 'info')
  }, [addLog])

  const handleGenerateExcel = () => {
    if (files.length === 0) {
      addLog('No files selected', 'error')
      return
    }

    setLoading(true)
    addLog('Generating Excel file...', 'info')

    try {
      // Extract filenames without extension
      const data = files.map((file, index) => {
        const nameWithoutExt = file.name.replace(/\.(docx|doc|pdf|txt)$/i, '')
        return {
          'S.No': index + 1,
          'Doc Name': nameWithoutExt,
          'DMC Code': '' // Empty for user to fill
        }
      })

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data)

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // S.No
        { wch: 50 }, // Doc Name
        { wch: 50 }  // DMC Code
      ]

      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'File Mapping')

      // Generate Excel file
      XLSX.writeFile(wb, 'file-mapping-template.xlsx')

      addLog(`Excel file generated with ${files.length} entries`, 'success')
    } catch (err) {
      addLog(`Failed to generate Excel: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8" />
          Excel Template Generator
        </h2>
        <p className="text-muted-foreground">
          Upload files to extract their names and generate an Excel template with "Doc Name" and "DMC Code" columns.
          Fill in the DMC Code column and use with Excel Renamer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Files
          </CardTitle>
          <CardDescription>
            Select files (DOCX, DOC, PDF, TXT) to extract their names for the Excel template
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <FileDropzone
              onDrop={onDrop}
              accept={{
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'application/msword': ['.doc'],
                'application/pdf': ['.pdf'],
                'text/plain': ['.txt']
              }}
              multiple={true}
            >
              <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground font-medium">
                Drag & drop files here, or click to select
              </p>
            </FileDropzone>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Selected Files: <span className="text-primary">{files.length}</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiles([])
                    addLog('File selection cleared', 'info')
                  }}
                >
                  Clear All
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary rounded-md border border-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted-foreground font-medium">{index + 1}.</span>
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Will be extracted as: {file.name.replace(/\.(docx|doc|pdf|txt)$/i, '')}
                        </p>
                      </div>
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

      {files.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Preview: Excel Template Structure</CardTitle>
            <CardDescription>
              The generated Excel file will have the following format:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-3 text-left w-20">S.No</th>
                    <th className="p-3 text-left">Doc Name</th>
                    <th className="p-3 text-left">DMC Code</th>
                  </tr>
                </thead>
                <tbody>
                  {files.slice(0, 5).map((file, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="p-3 text-muted-foreground">{index + 1}</td>
                      <td className="p-3 font-mono text-xs">
                        {file.name.replace(/\.(docx|doc|pdf|txt)$/i, '')}
                      </td>
                      <td className="p-3 text-muted-foreground italic text-xs">
                        (empty - to be filled)
                      </td>
                    </tr>
                  ))}
                  {files.length > 5 && (
                    <tr className="border-t border-border">
                      <td colSpan="3" className="p-3 text-center text-muted-foreground text-xs">
                        ... and {files.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">How to use:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Generate the Excel file using the button below</li>
                <li>Open the file and fill in the "DMC Code" column with new names</li>
                <li>Save the Excel file</li>
                <li>Use it with the Excel Renamer tool to rename your files</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleGenerateExcel}
          disabled={files.length === 0 || loading}
          size="lg"
          className="flex-1"
        >
          <Download className="h-5 w-5 mr-2" />
          {loading ? 'Generating...' : `Generate Excel Template (${files.length} files)`}
        </Button>
      </div>
    </div>
  )
}
