import { useState, useCallback } from 'react'
import { Search, Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import apiClient from '@/api/apiClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLogs } from '@/context/LogsContext'

export default function IcnExtractorPage() {
  const { addLog } = useLogs()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles)
    setError(null)
    setSuccessMessage(null)
    addLog(`Selected ${acceptedFiles.length} file(s) for ICN extraction`, 'info')
  }, [addLog])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  })

  const handleExtract = async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      addLog('No files selected for extraction', 'error')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      addLog(`Starting ICN extraction for ${files.length} file(s)...`, 'info')

      // Convert files to ArrayBuffer format for IPC
      const fileData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      // Call IPC
      const result = await window.electronAPI.extractIcn(fileData)

      if (result.success) {
        // Download ZIP file
        const blob = new Blob([result.data], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'extracted_icn.zip'
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)

        const stats = result.stats || {}
        const statsMsg = `Processed ${stats.filesProcessed || 0} file(s), extracted ${stats.imagesExtracted || 0} image(s)`
        setSuccessMessage(statsMsg)
        addLog(`ICN extraction successful! ${statsMsg}`, 'success')
        setFiles([])
      } else {
        throw new Error(result.error || 'Extraction failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Extraction failed. Please try again.'
      setError(errorMsg)
      addLog(`ICN extraction failed: ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Search className="h-8 w-8" />
        <h2 className="text-3xl font-bold">ICN Extractor</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extract ICN Images</CardTitle>
          <CardDescription>
            Extract images from DOCX files with ICN tags. Images will be organized by document name and labeled with their ICN codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'Drop the DOCX files here...'
                : 'Drag & drop DOCX files here, or click to select (multiple files supported)'}
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
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
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

          {successMessage && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm font-medium">
              ✓ {successMessage}
            </div>
          )}

          <Button
            onClick={handleExtract}
            disabled={files.length === 0 || loading}
            className="w-full"
          >
            {loading ? 'Extracting...' : 'Extract ICN Images'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
