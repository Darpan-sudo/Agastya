import { useState, useCallback } from 'react'
import { FileJson, Upload, X, CheckCircle2, Download } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import apiClient from '@/api/apiClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLogs } from '@/context/LogsContext'

export default function HtmlToJsonPage() {
  const { addLog } = useLogs()
  const [files, setFiles] = useState([])
  const [outputFormat, setOutputFormat] = useState('js')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [downloadName, setDownloadName] = useState('')

  const onDrop = useCallback((acceptedFiles) => {
    const htmlFiles = acceptedFiles.filter(file =>
      file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')
    )
    setFiles(htmlFiles)
    setError(null)
    setDownloadUrl(null)
    addLog(`Selected ${htmlFiles.length} HTML file(s) for conversion`, 'info')
  }, [addLog])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm']
    },
    multiple: true
  })

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Please select at least one HTML file')
      addLog('No files selected for conversion', 'error')
      return
    }

    setLoading(true)
    setError(null)
    setUploadProgress(0)
    setProcessingStatus('Preparing files...')

    try {
      setProcessingStatus('Processing HTML files...')
      setUploadProgress(30)

      // Convert files to ArrayBuffer format for IPC
      const fileData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      setUploadProgress(60)

      // Call IPC
      const result = await window.electronAPI.htmlToJson(fileData, outputFormat)

      setUploadProgress(100)

      if (result.success) {
        setProcessingStatus('Conversion complete!')

        // Create download blob
        const blob = new Blob([result.data])
        const url = window.URL.createObjectURL(blob)
        setDownloadUrl(url)
        setDownloadName(result.filename)

        addLog(`Successfully converted ${result.filesProcessed} HTML file(s) to ${outputFormat.toUpperCase()}`, 'success')
      } else {
        throw new Error(result.error || 'Conversion failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Conversion failed. Please try again.'
      setError(errorMsg)
      addLog(`Conversion failed: ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
      setProcessingStatus('')
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileJson className="h-8 w-8" />
        <h2 className="text-3xl font-bold">HTML to JSON</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convert HTML to Data Source</CardTitle>
          <CardDescription>
            Extract content from HTML files and generate a JavaScript or JSON data source file.
            Useful for creating searchable data indexes from S1000D HTML output.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Output Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="js"
                  checked={outputFormat === 'js'}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">JavaScript (.js)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={outputFormat === 'json'}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">JSON (.json)</span>
              </label>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'Drop the HTML files here...'
                : 'Drag & drop HTML files here, or click to select (multiple files supported)'}
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Selected Files ({files.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">{processingStatus}</p>
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
            </div>
          )}

          {/* Download Button - Shows after successful conversion */}
          {downloadUrl && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium text-green-500">Conversion Complete!</p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download {downloadName}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setFiles([]); setDownloadUrl(null); }}
              >
                Convert More Files
              </Button>
            </div>
          )}

          {!loading && !downloadUrl && (
            <Button
              onClick={handleConvert}
              disabled={files.length === 0}
              className="w-full"
            >
              Convert to {outputFormat === 'json' ? 'JSON' : 'JavaScript'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
