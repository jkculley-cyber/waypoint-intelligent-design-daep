import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from '../ui/LoadingSpinner'

export default function RequireRole({ roles, children }) {
  const { hasRole, profile, loading } = useAuth()

  if (loading) return <PageLoader message="Loading..." />
  if (!profile) return null

  if (!hasRole(roles)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          You don't have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
    )
  }

  return children
}
