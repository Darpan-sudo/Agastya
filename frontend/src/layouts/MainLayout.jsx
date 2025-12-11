import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Navigation from '@/components/layout/Navigation'
import LogsPanel from '@/components/layout/LogsPanel'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto p-5 flex-1">
        <Header />
        <Navigation />

        <div className="flex gap-5 bg-card border border-border rounded-lg shadow-sm overflow-hidden min-h-[calc(100vh-260px)]">
          <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-260px)]">
            <Outlet />
          </main>

          <LogsPanel />
        </div>
      </div>


    </div>
  )
}
