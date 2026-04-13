import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
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
