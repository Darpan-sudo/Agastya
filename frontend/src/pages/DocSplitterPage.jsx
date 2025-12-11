import { useState, useCallback } from 'react'
import { Scissors, Upload, X, Download, CheckCircle2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLogs } from '@/context/LogsContext'

export default function DocSplitterPage() {
  const { addLog } = useLogs()
  const [file, setFile] = useState(null)
  const [headingStyle, setHeadingStyle] = useState('Heading 1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [results, setResults] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError(null)
      setResults(null)
      addLog(`Selected file: ${acceptedFiles[0].name}`, 'info')
    }
  }, [addLog])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  })

  const handleSplit = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setLoading(true)
    setError(null)
    setUploadProgress(0)
    setProcessingStatus('Preparing document...')
    addLog(`Starting split of ${file.name} by ${headingStyle}...`, 'info')

    try {
      // Read file as ArrayBuffer
      const fileData = {
        name: file.name,
        data: await file.arrayBuffer()
      }

      setUploadProgress(50)
      setProcessingStatus('Splitting document...')

      // Call IPC handler
      const result = await window.electronAPI.splitDocx(fileData, { headingStyle })

      setUploadProgress(100)

      if (result.success) {
        setResults(result)
        setProcessingStatus(`Split complete! Created ${result.count} files`)
        addLog(`Document split successful: ${result.count} files created`, 'success')
      } else {
        setError(result.error || 'Splitting failed')
        addLog(`Split failed: ${result.error}`, 'error')
        setProcessingStatus('')
      }
    } catch (err) {
      const errorMsg = err.message || 'Splitting failed. Please try again.'
      setError(errorMsg)
      addLog(`Split failed: ${errorMsg}`, 'error')
      setProcessingStatus('')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!results || !results.zipData) return

    // Download ZIP file
    const blob = new Blob([results.zipData], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = results.zipName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    addLog(`Downloaded ${results.zipName}`, 'success')
  }

  const handleReset = () => {
    setFile(null)
    setResults(null)
    setUploadProgress(0)
    setProcessingStatus('')
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Scissors className="h-8 w-8" />
        <h2 className="text-3xl font-bold">Document Splitter</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Split DOCX by Heading Style</CardTitle>
          <CardDescription>
            Split a DOCX document into multiple files based on heading styles. All split files will be downloaded as a ZIP archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Heading Style:</label>
            <select
              value={headingStyle}
              onChange={(e) => setHeadingStyle(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              disabled={loading || results}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <option key={num} value={`Heading ${num}`}>
                  Heading {num}
                </option>
              ))}
            </select>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
              } ${(loading || results) ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'Drop the DOCX file here...'
                : 'Drag & drop a DOCX file here, or click to select'}
            </p>
          </div>

          {file && !results && (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <span className="text-sm">{file.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={loading}>
                <X className="h-4 w-4" />
              </Button>
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

          {!results && (
            <Button
              onClick={handleSplit}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? 'Splitting...' : 'Split Document'}
            </Button>
          )}

          {results && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Split Complete!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Created {results.count} files from {file.name}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP ({results.count} files)
                </Button>
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Split Another File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
