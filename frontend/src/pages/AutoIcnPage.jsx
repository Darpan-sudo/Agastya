import { useState, useCallback } from 'react'
import { Wand2, Upload, X, CheckCircle2, Download } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLogs } from '@/context/LogsContext'

export default function AutoIcnPage() {
    const { addLog } = useLogs()
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [processingStatus, setProcessingStatus] = useState('')
    const [results, setResults] = useState(null)
    const [downloadUrl, setDownloadUrl] = useState(null)

    const onDrop = useCallback((acceptedFiles) => {
        const adocFiles = acceptedFiles.filter(file =>
            file.name.toLowerCase().endsWith('.adoc')
        )
        setFiles(adocFiles)
        setError(null)
        setResults(null)
        setDownloadUrl(null)
        addLog(`Selected ${adocFiles.length} AsciiDoc file(s) for processing`, 'info')
    }, [addLog])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.adoc']
        },
        multiple: true
    })

    const handleProcess = async () => {
        if (files.length === 0) {
            setError('Please select at least one AsciiDoc file')
            addLog('No files selected for processing', 'error')
            return
        }

        setLoading(true)
        setError(null)
        setUploadProgress(0)
        setProcessingStatus('Preparing files...')

        try {
            setProcessingStatus('Processing AsciiDoc files...')
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
            const result = await window.electronAPI.autoIcn(fileData)

            setUploadProgress(100)

            if (result.success) {
                setProcessingStatus('Processing complete!')
                setResults(result)

                // Create download blob
                const blob = new Blob([result.data], { type: 'application/zip' })
                const url = window.URL.createObjectURL(blob)
                setDownloadUrl(url)

                addLog(`Processed ${result.filesProcessed} file(s), made ${result.totalChanges} change(s)`, 'success')
            } else {
                throw new Error(result.error || 'Processing failed')
            }
        } catch (err) {
            const errorMsg = err.message || 'Processing failed. Please try again.'
            setError(errorMsg)
            addLog(`Processing failed: ${errorMsg}`, 'error')
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
            link.download = 'auto_icn_processed.zip'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Wand2 className="h-8 w-8" />
                <h2 className="text-3xl font-bold">Auto ICN</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Automatically Move ICN Codes</CardTitle>
                    <CardDescription>
                        Automatically moves ICN codes from image captions into the image attribute blocks in AsciiDoc files.
                        Processes all .adoc files and updates them in place.
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
                                ? 'Drop the AsciiDoc files here...'
                                : 'Drag & drop AsciiDoc files here, or click to select (multiple files supported)'}
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

                    {results && (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <p className="text-sm font-medium text-green-500">Processing Complete!</p>
                            </div>
                            <div className="text-sm space-y-1">
                                <p>Files processed: <span className="font-semibold">{results.filesProcessed}</span></p>
                                <p>Total changes made: <span className="font-semibold">{results.totalChanges}</span></p>
                                <div className="mt-2 max-h-32 overflow-y-auto">
                                    {results.results.map((r, i) => (
                                        <div key={i} className="text-xs py-1">
                                            {r.status === 'success' && `✅ ${r.file}: ${r.changes} change(s)`}
                                            {r.status === 'no_changes' && `🟡 ${r.file}: No changes needed`}
                                            {r.status === 'error' && `❌ ${r.file}: ${r.message}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={handleDownload}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download Processed Files (ZIP)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => { setFiles([]); setResults(null); setDownloadUrl(null); }}
                            >
                                Process More Files
                            </Button>
                        </div>
                    )}

                    {!loading && !results && (
                        <Button
                            onClick={handleProcess}
                            disabled={files.length === 0}
                            className="w-full"
                        >
                            <Wand2 className="h-4 w-4 mr-2" />
                            Process Files
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p>This tool automatically finds ICN codes in image captions and moves them to the image attribute block:</p>
                    <div className="bg-secondary p-3 rounded-lg space-y-2">
                        <p className="font-semibold">Before:</p>
                        <code className="text-xs block">image::path/to/image.png[]</code>
                        <code className="text-xs block">.Caption with ICN-ABC123-XYZ456-789012345</code>
                    </div>
                    <div className="bg-secondary p-3 rounded-lg space-y-2">
                        <p className="font-semibold">After:</p>
                        <code className="text-xs block">image::path/to/image.png[icn=ICN-ABC123-XYZ456-789012345]</code>
                        <code className="text-xs block">.Caption</code>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
