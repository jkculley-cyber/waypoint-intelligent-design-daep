import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6">
              An unexpected error occurred. Refreshing the page usually fixes this.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-left bg-gray-100 rounded-lg p-3 mb-6 text-gray-600 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            {this.state.componentStack && (
              <pre className="text-xs text-left bg-gray-100 rounded-lg p-3 mb-6 text-gray-600 overflow-auto max-h-40">
                {this.state.componentStack}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  const txt = (this.state.error?.message || '') + '\n' + (this.state.componentStack || '')
                  navigator.clipboard?.writeText(txt)
                }}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Copy Error
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
