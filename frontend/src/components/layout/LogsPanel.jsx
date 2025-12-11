import { useState, useCallback, useEffect, useRef } from 'react'
import { Trash2, Activity, GripVertical } from 'lucide-react'
import { useLogs } from '@/context/LogsContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LogsPanel() {
  const { logs, clearLogs } = useLogs()
  const [panelWidth, setPanelWidth] = useState(384) // 24rem = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef(null)

  const getLogStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-950 border-l-green-500 text-green-200'
      case 'error':
        return 'bg-red-950 border-l-red-500 text-red-200'
      case 'warning':
        return 'bg-yellow-950 border-l-yellow-500 text-yellow-200'
      default:
        return 'bg-card border-l-blue-500 text-blue-200'
    }
  }

  // Resize handlers
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return
    const containerRight = window.innerWidth
    const newWidth = containerRight - e.clientX
    // Constrain between 250px and 600px
    setPanelWidth(Math.min(Math.max(newWidth, 250), 600))
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add/remove mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div className="flex">
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className={cn(
          "w-1 bg-border hover:bg-primary cursor-col-resize flex items-center justify-center transition-colors",
          isResizing && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="w-4 h-8 flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Logs Panel */}
      <aside 
        className="bg-background border-l border-border p-5 overflow-y-auto max-h-[calc(100vh-220px)] flex flex-col"
        style={{ width: `${panelWidth}px`, minWidth: '250px', maxWidth: '600px' }}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs
          </h3>
          <Button
            onClick={clearLogs}
            variant="ghost"
            size="sm"
            className="h-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-2">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              No activity yet
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "p-3 rounded-md border-l-4 text-sm leading-relaxed",
                  getLogStyles(log.type)
                )}
              >
                <span className="block text-xs text-muted-foreground mb-1">
                  {log.timestamp}
                </span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
