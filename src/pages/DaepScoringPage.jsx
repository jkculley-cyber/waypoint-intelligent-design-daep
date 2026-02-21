import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from '../hooks/useAccessScope'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { format } from 'date-fns'

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]
const SCORE_OPTIONS = ['E', 'S', 'N', 'U']
const SCORE_LABELS = { E: 'Excellent', S: 'Satisfactory', N: 'Needs Improvement', U: 'Unsatisfactory' }
const SCORE_COLORS = {
  E: 'bg-green-100 text-green-800 border-green-300',
  S: 'bg-blue-100 text-blue-800 border-blue-300',
  N: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  U: 'bg-red-100 text-red-800 border-red-300',
}

export default function DaepScoringPage() {
  const { districtId, campusIds } = useAuth()
  const { scope } = useAccessScope()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [saving, setSaving] = useState({})

  const fetchTodaysRecords = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    let campusFilter = campusIds?.length ? campusIds[0] : null
    if (scope.isDistrictWide) campusFilter = null

    let query = supabase
      .from('daily_behavior_tracking')
      .select(`
        id, student_id, check_in_time, period_scores, daily_notes, status, campus_id,
        students(id, first_name, last_name, student_id_number, grade_level)
      `)
      .eq('tracking_date', today)
      .order('check_in_time', { ascending: true })

    if (campusFilter) {
      query = query.eq('campus_id', campusFilter)
    } else if (!scope.isDistrictWide && campusIds?.length) {
      query = query.in('campus_id', campusIds)
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      toast.error('Failed to load today\'s check-ins')
    }
    setRecords(data || [])
    setLoading(false)
  }, [districtId, today, campusIds, scope])

  useEffect(() => { fetchTodaysRecords() }, [fetchTodaysRecords])

  const updatePeriodScore = async (recordId, period, score, notes) => {
    setSaving(s => ({ ...s, [`${recordId}-${period}`]: true }))
    const record = records.find(r => r.id === recordId)
    const updatedScores = {
      ...(record?.period_scores || {}),
      [period]: { score, notes: notes || '', updated_at: new Date().toISOString() },
    }
    const { error } = await supabase
      .from('daily_behavior_tracking')
      .update({ period_scores: updatedScores })
      .eq('id', recordId)

    if (error) {
      toast.error('Failed to save score')
    } else {
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, period_scores: updatedScores } : r
      ))
    }
    setSaving(s => ({ ...s, [`${recordId}-${period}`]: false }))
  }

  const updateDailyNotes = async (recordId, notes) => {
    const { error } = await supabase
      .from('daily_behavior_tracking')
      .update({ daily_notes: notes })
      .eq('id', recordId)
    if (error) {
      toast.error('Failed to save notes')
    } else {
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, daily_notes: notes } : r
      ))
      toast.success('Notes saved')
    }
  }

  return (
    <div>
      <Topbar
        title="Daily Behavior Scoring"
        subtitle={`${format(new Date(), 'EEEE, MMMM d, yyyy')} — ${records.length} student${records.length !== 1 ? 's' : ''} checked in`}
        actions={
          <Button variant="secondary" size="sm" onClick={fetchTodaysRecords}>
            Refresh
          </Button>
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : records.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-500">No students checked in yet today.</p>
              <p className="text-sm text-gray-400 mt-1">Check-ins appear here after students use the kiosk.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map(record => (
              <StudentScoringCard
                key={record.id}
                record={record}
                expanded={expandedId === record.id}
                onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
                onScoreChange={updatePeriodScore}
                onNotesChange={updateDailyNotes}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StudentScoringCard({ record, expanded, onToggle, onScoreChange, onNotesChange, saving }) {
  const student = record.students
  const scores = record.period_scores || {}
  const completedPeriods = PERIODS.filter(p => scores[p]?.score).length
  const [localNotes, setLocalNotes] = useState(record.daily_notes || '')

  const handlePeriodScore = (period, score) => {
    const currentNotes = scores[period]?.notes || ''
    onScoreChange(record.id, period, score, currentNotes)
  }

  const handlePeriodNotes = (period, notes) => {
    const currentScore = scores[period]?.score || null
    if (currentScore) {
      onScoreChange(record.id, period, currentScore, notes)
    }
  }

  return (
    <Card>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {student?.first_name?.charAt(0)}{student?.last_name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {student?.first_name} {student?.last_name}
            </p>
            <p className="text-xs text-gray-500">
              Grade {student?.grade_level} | ID: {student?.student_id_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Period score summary chips */}
          <div className="hidden md:flex items-center gap-1">
            {PERIODS.map(p => {
              const s = scores[p]?.score
              return (
                <span
                  key={p}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold border ${
                    s ? SCORE_COLORS[s] : 'bg-gray-100 text-gray-400 border-gray-200'
                  }`}
                  title={`Period ${p}: ${s ? SCORE_LABELS[s] : 'Not scored'}`}
                >
                  {s || p}
                </span>
              )
            })}
          </div>
          <span className="text-xs text-gray-500">{completedPeriods}/{PERIODS.length} periods</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {/* Period grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {PERIODS.map(period => {
              const current = scores[period] || {}
              const isSaving = saving[`${record.id}-${period}`]
              return (
                <div key={period} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Period {period}</p>
                  <div className="flex gap-1 flex-wrap">
                    {SCORE_OPTIONS.map(score => (
                      <button
                        key={score}
                        onClick={() => handlePeriodScore(period, score)}
                        disabled={isSaving}
                        className={`w-8 h-8 rounded text-xs font-bold border transition-all ${
                          current.score === score
                            ? SCORE_COLORS[score]
                            : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                        } ${isSaving ? 'opacity-50' : ''}`}
                        title={SCORE_LABELS[score]}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  {current.score && (
                    <input
                      type="text"
                      defaultValue={current.notes || ''}
                      onBlur={e => handlePeriodNotes(period, e.target.value)}
                      placeholder="Notes..."
                      className="mt-2 w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Daily notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Daily Notes</label>
            <div className="flex gap-2">
              <textarea
                value={localNotes}
                onChange={e => setLocalNotes(e.target.value)}
                placeholder="Overall notes for today..."
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onNotesChange(record.id, localNotes)}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Checked in: {record.check_in_time ? format(new Date(record.check_in_time), 'h:mm a') : '—'}
            </span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-500 capitalize">Status: {record.status}</span>
          </div>
        </div>
      )}
    </Card>
  )
}
