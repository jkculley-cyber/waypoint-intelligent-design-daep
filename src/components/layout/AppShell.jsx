import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { NotificationProvider } from '../../contexts/NotificationContext'
import { Toaster } from 'react-hot-toast'
import ChatBubble from '../chat/ChatBubble'

export default function AppShell() {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
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
    </NotificationProvider>
  )
}
