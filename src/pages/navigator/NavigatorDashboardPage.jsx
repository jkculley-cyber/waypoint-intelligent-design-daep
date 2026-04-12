import { Link } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigatorDashboardStats, useDaepReturns, useDaepRiskStudents, useCreateReturnSupports } from '../../hooks/useNavigator'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
  escalated_to_daep: 'bg-red-100 text-red-700',
}

export default function NavigatorDashboardPage() {
  const { hasProduct } = useAuth()
  const showDaep = hasProduct('waypoint')
  const { stats, recentReferrals, escalationAlerts, loading } = useNavigatorDashboardStats()
  const { returns: daepReturns, loading: returnsLoading, refetch: refetchReturns } = useDaepReturns()
  const { students: atRiskStudents, loading: riskLoading } = useDaepRiskStudents()
  const { createFromPlan, loading: creatingSupport } = useCreateReturnSupports()

  return (
    <div>
      <Topbar
        title="Navigator Dashboard"
        subtitle="ISS / OSS Tracker &amp; Proactive Supports"
        actions={
          <Link
            to="/navigator/referrals"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Referral
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Escalation Alert Banner */}
        {escalationAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">
                {escalationAlerts.length} student{escalationAlerts.length !== 1 ? 's' : ''} with 3+ OSS placements in the last 90 days{showDaep ? ' — Consider DAEP review.' : ' — Immediate intervention needed.'}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {escalationAlerts.map(a => (
                  <Link
                    key={a.student_id}
                    to={`/navigator/students/${a.student_id}`}
                    className="text-xs text-red-700 underline hover:text-red-900"
                  >
                    {a.student ? `${a.student.first_name} ${a.student.last_name}` : a.student_id} ({a.oss_count} OSS)
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                <div className="h-8 w-12 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-2 ${showDaep ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-4`}>
            <StatCard
              label="Referrals This Month"
              value={stats?.referralsThisMonth ?? 0}
              color="text-blue-600"
              icon={<ReferralIcon />}
              link="/navigator/referrals"
            />
            <StatCard
              label="Active ISS"
              value={stats?.activeISS ?? 0}
              color="text-blue-600"
              icon={<PlacementIcon />}
              link="/navigator/placements"
            />
            <StatCard
              label="Active OSS"
              value={stats?.activeOSS ?? 0}
              color="text-red-600"
              icon={<PlacementIcon />}
              link="/navigator/placements"
            />
            {showDaep && (
              <StatCard
                label="At DAEP"
                value={stats?.atDaep ?? 0}
                color="text-orange-600"
                icon={<DaepIcon />}
                link="/navigator/placements"
              />
            )}
            <StatCard
              label="Active Supports"
              value={stats?.activeSupports ?? 0}
              color="text-emerald-600"
              icon={<SupportIcon />}
              link="/navigator/supports"
            />
          </div>
        )}

        {/* DAEP Risk — Proactive Alert (only when Waypoint/DAEP is enabled) */}
        {showDaep && !riskLoading && atRiskStudents.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-900">DAEP Risk — Proactive Intervention Needed</h2>
              </div>
              <span className="text-xs text-gray-500">{atRiskStudents.length} student{atRiskStudents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {atRiskStudents.map(s => {
                const riskColor = s.riskScore >= 85 ? 'text-red-700 bg-red-50' : s.riskScore >= 70 ? 'text-orange-700 bg-orange-50' : 'text-yellow-700 bg-yellow-50'
                const riskLabel = s.riskScore >= 85 ? 'CRITICAL' : s.riskScore >= 70 ? 'HIGH' : 'ELEVATED'
                return (
                  <Link key={s.student_id} to={`/navigator/students/${s.student_id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {s.student?.first_name} {s.student?.last_name}
                        <span className="ml-2 text-xs text-gray-500">Grade {s.student?.grade_level}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.issCount} ISS · {s.ossCount} OSS · {s.failedSupports} failed support{s.failedSupports !== 1 ? 's' : ''} (180 days)
                        {s.priorDaep && <span className="ml-1 text-orange-600 font-semibold">· PRIOR DAEP</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${riskColor}`}>{riskLabel} {s.riskScore}</span>
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Returning from DAEP (only when Waypoint/DAEP is enabled) */}
        {showDaep && !returnsLoading && daepReturns.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-green-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-green-100 bg-green-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                <h2 className="text-sm font-semibold text-green-900">Returning from DAEP</h2>
              </div>
              <span className="text-xs text-green-700">{daepReturns.length} student{daepReturns.length !== 1 ? 's' : ''} in last 90 days</span>
            </div>
            <div className="divide-y divide-gray-50">
              {daepReturns.map(ret => {
                const student = ret.student
                const plan = ret.plan
                const hasAdjustments = !!plan?.post_return_adjustments
                return (
                  <div key={ret.id} className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/navigator/students/${student.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {student.first_name} {student.last_name}
                          <span className="ml-2 text-xs text-gray-500">Grade {student.grade_level}</span>
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {student.campus?.name} · {ret.consequence_days} DAEP days served
                          {plan.handoff_initiated_at && ` · Completed ${format(new Date(plan.handoff_initiated_at), 'MMM d')}`}
                        </p>
                        {hasAdjustments && (
                          <p className="text-xs text-green-800 bg-green-50 rounded px-2 py-1 mt-2 italic">
                            "{plan.post_return_adjustments}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {ret.handoffPending && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Pending Acceptance</span>
                        )}
                        {ret.handoffAccepted && (
                          <button
                            onClick={async () => {
                              const { success, count, error } = await createFromPlan(student.id, student.campus_id, plan)
                              if (success && count > 0) {
                                toast.success(`${count} support${count > 1 ? 's' : ''} created from DAEP plan`)
                                refetchReturns()
                              } else if (success && count === 0) {
                                toast('No supports to import from the transition plan', { icon: 'i' })
                              } else {
                                toast.error(error || 'Failed to create supports')
                              }
                            }}
                            disabled={creatingSupport}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {creatingSupport ? 'Creating...' : 'Import DAEP Supports'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Referrals</h2>
            <Link to="/navigator/referrals" className="text-xs text-blue-500 hover:text-blue-600 font-medium">View all →</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : recentReferrals.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No referrals yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Offense</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentReferrals.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.students ? `${r.students.first_name} ${r.students.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.campuses?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.offense_codes ? `${r.offense_codes.code} — ${r.offense_codes.description}` : r.description?.slice(0, 40) || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.referral_date ? format(new Date(r.referral_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon, link }) {
  return (
    <Link to={link} className="block">
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">{label}</span>
          <div className={`w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </div>
    </Link>
  )
}

function ReferralIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function PlacementIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )
}

function DaepIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )
}

function SupportIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  )
}
