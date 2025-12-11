import { useState, useCallback } from 'react'
import { CheckCircle, Upload, AlertTriangle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import apiClient from '@/api/apiClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLogs } from '@/context/LogsContext'

export default function IcnValidatorPage() {
  const { addLog } = useLogs()
  const [adocFiles, setAdocFiles] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const onDropAdoc = useCallback((acceptedFiles) => {
    setAdocFiles(acceptedFiles)
    setError(null)
    setResults(null)
    addLog(`Selected ${acceptedFiles.length} ADOC file(s)`, 'info')
  }, [addLog])

  const onDropImages = useCallback((acceptedFiles) => {
    setImageFiles(acceptedFiles)
    setError(null)
    setResults(null)
    addLog(`Selected ${acceptedFiles.length} image file(s)`, 'info')
  }, [addLog])

  const { getRootProps: getRootPropsAdoc, getInputProps: getInputPropsAdoc, isDragActive: isDragActiveAdoc } = useDropzone({
    onDrop: onDropAdoc,
    accept: {
      'text/plain': ['.adoc']
    },
    multiple: true
  })

  const { getRootProps: getRootPropsImages, getInputProps: getInputPropsImages, isDragActive: isDragActiveImages } = useDropzone({
    onDrop: onDropImages,
    multiple: true
  })

  const handleValidate = async () => {
    if (adocFiles.length === 0) {
      setError('Please select at least one ADOC file')
      addLog('No ADOC files selected', 'error')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      addLog(`Starting ICN validation for ${adocFiles.length} ADOC file(s)...`, 'info')

      // Convert files to ArrayBuffer format for IPC
      const adocData = await Promise.all(
        adocFiles.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      const imageData = await Promise.all(
        imageFiles.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      // Call IPC
      const result = await window.electronAPI.validateIcn(adocData, imageData)

      if (result.success) {
        setResults(result.results)
        addLog('ICN validation completed', 'success')
      } else {
        throw new Error(result.error || 'Validation failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Validation failed. Please try again.'
      setError(errorMsg)
      addLog(`ICN validation failed: ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-8 w-8" />
        <h2 className="text-3xl font-bold">ICN Validator</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validate ICN References</CardTitle>
          <CardDescription>
            Validate ADOC image references against actual image files. Identifies missing and unused images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">ADOC Files</h3>
            <div
              {...getRootPropsAdoc()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActiveAdoc ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                }`}
            >
              <input {...getInputPropsAdoc()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActiveAdoc
                  ? 'Drop ADOC files here...'
                  : 'Drag & drop ADOC files here, or click to select'}
              </p>
            </div>

            {adocFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selected: {adocFiles.length} file(s)</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {adocFiles.map((file, index) => (
                    <div key={index} className="text-xs p-2 bg-secondary rounded">
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Image Files (Optional)</h3>
            <div
              {...getRootPropsImages()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActiveImages ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
                }`}
            >
              <input {...getInputPropsImages()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActiveImages
                  ? 'Drop image files here...'
                  : 'Drag & drop image files here, or click to select'}
              </p>
            </div>

            {imageFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">Selected: {imageFiles.length} file(s)</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleValidate}
            disabled={adocFiles.length === 0 || loading}
            className="w-full"
          >
            {loading ? 'Validating...' : 'Validate ICN References'}
          </Button>

          {results && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Validation Results</h3>
              {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{result.file}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.error && (
                      <div className="flex items-start gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>{result.error}</span>
                      </div>
                    )}

                    {result.missing && result.missing.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Missing Images ({result.missing.length})</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
                          {result.missing.map((img, i) => (
                            <li key={i}>{img}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.unused && result.unused.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-yellow-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Unused Images ({result.unused.length})</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 pl-6 list-disc">
                          {result.unused.map((img, i) => (
                            <li key={i}>{img}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.status === 'ok' && (
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">All images are properly referenced!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
