import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useEscalationRisk } from '../../hooks/useNavigator'

const SUPPORT_LABELS = {
  cico: 'CICO',
  behavior_contract: 'Behavior Contract',
  counseling_referral: 'Counseling',
  parent_contact: 'Parent Contact',
  mentoring: 'Mentoring',
  other: 'Other',
}

const LEVEL_STYLES = {
  high:   { badge: 'bg-red-100 text-red-700 border border-red-200',   bar: 'bg-red-500',   label: 'High' },
  medium: { badge: 'bg-amber-100 text-amber-700 border border-amber-200', bar: 'bg-amber-400', label: 'Medium' },
  low:    { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', bar: 'bg-emerald-400', label: 'Low' },
}

const BULK_SUPPORT_TYPES = [
  { value: 'cico', label: 'CICO (Check-In Check-Out)' },
  { value: 'behavior_contract', label: 'Behavior Contract' },
  { value: 'counseling_referral', label: 'Counseling Referral' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'parent_contact', label: 'Parent Contact' },
]

// When a support type was tried and discontinued, suggest the next-tier
// intervention rather than re-running what failed. Pattern is one-step
// escalation along the standard MTSS continuum (low-touch → high-touch).
const SUGGESTED_ALTERNATIVE = {
  cico: 'behavior_contract',
  behavior_contract: 'counseling_referral',
  counseling_referral: 'mentoring',
  mentoring: 'counseling_referral',
  parent_contact: 'behavior_contract',
}

export default function NavigatorEscalationPage() {
  const { districtId, profile, isDemoReadonly } = useAuth()
  const { students, loading, error, refetch } = useEscalationRisk()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkType, setBulkType] = useState('cico')
  const [bulkNotes, setBulkNotes] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAll = () => {
    if (selected.size === visible.length) setSelected(new Set())
    else setSelected(new Set(visible.map(s => s.student_id)))
  }

  // ─── Existing supports lookup for selected students ─────────────────────
  // When the bulk modal opens we fetch all supports (active + recently completed/discontinued)
  // for the selected cohort so the AP can see what's already in place before assigning.
  const [existingSupports, setExistingSupports] = useState({})  // studentId -> [supports]
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  // Default ON: a discontinued same-type support in the last 90 days means the
  // intervention failed; re-running it without justification is the round-1
  // "ranks but doesn't route" complaint Marsha flagged. Override requires an
  // affirmative click + reason so the audit trail captures the AP's rationale.
  const [skipPriorFailures, setSkipPriorFailures] = useState(true)
  const [overrideReason, setOverrideReason] = useState('')

  useEffect(() => {
    if (!showBulkModal || selected.size === 0) return
    let cancelled = false
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
    supabase
      .from('navigator_supports')
      .select('id, student_id, support_type, status, start_date, end_date')
      .in('student_id', [...selected])
      .or(`status.eq.active,start_date.gte.${ninetyDaysAgo}`)
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        const map = {}
        ;(data || []).forEach(s => {
          if (!map[s.student_id]) map[s.student_id] = []
          map[s.student_id].push(s)
        })
        setExistingSupports(map)
      })
    return () => { cancelled = true }
  }, [showBulkModal, selected])

  // For the chosen bulk type, find which selected students already have it active
  // so we can either skip or warn before duplicate-assigning.
  const duplicates = [...selected].filter(sid => {
    const list = existingSupports[sid] || []
    return list.some(s => s.support_type === bulkType && s.status === 'active')
  })
  const failedRecent = [...selected].filter(sid => {
    const list = existingSupports[sid] || []
    return list.some(s => s.support_type === bulkType && s.status === 'discontinued')
  })

  const handleBulkCreate = async () => {
    if (selected.size === 0) return
    // Prior-failure override requires a documented reason — captured into
    // notes so the audit trail surfaces the AP's rationale.
    if (!skipPriorFailures && failedRecent.length > 0 && !overrideReason.trim()) {
      toast.error('Override requires a reason — explain why re-running a failed support is appropriate.')
      return
    }
    setBulkSaving(true)
    let targetIds = [...selected]
    if (skipDuplicates) targetIds = targetIds.filter(id => !duplicates.includes(id))
    if (skipPriorFailures) targetIds = targetIds.filter(id => !failedRecent.includes(id))

    if (targetIds.length === 0) {
      toast.error('All selected students already have an active or recently-failed support of this type.')
      setBulkSaving(false)
      return
    }

    const noteText = !skipPriorFailures && failedRecent.length > 0 && overrideReason.trim()
      ? `${bulkNotes ? bulkNotes + '\n\n' : ''}OVERRIDE PRIOR-FAILURE: ${overrideReason.trim()}`
      : (bulkNotes || null)

    const rows = targetIds.map(studentId => {
      const s = students.find(x => x.student_id === studentId)
      return {
        district_id: districtId,
        campus_id: s?.campus?.id,
        student_id: studentId,
        assigned_by: profile.id,
        support_type: bulkType,
        start_date: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: noteText,
      }
    })
    const { error: err } = await supabase.from('navigator_supports').insert(rows)
    setBulkSaving(false)
    if (err) { toast.error(err.message); return }
    const skipped = selected.size - rows.length
    const skipParts = []
    if (skipDuplicates && duplicates.length) skipParts.push(`${duplicates.filter(id => selected.has(id)).length} duplicate${duplicates.length === 1 ? '' : 's'}`)
    if (skipPriorFailures && failedRecent.length) skipParts.push(`${failedRecent.filter(id => selected.has(id)).length} prior-failure${failedRecent.length === 1 ? '' : 's'}`)
    toast.success(
      `${rows.length} support${rows.length > 1 ? 's' : ''} created${skipped > 0 ? ` · skipped ${skipParts.join(' + ')}` : ''}`
    )
    setSelected(new Set())
    setShowBulkModal(false)
    setBulkNotes('')
    setOverrideReason('')
    setExistingSupports({})
    refetch()
  }

  const high   = students.filter(s => s.risk_level === 'high')
  const medium = students.filter(s => s.risk_level === 'medium')
  const low    = students.filter(s => s.risk_level === 'low')

  const visible = filter === 'all' ? students
    : filter === 'high'   ? high
    : filter === 'medium' ? medium
    : low

  return (
    <div>
      <Topbar
        title="Escalation Engine"
        subtitle="Predictive risk scoring — rolling 90-day window"
        actions={
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Scores
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <RiskCard level="high"   count={high.length}   label="High Risk (≥70)" onClick={() => setFilter('high')}   active={filter === 'high'} />
          <RiskCard level="medium" count={medium.length} label="Medium Risk (35–69)" onClick={() => setFilter('medium')} active={filter === 'medium'} />
          <RiskCard level="low"    count={low.length}    label="Low Risk (<35)" onClick={() => setFilter('low')}    active={filter === 'low'} />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {['all','high','medium','low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? `All (${students.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${
                f === 'high' ? high.length : f === 'medium' ? medium.length : low.length
              })`}
            </button>
          ))}
        </div>

        {/* Risk Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Computing risk scores...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 font-medium">No students at this risk level</p>
              <p className="text-gray-400 text-sm mt-1">Risk is computed from referrals, ISS/OSS placements, and active supports in the last 90 days.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={!isDemoReadonly && selected.size > 0 && selected.size === visible.length} onChange={isDemoReadonly ? undefined : toggleAll} disabled={isDemoReadonly} className="rounded border-gray-300" title={isDemoReadonly ? 'Available in your pilot account' : ''} />
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-40">Risk Score</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Level</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Triggers</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Supports</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visible.map(s => {
                    const st = LEVEL_STYLES[s.risk_level]
                    return (
                      <tr key={s.student_id} className={`hover:bg-gray-50 transition-colors ${selected.has(s.student_id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={!isDemoReadonly && selected.has(s.student_id)} onChange={isDemoReadonly ? undefined : () => toggleSelect(s.student_id)} disabled={isDemoReadonly} className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {s.student ? `${s.student.first_name} ${s.student.last_name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.student?.grade_level ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {s.campus?.name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${st.bar}`}
                                style={{ width: `${s.risk_score}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-6 text-right">{s.risk_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${st.badge}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {s.triggers.map(t => (
                              <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {s.activeSupports > 0
                            ? <span className="text-emerald-600 font-medium">{s.activeSupports} active</span>
                            : <span className="text-gray-400">None</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/navigator/students/${s.student_id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Algorithm note */}
        <p className="text-xs text-gray-400">
          Risk score factors: referral recency (+30/+15), frequency (+15/+10), OSS (+25/+10), ISS (+10), prior escalation history (+20), active supports (−12 each). Scores clamped 0–100.
        </p>
      </div>

      {/* Floating action bar when students selected */}
      {!isDemoReadonly && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selected.size} student{selected.size !== 1 ? 's' : ''} selected</span>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Create Support for All
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk support modal */}
      {!isDemoReadonly && showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">Create Support for {selected.size} Student{selected.size !== 1 ? 's' : ''}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Support Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={bulkType}
                  onChange={e => setBulkType(e.target.value)}
                >
                  {BULK_SUPPORT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Per-student existing-supports awareness */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">Pre-flight check — what's already on these students</p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {[...selected].map(sid => {
                    const s = students.find(x => x.student_id === sid)
                    const hist = existingSupports[sid] || []
                    const active = hist.filter(h => h.status === 'active')
                    const failed = hist.filter(h => h.status === 'discontinued')
                    const completed = hist.filter(h => h.status === 'completed')
                    const isDup = duplicates.includes(sid)
                    const wasFailed = failedRecent.includes(sid)
                    return (
                      <div key={sid} className={`px-3 py-2 text-xs ${isDup ? 'bg-amber-50' : wasFailed ? 'bg-red-50' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-800">
                            {s?.student ? `${s.student.first_name} ${s.student.last_name}` : sid.slice(0, 8)}
                            <span className="ml-1.5 text-gray-400">Gr {s?.student?.grade_level || '—'}</span>
                            {s?.risk_score != null && (
                              <span className="ml-1.5 text-gray-400">· risk {s.risk_score}</span>
                            )}
                          </span>
                          {isDup && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">DUPLICATE</span>}
                          {wasFailed && !isDup && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-800">PRIOR FAILURE</span>}
                        </div>
                        {Array.isArray(s?.triggers) && s.triggers.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1" title="Why this student is on the escalation list">
                            {s.triggers.map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {active.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {active.map(h => (
                              <span key={h.id} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">
                                Active: {SUPPORT_LABELS[h.support_type] || h.support_type}
                              </span>
                            ))}
                          </div>
                        )}
                        {(completed.length > 0 || failed.length > 0) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {completed.map(h => (
                              <span key={h.id} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600" title={h.start_date}>
                                Completed: {SUPPORT_LABELS[h.support_type] || h.support_type}
                              </span>
                            ))}
                            {failed.map(h => (
                              <span key={h.id} className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700" title={h.start_date}>
                                Failed: {SUPPORT_LABELS[h.support_type] || h.support_type}
                              </span>
                            ))}
                          </div>
                        )}
                        {hist.length === 0 && <p className="text-gray-400 mt-0.5 italic">No active or recent supports on file</p>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {duplicates.length > 0 && (
                <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5"
                    checked={skipDuplicates}
                    onChange={e => setSkipDuplicates(e.target.checked)}
                  />
                  <span className="text-xs text-amber-800">
                    <strong>{duplicates.length} student{duplicates.length === 1 ? '' : 's'}</strong> already have an active {BULK_SUPPORT_TYPES.find(t => t.value === bulkType)?.label} —
                    {skipDuplicates ? ' skip them and only create for the rest.' : ' create anyway (will produce duplicate active supports).'}
                  </span>
                </label>
              )}

              {failedRecent.length > 0 && (() => {
                const altType = SUGGESTED_ALTERNATIVE[bulkType]
                const altLabel = altType ? (BULK_SUPPORT_TYPES.find(t => t.value === altType)?.label || altType) : null
                return (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg space-y-2">
                    <p className="text-xs text-red-800">
                      ⚠ <strong>{failedRecent.length} student{failedRecent.length === 1 ? '' : 's'}</strong> had this support discontinued in the last 90 days.
                      Re-running a failed intervention without changing approach is the pattern districts get cited on at OCR review.
                    </p>
                    {altLabel && (
                      <p className="text-xs text-red-800">
                        <strong>Suggested alternative:</strong> assign <em>{altLabel}</em> for those students instead.
                        {' '}
                        <button
                          type="button"
                          onClick={() => { setBulkType(altType); setSkipPriorFailures(true) }}
                          className="underline font-semibold hover:text-red-900"
                        >
                          Switch to {altLabel} →
                        </button>
                      </p>
                    )}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5"
                        checked={skipPriorFailures}
                        onChange={e => setSkipPriorFailures(e.target.checked)}
                      />
                      <span className="text-xs text-red-900">
                        <strong>Skip prior-failure students</strong> — only create for the rest. Recommended.
                      </span>
                    </label>
                    {!skipPriorFailures && (
                      <div>
                        <label className="block text-xs font-medium text-red-900 mb-1">
                          Override reason (required) — explain why re-running this is appropriate
                        </label>
                        <textarea
                          className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs resize-none bg-white"
                          rows={2}
                          placeholder="e.g. Original CICO failed due to mentor scheduling conflict, not strategy fit; reassigning with different mentor."
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                        />
                        <p className="text-[10px] text-red-800 mt-1">This text is appended to the support's notes for the audit trail.</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes (applied to all)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Assigned via bulk action from Escalation Engine..."
                  value={bulkNotes}
                  onChange={e => setBulkNotes(e.target.value)}
                />
              </div>

              {(() => {
                const skipDup = skipDuplicates ? duplicates.filter(id => selected.has(id)).length : 0
                const skipFail = skipPriorFailures ? failedRecent.filter(id => selected.has(id) && !duplicates.includes(id)).length : 0
                const willCreate = selected.size - skipDup - skipFail
                const skipBits = []
                if (skipDup) skipBits.push(`${skipDup} duplicate${skipDup === 1 ? '' : 's'}`)
                if (skipFail) skipBits.push(`${skipFail} prior-failure${skipFail === 1 ? '' : 's'}`)
                const label = BULK_SUPPORT_TYPES.find(t => t.value === bulkType)?.label
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    {willCreate <= 0
                      ? <>All {selected.size} selected students would be skipped — pick a different support type or uncheck the skip toggles.</>
                      : <>Will create <strong>{willCreate}</strong> active {label} support{willCreate !== 1 ? 's' : ''} starting today
                          {skipBits.length > 0 ? <> · skipping {skipBits.join(' + ')}</> : null}.</>}
                  </div>
                )
              })()}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              {(() => {
                const skipDup = skipDuplicates ? duplicates.filter(id => selected.has(id)).length : 0
                const skipFail = skipPriorFailures ? failedRecent.filter(id => selected.has(id) && !duplicates.includes(id)).length : 0
                const willCreate = selected.size - skipDup - skipFail
                const blocked = bulkSaving || willCreate <= 0
                return (
                  <button
                    onClick={handleBulkCreate}
                    disabled={blocked}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
                  >
                    {bulkSaving ? 'Creating...'
                      : willCreate <= 0 ? 'Nothing to create'
                      : `Create ${willCreate} Support${willCreate !== 1 ? 's' : ''}`}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RiskCard({ level, count, label, onClick, active }) {
  const colors = {
    high:   { bg: active ? 'bg-red-50 ring-2 ring-red-300' : 'bg-white', num: 'text-red-600' },
    medium: { bg: active ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-white', num: 'text-amber-600' },
    low:    { bg: active ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-white', num: 'text-emerald-600' },
  }
  const c = colors[level]
  return (
    <button
      onClick={onClick}
      className={`${c.bg} rounded-xl border border-gray-200 p-6 text-left hover:shadow-md transition-all w-full`}
    >
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${c.num}`}>{count}</p>
    </button>
  )
}
