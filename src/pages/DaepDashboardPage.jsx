import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import {
  useDaepSummaryStats,
  useActiveDaepEnrollments,
  usePendingDaepEnrollments,
  useDaepSubPopulations,
  useDaepDaysActions,
} from '../hooks/useDaepDashboard'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatStudentName, formatDate, formatGradeLevel, getSchoolYearLabel } from '../lib/utils'
import { INCIDENT_STATUS_LABELS, INCIDENT_STATUS_COLORS } from '../lib/constants'

const CHART_COLORS = ['#f97316', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function DaepDashboardPage() {
  return (
    <div>
      <Topbar
        title="DAEP Dashboard"
        subtitle={`${getSchoolYearLabel()} School Year`}
      />
      <div className="p-6 space-y-6">
        <SummaryCards />
        <ActiveEnrollmentsTable />
        <PendingPlacementsTable />
        <SubPopulationCharts />
      </div>
    </div>
  )
}

// =================== SUMMARY CARDS ===================

function SummaryCards() {
  const { stats, loading } = useDaepSummaryStats()

  if (loading) {
    return <div className="flex justify-center py-8"><LoadingSpinner /></div>
  }

  const cards = [
    { label: 'Active Enrolled', value: stats?.activeEnrollments, color: 'text-orange-600', href: null },
    { label: 'Pending Placement', value: stats?.pendingPlacements, color: 'text-orange-600', href: null },
    { label: 'Completed YTD', value: stats?.completedYtd, color: 'text-green-600', href: null },
    { label: 'Compliance Holds', value: stats?.complianceHolds, color: 'text-red-600', href: '/compliance' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(card => {
        const content = (
          <div className={`bg-white border border-gray-200 rounded-lg px-4 py-3 ${card.href ? 'hover:border-orange-300 hover:shadow-md transition-all cursor-pointer' : ''}`}>
            <p className="text-xs text-gray-500 truncate">{card.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>
              {card.value ?? '--'}
            </p>
          </div>
        )
        return card.href ? (
          <Link key={card.label} to={card.href} className="block">{content}</Link>
        ) : (
          <div key={card.label}>{content}</div>
        )
      })}
    </div>
  )
}

// =================== ACTIVE ENROLLMENTS TABLE ===================

function ActiveEnrollmentsTable() {
  const { enrollments, loading, refetch } = useActiveDaepEnrollments()
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [adjustRow, setAdjustRow] = useState(null)
  const canEdit = hasRole(['admin', 'principal'])

  return (
    <Card>
      <CardTitle>DAEP Enrollments</CardTitle>
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : enrollments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No active DAEP enrollments.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Grade</th>
                <th className="px-3 py-2">Home Campus</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Days Assigned</th>
                <th className="px-3 py-2">Days Served</th>
                <th className="px-3 py-2">Days Remaining</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Flags</th>
                {canEdit && <th className="px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enrollments.map(row => {
                const progressPct = row.daysTotal
                  ? Math.min(100, Math.round(((row.daysElapsed || 0) / row.daysTotal) * 100))
                  : 0

                return (
                  <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/incidents/${row.id}`)}>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {row.student ? formatStudentName(row.student) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.student?.student_id_number || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.student ? formatGradeLevel(row.student.grade_level) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.campus?.name || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        color={row.status === 'approved' ? 'blue' : row.status === 'completed' ? 'green' : 'indigo'}
                        size="sm"
                        dot
                      >
                        {row.status === 'approved' ? 'Approved' : row.status === 'completed' ? 'Completed' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-medium">
                      {row.consequence_days ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-medium">
                      {row.daysServed ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      <DaysRemainingBadge days={row.daysRemaining} status={row.status} />
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 120 }}>
                      <ProgressBar pct={progressPct} />
                    </td>
                    <td className="px-3 py-2">
                      <StudentFlags student={row.student} />
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setAdjustRow(row) }}
                          className="text-gray-400 hover:text-orange-600 p-1 rounded hover:bg-orange-50 transition-colors"
                          title="Adjust days"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {adjustRow && (
        <AdjustDaysModal
          enrollment={adjustRow}
          onClose={() => setAdjustRow(null)}
          onSaved={() => {
            setAdjustRow(null)
            refetch()
          }}
        />
      )}
    </Card>
  )
}

function DaysAbsentBadge({ days }) {
  const count = days || 0
  if (count === 0) return <span className="text-gray-400 text-xs">0</span>
  const color = count >= 5 ? 'red' : count >= 3 ? 'yellow' : 'gray'
  return <Badge color={color} size="sm">{count}</Badge>
}

function DaysRemainingBadge({ days, status }) {
  if (status === 'approved') return <Badge color="blue" size="sm">Approved for Placement</Badge>
  if (status === 'completed') return <Badge color="green" size="sm">Completed Placement</Badge>
  if (days == null) return <span className="text-gray-400 text-xs">N/A</span>
  if (days === 0) return <Badge color="green" size="sm">Completed Placement</Badge>
  const color = days <= 5 ? 'red' : days <= 15 ? 'yellow' : 'green'
  return <Badge color={color} size="sm">{days}d remaining</Badge>
}

function ProgressBar({ pct }) {
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-500' : 'bg-orange-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function StudentFlags({ student }) {
  if (!student) return null
  const flags = []
  if (student.is_sped) flags.push({ label: 'SPED', color: 'purple' })
  if (student.is_504) flags.push({ label: '504', color: 'blue' })
  if (student.is_ell) flags.push({ label: 'ELL', color: 'orange' })
  if (student.is_homeless) flags.push({ label: 'HML', color: 'red' })
  if (student.is_foster_care) flags.push({ label: 'FC', color: 'red' })
  if (!flags.length) return null

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map(f => (
        <Badge key={f.label} color={f.color} size="sm">{f.label}</Badge>
      ))}
    </div>
  )
}

// =================== ADJUST DAYS MODAL ===================

function AdjustDaysModal({ enrollment, onClose, onSaved }) {
  const studentName = enrollment.student ? formatStudentName(enrollment.student) : 'Unknown'
  const { updateDaepDays, loading } = useDaepDaysActions()

  const [formData, setFormData] = useState({
    consequence_days: enrollment.consequence_days || 0,
    days_absent: enrollment.days_absent || 0,
    consequence_end: enrollment.consequence_end || '',
    notes: '',
  })

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const result = await updateDaepDays(enrollment.id, {
      consequence_days: Number(formData.consequence_days),
      days_absent: Number(formData.days_absent),
      consequence_end: formData.consequence_end || null,
    })

    if (result.success) {
      toast.success('DAEP placement updated')
      onSaved()
    } else {
      toast.error(result.error || 'Failed to update placement')
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Adjust DAEP Placement"
      description={studentName}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <span className="font-medium">Current Days Assigned:</span> {enrollment.consequence_days ?? '—'}
          <span className="ml-4 font-medium">Days Absent:</span> {enrollment.days_absent ?? 0}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Days Assigned
          </label>
          <input
            type="number"
            min={1}
            value={formData.consequence_days}
            onChange={e => handleChange('consequence_days', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Days Absent
          </label>
          <input
            type="number"
            min={0}
            value={formData.days_absent}
            onChange={e => handleChange('days_absent', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New End Date
          </label>
          <input
            type="date"
            value={formData.consequence_end}
            onChange={e => handleChange('consequence_end', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason / Notes
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Why is this change being made?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>
    </Modal>
  )
}

// =================== PENDING PLACEMENTS TABLE ===================

function PendingPlacementsTable() {
  const navigate = useNavigate()
  const { enrollments, loading } = usePendingDaepEnrollments()

  return (
    <Card>
      <CardTitle>Pending Placements</CardTitle>
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : enrollments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No pending DAEP placements.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Incident Date</th>
                <th className="px-3 py-2">Offense</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Compliance</th>
                <th className="px-3 py-2">Assigned Days</th>
                <th className="px-3 py-2">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enrollments.map(row => {
                const compliance = row.compliance
                const isBlocked = Array.isArray(compliance)
                  ? compliance.some(c => c.placement_blocked)
                  : compliance?.placement_blocked

                return (
                  <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/incidents/${row.id}`)}>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {row.student ? formatStudentName(row.student) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.student?.student_id_number || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {formatDate(row.incident_date)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.offense?.title || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        color={INCIDENT_STATUS_COLORS[row.status] || 'gray'}
                        size="sm"
                        dot
                      >
                        {INCIDENT_STATUS_LABELS[row.status] || row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={isBlocked ? 'red' : 'green'} size="sm">
                        {isBlocked ? 'Blocked' : 'Cleared'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.consequence_days || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StudentFlags student={row.student} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// =================== SUB-POPULATION CHARTS ===================

function SubPopulationCharts() {
  const { data, loading } = useDaepSubPopulations()

  if (loading) {
    return <div className="flex justify-center py-8"><LoadingSpinner /></div>
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-400 text-center py-8">
          No DAEP data available for sub-population analysis this school year.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Race/Ethnicity */}
        <Card>
          <CardTitle>By Race/Ethnicity</CardTitle>
          <div className="mt-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byRace}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {data.byRace.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By Gender */}
        <Card>
          <CardTitle>By Gender</CardTitle>
          <div className="mt-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byGender}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {data.byGender.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By SPED/504/Gen Ed */}
        <Card>
          <CardTitle>By SPED / 504 / Gen Ed</CardTitle>
          <div className="mt-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bySped} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" name="DAEP Placements" radius={[4, 4, 0, 0]}>
                  {data.bySped.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* By Grade Level */}
        <Card>
          <CardTitle>By Grade Level</CardTitle>
          <div className="mt-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byGrade} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" name="DAEP Placements" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Homeless / Foster Care counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Homeless</p>
          <p className="text-2xl font-bold mt-0.5 text-red-600">{data.homeless}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500">Foster Care</p>
          <p className="text-2xl font-bold mt-0.5 text-red-600">{data.fosterCare}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 col-span-2">
          <p className="text-xs text-gray-500">Total DAEP Placements (YTD)</p>
          <p className="text-2xl font-bold mt-0.5 text-gray-900">{data.total}</p>
        </div>
      </div>
    </div>
  )
}
