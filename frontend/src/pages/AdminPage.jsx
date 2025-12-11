import { useState } from 'react'
import { Settings, Lock, Unlock, LogOut } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLogs } from '@/context/LogsContext'

export default function AdminPage() {
  const { addLog } = useLogs()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  // Simple password check (in production, this should be more secure)
  const ADMIN_PASSWORD = 'admin123'

  const handleLogin = (e) => {
    e.preventDefault()
    setError(null)

    if (!password || password.trim() === '') {
      setError('Please enter a password')
      return
    }

    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true)
      addLog('Admin logged in', 'success')
    } else {
      setError('Invalid password')
      addLog('Admin login failed', 'error')
      setTimeout(() => setError(null), 5000)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-6 max-w-md mx-auto mt-12">
        <div className="flex items-center gap-3">
          <Lock className="h-8 w-8" />
          <h2 className="text-3xl font-bold">Admin Panel</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Authentication</CardTitle>
            <CardDescription>
              Enter the admin password to access settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8" />
          <h2 className="text-3xl font-bold">Admin Panel</h2>
        </div>
        <Button variant="outline" onClick={() => {
          setIsLoggedIn(false)
          setPassword('')
          addLog('Admin logged out', 'info')
        }}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Information</CardTitle>
          <CardDescription>
            Backend-free Electron application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Unlock className="h-5 w-5" />
              <span className="font-semibold">All Features Enabled</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This application runs entirely in Electron without a backend server.
              All conversion tools are available and ready to use.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Available Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>DOCX to S1000D AsciiDoc Converter</li>
              <li>XML to HTML Converter (Saxon XSLT)</li>
              <li>AsciiDoc to S1000D XML Converter</li>
              <li>PDF to DOCX Converter</li>
              <li>Document Splitter</li>
              <li>File Renamer</li>
              <li>And more...</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">ℹ️ Note</h4>
            <p className="text-xs text-muted-foreground">
              Feature management has been simplified in the backend-free version.
              All tools are permanently enabled and run directly through Electron IPC.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
