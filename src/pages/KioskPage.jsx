import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { useKioskAuth, useDailyBehavior, useBehaviorActions } from '../hooks/useKiosk'
import Button from '../components/ui/Button'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { getInstructionalDaysRemaining, getInstructionalDaysElapsed, getInstructionalDaysTotal } from '../lib/instructionalCalendar'

// Hardcoded campus ID for demo - in production this would be configured per kiosk device
const DEMO_CAMPUS_ID = null

// Auto-return delay (seconds) after check-in confirmation
const AUTO_RETURN_SECONDS = 8
// Idle timeout on login screen (seconds) - FERPA: clear any partial input
const LOGIN_IDLE_SECONDS = 60

export default function KioskPage() {
  const { student, loading: authLoading, error: authError, authenticateStudent, logout } = useKioskAuth()
  const [studentIdInput, setStudentIdInput] = useState('')
  const [view, setView] = useState('login') // login | confirm_identity | confirmation
  const loginIdleRef = useRef(null)
  const [phoneBagNumber, setPhoneBagNumber] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [countdown, setCountdown] = useState(AUTO_RETURN_SECONDS)

  // Snapshot of student/placement info shown on the confirmation screen
  const [confirmationData, setConfirmationData] = useState(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const { record, loading: recordLoading, refetch: refetchBehavior } = useDailyBehavior(student?.id, today)
  const { checkIn } = useBehaviorActions()

  const hasCheckedInToday = !!record // any record exists for today

  // Fetch active DAEP placement for this student (for days remaining)
  const [placement, setPlacement] = useState(null)
  const [placementLoaded, setPlacementLoaded] = useState(false)
  useEffect(() => {
    if (!student?.id) { setPlacement(null); setPlacementLoaded(false); return }
    setPlacementLoaded(false)
    const fetchPlacement = async () => {
      const { data } = await supabase
        .from('incidents')
        .select('id, consequence_type, consequence_days, consequence_start, consequence_end, status')
        .eq('student_id', student.id)
        .in('status', ['active', 'approved', 'compliance_hold'])
        .in('consequence_type', ['daep', 'expulsion'])
        .order('consequence_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      setPlacement(data)
      setPlacementLoaded(true)
    }
    fetchPlacement()
  }, [student?.id])

  const remaining = placement
    ? getInstructionalDaysRemaining(placement.consequence_end, student?.district_id)
    : null
  const elapsed = placement
    ? getInstructionalDaysElapsed(placement.consequence_start, student?.district_id)
    : null
  const totalInstructional = placement
    ? getInstructionalDaysTotal(placement.consequence_start, placement.consequence_end, student?.district_id)
    : null

  // Once student authenticates and data loads, show identity confirmation step
  useEffect(() => {
    if (!student || !placementLoaded || recordLoading) return
    if (view !== 'login') return // only trigger from login flow
    setView('confirm_identity')
  }, [student, placementLoaded, recordLoading])

  // Login screen idle timeout - clear partial input after 60s of inactivity
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

  const handleConfirmIdentity = () => {
    if (hasCheckedInToday) {
      setConfirmationData({
        firstName: student.first_name,
        lastName: student.last_name,
        gradeLevel: student.grade_level,
        studentIdNumber: student.student_id_number,
        phoneBagNumber: record?.phone_bag_number || null,
        remaining,
        totalInstructional,
        elapsed,
        placement,
        alreadyCheckedIn: true,
      })
      setView('confirmation')
    } else {
      performCheckIn()
    }
  }

  // Auto-return countdown on confirmation screen
  useEffect(() => {
    if (view !== 'confirmation') return
    setCountdown(AUTO_RETURN_SECONDS)
    const interval = setInterval(() => {
      setCountdown((prev) => {
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
    setPhoneBagNumber('')
    setPlacement(null)
    setPlacementLoaded(false)
    setConfirmationData(null)
    setView('login')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!studentIdInput.trim()) return
    authenticateStudent(studentIdInput.trim(), DEMO_CAMPUS_ID)
  }

  const performCheckIn = async () => {
    if (actionLoading) return
    setActionLoading(true)
    const { error } = await checkIn(student.id, student.campus_id, student.district_id, {
      phoneBagNumber: phoneBagNumber.trim() || null,
    })
    if (error) {
      toast.error('Check-in failed')
      setActionLoading(false)
      return
    }
    await refetchBehavior()
    // Snapshot data for confirmation screen
    setConfirmationData({
      firstName: student.first_name,
      lastName: student.last_name,
      gradeLevel: student.grade_level,
      studentIdNumber: student.student_id_number,
      phoneBagNumber: phoneBagNumber.trim() || null,
      remaining,
      totalInstructional,
      elapsed,
      placement,
      alreadyCheckedIn: false,
    })
    setActionLoading(false)
    setView('confirmation')
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
            <h1 className="text-xl font-bold text-orange-400">Waypoint Student Kiosk</h1>
            <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </button>
      </header>

      {/* Login Screen */}
      {view === 'login' && !authLoading && !actionLoading && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Student Check-In</h2>
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
                Check In
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Loading state while authenticating / checking in */}
      {view === 'login' && (authLoading || actionLoading) && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">{authLoading ? 'Looking up student...' : 'Checking in...'}</p>
          </div>
        </div>
      )}

      {/* Identity Confirmation Screen - student must verify before check-in */}
      {view === 'confirm_identity' && student && (
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

            {/* Phone Bag / Locker Number */}
            {!hasCheckedInToday && (
              <div className="mt-6 text-left">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Phone Bag / Locker # <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={phoneBagNumber}
                  onChange={(e) => setPhoneBagNumber(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-xl text-center font-mono text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  maxLength={20}
                />
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={resetToLogin}
              >
                No, Go Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmIdentity}
                loading={actionLoading}
              >
                {hasCheckedInToday ? 'View Status' : 'Check In'}
              </Button>
            </div>

            <p className="text-xs text-gray-600 mt-6">
              This screen contains student information protected under FERPA.
            </p>
          </div>
        </div>
      )}

      {/* Check-In Confirmation Screen */}
      {view === 'confirmation' && confirmationData && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-lg px-6 text-center">
            {/* Icon */}
            <div className={`w-24 h-24 ${confirmationData.alreadyCheckedIn ? 'bg-orange-500' : 'bg-green-600'} rounded-full mx-auto mb-6 flex items-center justify-center`}>
              <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h2 className={`text-3xl font-bold ${confirmationData.alreadyCheckedIn ? 'text-orange-400' : 'text-green-400'} mb-2`}>
              {confirmationData.alreadyCheckedIn ? 'Already Checked In Today' : 'Checked In!'}
            </h2>
            <p className="text-xl text-gray-300">
              {confirmationData.alreadyCheckedIn ? '' : 'Welcome, '}{confirmationData.firstName} {confirmationData.lastName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Grade {confirmationData.gradeLevel} | ID: {confirmationData.studentIdNumber}
            </p>
            {confirmationData.phoneBagNumber && (
              <div className="mt-4 bg-gray-800 rounded-xl px-6 py-4 inline-block">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone Bag / Locker</p>
                <p className="text-3xl font-bold text-orange-400 font-mono">{confirmationData.phoneBagNumber}</p>
              </div>
            )}

            {confirmationData.alreadyCheckedIn && (
              <p className="text-sm text-yellow-400 mt-3">
                You have already checked in today. Only one check-in per day is recorded.
              </p>
            )}

            {/* DAEP Placement Tracker */}
            {confirmationData.placement && confirmationData.remaining !== null && (
              <DaepTracker
                remaining={confirmationData.remaining}
                elapsed={confirmationData.elapsed || 0}
                total={confirmationData.totalInstructional || confirmationData.placement.consequence_days}
                startDate={confirmationData.placement.consequence_start}
                endDate={confirmationData.placement.consequence_end}
                daysAssigned={confirmationData.placement.consequence_days}
              />
            )}

            {/* Auto-return notice */}
            <p className="text-sm text-gray-500 mt-8">
              Returning to check-in screen in <span className="font-bold text-white">{countdown}</span> seconds...
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={resetToLogin}
            >
              Return Now
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Domino's-style DAEP placement tracker.
 * Shows milestones along a progress rail with the student's current position.
 */
function DaepTracker({ remaining, elapsed, total, startDate, endDate, daysAssigned }) {
  const progress = total > 0 ? Math.min((elapsed / total) * 100, 100) : 0

  // Build milestone stages
  const milestones = [
    { pct: 0,   label: 'Day 1',    icon: 'flag' },
    { pct: 25,  label: '25%',      icon: 'check' },
    { pct: 50,  label: 'Halfway',  icon: 'check' },
    { pct: 75,  label: '75%',      icon: 'check' },
    { pct: 100, label: 'Complete', icon: 'star' },
  ]

  // Color based on progress
  const progressColor = progress >= 75
    ? { bar: 'bg-green-500', glow: 'shadow-green-500/50', text: 'text-green-400', ring: 'ring-green-500' }
    : progress >= 50
    ? { bar: 'bg-orange-500', glow: 'shadow-orange-500/50', text: 'text-orange-400', ring: 'ring-orange-500' }
    : progress >= 25
    ? { bar: 'bg-yellow-500', glow: 'shadow-yellow-500/50', text: 'text-yellow-400', ring: 'ring-yellow-500' }
    : { bar: 'bg-orange-500', glow: 'shadow-orange-500/50', text: 'text-orange-400', ring: 'ring-orange-500' }

  return (
    <div className="mt-8 bg-gray-800 rounded-xl p-6 text-left">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-gray-300 uppercase tracking-wide">DAEP Placement Tracker</p>
        <span className={`text-3xl font-bold ${progressColor.text}`}>
          {remaining} <span className="text-base font-normal text-gray-400">days left</span>
        </span>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mb-6">
        <span>Started {format(new Date(startDate), 'MMM d, yyyy')}</span>
        <span>Ends {format(new Date(endDate), 'MMM d, yyyy')}</span>
        <span>{daysAssigned} calendar days assigned</span>
        <span>{total} instructional days</span>
      </div>

      {/* ---- Tracker Rail ---- */}
      <div className="relative mt-2 mb-2">
        {/* Background rail */}
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          {/* Filled portion with animated pulse glow */}
          <div
            className={`h-full rounded-full ${progressColor.bar} transition-all duration-1000 ease-out shadow-lg ${progressColor.glow}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current position indicator (pulsing dot) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-1000 ease-out"
          style={{ left: `${progress}%` }}
        >
          <div className={`w-6 h-6 rounded-full ${progressColor.bar} border-3 border-gray-800 shadow-lg ${progressColor.glow} flex items-center justify-center`}>
            <div className={`w-2 h-2 bg-white rounded-full animate-pulse`} />
          </div>
        </div>

        {/* Milestone markers */}
        {milestones.map((m) => {
          const reached = progress >= m.pct
          return (
            <div
              key={m.pct}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${m.pct}%` }}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] transition-all ${
                  reached
                    ? `${progressColor.bar} border-gray-800 text-white`
                    : 'bg-gray-700 border-gray-600 text-gray-500'
                }`}
              >
                {m.icon === 'flag' && reached ? (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a1 1 0 011-1h3.586a1 1 0 01.707.293l1.414 1.414a1 1 0 00.707.293H15a1 1 0 011 1v5a1 1 0 01-1 1H9.414a1 1 0 01-.707-.293L7.293 9.293A1 1 0 006.586 9H4V3z" /><path d="M4 11v6a1 1 0 102 0v-6H4z" /></svg>
                ) : m.icon === 'star' && reached ? (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ) : reached ? (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Milestone labels */}
      <div className="relative h-8 mt-3">
        {milestones.map((m) => {
          const reached = progress >= m.pct
          return (
            <span
              key={m.pct}
              className={`absolute -translate-x-1/2 text-[10px] font-medium ${
                reached ? 'text-gray-300' : 'text-gray-600'
              }`}
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </span>
          )
        })}
      </div>

      {/* Elapsed / Remaining summary */}
      <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${progressColor.bar}`} />
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-gray-200">{elapsed}</span> days completed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-gray-200">{remaining}</span> days remaining
          </span>
        </div>
      </div>
    </div>
  )
}
