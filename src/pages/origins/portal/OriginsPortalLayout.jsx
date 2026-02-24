// Standalone layout for the Origins family portal — no sidebar, no staff chrome

export default function OriginsPortalLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Top bar */}
      <header className="bg-white border-b border-teal-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.47 9.53l-4.94 2.47-2.47 4.94 4.94-2.47 2.47-4.94z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-teal-700">Origins</span>
            <span className="text-xs text-gray-400 ml-2">by Compass Pathway</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center">
        <p className="text-xs text-gray-400">
          &copy; 2026 Clear Path Education Group, LLC · Origins Family Portal
        </p>
      </footer>
    </div>
  )
}
