import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useReentryChecklist, useReentryCheckins, useReentryAdvisory } from '../../hooks/useReentry'
import Card, { CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'

/**
 * ReentryHub — The full re-entry intelligence panel.
 * Shown on TransitionPlanDetailPage for daep_exit and iss_reentry plan types.
 */
export default function ReentryHub({ plan, student }) {
  const { profile } = useAuth()
  const { checklist, loading: clLoading, saving, updateField, markBriefSent, setReturnDate, isReady, readyCount } =
    useReentryChecklist(plan.id)
  const { checkins, loading: ciLoading, adding, addCheckin, daysSinceLastCheckin } =
    useReentryCheckins(plan.id)
  const { advisory } = useReentryAdvisory(student?.id)

  if (clLoading) return null

  return (
    <div className="space-y-6">
      {/* Adaptive Timeline Advisory */}
      {advisory && advisory.type !== 'insufficient' && (
        <AdvisoryBanner advisory={advisory} />
      )}

      {/* Return Ready Checklist */}
      <ReturnReadyCard
        checklist={checklist}
        saving={saving}
        isReady={isReady}
        readyCount={readyCount}
        onUpdate={updateField}
        onSetReturnDate={setReturnDate}
      />

      {/* Return to Campus Brief */}
      <ReturnBriefCard
        plan={plan}
        student={student}
        checklist={checklist}
        profile={profile}
        onBriefSent={markBriefSent}
      />

      {/* Post-Return Check-ins */}
      <CheckinTrackerCard
        checkins={checkins}
        loading={ciLoading}
        adding={adding}
        daysSince={daysSinceLastCheckin}
        student={student}
        planId={plan.id}
        onAdd={addCheckin}
      />
    </div>
  )
}

// ── Adaptive Timeline Advisory ─────────────────────────────────────────────

function AdvisoryBanner({ advisory }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  }
  const icons = {
    green: (
      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    yellow: (
      <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    red: (
      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  }

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-3 ${colors[advisory.color]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[advisory.color]}</div>
      <div>
        <p className="text-sm font-semibold">Behavior Advisory — {advisory.label}</p>
        <p className="text-sm mt-0.5 opacity-90">{advisory.message}</p>
      </div>
    </div>
  )
}

// ── Return Ready Checklist ─────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  {
    party: 'Student',
    color: 'blue',
    items: [
      { field: 'student_goals_met', label: 'Transition goals met' },
      { field: 'student_commitment_signed', label: 'Return commitment signed' },
    ],
  },
  {
    party: 'Parent / Guardian',
    color: 'purple',
    items: [
      { field: 'parent_plan_acknowledged', label: 'Return plan acknowledged' },
      { field: 'parent_contact_confirmed', label: 'Contact info confirmed' },
    ],
  },
  {
    party: 'Counselor',
    color: 'green',
    items: [
      { field: 'counselor_schedule_set', label: 'Check-in schedule set (days 1, 3, 7, 14, 30)' },
      { field: 'counselor_teachers_briefed', label: 'Return brief sent to teachers' },
    ],
  },
  {
    party: 'Admin',
    color: 'orange',
    items: [
      { field: 'admin_schedule_confirmed', label: 'Campus schedule confirmed' },
    ],
  },
]

