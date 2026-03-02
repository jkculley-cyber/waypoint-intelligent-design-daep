import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Topbar from '../../components/layout/Topbar'
import { useSkillGapData, SKILL_GAP_LABELS } from '../../hooks/useNavigator'

const SUPPORT_TYPE_LABELS = {
  cico: 'CICO',
  behavior_contract: 'Behavior Contract',
  counseling_referral: 'Counseling Referral',
  parent_contact: 'Parent Conference',
  mentoring: 'Mentoring',
  other: 'Other',
}

const SKILL_DESCRIPTIONS = {
  emotional_regulation: 'Difficulty managing emotional responses; escalates quickly under stress.',
  executive_functioning: 'Struggles with planning, organization, and task initiation.',
  peer_conflict_resolution: 'Challenges navigating peer disagreements without adult intervention.',
  academic_frustration_tolerance: 'Behavioral disruptions triggered by academic difficulty.',
  impulse_control: 'Acts before thinking; difficulty delaying responses.',
  adult_communication: 'Disrespect, defiance, or poor tone when addressing staff.',
}

const CHART_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff']

export default function NavigatorSkillMapPage() {
  const { data, loading, error, refetch } = useSkillGapData()
  const [selected, setSelected] = useState(null)

  const selectedSkill = data.find(d => d.gap === selected) || data[0] || null

  const chartData = data.map(d => ({ name: d.label.replace(' ', '\n'), fullLabel: d.label, count: d.count, unique: d.unique_students, gap: d.gap }))

  return (
    <div>
      <Topbar
        title="Skill Gap Map"
        subtitle="Identify deficit patterns and match evidence-based interventions"
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
            Loading skill gap data...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500 text-sm">{error}</div>
        ) : data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">No skill gap data yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Skill gaps are tagged on referrals. Open a referral and select the underlying skill deficit to populate this map.
            </p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Referral Frequency by Skill Gap</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="fullLabel"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) => [value, name === 'count' ? 'Referrals' : 'Unique Students']}
                    labelFormatter={label => label}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[4,4,0,0]} cursor="pointer" onClick={d => setSelected(d.gap)}>
                    {chartData.map((entry, i) => (
                      <Cell key={entry.gap} fill={selected === entry.gap ? '#1d4ed8' : CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Skill Gap Breakdown &amp; Recommended Interventions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Skill Gap</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Referrals</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Unique Students</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Recommended Supports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((d, i) => (
                      <tr
                        key={d.gap}
                        className={`transition-colors cursor-pointer ${selected === d.gap ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setSelected(d.gap === selected ? null : d.gap)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            {d.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {d.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{d.unique_students}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                          {SKILL_DESCRIPTIONS[d.gap] || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.interventions.map(iv => (
                              <span key={iv} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {iv}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info note */}
            <p className="text-xs text-gray-400">
              Skill gaps are tagged on individual referrals. To populate this map, open a referral and set the "Skill Gap" field when reviewing.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
