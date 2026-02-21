import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FormField from '../components/ui/FormField'
import Button from '../components/ui/Button'
import AlertBanner from '../components/ui/AlertBanner'

// Two modes:
//   'request' — user enters email, we send reset link
//   'update'  — user arrived via reset link, set new password

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('request')

  // request mode
  const [email, setEmail] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestError, setRequestError] = useState('')

  // update mode
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // Supabase fires PASSWORD_RECOVERY when user arrives via the emailed link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest(e) {
    e.preventDefault()
    setRequestError('')
    setRequestLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setRequestLoading(false)
    if (error) {
      setRequestError(error.message)
    } else {
      setRequestSent(true)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setUpdateError('')

    if (password.length < 8) {
      setUpdateError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setUpdateError('Passwords do not match.')
      return
    }

    setUpdateLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setUpdateLoading(false)

    if (error) {
      setUpdateError(error.message)
    } else {
      setUpdateSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Waypoint" className="h-44 w-44 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-orange-600 mb-2">Waypoint</h1>
          <p className="text-gray-500">Behavioral Solutions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {mode === 'request' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>

              {requestSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Check your email</p>
                  <p className="text-sm text-gray-500">
                    We sent a password reset link to <span className="font-medium">{email}</span>.
                  </p>
                </div>
              ) : (
                <>
                  {requestError && (
                    <div className="mb-4">
                      <AlertBanner variant="error">{requestError}</AlertBanner>
                    </div>
                  )}
                  <form onSubmit={handleRequest} className="space-y-4">
                    <FormField
                      label="Email address"
                      name="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@district.edu"
                      required
                      autoComplete="email"
                    />
                    <Button type="submit" className="w-full" size="lg" loading={requestLoading}>
                      Send Reset Link
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Set new password</h2>
              <p className="text-sm text-gray-500 mb-6">Choose a password that's at least 8 characters.</p>

              {updateSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Password updated!</p>
                  <p className="text-sm text-gray-500">Redirecting you to login...</p>
                </div>
              ) : (
                <>
                  {updateError && (
                    <div className="mb-4">
                      <AlertBanner variant="error">{updateError}</AlertBanner>
                    </div>
                  )}
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <FormField
                      label="New password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoComplete="new-password"
                    />
                    <FormField
                      label="Confirm password"
                      name="confirm"
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      autoComplete="new-password"
                    />
                    <Button type="submit" className="w-full" size="lg" loading={updateLoading}>
                      Update Password
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center mt-6">
          <a href="/login" className="text-sm text-orange-600 hover:text-orange-700">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  )
}
