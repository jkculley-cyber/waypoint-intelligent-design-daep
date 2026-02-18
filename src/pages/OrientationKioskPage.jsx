import { useState, useEffect, useRef } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useKioskAuth } from '../hooks/useKiosk'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'
import { format } from 'date-fns'

const AUTO_RETURN_SECONDS = 10
const LOGIN_IDLE_SECONDS = 60

const EMPTY_GOAL = { behavior: '', supports: '', interventions: '' }

export default function OrientationKioskPage() {
  const { student, loading: authLoading, error: authError, authenticateStudent, logout } = useKioskAuth()
  const [studentIdInput, setStudentIdInput] = useState('')
  const [view, setView] = useState('login') // login | confirm | reflection_form | no_orientation | already_completed | success
  const [orientation, setOrientation] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const isSubmittingRef = useRef(false) // sync guard against rapid double-tap
  const [countdown, setCountdown] = useState(AUTO_RETURN_SECONDS)
  const loginIdleRef = useRef(null)

  // Reflection form state
  const [reflection, setReflection] = useState('')
  const [behaviorPlan, setBehaviorPlan] = useState([
    { ...EMPTY_GOAL }, { ...EMPTY_GOAL }, { ...EMPTY_GOAL },
  ])

  const today = format(new Date(), 'yyyy-MM-dd')

  // When student authenticates, look up their orientation
  useEffect(() => {
    if (!student) return
    if (view !== 'login') return

    const fetchOrientation = async () => {
      const { data } = await supabase
        .from('daep_placement_scheduling')
        .select('id, orientation_scheduled_date, orientation_scheduled_time, orientation_status, orientation_completed_date, orientation_form_data, student_id')
        .eq('student_id', student.id)
        .in('orientation_status', ['scheduled', 'completed', 'pending'])
        .order('orientation_scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!data) {
        setView('no_orientation')
        return
      }

      if (data.orientation_status === 'completed') {
        setOrientation(data)
        setView('already_completed')
        return
      }

      setOrientation(data)
      setView('confirm')
    }

    fetchOrientation()
  }, [student, view])

  // Login idle timeout
  useEffect(() => {
    if (view !== 'login') {
      if (loginIdleRef.current) clearTimeout(loginIdleRef.current)
      return
    }
    const resetIdle = () => {
      if (loginIdleRef.current) clearTimeout(loginIdleRef.current)
      loginIdleRef.current = setTimeout(() => {
        setStudentIdInput('')
      }, LOGIN_IDLE_SECONDS * 1000)
    }
    resetIdle()
    const events = ['keydown', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle))
      if (loginIdleRef.current) clearTimeout(loginIdleRef.current)
    }
  }, [view])

  // Auto-return countdown on terminal screens
  useEffect(() => {
    if (!['success', 'no_orientation', 'already_completed'].includes(view)) return
    setCountdown(AUTO_RETURN_SECONDS)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          resetToLogin()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [view])

  const resetToLogin = () => {
    logout()
    setStudentIdInput('')
    setOrientation(null)
    setReflection('')
    setBehaviorPlan([{ ...EMPTY_GOAL }, { ...EMPTY_GOAL }, { ...EMPTY_GOAL }])
    setView('login')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!studentIdInput.trim()) return
    authenticateStudent(studentIdInput.trim(), null)
  }

  // After confirming identity, move to reflection form
  const handleConfirm = () => {
    setView('reflection_form')
  }

  const setGoal = (idx, field, val) => {
    setBehaviorPlan(prev => {
      const plan = [...prev]
      plan[idx] = { ...plan[idx], [field]: val }
      return plan
    })
  }

  // Save form + complete orientation in one step
  const handleSubmitAndComplete = async (skipForm = false) => {
    if (!orientation || actionLoading || isSubmittingRef.current) return

    // Require at least one behavior goal (unless skipping the form)
    if (!skipForm) {
      const hasGoal = behaviorPlan.some(g => g.behavior?.trim())
      if (!hasGoal) {
        toast.error('Please enter at least one behavior goal before completing orientation.')
        return
      }
    }

    isSubmittingRef.current = true
    setActionLoading(true)

    const formData = skipForm ? null : {
      reflection,
      behavior_plan: behaviorPlan,
      completed_at: today,
    }

    const updates = {
      orientation_status: 'completed',
      orientation_completed_date: today,
    }
    if (formData) {
      updates.orientation_form_data = formData
    }

    const { error } = await supabase
      .from('daep_placement_scheduling')
      .update(updates)
      .eq('id', orientation.id)

    if (error) {
      toast.error('Failed to complete orientation. Please try again.')
      isSubmittingRef.current = false
      setActionLoading(false)
      return
    }

    isSubmittingRef.current = false
    setActionLoading(false)
    setView('success')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={resetToLogin}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.png" alt="Waypoint" className="h-10 w-10 object-contain" />
          <div className="text-left">
            <h1 className="text-xl font-bold text-orange-400">Waypoint Orientation Kiosk</h1>
            <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </button>
      </header>

      {/* Login Screen */}
      {view === 'login' && !authLoading && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Orientation Check-In</h2>
              <p className="text-gray-400 mt-1">Enter your Student ID to begin</p>
            </div>

            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                placeholder="Student ID Number"
                className="w-full px-6 py-4 bg-gray-800 border-2 border-gray-700 rounded-xl text-2xl text-center font-mono text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                autoFocus
              />
              {authError && (
                <p className="text-red-400 text-sm text-center mt-3">{authError}</p>
              )}
              <Button
                type="submit"
                className="w-full mt-4"
                size="xl"
                loading={authLoading}
              >
                Look Up Orientation
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {view === 'login' && authLoading && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Looking up student...</p>
          </div>
        </div>
      )}

      {/* Confirm Identity Screen */}
      {view === 'confirm' && student && orientation && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6 text-center">
            <div className="w-20 h-20 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Is this you?</h2>
            <p className="text-xl text-gray-300">{student.first_name} {student.last_name}</p>
            <p className="text-sm text-gray-500 mt-1">Grade {student.grade_level} | ID: {student.student_id_number}</p>

            <div className="mt-6 bg-gray-800 rounded-xl p-6 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Scheduled Date</span>
                <span className="font-medium">
                  {orientation.orientation_scheduled_date
                    ? new Date(orientation.orientation_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                      })
                    : 'TBD'}
                </span>
              </div>
              {orientation.orientation_scheduled_time && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Time</span>
                  <span className="font-medium">{formatTime(orientation.orientation_scheduled_time)}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-orange-400 mt-4">
              Next: Complete your Reflection &amp; Behavior Plan →
            </p>

            <div className="flex gap-4 mt-6">
              <Button variant="secondary" className="flex-1" onClick={resetToLogin}>
                Not Me
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Continue
              </Button>
            </div>

            <p className="text-xs text-gray-600 mt-6">
              This screen contains student information protected under FERPA.
            </p>
          </div>
        </div>
      )}

      {/* Reflection & Behavior Plan Form */}
      {view === 'reflection_form' && student && (
        <div className="min-h-[80vh] px-6 py-8 max-w-3xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">✓</div>
              <span className="text-sm text-gray-400">Check-In</span>
            </div>
            <div className="flex-1 h-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold">2</div>
              <span className="text-sm text-white font-medium">Reflection &amp; Plan</span>
            </div>
            <div className="flex-1 h-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400">3</div>
              <span className="text-sm text-gray-500">Complete</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Student Reflection &amp; Behavior Plan</h2>
            <p className="text-gray-400 mt-1">{student.first_name} {student.last_name}</p>
          </div>

          {/* Section 1: Reflection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-orange-400 mb-2">Reflect on Your Incident</h3>
            <p className="text-sm text-gray-400 mb-3">
              In your own words, describe what happened and what you could have done differently.
            </p>
            <textarea
              rows={5}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Write your reflection here..."
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-base resize-none"
            />
          </div>

          {/* Section 2: Behavior Plan Goals */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-orange-400 mb-2">My Behavior Plan</h3>
            <p className="text-sm text-gray-400 mb-5">
              List 3 behaviors you will work on while at DAEP, along with the supports and interventions you need.
            </p>
            <div className="space-y-5">
              {behaviorPlan.map((goal, idx) => (
                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-semibold text-orange-300">Goal {idx + 1}</h4>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Behavior to Improve</label>
                    <input
                      type="text"
                      value={goal.behavior}
                      onChange={(e) => setGoal(idx, 'behavior', e.target.value)}
                      placeholder="e.g. Following classroom instructions"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Supports Needed</label>
                    <input
                      type="text"
                      value={goal.supports}
                      onChange={(e) => setGoal(idx, 'supports', e.target.value)}
                      placeholder="e.g. Check-ins with counselor"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Interventions Needed</label>
                    <input
                      type="text"
                      value={goal.interventions}
                      onChange={(e) => setGoal(idx, 'interventions', e.target.value)}
                      placeholder="e.g. Social-emotional learning group"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 text-base"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => handleSubmitAndComplete(true)}
              disabled={actionLoading}
              className="px-5 py-3 text-sm font-medium text-gray-400 hover:text-white border border-gray-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Skip Form
            </button>
            <Button
              className="flex-1"
              size="lg"
              onClick={() => handleSubmitAndComplete(false)}
              loading={actionLoading}
            >
              Submit &amp; Complete Orientation
            </Button>
          </div>

          <p className="text-xs text-gray-600 text-center mt-6">
            This information is protected under FERPA and will be shared with your home campus and DAEP staff.
          </p>
        </div>
      )}

      {/* No Orientation Scheduled */}
      {view === 'no_orientation' && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6 text-center">
            <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-14 h-14 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-400 mb-2">No Orientation Scheduled</h2>
            <p className="text-gray-500">There is no orientation scheduled for this student.</p>
            <p className="text-gray-600 text-sm mt-1">Please see a staff member for assistance.</p>

            <p className="text-sm text-gray-500 mt-8">
              Returning in <span className="font-bold text-white">{countdown}</span> seconds...
            </p>
            <Button variant="secondary" className="mt-3" onClick={resetToLogin}>
              Return Now
            </Button>
          </div>
        </div>
      )}

      {/* Already Completed */}
      {view === 'already_completed' && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6 text-center">
            <div className="w-24 h-24 bg-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-orange-400 mb-2">Orientation Already Completed</h2>
            <p className="text-gray-300">
              {student?.first_name} {student?.last_name}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Completed on {orientation?.orientation_completed_date
                ? new Date(orientation.orientation_completed_date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })
                : 'a previous date'}
            </p>

            <p className="text-sm text-gray-500 mt-8">
              Returning in <span className="font-bold text-white">{countdown}</span> seconds...
            </p>
            <Button variant="secondary" className="mt-3" onClick={resetToLogin}>
              Return Now
            </Button>
          </div>
        </div>
      )}

      {/* Success Confirmation */}
      {view === 'success' && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6 text-center">
            <div className="w-24 h-24 bg-green-600 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-green-400 mb-2">Orientation Complete!</h2>
            <p className="text-xl text-gray-300">
              {student?.first_name} {student?.last_name}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Grade {student?.grade_level} | ID: {student?.student_id_number}
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Your reflection and behavior plan have been saved.
            </p>

            <p className="text-sm text-gray-500 mt-8">
              Returning in <span className="font-bold text-white">{countdown}</span> seconds...
            </p>
            <Button variant="secondary" className="mt-3" onClick={resetToLogin}>
              Return Now
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-2 text-center">
        <p className="text-[10px] text-gray-600">
          &copy; {new Date().getFullYear()} Clear Path Education Group, LLC. All rights reserved.
        </p>
      </div>
    </div>
  )
}

function formatTime(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}
