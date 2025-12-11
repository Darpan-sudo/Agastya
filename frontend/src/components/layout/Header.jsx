import { useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isElectron = window.electronAPI?.isElectron

  const handleRefresh = async () => {
    if (!isElectron || isRefreshing) return

    setIsRefreshing(true)
    try {
      const result = await window.electronAPI.cancelOperations()
      if (result.success) {
        console.log('Backend restarted successfully')
      } else {
        console.error('Failed to restart backend:', result.message)
      }
    } catch (err) {
      console.error('Error refreshing:', err)
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-5 shadow-sm flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            Agastya <span className="text-sm font-normal text-muted-foreground ml-2">Beta v0.6</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Professional Document Processing and Conversion Tools
        </p>
      </div>

      <div className="flex items-center gap-4">
        {isElectron && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Restart backend / Cancel all operations"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Restarting...' : 'Refresh'}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