function ReturnReadyCard({ checklist, saving, isReady, readyCount, onUpdate, onSetReturnDate }) {
  const total = 7

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Return Ready Checklist</CardTitle>
        <div className="flex items-center gap-3">
          {isReady ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Return Ready
            </span>
          ) : (
            <span className="text-xs text-gray-500 font-medium">{readyCount} / {total} complete</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${isReady ? 'bg-green-500' : 'bg-orange-400'}`}
            style={{ width: `${(readyCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Return date */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Return Date</label>
        <input
          type="date"
          defaultValue={checklist?.return_date || ''}
          onBlur={e => { if (e.target.value) onSetReturnDate(e.target.value) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {checklist?.return_date && (
          <span className="text-xs text-gray-500">
            {Math.ceil((new Date(checklist.return_date) - Date.now()) / 86400000)} days away
          </span>
        )}
      </div>

      {/* Party columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHECKLIST_ITEMS.map(({ party, color, items }) => {
          const allDone = items.every(i => checklist?.[i.field])
          return (
            <div key={party} className={`rounded-lg border p-3 ${allDone ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${allDone ? 'bg-green-500' : `bg-${color}-400`}`} />
                <p className={`text-xs font-semibold ${allDone ? 'text-green-700' : 'text-gray-700'}`}>{party}</p>
                {allDone && (
                  <svg className="h-3.5 w-3.5 text-green-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="space-y-2">
                {items.map(({ field, label }) => (
                  <label key={field} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checklist?.[field] || false}
                      onChange={e => onUpdate(field, e.target.checked)}
                      disabled={saving}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className={`text-xs leading-snug ${checklist?.[field] ? 'text-gray-400 line-through' : 'text-gray-600'} group-hover:text-gray-900`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Return to Campus Brief ─────────────────────────────────────────────────

function ReturnBriefCard({ plan, student, checklist, profile, onBriefSent }) {
  const [sending, setSending] = useState(false)
  const [teacherEmails, setTeacherEmails] = useState('')
  const [preview, setPreview] = useState(false)

  const studentName = student ? `${student.first_name} ${student.last_name}` : 'Student'
  const returnDate = checklist?.return_date
    ? new Date(checklist.return_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'TBD'

  async function handleSend() {
    const emails = teacherEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean)
    if (!emails.length) {
      toast.error('Enter at least one teacher email')
      return
    }
    setSending(true)
    let sent = 0
    const errors = []

    for (const email of emails) {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          to: email,
          subject: `Student Returning to Campus — ${studentName} (${checklist?.return_date || 'soon'})`,
          template: 'reentry_brief',
          data: {
            studentName,
            returnDate,
            strengths: plan.goals || '',
            concerns: '',
            goals: plan.goals || '',
            counselorName: profile?.full_name || '',
            counselorEmail: profile?.email || '',
          },
        },
      })
      if (error) errors.push(email)
      else sent++
    }

    if (sent > 0) {
      await onBriefSent(profile?.id)
      toast.success(`Brief sent to ${sent} teacher${sent !== 1 ? 's' : ''}`)
      setTeacherEmails('')
    }
    if (errors.length) toast.error(`Failed to send to: ${errors.join(', ')}`)
    setSending(false)
  }

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <CardTitle>Return to Campus Brief</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-generated from this transition plan. Send to every teacher this student will have.
          </p>
        </div>
        {checklist?.brief_sent_at && (
          <span className="flex-shrink-0 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 font-medium">
            Sent {new Date(checklist.brief_sent_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Preview toggle */}
      <button
        type="button"
        onClick={() => setPreview(p => !p)}
        className="text-xs text-orange-600 hover:underline mb-3"
      >
        {preview ? 'Hide preview' : 'Preview brief content'}
      </button>

      {preview && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-xs text-gray-700">
          <div>
            <p className="font-semibold text-green-800 mb-1">What Helped This Student</p>
            <p>{plan.goals || 'See transition plan for full details.'}</p>
          </div>
          <div>
            <p className="font-semibold text-yellow-800 mb-1">Triggers to Be Aware Of</p>
            <p>No specific triggers noted. Use normal de-escalation protocols.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">If You Notice Something</p>
            <p>Contact {profile?.full_name || 'the campus counselor'} directly. Don't send to the office first.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Teacher Emails</label>
        <textarea
          value={teacherEmails}
          onChange={e => setTeacherEmails(e.target.value)}
          placeholder="teacher1@district.org, teacher2@district.org"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <p className="text-xs text-gray-400">Comma or newline separated. Each teacher receives a confidential copy.</p>
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={sending || !teacherEmails.trim()}
        className="mt-3 w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        {sending ? 'Sending…' : 'Send Return Brief to Teachers'}
      </button>
    </Card>
  )
}

// ── Post-Return Check-in Tracker ───────────────────────────────────────────

const STATUS_CONFIG = {
  positive: { color: 'bg-green-500', label: 'Positive', badge: 'green' },
  neutral: { color: 'bg-yellow-400', label: 'Neutral', badge: 'yellow' },
  concerning: { color: 'bg-red-500', label: 'Concerning', badge: 'red' },
}

function CheckinTrackerCard({ checkins, loading, adding, daysSince, student, planId, onAdd }) {
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('positive')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await onAdd({ status, notes, studentId: student?.id })
    if (!error) {
      toast.success('Check-in logged')
      setShowForm(false)
      setNotes('')
      setStatus('positive')
    } else {
      toast.error('Failed to log check-in')
    }
  }

  const needsCheckin = daysSince === null || daysSince >= 5

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardTitle>Post-Return Check-ins</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">Track counselor touchpoints during the first 30 days back.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(f => !f)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          + Log Check-in
        </button>
      </div>

      {/* Alert: check-in overdue */}
      {needsCheckin && checkins.length > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <p className="text-xs text-red-800 font-medium">
            {daysSince === null
              ? 'No check-ins logged yet — schedule the first one.'
              : `Last check-in was ${daysSince} days ago. Due for a touchpoint.`}
          </p>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">How did it go?</label>
            <div className="flex gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    status === key
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Brief observation or action taken..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={adding} className="flex-1 py-2 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
              {adding ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Check-in history — heat map dots */}
      {checkins.length > 0 ? (
        <div className="space-y-2">
          {/* 30-day dot grid */}
          <CheckinHeatMap checkins={checkins} />
          {/* List */}
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {checkins.map(ci => (
              <div key={ci.id} className="flex items-start gap-2.5 py-1.5 border-b border-gray-100 last:border-0">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_CONFIG[ci.status]?.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      {new Date(ci.checkin_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <Badge color={STATUS_CONFIG[ci.status]?.badge} size="xs">{STATUS_CONFIG[ci.status]?.label}</Badge>
                  </div>
                  {ci.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{ci.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">No check-ins logged yet.</p>
      )}
    </Card>
  )
}

function CheckinHeatMap({ checkins }) {
  // Show last 30 days as a dot grid
  const today = new Date()
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  const byDate = {}
  for (const ci of checkins) {
    byDate[ci.checkin_date] = ci.status
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Last 30 days</p>
      <div className="flex gap-1 flex-wrap">
        {days.map(day => {
          const status = byDate[day]
          const color = status
            ? STATUS_CONFIG[status]?.color
            : 'bg-gray-100'
          return (
            <div
              key={day}
              title={`${day}${status ? ` — ${STATUS_CONFIG[status]?.label}` : ''}`}
              className={`w-4 h-4 rounded-sm ${color}`}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${v.color}`} />
            <span className="text-xs text-gray-400">{v.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-100" />
          <span className="text-xs text-gray-400">No entry</span>
        </div>
      </div>
    </div>
  )
}
