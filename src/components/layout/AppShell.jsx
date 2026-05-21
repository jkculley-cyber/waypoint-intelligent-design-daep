import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import SandboxCrossSellBanner from './SandboxCrossSellBanner'
import { NotificationProvider } from '../../contexts/NotificationContext'
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext'
import { Toaster } from 'react-hot-toast'
import ChatBubble from '../chat/ChatBubble'

function AppShellInner() {
  const { sidebarOpen, setSidebarOpen } = useSidebar()

  // Close drawer when rotating to landscape / resizing to desktop width
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile backdrop — tap to close sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <SandboxCrossSellBanner />
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '12px 16px',
            fontSize: '14px',
          },
        }}
      />
      <ChatBubble />
    </div>
  )
}

export default function AppShell() {
  return (
    <NotificationProvider>
      <SidebarProvider>
        <AppShellInner />
      </SidebarProvider>
    </NotificationProvider>
  )
}
