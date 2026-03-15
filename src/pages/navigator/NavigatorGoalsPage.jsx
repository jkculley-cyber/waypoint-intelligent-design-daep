import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import Topbar from '../../components/layout/Topbar'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  useNavigatorGoals,
  useNavigatorYOYData,
  useNavigatorPlacements,
  saveNavigatorGoal,
  currentSchoolYear,
} from '../../hooks/useNavigator'
import { ROLES } from '../../lib/constants'

// ─── School Year Helpers ────────────────────────────────────────────────────────

function getSchoolYearBounds(schoolYear) {
  const [startY] = schoolYear.split('-')
  const endY = parseInt(startY) + 1
  return { start: `${startY}-08-01`, end: `${endY}-07-31` }
}

function weeksIntoYear(schoolYear) {
  const { start } = getSchoolYearBounds(schoolYear)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeks = Math.floor((Date.now() - new Date(start)) / msPerWeek) + 1
  return Math.max(1, Math.min(weeks, 36))
}

function expectedByWeek(baseline, reductionPct, week, totalWeeks = 36) {
  const target = Math.round(baseline * (1 - reductionPct / 100))
  return Math.round(baseline - (baseline - target) * (week / totalWeeks))
}

// ─── Campus Goal Card ──────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const colorClass = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  }[color] || 'bg-blue-500'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`${colorClass} h-2 rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function statusColor(ytd, trajectory) {
  if (trajectory <= 0) return 'green'
  const ratio = ytd / trajectory
  if (ratio <= 1.0) return 'green'
  if (ratio <= 1.2) return 'yellow'
  return 'red'
}

