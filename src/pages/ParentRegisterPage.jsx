import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Public parent self-registration page.
 * URL: /parent-register?d={district_id}
 *
 * Admin sends parents a link with their district_id embedded.
 * Parent verifies identity via student ID number + last name,
 * then provides their email to receive an invitation link.
 */
export default function ParentRegisterPage() {
  const [searchParams] = useSearchParams()
  const districtId = searchParams.get('d')

  const [step, setStep] = useState(1) // 1=verify, 2=email, 3=done
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Step 1 form
  const [studentIdNumber, setStudentIdNumber] = useState('')
  const [lastName, setLastName] = useState('')

  // Step 2 form
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  async function handleVerify(e) {
    e.preventDefault()
    if (!districtId) {
      setError('This registration link is missing district information. Please contact your school.')
      return
    }
    setVerifying(true)
    setError(null)

    // Pre-check: look up student to give fast feedback without creating an account yet
    try {
      const { data, error: err } = await supabase
        .from('students')
        .select('id, first_name')
        .eq('district_id', districtId)
        .ilike('student_id_number', studentIdNumber.trim())
        .ilike('last_name', lastName.trim())
        .maybeSingle()

      if (err) throw err

      if (!data) {
        setError('No student found matching that ID and last name. Please double-check and try again.')
        return
      }

      setStep(2)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-parent', {
        body: {
          district_id: districtId,
          student_id_number: studentIdNumber.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          full_name: fullName.trim() || email.trim(),
        },
      })

      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      setResult(data)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!districtId) {
    return (
      <PageShell>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid Registration Link</h2>
          <p className="text-sm text-gray-600">This link is missing district information. Please use the link provided by your school district.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            {s > 1 && <div className={`w-8 h-0.5 mr-2 ${step >= s ? 'bg-orange-500' : 'bg-gray-200'}`} />}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              step > s ? 'bg-orange-500 text-white' :
              step === s ? 'bg-orange-500 text-white ring-2 ring-orange-200' :
              'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : s}
            </div>
            <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${step >= s ? 'text-orange-600' : 'text-gray-400'}`}>
              {s === 1 ? 'Verify Student' : s === 2 ? 'Your Info' : 'Done'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Verify student */}
      {step === 1 && (
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Find your child's record</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your child's student ID number and last name to get started.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID Number</label>
            <input
              type="text"
              value={studentIdNumber}
              onChange={e => setStudentIdNumber(e.target.value)}
              required
              placeholder="e.g. 123456"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1">Found on your child's report card or enrollment paperwork.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              placeholder="Last name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
          )}

          <button
            type="submit"
            disabled={verifying || !studentIdNumber || !lastName}
            className="w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      )}

      {/* Step 2: Email + name */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your email address. You'll receive a link to set your password.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep(1); setError(null) }}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !email}
              className="flex-1 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Done */}
      {step === 3 && result && (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {result.existing_account ? 'Account linked!' : 'Check your email'}
          </h2>
          <p className="text-sm text-gray-600">{result.message}</p>
          {result.student_name && (
            <p className="text-xs text-gray-500">Linked to: <span className="font-medium">{result.student_name}</span></p>
          )}
          <Link
            to="/login"
            className="inline-block mt-2 px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
          >
            Go to Login
          </Link>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        Already have an account? <Link to="/login" className="text-orange-600 hover:underline">Log in here</Link>
      </p>
    </PageShell>
  )
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-lg mb-3">
            Waypoint
          </div>
          <h1 className="text-xl font-bold text-gray-900">Parent Portal Registration</h1>
          <p className="text-sm text-gray-500 mt-1">Access your child's discipline and support records</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {children}
        </div>

        <p className="text-xs text-center text-gray-400 mt-4">
          Student records are protected under FERPA.
        </p>
      </div>
    </div>
  )
}
