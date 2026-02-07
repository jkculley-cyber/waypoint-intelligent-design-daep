import Topbar from '../components/layout/Topbar'

/**
 * Placeholder page component used for routes that haven't been built yet.
 * Each page will be replaced with a real implementation in later phases.
 */
export default function StubPage({ title, subtitle, description }) {
  return (
    <div>
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="h-16 w-16 text-gray-200 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.4a1.5 1.5 0 010-2.54l5.1-3.4a1.5 1.5 0 012.08.54l.96 1.92a1.5 1.5 0 01-.54 2.08l-1.92.96a1.5 1.5 0 00-.54 2.08l.96 1.92a1.5 1.5 0 01-.54 2.08l-5.1 3.4" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-500 max-w-md">
            {description || `The ${title} page is under development and will be available in a future update.`}
          </p>
        </div>
      </div>
    </div>
  )
}
