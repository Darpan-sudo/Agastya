import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export function BatchProgress({ 
  loading, 
  processingStatus, 
  convertedCount, 
  failedCount, 
  totalFiles, 
  uploadProgress, 
  fileStatuses 
}) {
  if (!loading) return null

  const progressValue = totalFiles > 0 
    ? ((convertedCount + failedCount) / totalFiles) * 100 
    : uploadProgress

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{processingStatus}</p>
        <span className="text-sm font-bold">
          <span className="text-green-500">{convertedCount} ✓</span>
          {failedCount > 0 && <span className="text-red-500 ml-2">{failedCount} ✗</span>}
          <span className="text-muted-foreground"> / {totalFiles}</span>
        </span>
      </div>
      
      {/* Overall Progress Bar */}
      <div className="space-y-1">
        <Progress value={progressValue} className="h-3" />
        <p className="text-xs text-center text-muted-foreground">
          {uploadProgress < 100 
            ? `Uploading: ${uploadProgress}%` 
            : `Progress: ${Math.round(progressValue)}%`
          }
        </p>
      </div>
      
      {/* Individual File Status */}
      {Object.keys(fileStatuses).length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(fileStatuses).map(([key, fileInfo]) => (
            <div key={key} className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
              {fileInfo.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              )}
              {fileInfo.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {fileInfo.status === 'uploaded' && (
                <div className="h-4 w-4 rounded-full bg-blue-500" />
              )}
              {(fileInfo.status === 'converting' || fileInfo.status === 'processing') && (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
              )}
              {(fileInfo.status === 'converted' || fileInfo.status === 'completed') && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {fileInfo.status === 'failed' && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm flex-1 truncate">{fileInfo.name}</span>
              <span className={`text-xs capitalize ${
                fileInfo.status === 'converted' || fileInfo.status === 'completed' ? 'text-green-500' : 
                fileInfo.status === 'failed' ? 'text-red-500' : 
                'text-muted-foreground'
              }`}>
                {fileInfo.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook for batch processing state
export function useBatchProgress(files) {
  const initialState = {
    loading: false,
    uploadProgress: 0,
    processingStatus: '',
    convertedCount: 0,
    failedCount: 0,
    totalFiles: files?.length || 0,
    fileStatuses: {}
  }
  
  return initialState
}
