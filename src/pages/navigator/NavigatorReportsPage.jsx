import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format, subMonths, subDays, startOfMonth } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { exportToPdf, exportToExcel } from '../../lib/exportUtils'

const CHART_COLORS = ['#3b82f6', '#2563eb', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4']

const DATE_PRESETS = [
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
  { key: 'semester', label: 'This Semester' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

function getPresetRange(key) {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  switch (key) {
    case '30d':
      return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: todayStr }
    case '90d':
      return { from: format(subDays(today, 90), 'yyyy-MM-dd'), to: todayStr }
    case 'semester': {
      const month = today.getMonth()
      const y = today.getFullYear()
      // Fall semester: Aug-Dec, Spring semester: Jan-May
      if (month >= 7) return { from: `${y}-08-01`, to: `${y}-12-31` }
      return { from: `${y}-01-01`, to: `${y}-05-31` }
    }
    case 'year': {
      const month = today.getMonth()
      const y = today.getFullYear()
      if (month >= 7) return { from: `${y}-08-01`, to: `${y + 1}-07-31` }
      return { from: `${y - 1}-08-01`, to: `${y}-07-31` }
    }
    default:
      return { from: format(subMonths(today, 6), 'yyyy-MM-dd'), to: todayStr }
  }
}

export default function NavigatorReportsPage() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [trendData, setTrendData] = useState([])
  const [issOssData, setIssOssData] = useState([])
  const [offenseData, setOffenseData] = useState([])
  const [campusData, setCampusData] = useState([])
  const [rangePreset, setRangePreset] = useState('90d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [drillDown, setDrillDown] = useState(null) // { type: 'campus'|'offense'|'month', key: '...', label: '...' }
  const [allReferrals, setAllReferrals] = useState([])

  const dateRange = useMemo(() => {
    if (rangePreset === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo }
    }
    return getPresetRange(rangePreset)
  }, [rangePreset, customFrom, customTo])

  useEffect(() => {
    if (!districtId) return
    loadReportData()
  }, [districtId, dateRange.from, dateRange.to])

  async function loadReportData() {
    setLoading(true)

    // Build monthly buckets from date range
    const rangeStart = new Date(dateRange.from)
    const rangeEnd = new Date(dateRange.to)
    const months = []
    let cursor = startOfMonth(rangeStart)
    while (cursor <= rangeEnd) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      months.push({
        label: format(cursor, 'MMM yy'),
        start: format(cursor, 'yyyy-MM-dd'),
        end: format(monthEnd, 'yyyy-MM-dd'),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }

    // Campus scoping helper — non-admins only see assigned campuses
    const scope = (q, campusCol = 'campus_id') => {
      if (!isAdmin && campusIds?.length) q = q.in(campusCol, campusIds)
      return q
    }

    const [referralsRes, placementsRes] = await Promise.all([
      scope(supabase.from('navigator_referrals')
        .select('id, referral_date, description, status, outcome, student_id, campus_id, students(first_name, last_name, grade_level), campuses(name), offense_codes(code, description)')
        .eq('district_id', districtId)
        .gte('referral_date', dateRange.from).lte('referral_date', dateRange.to)
        .order('referral_date', { ascending: false })),
      scope(supabase.from('navigator_placements').select('start_date, placement_type').eq('district_id', districtId)
        .gte('start_date', dateRange.from).lte('start_date', dateRange.to)),
    ])

    const refs = referralsRes.data || []
    setAllReferrals(refs)
    setDrillDown(null)

    // Trend: referrals by month
    const trend = months.map(m => {
      const count = refs.filter(r => r.referral_date >= m.start && r.referral_date <= m.end).length
      return { month: m.label, start: m.start, end: m.end, referrals: count }
    })
    setTrendData(trend)

    // ISS vs OSS breakdown
    const issCount = (placementsRes.data || []).filter(p => p.placement_type === 'iss').length
    const ossCount = (placementsRes.data || []).filter(p => p.placement_type === 'oss').length
    setIssOssData([
      { name: 'ISS', value: issCount },
      { name: 'OSS', value: ossCount },
    ])

    // Top 10 offense codes
    const offenseMap = {}
    refs.forEach(r => {
      if (r.offense_codes) {
        const key = r.offense_codes.code
        offenseMap[key] = offenseMap[key] || { code: key, description: r.offense_codes.description, count: 0 }
        offenseMap[key].count++
      }
    })
    const offenses = Object.values(offenseMap).sort((a, b) => b.count - a.count).slice(0, 10)
    setOffenseData(offenses)

    // By campus
    const campusMap = {}
    refs.forEach(r => {
      if (r.campuses) {
        const name = r.campuses.name
        campusMap[name] = (campusMap[name] || 0) + 1
      }
    })
    const campusList = Object.entries(campusMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    setCampusData(campusList)

    setLoading(false)
  }

  const rangeLabel = rangePreset === 'custom'
    ? `${customFrom || '?'} to ${customTo || '?'}`
    : DATE_PRESETS.find(p => p.key === rangePreset)?.label || ''

  const handleExportPdf = () => {
    const headers = ['Month', 'Referrals']
    const rows = trendData.map(d => [d.month, d.referrals])
    exportToPdf('Navigator — Referral Trend Report', headers, rows, { subtitle: rangeLabel, filename: 'navigator_trend_report' })
  }

  const handleExportExcel = () => {
    const headers = ['Month', 'Referrals']
    const rows = trendData.map(d => [d.month, d.referrals])
    exportToExcel('Navigator Trend', headers, rows, { filename: 'navigator_trend_report' })
  }

  if (loading) {
    return (
      <div>
        <Topbar title="Navigator — Reports" />
        <div className="p-6 text-center text-gray-400">Loading reports...</div>
      </div>
    )
  }

  return (
    <div>
      <Topbar
        title="Navigator — Reports"
        subtitle="Discipline trends and behavioral analytics"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Export PDF</button>
            <button onClick={handleExportExcel} className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Export Excel</button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Date Range Picker */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 mr-1">Date Range:</span>
            {DATE_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setRangePreset(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  rangePreset === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            {rangePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-blue-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Referral Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Referral Trend ({rangeLabel})</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="referrals" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ISS vs OSS Donut */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">ISS vs OSS Ratio</h2>
            {issOssData[0]?.value === 0 && issOssData[1]?.value === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No placement data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={issOssData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {issOssData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* By Campus */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Referrals by Campus</h2>
            {campusData.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {campusData.map((c, i) => {
                  const max = campusData[0]?.count || 1
                  return (
                    <button key={i} onClick={() => setDrillDown({ type: 'campus', key: c.name, label: c.name })} className="flex items-center gap-3 w-full text-left hover:bg-blue-50 rounded-lg px-1 py-0.5 transition-colors">
                      <span className="text-xs text-gray-600 w-32 truncate shrink-0" title={c.name}>{c.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(c.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-6 text-right">{c.count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Offense Codes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Offense Codes</h2>
          {offenseData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No offense code data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={offenseData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={75} />
                <Tooltip formatter={(v, n, p) => [v, p.payload.description || p.payload.code]} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => setDrillDown({ type: 'offense', key: d.code, label: `${d.code} — ${d.description}` })} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Drill-Down Panel */}
        {drillDown && (() => {
          const drillDownRows = allReferrals.filter(r => {
            if (drillDown.type === 'campus') return r.campuses?.name === drillDown.key
            if (drillDown.type === 'offense') return r.offense_codes?.code === drillDown.key
            if (drillDown.type === 'month') return r.referral_date >= drillDown.start && r.referral_date <= drillDown.end
            return false
          })
          return (
          <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-blue-100 bg-blue-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-blue-900">
                  {drillDown.type === 'campus' && `Referrals at ${drillDown.label}`}
                  {drillDown.type === 'offense' && `Referrals for ${drillDown.label}`}
                  {drillDown.type === 'month' && `Referrals in ${drillDown.label}`}
                </h2>
                <p className="text-xs text-blue-700 mt-0.5">
                  {drillDownRows.length} referral{drillDownRows.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setDrillDown(null)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Close</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Student</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Campus</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Offense</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drillDownRows.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <Link to={`/navigator/students/${r.student_id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {r.students ? `${r.students.first_name} ${r.students.last_name}` : '—'}
                          </Link>
                          <span className="ml-1 text-xs text-gray-400">Gr {r.students?.grade_level}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{r.referral_date ? format(new Date(r.referral_date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{r.campuses?.name || '—'}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{r.offense_codes ? `${r.offense_codes.code} — ${r.offense_codes.description}` : r.description?.slice(0, 40) || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            r.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{r.status?.replace(/_/g, ' ')}</span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          )
        })()}
      </div>
    </div>
  )
}
