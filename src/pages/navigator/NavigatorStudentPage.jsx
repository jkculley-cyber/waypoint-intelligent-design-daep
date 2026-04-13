import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigatorStudentHistory, useStudentDaepStatus, useStudentMonitors, MONITOR_TYPE_LABELS } from '../../hooks/useNavigator'
import toast from 'react-hot-toast'

const SUPPORT_TYPE_LABELS = {
  cico: 'CICO',
  behavior_contract: 'Behavior Contract',
  counseling_referral: 'Counseling Referral',
  parent_contact: 'Parent Contact',
  mentoring: 'Mentoring',
  other: 'Other',
}

const RISK_STYLES = {
  high:   { badge: 'text-red-600 bg-red-50 border-red-200',    label: 'HIGH RISK' },
  medium: { badge: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'MEDIUM RISK' },
  low:    { badge: 'text-green-600 bg-green-50 border-green-200',  label: 'LOW RISK' },
}

export default function NavigatorStudentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasProduct, isDemoReadonly, profile } = useAuth()
  const showDaep = hasProduct('waypoint')
  const [showEscalateModal, setShowEscalateModal] = useState(false)
  const [showMonitorModal, setShowMonitorModal] = useState(false)
  const [monitorForm, setMonitorForm] = useState({ monitor_type: 'review_due', alert_date: '', notes: '' })
  const { createMonitor } = useStudentMonitors()
  const { student, referrals, placements, supports, riskScore, riskTriggers, riskLevel, loading } = useNavigatorStudentHistory(id)
  const daepStatus = useStudentDaepStatus(id)

  if (loading) {
    return (
      <div>
        <Topbar title="Navigator — Student History" />
        <div className="p-6 text-center text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div>
        <Topbar title="Navigator — Student History" />
        <div className="p-6 text-center text-gray-400">Student not found.</div>
      </div>
    )
  }

  const activeSupports = supports.filter(s => s.status === 'active')
  const level = riskLevel || 'low'
  const riskStyle = RISK_STYLES[level]

  // OSS count in last 90 days
  const oss90 = placements.filter(p => {
    if (p.placement_type !== 'oss') return false
    const d = new Date(p.start_date)
    return (Date.now() - d.getTime()) <= 90 * 24 * 60 * 60 * 1000
  }).length

  const handleEscalate = () => {
    const params = new URLSearchParams({
      student: id,
      from: 'navigator',
      risk: riskScore,
      referrals: referrals.length,
      oss_90d: oss90,
    })
    if (student?.is_sped) params.set('sped', '1')
    navigate(`/incidents/new?${params.toString()}`)
  }

  // Build chronological timeline from referrals, placements, AND supports
  const timelineItems = [
    ...referrals.map(r => ({ type: 'referral', date: r.referral_date, data: r })),
    ...placements.map(p => ({ type: 'placement', date: p.start_date, data: p })),
    ...supports.map(s => ({ type: 'support', date: s.start_date, data: s })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div>
      <Topbar
        title="Navigator — Student History"
        subtitle={student.first_name + ' ' + student.last_name}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={isDemoReadonly ? undefined : () => navigate(`/navigator/referrals?new=1&student=${id}`)}
              disabled={isDemoReadonly}
              title={isDemoReadonly ? 'Available in your pilot account' : ''}
              className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-blue-400 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              + Referral
            </button>
            <button
              onClick={isDemoReadonly ? undefined : () => navigate(`/navigator/placements?new=1&student=${id}`)}
              disabled={isDemoReadonly}
              title={isDemoReadonly ? 'Available in your pilot account' : ''}
              className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-gray-600 hover:bg-gray-700'}`}
            >
              + Placement
            </button>
            <button
              onClick={isDemoReadonly ? undefined : () => navigate(`/navigator/supports?new=1&student=${id}`)}
              disabled={isDemoReadonly}
              title={isDemoReadonly ? 'Available in your pilot account' : ''}
              className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-emerald-400 cursor-not-allowed opacity-60' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              + Support
            </button>
            <button
              onClick={isDemoReadonly ? undefined : () => setShowMonitorModal(true)}
              disabled={isDemoReadonly}
              title={isDemoReadonly ? 'Available in your pilot account' : 'Set a monitoring alert for this student'}
              className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-amber-300 cursor-not-allowed opacity-60' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              Monitor
            </button>
            {showDaep && (
              <button
                onClick={isDemoReadonly ? undefined : () => setShowEscalateModal(true)}
                disabled={isDemoReadonly}
                title={isDemoReadonly ? 'Available in your pilot account' : ''}
                className={`px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-red-300 cursor-not-allowed opacity-60' : 'bg-red-500 hover:bg-red-600'}`}
              >
                Escalate to DAEP →
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Student Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-500 shrink-0">
            {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-xl font-semibold text-gray-900">{student.first_name} {student.last_name}</h2>
              {student.is_sped && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">SPED</span>}
              {student.is_504 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">504</span>}
              {student.mtss_tier && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                  student.mtss_tier === 3 ? 'bg-red-100 text-red-700 border-red-200' :
                  student.mtss_tier === 2 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-green-100 text-green-700 border-green-200'
                }`}>MTSS Tier {student.mtss_tier}</span>
              )}
              {!isDemoReadonly && (
                <select
                  value={student.mtss_tier || ''}
                  onChange={async (e) => {
                    const tier = e.target.value ? parseInt(e.target.value) : null
                    await supabase.from('students').update({ mtss_tier: tier }).eq('id', student.id)
                    toast.success(tier ? `Set to MTSS Tier ${tier}` : 'MTSS tier removed')
                    window.location.reload()
                  }}
                  className="text-[10px] px-1.5 py-0.5 border border-gray-300 rounded text-gray-600 bg-white"
                  title="Set MTSS Tier"
                >
                  <option value="">No Tier</option>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              )}
              {daepStatus.atDaep && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">AT DAEP</span>}
              {!daepStatus.atDaep && daepStatus.priorDaep?.length > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">PRIOR DAEP ({daepStatus.priorDaep.length})</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Grade {student.grade_level || '—'} · {student.campuses?.name || '—'}
            </p>
            {student.student_id && (
              <p className="text-xs text-gray-400 mt-1 font-mono">{student.student_id}</p>
            )}
          </div>
          <div className={`px-4 py-3 rounded-xl border text-center min-w-[96px] ${riskStyle.badge}`}>
            <p className="text-2xl font-bold">{riskScore}</p>
            <p className="text-xs font-semibold mt-0.5 tracking-wide">{riskStyle.label}</p>
          </div>
        </div>

        {/* DAEP History */}
        {(daepStatus.atDaep || daepStatus.priorDaep?.length > 0) && (
          <div className={`rounded-xl border p-4 ${daepStatus.atDaep ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
            {daepStatus.atDaep && (
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <p className="text-sm font-semibold text-orange-800">Currently at DAEP</p>
                {daepStatus.activeDaepIncident && (
                  <a href={`/incidents/${daepStatus.activeDaepIncident.id}`} className="text-xs text-orange-600 underline ml-auto">View Incident</a>
                )}
              </div>
            )}
            {daepStatus.priorDaep?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">{daepStatus.atDaep ? 'Previous' : 'Prior'} DAEP Placement{daepStatus.priorDaep.length > 1 ? 's' : ''}</p>
                <div className="space-y-1">
                  {daepStatus.priorDaep.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{d.date ? format(parseISO(d.date), 'MMM d, yyyy') : '—'} · {d.days || '?'} days assigned</span>
                      <a href={`/incidents/${d.id}`} className="text-blue-600 underline">View</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Risk Triggers */}
        {riskTriggers && riskTriggers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {riskTriggers.map(t => (
              <span key={t} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{referrals.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Referrals</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{placements.length}</p>
            <p className="text-xs text-gray-500 mt-1">Placements (ISS/OSS)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{activeSupports.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active Supports</p>
          </div>
        </div>

        {/* Progress & Effectiveness Review */}
        <StudentProgressPanel referrals={referrals} placements={placements} supports={supports} student={student} />

        {/* Active Supports */}
        {activeSupports.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Active Supports</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {activeSupports.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{SUPPORT_TYPE_LABELS[s.support_type] || s.support_type}</p>
                    <p className="text-xs text-gray-400">
                      Assigned to {s.assignee?.full_name || 'Unassigned'} · Started {s.start_date ? format(parseISO(s.start_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Behavior Timeline</h3>
          </div>
          <div className="p-5">
            {timelineItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No behavior history on record.</p>
            ) : (
              <div className="relative space-y-4">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />

                {timelineItems.map((item, i) => {
                  const isReferral = item.type === 'referral'
                  const isPlacement = item.type === 'placement'
                  const isSupport = item.type === 'support'
                  const dotClass = isReferral
                    ? 'bg-blue-100 text-blue-600'
                    : isPlacement
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                  const dotLabel = isReferral ? 'R' : isPlacement ? 'P' : 'S'

                  return (
                    <div key={i} className="relative flex items-start gap-4 pl-8">
                      <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotClass}`}>
                        {dotLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {isReferral
                              ? `Referral — ${item.data.offense_codes?.code || 'No code'}`
                              : isPlacement
                              ? `${item.data.placement_type?.toUpperCase()} Placement`
                              : `Support — ${SUPPORT_TYPE_LABELS[item.data.support_type] || item.data.support_type}`}
                          </p>
                          <span className="text-xs text-gray-400 shrink-0">
                            {item.date ? format(parseISO(item.date), 'MMM d, yyyy') : '—'}
                          </span>
                        </div>
                        {isReferral && item.data.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{item.data.description}</p>
                        )}
                        {isPlacement && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.data.days ? `${item.data.days} day${item.data.days !== 1 ? 's' : ''}` : ''}
                            {item.data.end_date ? ` · Ended ${format(parseISO(item.data.end_date), 'MMM d')}` : ' · Active'}
                          </p>
                        )}
                        {isSupport && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.data.assignee?.full_name ? `Assigned to ${item.data.assignee.full_name}` : ''}
                            {item.data.status ? ` · ${item.data.status.charAt(0).toUpperCase() + item.data.status.slice(1)}` : ''}
                          </p>
                        )}
                        {isReferral && item.data.status && (
                          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded capitalize ${
                            item.data.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.data.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-5 pb-4 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-100 inline-block" />Referral</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-100 inline-block" />Placement</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-100 inline-block" />Support</span>
          </div>
        </div>
      </div>

      {/* Escalation confirmation modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEscalateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Escalate to DAEP Placement?</h2>
            <p className="text-sm text-gray-500 mb-4">This will open a new DAEP incident pre-filled with this student's Navigator context.</p>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Student</span>
                <span className="font-medium text-gray-900">{student.first_name} {student.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Score</span>
                <span className={`font-semibold ${level === 'high' ? 'text-red-600' : level === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{riskScore} ({riskStyle.label})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Referrals</span>
                <span className="font-medium text-gray-900">{referrals.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">OSS in last 90 days</span>
                <span className="font-medium text-gray-900">{oss90}</span>
              </div>
              {(student.is_sped || student.is_504) && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Eligibility</span>
                  <span className="font-medium">
                    {student.is_sped && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 mr-1">SPED</span>}
                    {student.is_504 && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">504</span>}
                  </span>
                </div>
              )}
            </div>

            {student.is_sped && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800 mb-4">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <span><strong>SPED student</strong> — A Manifestation Determination Review (MDR) is required before DAEP placement. Ensure the IEP team has been notified.</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEscalateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={() => { setShowEscalateModal(false); handleEscalate() }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Continue to DAEP →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monitor Modal */}
      {showMonitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowMonitorModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900">Set Monitoring Alert — {student.first_name} {student.last_name}</h2>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Alert Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={monitorForm.monitor_type} onChange={e => setMonitorForm(f => ({ ...f, monitor_type: e.target.value }))}>
                {Object.entries(MONITOR_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {monitorForm.monitor_type !== 'new_referral' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Alert Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={monitorForm.alert_date} onChange={e => setMonitorForm(f => ({ ...f, alert_date: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes / What to Check</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" rows={2} placeholder="e.g., Review behavior contract progress..." value={monitorForm.notes} onChange={e => setMonitorForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowMonitorModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={async () => {
                  const { error } = await createMonitor({
                    district_id: profile.district_id,
                    campus_id: student.campus_id,
                    student_id: student.id,
                    created_by: profile.id,
                    monitor_type: monitorForm.monitor_type,
                    alert_date: monitorForm.alert_date || null,
                    notes: monitorForm.notes || null,
                  })
                  if (error) { toast.error(error); return }
                  toast.success(`Monitoring alert set for ${student.first_name}`)
                  setShowMonitorModal(false)
                  setMonitorForm({ monitor_type: 'review_due', alert_date: '', notes: '' })
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
              >
                Set Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Progress & Effectiveness Panel ──────────────────────────────────────────

const SUPPORT_TYPE_SHORT = { cico: 'CICO', behavior_contract: 'Contract', counseling_referral: 'Counseling', parent_contact: 'Parent', mentoring: 'Mentoring', other: 'Other' }
const TIER_COLORS = { 1: 'bg-green-100 text-green-700', 2: 'bg-amber-100 text-amber-700', 3: 'bg-red-100 text-red-700' }

function StudentProgressPanel({ referrals, placements, supports, student }) {
  const completedSupports = supports.filter(s => s.status === 'completed' && s.incidents_before != null)
  const activeSupports = supports.filter(s => s.status === 'active')

  // ── Referral trend: compare first half to second half rate ──
  const sortedRefs = [...referrals].sort((a, b) => new Date(a.referral_date) - new Date(b.referral_date))
  const mid = Math.floor(sortedRefs.length / 2)
  const firstHalf = sortedRefs.slice(0, mid)
  const secondHalf = sortedRefs.slice(mid)
  const firstHalfDays = firstHalf.length > 1 ? (new Date(firstHalf[firstHalf.length - 1]?.referral_date) - new Date(firstHalf[0]?.referral_date)) / 86400000 || 1 : 1
  const secondHalfDays = secondHalf.length > 1 ? (new Date(secondHalf[secondHalf.length - 1]?.referral_date) - new Date(secondHalf[0]?.referral_date)) / 86400000 || 1 : 1
  const firstRate = firstHalf.length / firstHalfDays * 30
  const secondRate = secondHalf.length / secondHalfDays * 30
  const refTrend = referrals.length >= 4 ? (secondRate < firstRate ? 'improving' : secondRate > firstRate * 1.2 ? 'worsening' : 'stable') : 'insufficient'

  // ── Days since last referral ──
  const lastRefDate = sortedRefs.length > 0 ? new Date(sortedRefs[sortedRefs.length - 1].referral_date) : null
  const daysSinceLastRef = lastRefDate ? Math.floor((Date.now() - lastRefDate) / 86400000) : null
  const refRecency = daysSinceLastRef != null ? (daysSinceLastRef >= 30 ? 'quiet' : daysSinceLastRef >= 14 ? 'cooling' : 'recent') : null

  // ── Placement trend: compare current year to prior year ──
  const currentYearPlacements = (placements || []).filter(p => p.start_date >= '2025-08-01')
  const priorYearPlacements = (placements || []).filter(p => p.start_date < '2025-08-01')
  const placementTrend = priorYearPlacements.length > 0 && currentYearPlacements.length < priorYearPlacements.length ? 'fewer' : priorYearPlacements.length > 0 && currentYearPlacements.length > priorYearPlacements.length ? 'more' : priorYearPlacements.length > 0 ? 'same' : null

  // ── Total incident reduction from completed supports ──
  const totalBefore = completedSupports.reduce((s, c) => s + (c.incidents_before || 0), 0)
  const totalAfter = completedSupports.reduce((s, c) => s + (c.incidents_after || 0), 0)
  const totalReduction = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : null

  // ── Average support duration (completed) ──
  const avgDuration = completedSupports.length > 0
    ? Math.round(completedSupports.reduce((s, c) => s + (c.end_date && c.start_date ? (new Date(c.end_date) - new Date(c.start_date)) / 86400000 : 0), 0) / completedSupports.length)
    : null

  // ── Overall progress score (0-100) ──
  let progressScore = 50 // baseline
  if (refTrend === 'improving') progressScore += 15
  if (refTrend === 'worsening') progressScore -= 20
  if (refRecency === 'quiet') progressScore += 15
  if (refRecency === 'recent') progressScore -= 10
  if (totalReduction != null && totalReduction > 50) progressScore += 15
  if (totalReduction != null && totalReduction > 0 && totalReduction <= 50) progressScore += 8
  if (totalReduction != null && totalReduction < 0) progressScore -= 15
  if (placementTrend === 'fewer') progressScore += 10
  if (placementTrend === 'more') progressScore -= 10
  if (activeSupports.length > 0) progressScore += 5
  progressScore = Math.max(0, Math.min(100, progressScore))

  const progressLabel = progressScore >= 75 ? 'Strong Progress' : progressScore >= 55 ? 'Making Progress' : progressScore >= 40 ? 'Monitoring' : 'Needs Attention'
  const progressColor = progressScore >= 75 ? 'green' : progressScore >= 55 ? 'emerald' : progressScore >= 40 ? 'amber' : 'red'

  if (referrals.length === 0 && supports.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">Progress & Effectiveness Review</h2>
        </div>
        {student.mtss_tier && (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${TIER_COLORS[student.mtss_tier]}`}>
            MTSS Tier {student.mtss_tier}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Progress Score Bar */}
        <div className={`rounded-lg p-4 border-2 ${progressColor === 'green' ? 'border-green-300 bg-green-50' : progressColor === 'emerald' ? 'border-emerald-300 bg-emerald-50' : progressColor === 'amber' ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-bold ${progressColor === 'green' ? 'text-green-800' : progressColor === 'emerald' ? 'text-emerald-800' : progressColor === 'amber' ? 'text-amber-800' : 'text-red-800'}`}>
              {progressLabel}
            </p>
            <span className="text-xs font-mono text-gray-500">{progressScore}/100</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressColor === 'green' ? 'bg-green-500' : progressColor === 'emerald' ? 'bg-emerald-500' : progressColor === 'amber' ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${progressScore}%` }} />
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">{referrals.length}</p>
            <p className="text-[10px] text-gray-500 uppercase">Total Referrals</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${refTrend === 'improving' ? 'bg-green-50' : refTrend === 'worsening' ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className={`text-lg font-bold ${refTrend === 'improving' ? 'text-green-700' : refTrend === 'worsening' ? 'text-red-700' : 'text-gray-600'}`}>
              {refTrend === 'improving' ? '↓ Fewer' : refTrend === 'worsening' ? '↑ More' : '— Stable'}
            </p>
            <p className="text-[10px] text-gray-500 uppercase">Referral Trend</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${refRecency === 'quiet' ? 'bg-green-50' : refRecency === 'recent' ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className={`text-lg font-bold ${refRecency === 'quiet' ? 'text-green-700' : refRecency === 'recent' ? 'text-red-700' : 'text-gray-600'}`}>
              {daysSinceLastRef != null ? `${daysSinceLastRef}d` : '—'}
            </p>
            <p className="text-[10px] text-gray-500 uppercase">Since Last Referral</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${placementTrend === 'fewer' ? 'bg-green-50' : placementTrend === 'more' ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className={`text-lg font-bold ${placementTrend === 'fewer' ? 'text-green-700' : placementTrend === 'more' ? 'text-red-700' : 'text-gray-600'}`}>
              {currentYearPlacements.length}
              {priorYearPlacements.length > 0 && <span className="text-xs font-normal text-gray-400 ml-1">vs {priorYearPlacements.length}</span>}
            </p>
            <p className="text-[10px] text-gray-500 uppercase">Placements (YOY)</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${totalReduction != null && totalReduction > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
            <p className={`text-lg font-bold ${totalReduction != null && totalReduction > 0 ? 'text-green-700' : 'text-gray-600'}`}>
              {totalReduction != null ? `${totalReduction}%` : '—'}
            </p>
            <p className="text-[10px] text-gray-500 uppercase">Incident Reduction</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-gray-800">
              {avgDuration != null ? `${avgDuration}d` : '—'}
            </p>
            <p className="text-[10px] text-gray-500 uppercase">Avg Support Duration</p>
          </div>
        </div>

        {/* Active Supports Status */}
        {activeSupports.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Supports</p>
            <div className="space-y-1.5">
              {activeSupports.map(s => {
                const daysSinceStart = s.start_date ? Math.floor((Date.now() - new Date(s.start_date)) / 86400000) : 0
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-blue-800">{SUPPORT_TYPE_SHORT[s.support_type] || s.support_type}</span>
                      {s.tiers?.map(t => <span key={t} className={`px-1 py-0.5 rounded text-[9px] font-bold ${TIER_COLORS[t]}`}>T{t}</span>)}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">{daysSinceStart} days active</span>
                      {s.end_date && <span className="text-[10px] text-gray-400 ml-2">ends {format(parseISO(s.end_date), 'MMM d')}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed Supports with Effectiveness */}
        {completedSupports.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Completed Supports — Effectiveness Data</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-gray-400 font-medium uppercase text-[10px]">Support</th>
                  <th className="py-2 text-left text-gray-400 font-medium uppercase text-[10px]">Tier</th>
                  <th className="py-2 text-center text-gray-400 font-medium uppercase text-[10px]">Before</th>
                  <th className="py-2 text-center text-gray-400 font-medium uppercase text-[10px]">After</th>
                  <th className="py-2 text-center text-gray-400 font-medium uppercase text-[10px]">Change</th>
                  <th className="py-2 text-left text-gray-400 font-medium uppercase text-[10px]">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completedSupports.map(s => {
                  const change = s.incidents_before - s.incidents_after
                  const pct = s.incidents_before > 0 ? Math.round((change / s.incidents_before) * 100) : 0
                  return (
                    <tr key={s.id}>
                      <td className="py-2 font-medium text-gray-800">{SUPPORT_TYPE_SHORT[s.support_type] || s.support_type}</td>
                      <td className="py-2">{s.tiers?.map(t => <span key={t} className={`px-1 py-0.5 rounded text-[9px] font-bold mr-0.5 ${TIER_COLORS[t]}`}>T{t}</span>)}</td>
                      <td className="py-2 text-center text-gray-600">{s.incidents_before}</td>
                      <td className="py-2 text-center text-gray-600">{s.incidents_after}</td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {change > 0 ? `↓${pct}%` : change < 0 ? `↑${Math.abs(pct)}%` : '—'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 max-w-xs truncate">{s.outcome_notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Score Factors</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px]">
            <span className={refTrend === 'improving' ? 'text-green-700' : refTrend === 'worsening' ? 'text-red-600' : 'text-gray-500'}>
              {refTrend === 'improving' ? '+15' : refTrend === 'worsening' ? '−20' : '+0'} Referral trend ({refTrend})
            </span>
            <span className={refRecency === 'quiet' ? 'text-green-700' : refRecency === 'recent' ? 'text-red-600' : 'text-gray-500'}>
              {refRecency === 'quiet' ? '+15' : refRecency === 'recent' ? '−10' : '+0'} Days since last ({daysSinceLastRef ?? '—'}d)
            </span>
            <span className={placementTrend === 'fewer' ? 'text-green-700' : placementTrend === 'more' ? 'text-red-600' : 'text-gray-500'}>
              {placementTrend === 'fewer' ? '+10' : placementTrend === 'more' ? '−10' : '+0'} Placement trend ({placementTrend || 'n/a'})
            </span>
            <span className={totalReduction > 50 ? 'text-green-700' : totalReduction > 0 ? 'text-emerald-600' : totalReduction < 0 ? 'text-red-600' : 'text-gray-500'}>
              {totalReduction > 50 ? '+15' : totalReduction > 0 ? '+8' : totalReduction < 0 ? '−15' : '+0'} Incident reduction ({totalReduction ?? 0}%)
            </span>
            <span className={activeSupports.length > 0 ? 'text-green-700' : 'text-gray-500'}>
              {activeSupports.length > 0 ? '+5' : '+0'} Active supports ({activeSupports.length})
            </span>
            <span className="text-gray-400">Base: 50</span>
          </div>
        </div>
      </div>
    </div>
  )
}
