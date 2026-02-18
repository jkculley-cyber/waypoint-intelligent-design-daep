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

  const { signIn, profile } = useAuth()
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
