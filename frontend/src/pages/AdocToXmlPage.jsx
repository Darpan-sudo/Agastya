import { useState, useCallback, useEffect } from 'react'
import { Code, Upload, CheckCircle2, Loader2, XCircle, Download } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLogs } from '@/context/LogsContext'

export default function AdocToXmlPage() {
  const { addLog } = useLogs()
  const [files, setFiles] = useState([])
  const [docType, setDocType] = useState('descript')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [convertedCount, setConvertedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [fileStatuses, setFileStatuses] = useState({})
  const [results, setResults] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    const adocFiles = acceptedFiles.filter(file =>
      file.name.toLowerCase().endsWith('.adoc')
    )
    setFiles(adocFiles)
    setError(null)
    addLog(`Selected ${adocFiles.length} AsciiDoc file(s) for conversion`, 'info')
  }, [addLog])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.adoc']
    },
    multiple: true
  })

  useEffect(() => {
    if (!window.electronAPI) return

    const handleProgress = (data) => {
      if (data.type === 'progress') {
        const newStatus = data.status === 'completed' ? 'completed' :
          data.status === 'failed' ? 'failed' : 'converting'

        setFileStatuses(prev => ({
          ...prev,
          [data.filename]: {
            status: newStatus,
            name: data.filename,
            error: data.error
          }
        }))

        if (data.status === 'completed') {
          setConvertedCount(prev => prev + 1)
        } else if (data.status === 'failed') {
          setFailedCount(prev => prev + 1)
        }

        setProcessingStatus(`Converting: ${data.current} / ${data.total} files`)
      }
    }

    window.electronAPI.onProgress(handleProgress)
    return () => window.electronAPI.removeProgressListener()
  }, [])

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Please select at least one AsciiDoc file')
      addLog('No files selected', 'error')
      return
    }

    setLoading(true)
    setError(null)
    setUploadProgress(0)
    setConvertedCount(0)
    setFailedCount(0)
    setTotalFiles(files.length)
    setProcessingStatus('Preparing files...')

    const initialStatuses = {}
    files.forEach((file) => {
      initialStatuses[file.name] = { status: 'pending', name: file.name }
    })
    setFileStatuses(initialStatuses)

    addLog(`Starting AsciiDoc to XML conversion of ${files.length} file(s)...`, 'info')

    try {
      const fileData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      )

      setUploadProgress(100)
      setProcessingStatus('Converting files with Asciidoctor + Saxon...')

      const result = await window.electronAPI.convertAdocToXml(fileData, { docType })

      if (result.success) {
        setResults(result.results)
        const successCount = result.results.filter(r => r.success).length
        const failCount = result.results.filter(r => !r.success).length

        addLog(`Successfully converted ${successCount} file(s) to XML`, 'success')
        setProcessingStatus(`Complete! ${successCount} succeeded, ${failCount} failed`)
      } else {
        setError('Conversion failed. Please try again.')
        addLog(`AsciiDoc to XML conversion failed`, 'error')
      }

    } catch (err) {
      const errorMsg = err.message || 'Conversion failed. Please try again.'
      setError(errorMsg)
      addLog(`AsciiDoc to XML conversion failed: ${errorMsg}`, 'error')
      setProcessingStatus('')
      setFileStatuses({})
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!results) return

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add all successful conversions to ZIP
    results.forEach(result => {
      if (result.success) {
        zip.file(result.name, result.data);
      }
    });

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `converted_xml_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    addLog('Downloaded ZIP file with converted files', 'info');
  }

  const handleReset = () => {
    setFiles([])
    setUploadProgress(0)
    setProcessingStatus('')
    setConvertedCount(0)
    setFailedCount(0)
    setFileStatuses({})
    setResults(null)
    setError(null)
  }

  const progressPercent = totalFiles > 0
    ? Math.round(((convertedCount + failedCount) / totalFiles) * 100)
    : uploadProgress

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Code className="h-8 w-8" />
        <h2 className="text-3xl font-bold">AsciiDoc to S1000D XML</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convert AsciiDoc to S1000D XML</CardTitle>
          <CardDescription>
            Convert S1000D AsciiDoc files to XML format using Asciidoctor and Saxon.
            Supports batch conversion with real-time progress tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Type:</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              disabled={loading || results}
            >
              <option value="descript">Descriptive</option>
              <option value="proced">Procedural</option>
              <option value="fault">Fault Isolation</option>
              <option value="ipd">Illustrated Parts Data (IPD)</option>
            </select>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">ℹ️ Requirements</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Ruby/Asciidoctor and Java/Saxon are bundled</li>
              <li>AsciiDoc files should have S1000D metadata</li>
              <li>Supports batch conversion</li>
            </ul>
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
                ? 'Drop the AsciiDoc files here...'
                : 'Drag & drop .adoc files here, or click to select'}
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
                {files.map((file, index) => {
                  const status = fileStatuses[file.name]
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-2">
                        {status?.status === 'converting' && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                        {status?.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {status?.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{processingStatus}</p>
                <span className="text-sm font-bold">
                  <span className="text-green-500">{convertedCount} ✓</span>
                  {failedCount > 0 && <span className="text-red-500 ml-2">{failedCount} ✗</span>}
                  <span className="text-muted-foreground"> / {totalFiles}</span>
                </span>
              </div>

              <div className="space-y-1">
                <Progress value={progressPercent} className="h-3" />
                <p className="text-xs text-center text-muted-foreground">{progressPercent}%</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleConvert}
            disabled={files.length === 0 || loading || results}
            className="w-full"
          >
            {loading ? 'Converting...' : `Convert ${files.length || ''} AsciiDoc to XML`}
          </Button>

          {results && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Conversion Complete!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {convertedCount} file(s) converted successfully{failedCount > 0 ? `, ${failedCount} failed` : ''}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP ({results.length} {results.length === 1 ? 'file' : 'files'})
                </Button>
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Convert More Files
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