function CampusGoalCard({ goal, placements, currentWeek, onEdit, isAdmin }) {
  const campusId = goal.campus_id
  const issTarget = Math.round(goal.iss_baseline * (1 - goal.iss_reduction_pct / 100))
  const ossTarget = Math.round(goal.oss_baseline * (1 - goal.oss_reduction_pct / 100))

  // YTD counts for this campus
  const campusPlacements = placements.filter(p => p.campus_id === campusId)
  const issYTD = campusPlacements.filter(p => p.placement_type === 'iss').length
  const ossYTD = campusPlacements.filter(p => p.placement_type === 'oss').length

  // Trajectory for current week
  const issTrajectory = expectedByWeek(goal.iss_baseline, goal.iss_reduction_pct, currentWeek)
  const ossTrajectory = expectedByWeek(goal.oss_baseline, goal.oss_reduction_pct, currentWeek)

  const issStatus = statusColor(issYTD, issTrajectory)
  const ossStatus = statusColor(ossYTD, ossTrajectory)

  // Mini sparkline — last 8 weeks
  const sparkData = useMemo(() => {
    const { start } = getSchoolYearBounds(goal.school_year)
    const yearStart = new Date(start)
    const weeks = Array.from({ length: 8 }, (_, i) => ({ week: i + 1, iss: 0, oss: 0 }))
    const startWeek = Math.max(0, currentWeek - 8)
    campusPlacements.forEach(p => {
      const d = new Date(p.start_date)
      const w = Math.floor((d - yearStart) / (7 * 24 * 60 * 60 * 1000))
      const idx = w - startWeek
      if (idx >= 0 && idx < 8) {
        if (p.placement_type === 'iss') weeks[idx].iss++
        else if (p.placement_type === 'oss') weeks[idx].oss++
      }
    })
    return weeks
  }, [campusPlacements, currentWeek, goal.school_year])

  const statusBorderClass = {
    green: 'border-l-green-400',
    yellow: 'border-l-yellow-400',
    red: 'border-l-red-400',
  }[issStatus] || 'border-l-gray-300'

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${statusBorderClass} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{goal.campuses?.name || 'Campus'}</h3>
          <span className="text-xs text-gray-400">{goal.school_year}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {goal.iss_reduction_pct}% / {goal.oss_reduction_pct}% goal
          </span>
          {isAdmin && (
            <button
              onClick={() => onEdit(goal.campus_id)}
              className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-1"
              title="Edit goal"
            >
              ✎
            </button>
          )}
        </div>
      </div>

      {/* ISS row */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 font-medium">ISS</span>
          <span className="text-xs text-gray-700">
            <span className={`font-semibold ${issStatus === 'red' ? 'text-red-600' : issStatus === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
              {issYTD}
            </span>
            <span className="text-gray-400"> / {issTarget} target</span>
          </span>
        </div>
        <ProgressBar value={issYTD} max={issTarget > 0 ? issTarget : goal.iss_baseline || 1} color={issStatus} />
      </div>

      {/* OSS row */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 font-medium">OSS</span>
          <span className="text-xs text-gray-700">
            <span className={`font-semibold ${ossStatus === 'red' ? 'text-red-600' : ossStatus === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
              {ossYTD}
            </span>
            <span className="text-gray-400"> / {ossTarget} target</span>
          </span>
        </div>
        <ProgressBar value={ossYTD} max={ossTarget > 0 ? ossTarget : goal.oss_baseline || 1} color={ossStatus} />
      </div>

      {/* Mini sparkline */}
      <div style={{ height: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sparkData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <XAxis dataKey="week" hide />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v, n) => [v, n.toUpperCase()]} />
            <Bar dataKey="iss" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="oss" stackId="a" fill="#f97316" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">Last 8 weeks</p>
    </div>
  )
}

// ─── Set Goals Modal ───────────────────────────────────────────────────────────

function SetGoalsModal({ isOpen, onClose, schoolYear, existingGoals, initialCampusId, onSaved }) {
  const { districtId, profile } = useAuth()
  const [campuses, setCampuses] = useState([])
  const [form, setForm] = useState({
    campus_id: '',
    school_year: schoolYear,
    iss_baseline: '',
    iss_reduction_pct: '10',
    oss_baseline: '',
    oss_reduction_pct: '10',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Load campuses and reset form when modal opens
  useEffect(() => {
    if (!isOpen || !districtId) return
    supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name')
      .then(({ data }) => setCampuses(data || []))
    // If opened with a specific campus, pre-populate from existing goal
    const startCampusId = initialCampusId || ''
    if (startCampusId) {
      const existing = existingGoals?.find(g => g.campus_id === startCampusId)
      if (existing) {
        setForm({
          campus_id: startCampusId,
          school_year: schoolYear,
          iss_baseline: String(existing.iss_baseline),
          iss_reduction_pct: String(existing.iss_reduction_pct),
          oss_baseline: String(existing.oss_baseline),
          oss_reduction_pct: String(existing.oss_reduction_pct),
        })
      } else {
        setForm({ campus_id: startCampusId, school_year: schoolYear, iss_baseline: '', iss_reduction_pct: '10', oss_baseline: '', oss_reduction_pct: '10' })
      }
    } else {
      setForm({
        campus_id: '',
        school_year: schoolYear,
        iss_baseline: '',
        iss_reduction_pct: '10',
        oss_baseline: '',
        oss_reduction_pct: '10',
      })
    }
    setError(null)
  }, [isOpen, districtId, schoolYear, initialCampusId])

  // Pre-populate form when campus changes to match existing goal
  function handleCampusChange(campusId) {
    const existing = existingGoals?.find(g => g.campus_id === campusId)
    if (existing) {
      setForm(f => ({
        ...f,
        campus_id: campusId,
        iss_baseline: String(existing.iss_baseline),
        iss_reduction_pct: String(existing.iss_reduction_pct),
        oss_baseline: String(existing.oss_baseline),
        oss_reduction_pct: String(existing.oss_reduction_pct),
      }))
    } else {
      setForm(f => ({
        ...f,
        campus_id: campusId,
        iss_baseline: '',
        iss_reduction_pct: '10',
        oss_baseline: '',
        oss_reduction_pct: '10',
      }))
    }
  }

  // Compute targets in real time
  const issTarget = form.iss_baseline
    ? Math.round(parseFloat(form.iss_baseline) * (1 - parseFloat(form.iss_reduction_pct || 0) / 100))
    : null
  const ossTarget = form.oss_baseline
    ? Math.round(parseFloat(form.oss_baseline) * (1 - parseFloat(form.oss_reduction_pct || 0) / 100))
    : null

  async function handleSave() {
    if (!form.campus_id) { setError('Please select a campus.'); return }
    if (!form.iss_baseline || !form.oss_baseline) { setError('Please enter baseline values.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await saveNavigatorGoal({
      district_id: districtId,
      campus_id: form.campus_id,
      school_year: form.school_year,
      iss_baseline: parseInt(form.iss_baseline),
      iss_reduction_pct: parseFloat(form.iss_reduction_pct),
      oss_baseline: parseInt(form.oss_baseline),
      oss_reduction_pct: parseFloat(form.oss_reduction_pct),
      created_by: profile?.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Campus Goals"
      description="Set ISS/OSS reduction targets for a campus this school year."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Goal</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.campus_id}
            onChange={e => handleCampusChange(e.target.value)}
          >
            <option value="">Select a campus…</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Year</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.school_year}
            onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))}
            placeholder="e.g. 2025-26"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISS Baseline (prior year)</label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.iss_baseline}
              onChange={e => setForm(f => ({ ...f, iss_baseline: e.target.value }))}
              placeholder="e.g. 45"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISS Reduction %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.iss_reduction_pct}
              onChange={e => setForm(f => ({ ...f, iss_reduction_pct: e.target.value }))}
            />
            {issTarget !== null && (
              <p className="text-xs text-blue-600 mt-1">Target: {issTarget} placements</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OSS Baseline (prior year)</label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.oss_baseline}
              onChange={e => setForm(f => ({ ...f, oss_baseline: e.target.value }))}
              placeholder="e.g. 20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OSS Reduction %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.oss_reduction_pct}
              onChange={e => setForm(f => ({ ...f, oss_reduction_pct: e.target.value }))}
            />
            {ossTarget !== null && (
              <p className="text-xs text-blue-600 mt-1">Target: {ossTarget} placements</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NavigatorGoalsPage() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole([ROLES.ADMIN, ROLES.PRINCIPAL])

  const [schoolYear, setSchoolYear] = useState(currentSchoolYear())
  const [metricToggle, setMetricToggle] = useState('combined') // 'iss' | 'oss' | 'combined'
  const [modalOpen, setModalOpen] = useState(false)
  const [editCampusId, setEditCampusId] = useState(null)

  const { goals, loading: goalsLoading, refetch: refetchGoals } = useNavigatorGoals(schoolYear)
  const { currentYear, priorYear, loading: yoyLoading } = useNavigatorYOYData(schoolYear)

  // All placements for current school year (for campus cards + weekly chart)
  const { start: syStart, end: syEnd } = getSchoolYearBounds(schoolYear)
  const { placements, loading: placementsLoading } = useNavigatorPlacements({})

  // Filter placements to current school year
  const yearPlacements = useMemo(() =>
    placements.filter(p => p.start_date >= syStart && p.start_date <= syEnd),
    [placements, syStart, syEnd]
  )

  const currentWeek = weeksIntoYear(schoolYear)

  // ── Campuses behind trajectory (>1.2× expected) ──
  const behindCampuses = useMemo(() => {
    if (!goals.length) return []
    return goals.filter(goal => {
      const campusPlacements = yearPlacements.filter(p => p.campus_id === goal.campus_id)
      const issYTD = campusPlacements.filter(p => p.placement_type === 'iss').length
      const ossYTD = campusPlacements.filter(p => p.placement_type === 'oss').length
      const issTraj = expectedByWeek(goal.iss_baseline, goal.iss_reduction_pct, currentWeek)
      const ossTraj = expectedByWeek(goal.oss_baseline, goal.oss_reduction_pct, currentWeek)
      return (issTraj > 0 && issYTD / issTraj > 1.2) || (ossTraj > 0 && ossYTD / ossTraj > 1.2)
    })
  }, [goals, yearPlacements, currentWeek])

  // ── YOY chart data ──
  const yoyChartData = currentYear.map((cur, i) => {
    const prior = priorYear[i] || { iss: 0, oss: 0, total: 0 }
    return {
      month: cur.label,
      'This Year': metricToggle === 'iss' ? cur.iss : metricToggle === 'oss' ? cur.oss : cur.total,
      'Prior Year': metricToggle === 'iss' ? prior.iss : metricToggle === 'oss' ? prior.oss : prior.total,
    }
  })

  // ── Weekly progress chart data ──
  const weeklyData = useMemo(() => {
    const { start } = getSchoolYearBounds(schoolYear)
    const yearStart = new Date(start)
    const msPerWeek = 7 * 24 * 60 * 60 * 1000

    // Aggregate district-wide placements by week
    const weeks = Array.from({ length: currentWeek }, (_, i) => ({
      week: i + 1,
      iss: 0,
      oss: 0,
    }))

    yearPlacements.forEach(p => {
      const d = new Date(p.start_date)
      const w = Math.floor((d - yearStart) / msPerWeek)
      if (w >= 0 && w < currentWeek) {
        if (p.placement_type === 'iss') weeks[w].iss++
        else if (p.placement_type === 'oss') weeks[w].oss++
      }
    })

    // Running cumulative
    let cumIss = 0, cumOss = 0
    return weeks.map(w => {
      cumIss += w.iss
      cumOss += w.oss

      // District-wide goal trajectory
      const totalIssBaseline = goals.reduce((s, g) => s + (g.iss_baseline || 0), 0)
      const totalOssBaseline = goals.reduce((s, g) => s + (g.oss_baseline || 0), 0)
      // Weighted average reduction %
      const avgIssReduction = goals.length > 0
        ? goals.reduce((s, g) => s + (g.iss_reduction_pct || 0), 0) / goals.length
        : 10
      const avgOssReduction = goals.length > 0
        ? goals.reduce((s, g) => s + (g.oss_reduction_pct || 0), 0) / goals.length
        : 10

      const issGoalTraj = totalIssBaseline > 0 ? expectedByWeek(totalIssBaseline, avgIssReduction, w.week) : null
      const ossGoalTraj = totalOssBaseline > 0 ? expectedByWeek(totalOssBaseline, avgOssReduction, w.week) : null

      return {
        week: `Wk ${w.week}`,
        'ISS Actual': cumIss,
        'OSS Actual': cumOss,
        'ISS Goal': issGoalTraj,
        'OSS Goal': ossGoalTraj,
      }
    })
  }, [yearPlacements, goals, currentWeek, schoolYear])

  // School year options (current ± 1)
  const [startY] = schoolYear.split('-')
  const yearOptions = [
    `${parseInt(startY) - 1}-${startY.slice(-2)}`,
    schoolYear,
    `${parseInt(startY) + 1}-${String(parseInt(startY) + 2).slice(-2)}`,
  ]

  const loading = goalsLoading || yoyLoading || placementsLoading

  return (
    <div>
      <Topbar
        title="Navigator — Goals & Progress"
        subtitle="Year-over-year tracking and campus reduction targets"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={schoolYear}
              onChange={e => setSchoolYear(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {isAdmin && (
              <Button onClick={() => setModalOpen(true)} size="sm">
                Set Goals
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">

        {/* ── Behind-trajectory alert banner ──────────────────────────────── */}
        {behindCampuses.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {behindCampuses.length} campus{behindCampuses.length !== 1 ? 'es are' : ' is'} behind trajectory
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {behindCampuses.map(g => g.campuses?.name || 'Unknown').join(', ')} — placements exceed 120% of expected week {currentWeek} target. Review interventions.
              </p>
            </div>
          </div>
        )}

        {/* ── Year-Over-Year Chart ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Year-Over-Year Comparison</h2>
            <div className="flex gap-1">
              {[
                { key: 'combined', label: 'Combined' },
                { key: 'iss', label: 'ISS' },
                { key: 'oss', label: 'OSS' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMetricToggle(key)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    metricToggle === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {yoyLoading ? (
            <div className="flex items-center justify-center" style={{ height: 280 }}>
              <p className="text-gray-400 text-sm">Loading…</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={yoyChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="curGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="priorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="This Year"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#curGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Prior Year"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#priorGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Weekly Progress Chart ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            District Weekly Progress <span className="text-gray-400 font-normal">(cumulative, Week {currentWeek} of 36)</span>
          </h2>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 280 }}>
              <p className="text-gray-400 text-sm">Loading…</p>
            </div>
          ) : weeklyData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">No placement data for this school year yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} interval={Math.floor(weeklyData.length / 6)} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="ISS Actual" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="OSS Actual" stroke="#f97316" strokeWidth={2} dot={false} />
                {goals.length > 0 && (
                  <>
                    <Line type="monotone" dataKey="ISS Goal" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="OSS Goal" stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
          {goals.length === 0 && !loading && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Goal trajectories will appear once campus goals are set.
            </p>
          )}
        </div>

        {/* ── Campus Goal Cards ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Campus Goals</h2>
            <span className="text-xs text-gray-400">{goals.length} campus{goals.length !== 1 ? 'es' : ''} with goals set</span>
          </div>

          {goalsLoading ? (
            <div className="text-center text-gray-400 text-sm py-8">Loading campus goals…</div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 border-dashed p-10 text-center">
              <TargetIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">No goals set for {schoolYear}</p>
              {isAdmin && (
                <p className="text-xs text-gray-400 mt-1">
                  Click <strong>Set Goals</strong> to configure campus reduction targets.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map(goal => (
                <CampusGoalCard
                  key={goal.id}
                  goal={goal}
                  placements={yearPlacements}
                  currentWeek={currentWeek}
                  isAdmin={isAdmin}
                  onEdit={campusId => { setEditCampusId(campusId); setModalOpen(true) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <SetGoalsModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditCampusId(null) }}
        schoolYear={schoolYear}
        existingGoals={goals}
        initialCampusId={editCampusId}
        onSaved={refetchGoals}
      />
    </div>
  )
}

function TargetIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v2m0 14v2M3 12h2m14 0h2M6.343 6.343l1.414 1.414m8.486 8.486l1.414 1.414M6.343 17.657l1.414-1.414M16.243 7.757l1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  )
}
