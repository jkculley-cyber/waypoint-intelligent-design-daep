import { Link } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import { useNavigatorDashboardStats } from '../../hooks/useNavigator'
import { format } from 'date-fns'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
  escalated_to_daep: 'bg-red-100 text-red-700',
}

export default function NavigatorDashboardPage() {
  const { stats, recentReferrals, escalationAlerts, loading } = useNavigatorDashboardStats()

  return (
    <div>
      <Topbar
        title="Navigator Dashboard"
        subtitle="ISS / OSS Tracker &amp; Proactive Supports"
        actions={
          <Link
            to="/navigator/referrals"
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
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
                {escalationAlerts.length} student{escalationAlerts.length !== 1 ? 's' : ''} with 3+ OSS placements in the last 90 days — Consider DAEP review.
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                <div className="h-8 w-12 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Referrals This Month"
              value={stats?.referralsThisMonth ?? 0}
              color="text-orange-600"
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
            <StatCard
              label="Active Supports"
              value={stats?.activeSupports ?? 0}
              color="text-emerald-600"
              icon={<SupportIcon />}
              link="/navigator/supports"
            />
          </div>
        )}

        {/* Recent Referrals */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Referrals</h2>
            <Link to="/navigator/referrals" className="text-xs text-orange-500 hover:text-orange-600 font-medium">View all →</Link>
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
                          {r.status?.replace('_', ' ') || '—'}
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

function SupportIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  )
}
