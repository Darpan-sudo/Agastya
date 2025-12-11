import { createContext, useContext, useState, useCallback } from 'react'

const LogsContext = createContext(undefined)

export const LogsProvider = ({ children }) => {
  const [logs, setLogs] = useState([])

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [
      { id: Date.now(), message, type, timestamp },
      ...prev,
    ].slice(0, 100)) // Keep last 100 logs
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return (
    <LogsContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogsContext.Provider>
  )
}

export const useLogs = () => {
  const context = useContext(LogsContext)
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider')
  }
  return context
}
