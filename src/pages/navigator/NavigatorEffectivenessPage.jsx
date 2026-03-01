import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { useInterventionEffectiveness } from '../../hooks/useNavigator'

const SUPPORT_TYPE_LABELS = {
  cico: 'CICO',
  behavior_contract: 'Behavior Contract',
  counseling_referral: 'Counseling Referral',
  parent_contact: 'Parent Conference',
  mentoring: 'Mentoring',
  other: 'Other',
}

export default function NavigatorEffectivenessPage() {
  const { supports, metrics, loading, error, refetch } = useInterventionEffectiveness()

  const chartData = metrics?.byType?.map(t => ({
    name: SUPPORT_TYPE_LABELS[t.type] || t.type,
    Before: t.before,
    After: t.after,
    count: t.count,
  })) || []

  return (
    <div>
      <Topbar
        title="Intervention Effectiveness"
        subtitle="Before-and-after incident tracking for completed supports"
        actions={
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Loading effectiveness data...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500 text-sm">{error}</div>
        ) : (
          <>
            {/* Stat Cards */}
            {metrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricCard label="Supports Tracked" value={metrics.totalTracked} color="text-blue-600" />
                <MetricCard label="Avg. Incident Reduction" value={`${metrics.avgReduction}%`} color="text-emerald-600" />
                <MetricCard label="Students Improved" value={metrics.improved} color="text-emerald-600" />
                <MetricCard label="Improvement Rate" value={`${metrics.improvedPct}%`} color="text-emerald-600" />
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium">No effectiveness data yet</p>
                <p className="mt-1 text-amber-700">
                  To track effectiveness, complete a support and fill in the "Incidents Before" and "Incidents After" fields.
                  Migration 050 adds these fields — apply via SQL Editor.
                </p>
              </div>
            )}

            {/* By Support Type Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Incidents Before vs. After — by Support Type</h2>
                <p className="text-xs text-gray-400 mb-4">Total across all tracked completions</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Before" fill="#fca5a5" radius={[3,3,0,0]} />
                    <Bar dataKey="After"  fill="#86efac" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detail Table */}
            {supports.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Completed Supports — Tracked Outcomes</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Support</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Completed</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Before</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">After</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Change</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {supports.map(s => {
                        const before = s.incidents_before || 0
                        const after = s.incidents_after || 0
                        const delta = after - before
                        const improved = delta < 0
                        return (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {s.students ? `${s.students.first_name} ${s.students.last_name}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600 capitalize">
                              {SUPPORT_TYPE_LABELS[s.support_type] || s.support_type}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {s.end_date ? format(new Date(s.end_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{before}</td>
                            <td className="px-4 py-3 text-gray-700 font-medium">{after}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${improved ? 'text-emerald-600' : delta > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {delta > 0 ? `+${delta}` : delta === 0 ? '—' : delta}
                                {improved && <span className="text-emerald-400">↓</span>}
                                {delta > 0  && <span className="text-red-400">↑</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                              {s.outcome_notes || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Note */}
            <p className="text-xs text-gray-400">
              Effectiveness data is recorded on individual support records (status = completed). Requires migration 050 columns:
              <code className="mx-1 px-1 bg-gray-100 rounded">incidents_before</code>,
              <code className="mx-1 px-1 bg-gray-100 rounded">incidents_after</code>,
              <code className="mx-1 px-1 bg-gray-100 rounded">outcome_notes</code>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
