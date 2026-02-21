import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'
import AlertBanner from '../components/ui/AlertBanner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)

  const { signIn, signInWithOAuth, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || null

  // After profile loads, redirect based on role
  useEffect(() => {
    if (profile) {
      const destination = from || (profile.role === 'parent' ? '/parent' : '/dashboard')
      navigate(destination, { replace: true })
    }
  }, [profile, from, navigate])

  const handleOAuth = async (provider) => {
    setError('')
    setOauthLoading(provider)
    const { error: oauthError } = await signInWithOAuth(provider)
    if (oauthError) {
      setError(oauthError.message || 'SSO sign-in failed')
      setOauthLoading(null)
    }
    // On success, browser redirects to provider — no further action needed
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message || 'Invalid email or password')
      setLoading(false)
    }
    // Navigation is handled by the useEffect above after profile loads
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Waypoint" className="h-44 w-44 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-orange-600 mb-2">Waypoint</h1>
          <p className="text-gray-500">Behavioral Solutions</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4">
              <AlertBanner variant="error">
                {error}
              </AlertBanner>
            </div>
          )}

          {/* SSO Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth('azure')}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {oauthLoading === 'azure' ? (
                <span className="h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
                  <path d="M1 1h10v10H1z" fill="#F25022"/>
                  <path d="M12 1h10v10H12z" fill="#7FBA00"/>
                  <path d="M1 12h10v10H1z" fill="#00A4EF"/>
                  <path d="M12 12h10v10H12z" fill="#FFB900"/>
                </svg>
              )}
              Sign in with Microsoft
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              {oauthLoading === 'google' ? (
                <span className="h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Sign in with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium tracking-wider">Or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@district.edu"
              required
              autoComplete="email"
            />

            <FormField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <a href="/reset-password" className="text-sm text-orange-600 hover:text-orange-700">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Contact your district administrator for account access.
        </p>
        <p className="text-center text-xs text-gray-400 mt-4">
          &copy; {new Date().getFullYear()} Clear Path Education Group, LLC. All rights reserved.
        </p>
      </div>
    </div>
  )
}
