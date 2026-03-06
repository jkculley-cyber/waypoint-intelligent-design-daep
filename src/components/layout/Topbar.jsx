import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSidebar } from '../../contexts/SidebarContext'
import { useNotifications } from '../../contexts/NotificationContext'

export default function Topbar({ title, subtitle, actions }) {
  const { profile } = useAuth()
  const { setSidebarOpen } = useSidebar()
  const { alertCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <header className="bg-white border-b border-gray-200">
      {/* Main row: hamburger + title + bell */}
      <div className="px-3 md:px-6 py-3 md:py-4 flex items-center gap-2">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Actions — desktop only in this row */}
        {actions && (
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            {actions}
          </div>
        )}

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="View alerts"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>

      {/* Actions — mobile second row, horizontally scrollable */}
      {actions && (
        <div className="md:hidden flex items-center gap-2 px-3 pb-2 overflow-x-auto">
          {actions}
        </div>
      )}
    </header>
  )
}
