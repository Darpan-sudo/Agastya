import { useState, useCallback } from 'react'
import { Sparkles, Upload, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import apiClient from '@/api/apiClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLogs } from '@/context/LogsContext'

export default function DocSplitter2Page() {
  const { addLog } = useLogs()
  const [file, setFile] = useState(null)
  const [headingStyle, setHeadingStyle] = useState('Heading 1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError(null)
      addLog(`Selected file for V2 split: ${acceptedFiles[0].name}`, 'info')
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

    try {
      addLog(`Starting enhanced split of ${file.name}...`, 'info')

      // Read file as ArrayBuffer
      const fileData = await file.arrayBuffer()

      setUploadProgress(50)
      setProcessingStatus('Splitting document with enhanced mode...')

      // Call IPC
      const result = await window.electronAPI.splitDocxV2({
        name: file.name,
        data: fileData
      }, { headingStyle })

      if (result.success) {
        // Download ZIP file
        const blob = new Blob([result.data], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${file.name.replace('.docx', '')}_split_v2.zip`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)

        addLog(`Successfully split into ${result.count} files (enhanced mode)`, 'success')
        setProcessingStatus(`Complete! Split into ${result.count} files`)
        setUploadProgress(100)

        setTimeout(() => {
          setFile(null)
          setUploadProgress(0)
          setProcessingStatus('')
        }, 2000)
      } else {
        throw new Error(result.error || 'Split failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Split failed. Please try again.'
      setError(errorMsg)
      addLog(`Enhanced split failed: ${errorMsg}`, 'error')
      setProcessingStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Document Splitter V2</h2>
        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-semibold">Enhanced</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enhanced Document Splitter</CardTitle>
          <CardDescription>
            Advanced version with improved handling of images, nested tables, list numbering, and complex formatting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Heading Style:</label>
            <select
              value={headingStyle}
              onChange={(e) => setHeadingStyle(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              disabled={loading}
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
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'Drop the DOCX file here...'
                : 'Drag & drop a DOCX file here, or click to select'}
            </p>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <span className="text-sm font-medium">{file.name}</span>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
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

          <Button
            onClick={handleSplit}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Splitting...' : 'Split Document'}
          </Button>

          <div className="p-4 bg-accent rounded-lg space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              V2 Enhancements
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Advanced image and table handling</li>
              <li>Preserves complex formatting</li>
              <li>Better list numbering support</li>
              <li>Improved nested structure handling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
