import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { useKioskAuth, useDailyBehavior, useBehaviorActions } from '../hooks/useKiosk'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { daysRemaining } from '../lib/utils'

const PERIODS = [
  { key: 'p1', label: 'Period 1' },
  { key: 'p2', label: 'Period 2' },
  { key: 'p3', label: 'Period 3' },
  { key: 'p4', label: 'Period 4' },
  { key: 'p5', label: 'Period 5' },
  { key: 'p6', label: 'Period 6' },
  { key: 'p7', label: 'Period 7' },
  { key: 'p8', label: 'Period 8' },
]

const SCORES = [
  { value: 5, label: 'Excellent', color: 'bg-green-500', emoji: 'star' },
  { value: 4, label: 'Good', color: 'bg-blue-500', emoji: 'thumbsup' },
  { value: 3, label: 'Satisfactory', color: 'bg-yellow-500', emoji: 'neutral' },
  { value: 2, label: 'Needs Improvement', color: 'bg-orange-500', emoji: 'warning' },
  { value: 1, label: 'Unsatisfactory', color: 'bg-red-500', emoji: 'alert' },
]

// Hardcoded campus ID for demo - in production this would be configured per kiosk device
const DEMO_CAMPUS_ID = null

export default function KioskPage() {
  const { student, loading: authLoading, error: authError, authenticateStudent, logout } = useKioskAuth()
  const [studentIdInput, setStudentIdInput] = useState('')
  const [view, setView] = useState('login') // login | dashboard | behavior
  const [actionLoading, setActionLoading] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const { record, refetch: refetchBehavior } = useDailyBehavior(student?.id, today)
  const { checkIn, checkOut, updatePeriodScore } = useBehaviorActions()

  // Determine check-in state: already checked in today?
  const isCheckedIn = record?.status === 'checked_in'
  const isCheckedOut = record?.status === 'checked_out'
  const hasCheckedInToday = !!record // any record exists for today

  // Fetch active DAEP placement for this student (for days remaining)
  const [placement, setPlacement] = useState(null)
  useEffect(() => {
    if (!student?.id) { setPlacement(null); return }
    const fetchPlacement = async () => {
      const { data } = await supabase
        .from('incidents')
        .select('id, consequence_type, consequence_days, consequence_start, consequence_end, status')
        .eq('student_id', student.id)
        .in('status', ['active', 'approved'])
        .in('consequence_type', ['daep', 'expulsion'])
        .order('consequence_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      setPlacement(data)
    }
    fetchPlacement()
  }, [student?.id])

  const remaining = placement ? daysRemaining(placement.consequence_end) : null

  // When student authenticates, move to dashboard
  useEffect(() => {
    if (student) setView('dashboard')
    else setView('login')
  }, [student])

  const handleLogin = (e) => {
    e.preventDefault()
    if (!studentIdInput.trim()) return
    authenticateStudent(studentIdInput.trim(), DEMO_CAMPUS_ID)
  }

  const handleCheckIn = async () => {
    if (actionLoading || hasCheckedInToday) return
    setActionLoading(true)
    const { error } = await checkIn(student.id, student.campus_id, student.district_id)
    if (error) toast.error('Check-in failed')
    else {
      toast.success(`Welcome, ${student.first_name}! Checked in.`)
      await refetchBehavior()
    }
    setActionLoading(false)
  }

  const handleCheckOut = async () => {
    if (!record?.id || actionLoading) return
    setActionLoading(true)
    const { error } = await checkOut(record.id)
    if (error) toast.error('Check-out failed')
    else {
      toast.success(`Goodbye, ${student.first_name}! Checked out.`)
      await refetchBehavior()
    }
    setActionLoading(false)
  }

  const handleScoreSelect = async (period, score) => {
    if (!record?.id) return
    const { error } = await updatePeriodScore(record.id, period, score, '')
    if (error) toast.error('Failed to save score')
    else {
      refetchBehavior()
    }
  }

  const handleLogout = () => {
    logout()
    setStudentIdInput('')
    setView('login')
  }

  // Calculate daily average
  const scores = record?.period_scores || {}
  const scoreValues = Object.values(scores).map((s) => s.score).filter(Boolean)
  const dailyAvg = scoreValues.length > 0
    ? (scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Waypoint" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-blue-400">Waypoint Student Kiosk</h1>
            <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        {student && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{student.first_name} {student.last_name}</p>
              <p className="text-xs text-gray-400">ID: {student.student_id_number}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-300">
              Sign Out
            </Button>
          </div>
        )}
      </header>

      {/* Login Screen */}
      {view === 'login' && (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md px-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
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
                className="w-full px-6 py-4 bg-gray-800 border-2 border-gray-700 rounded-xl text-2xl text-center font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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

      {/* Dashboard */}
      {view === 'dashboard' && student && (
        <div className="p-6 max-w-4xl mx-auto">
          {/* Welcome + Check-in/out */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Welcome, {student.first_name}!
                </h2>
                <p className="text-gray-400 mt-1">
                  Grade {student.grade_level} | ID: {student.student_id_number}
                </p>
                {student.is_sped && <Badge color="purple" size="sm" className="mt-2">SPED</Badge>}
              </div>
              <div className="text-right">
                {isCheckedOut ? (
                  <div>
                    <Badge color="blue" size="lg">Checked Out</Badge>
                    <p className="text-xs text-gray-400 mt-1">See you tomorrow!</p>
                  </div>
                ) : isCheckedIn ? (
                  <div>
                    <Badge color="green" size="lg" dot>Checked In</Badge>
                    <div className="mt-2">
                      <Button size="sm" variant="secondary" onClick={handleCheckOut} loading={actionLoading}>
                        Check Out
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="lg" onClick={handleCheckIn} loading={actionLoading} disabled={hasCheckedInToday}>
                    Check In
                  </Button>
                )}
              </div>
            </div>

            {/* Days Remaining */}
            {placement && remaining !== null && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">DAEP Days Remaining:</span>
                  <span className={`text-2xl font-bold ${
                    remaining <= 7 ? 'text-red-400' :
                    remaining <= 14 ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {remaining}
                  </span>
                  <span className="text-sm text-gray-400">of {placement.consequence_days} days</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        remaining <= 7 ? 'bg-red-500' :
                        remaining <= 14 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${((placement.consequence_days - remaining) / placement.consequence_days) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Started: {format(new Date(placement.consequence_start), 'MMM d, yyyy')}</span>
                  <span>Ends: {format(new Date(placement.consequence_end), 'MMM d, yyyy')}</span>
                </div>
              </div>
            )}

            {/* Daily Average */}
            {dailyAvg && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">Today's Average:</span>
                  <span className={`text-2xl font-bold ${
                    dailyAvg >= 4 ? 'text-green-400' :
                    dailyAvg >= 3 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {dailyAvg} / 5.0
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dailyAvg >= 4 ? 'bg-green-500' :
                        dailyAvg >= 3 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${(dailyAvg / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Period-by-Period Scoring */}
          {isCheckedIn && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Period Behavior Scores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERIODS.map((period) => {
                  const currentScore = scores[period.key]?.score
                  return (
                    <div key={period.key} className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{period.label}</h4>
                        {currentScore && (
                          <Badge
                            color={currentScore >= 4 ? 'green' : currentScore >= 3 ? 'yellow' : 'red'}
                            size="sm"
                          >
                            {currentScore}/5
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {SCORES.map((scoreOption) => (
                          <button
                            key={scoreOption.value}
                            onClick={() => handleScoreSelect(period.key, scoreOption.value)}
                            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                              currentScore === scoreOption.value
                                ? `${scoreOption.color} text-white ring-2 ring-white ring-offset-2 ring-offset-gray-800`
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={scoreOption.label}
                          >
                            {scoreOption.value}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>Unsatisfactory</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Not checked in yet */}
          {!isCheckedIn && !isCheckedOut && (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">Please check in to start tracking behavior scores.</p>
            </div>
          )}

          {/* Checked out message */}
          {isCheckedOut && (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">You're checked out for today. Great job!</p>
              {dailyAvg && (
                <p className="text-sm mt-2">Today's behavior average: <span className="font-bold text-white">{dailyAvg}/5.0</span></p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
