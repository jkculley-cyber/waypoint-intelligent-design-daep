import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import Topbar from '../../components/layout/Topbar'
import { useDisproportionality } from '../../hooks/useNavigator'

// Color scale for referral rate bars — white → amber → red
function rateColor(rate, max) {
  if (!rate || max === 0) return '#e5e7eb'
  const pct = rate / max
  if (pct >= 0.75) return '#ef4444'
  if (pct >= 0.5)  return '#f97316'
  if (pct >= 0.25) return '#fbbf24'
  return '#60a5fa'
}

export default function NavigatorDisproportionalityPage() {
  const { campusData, gradeData, loading, error, refetch } = useDisproportionality()

  const maxCampusRate = Math.max(...campusData.map(c => c.rate || 0), 0)
  const maxGradeRate  = Math.max(...gradeData.map(g => g.rate || 0), 0)
  const avgCampusRate = campusData.length > 0
    ? (campusData.reduce((s, c) => s + (c.rate || 0), 0) / campusData.length).toFixed(1)
    : null

  return (
    <div>
      <Topbar
        title="Disproportionality Radar"
        subtitle="Referral concentration by campus and grade — rolling 90-day window"
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
            Loading disproportionality data...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500 text-sm">{error}</div>
        ) : campusData.length === 0 && gradeData.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">No referral data in the last 90 days</p>
            <p className="text-gray-400 text-sm mt-1">Create referrals to see campus and grade concentration patterns.</p>
          </div>
        ) : (
          <>
            {/* Campus Section */}
            {campusData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Referral Rate by Campus</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Referrals ÷ enrolled students × 100. District avg: {avgCampusRate ?? '—'}%</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">90-day window</span>
                </div>

                <ResponsiveContainer width="100%" height={Math.max(160, campusData.length * 40)}>
                  <BarChart
                    layout="vertical"
                    data={campusData}
                    margin={{ top: 4, right: 40, left: 120, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#374151' }}
                      tickLine={false}
                      axisLine={false}
                      width={115}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Referral Rate']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    {avgCampusRate && (
                      <ReferenceLine x={parseFloat(avgCampusRate)} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Avg', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                    )}
                    <Bar dataKey="rate" radius={[0,4,4,0]}>
                      {campusData.map((entry) => (
                        <Cell key={entry.campus_id} fill={rateColor(entry.rate, maxCampusRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Campus table */}
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Referrals</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Enrollment</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Rate</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">vs. Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campusData.map(c => {
                      const diff = avgCampusRate ? (c.rate - parseFloat(avgCampusRate)).toFixed(1) : null
                      return (
                        <tr key={c.campus_id} className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-800">{c.name}</td>
                          <td className="py-2 text-right text-gray-600">{c.referrals}</td>
                          <td className="py-2 text-right text-gray-500">{c.enrollment || '—'}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">{c.rate != null ? `${c.rate}%` : '—'}</td>
                          <td className="py-2 text-right text-xs">
                            {diff != null && (
                              <span className={parseFloat(diff) > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                                {parseFloat(diff) > 0 ? `+${diff}` : diff}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grade Section */}
            {gradeData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Referral Rate by Grade</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Identifies grade bands with elevated incident rates</p>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={gradeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="%" allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name) => [name === 'rate' ? `${value}%` : value, name === 'rate' ? 'Referral Rate' : 'Referrals']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Bar dataKey="rate" radius={[4,4,0,0]}>
                      {gradeData.map((entry) => (
                        <Cell key={entry.grade} fill={rateColor(entry.rate, maxGradeRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Rate color scale:</span>
              {[
                { color: '#60a5fa', label: 'Low' },
                { color: '#fbbf24', label: 'Moderate' },
                { color: '#f97316', label: 'Elevated' },
                { color: '#ef4444', label: 'High' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-400">
              Rate = referrals ÷ active enrollment × 100. High rates may indicate targeted intervention needs or systemic referral patterns at that campus/grade.
              Requires active student records with campus assignments for accurate denominators.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
