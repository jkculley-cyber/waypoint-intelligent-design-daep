import { useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import { useEscalationRisk } from '../../hooks/useNavigator'

const LEVEL_STYLES = {
  high:   { badge: 'bg-red-100 text-red-700 border border-red-200',   bar: 'bg-red-500',   label: 'High' },
  medium: { badge: 'bg-amber-100 text-amber-700 border border-amber-200', bar: 'bg-amber-400', label: 'Medium' },
  low:    { badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200', bar: 'bg-emerald-400', label: 'Low' },
}

export default function NavigatorEscalationPage() {
  const { students, loading, error, refetch } = useEscalationRisk()
  const [filter, setFilter] = useState('all')

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
                      <tr key={s.student_id} className="hover:bg-gray-50 transition-colors">
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
