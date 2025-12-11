import { useState, useCallback } from 'react'
import { Image, Upload, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import apiClient from '@/api/apiClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLogs } from '@/context/LogsContext'

export default function IcnMakerPage() {
  const { addLog } = useLogs()
  const [files, setFiles] = useState([])
  const [params, setParams] = useState({
    kpc: '1',
    xyz: '1671Y',
    sq_start: '00005',
    icv: 'A',
    issue: '001',
    sec: '01'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles)
    setError(null)
    setSuccessMessage(null)
    addLog(`Selected ${acceptedFiles.length} file(s) for ICN generation`, 'info')
  }, [addLog])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  })

  const handleParamChange = (key, value) => {
    setParams({ ...params, [key]: value })
  }

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      addLog('No files selected for ICN generation', 'error')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      addLog(`Starting ICN generation for ${files.length} file(s)...`, 'info')

      // Convert files to ArrayBuffer format for IPC
      const fileData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      // Call IPC
      const result = await window.electronAPI.generateIcn(fileData, params)

      if (result.success) {
        // Download ZIP file
        const blob = new Blob([result.data], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'generated_icn.zip'
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)

        const stats = result.stats || {}
        const statsMsg = `Processed ${stats.filesProcessed || 0} file(s), generated ${stats.icnsGenerated || 0} ICN label(s)`
        setSuccessMessage(statsMsg)
        addLog(`ICN generation successful! ${statsMsg}`, 'success')
        setFiles([])
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (err) {
      const errorMsg = err.message || 'Generation failed. Please try again.'
      setError(errorMsg)
      addLog(`ICN generation failed: ${errorMsg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Image className="h-8 w-8" />
        <h2 className="text-3xl font-bold">ICN Maker</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate ICN Labels</CardTitle>
          <CardDescription>
            Generate ICN (Illustration Control Number) labels for images in DOCX files with continuous sequence numbering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">RPC (KPC):</label>
              <select
                value={params.kpc}
                onChange={(e) => handleParamChange('kpc', e.target.value)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">XYZ (Origcage):</label>
              <input
                type="text"
                value={params.xyz}
                onChange={(e) => handleParamChange('xyz', e.target.value)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sequence Start:</label>
              <input
                type="text"
                value={params.sq_start}
                onChange={(e) => handleParamChange('sq_start', e.target.value)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Variant (ICV):</label>
              <input
                type="text"
                value={params.icv}
                onChange={(e) => handleParamChange('icv', e.target.value)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Issue:</label>
              <input
                type="text"
                value={params.issue}
                onChange={(e) => handleParamChange('issue', e.target.value)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Security:</label>
              <select
                value={params.sec}
                onChange={(e) => handleParamChange('sec', e.target.value)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              >
                <option value="01">01 - Unclassified</option>
                <option value="02">02 - UK Official Sensitive</option>
                <option value="03">03 - RESTRICTED</option>
                <option value="04">05 - Confidential</option>
              </select>
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
            onClick={handleGenerate}
            disabled={files.length === 0 || loading}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate ICN Labels'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
