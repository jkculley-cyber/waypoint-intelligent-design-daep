import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigatorPilotSummary, currentSchoolYear, SKILL_GAP_LABELS } from '../../hooks/useNavigator'

const SCHOOL_YEARS = ['2025-26', '2024-25', '2023-24']

export default function NavigatorPilotPage() {
  const navigate = useNavigate()
  const { hasProduct } = useAuth()
  const showDaep = hasProduct('waypoint')
  const defaultYear = currentSchoolYear()
  const [schoolYear, setSchoolYear] = useState(defaultYear)
  const { summary, loading, error, refetch } = useNavigatorPilotSummary(schoolYear)

  return (
    <div>
      <Topbar
        title="Leadership Report"
        subtitle="Annual Navigator impact metrics and leadership narrative"
        actions={
          <div className="flex items-center gap-3">
            <select
              value={schoolYear}
              onChange={e => setSchoolYear(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SCHOOL_YEARS.map(y => (
                <option key={y} value={y}>{y} School Year</option>
              ))}
            </select>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Loading pilot summary...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500 text-sm">{error}</div>
        ) : !summary || summary.totalReferrals === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">No Navigator data for {schoolYear}</p>
            <p className="text-gray-400 text-sm mt-1">Create referrals, placements, and supports to populate this report.</p>
          </div>
        ) : (
          <>
            {/* Top headline metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <BigMetric label="Total Referrals" value={summary.totalReferrals} color="text-blue-700" bg="bg-blue-50" onClick={() => navigate('/navigator/referrals')} />
              <BigMetric label="Students Served" value={summary.uniqueStudents} color="text-indigo-700" bg="bg-indigo-50" onClick={() => navigate('/navigator')} />
              <BigMetric label={showDaep ? 'Diverted from DAEP' : 'Diverted from Escalation'} value={summary.diverted} color="text-emerald-700" bg="bg-emerald-50" onClick={() => navigate('/navigator/effectiveness')} />
              <BigMetric label={showDaep ? 'Escalated to DAEP' : 'Referred for Escalation'} value={summary.escalated} color={summary.escalated > 0 ? 'text-red-700' : 'text-gray-500'} bg={summary.escalated > 0 ? 'bg-red-50' : 'bg-gray-50'} onClick={() => navigate('/navigator/escalation')} />
            </div>

            {/* ISS / OSS row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="ISS Placements" value={summary.issCount} onClick={() => navigate('/navigator/placements')} />
              <MetricCard label="OSS Placements" value={summary.ossCount} onClick={() => navigate('/navigator/placements')} />
              <MetricCard label="Total Days Removed" value={summary.totalDaysRemoved} onClick={() => navigate('/navigator/placements')} />
              <MetricCard
                label="Diversion Rate"
                value={summary.totalReferrals > 0
                  ? `${Math.round(summary.diverted / summary.totalReferrals * 100)}%`
                  : '—'
                }
                highlight
                onClick={() => navigate('/navigator/effectiveness')}
              />
            </div>

            {/* Supports */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard label="Active Supports" value={summary.activeSupports} onClick={() => navigate('/navigator/supports')} />
              <MetricCard label="Completed Supports" value={summary.completedSupports} onClick={() => navigate('/navigator/supports')} />
              <MetricCard
                label="Avg. Incident Reduction"
                value={summary.avgReduction != null ? `${summary.avgReduction}%` : 'Not tracked'}
                highlight={summary.avgReduction != null && summary.avgReduction > 0}
                onClick={() => navigate('/navigator/effectiveness')}
              />
            </div>

            {/* Top Skill Gaps */}
            {summary.topGaps.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => navigate('/navigator/skill-map')}>
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Skill Gaps This Year <span className="text-xs text-blue-500 font-normal ml-2">View Skill Map →</span></h2>
                <div className="space-y-3">
                  {summary.topGaps.map(({ gap, label, count }, i) => {
                    const max = summary.topGaps[0].count
                    return (
                      <div key={gap} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-48 shrink-0">{label}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Skill gaps are tagged on referrals during the review process.
                </p>
              </div>
            )}

            {/* Narrative Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => navigate('/navigator/reports')}>
              <h2 className="text-sm font-semibold text-blue-900 mb-2">Leadership Narrative — {schoolYear}</h2>
              <p className="text-sm text-blue-800 leading-relaxed">
                Navigator served <strong>{summary.uniqueStudents}</strong> students
                across <strong>{summary.totalReferrals}</strong> referrals this school year.{' '}
                {summary.diverted > 0 && (
                  <>
                    <strong>{summary.diverted}</strong> students ({Math.round(summary.diverted / summary.totalReferrals * 100)}%)
                    were diverted from {showDaep ? 'DAEP' : 'escalation'} through targeted supports.{' '}
                  </>
                )}
                {summary.escalated > 0 && (
                  <>
                    <strong>{summary.escalated}</strong> student{summary.escalated !== 1 ? 's' : ''} required
                    escalation{showDaep ? ' to DAEP' : ''}.{' '}
                  </>
                )}
                {summary.totalDaysRemoved > 0 && (
                  <>
                    Students spent a combined <strong>{summary.totalDaysRemoved}</strong> days removed
                    (ISS + OSS) during this period.{' '}
                  </>
                )}
                {summary.avgReduction != null && (
                  <>
                    Among tracked interventions, the average incident rate dropped by <strong>{summary.avgReduction}%</strong> post-support.
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BigMetric({ label, value, color, bg, onClick }) {
  return (
    <div className={`${bg} rounded-xl border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all`} onClick={onClick}>
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-2">Click to view details →</p>
    </div>
  )
}

function MetricCard({ label, value, highlight, onClick }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all' : ''}`} onClick={onClick}>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-emerald-600' : 'text-gray-800'}`}>{value ?? '—'}</p>
    </div>
  )
}
