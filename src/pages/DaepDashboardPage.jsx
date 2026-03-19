import { useState, useMemo } from 'react'
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
  useApprovedDaepPlacements,
  useScheduledOrientations,
  useDaepSubPopulations,
  useDaepDaysActions,
  usePendingApprovals,
  useMissedOrientations,
  usePendingPlacementStart,
  useDaepEnrollmentStats,
} from '../hooks/useDaepDashboard'
import { useCampuses } from '../hooks/useCampuses'
import { useAuth } from '../contexts/AuthContext'
import { useReturningThisWeek } from '../hooks/useReentry'
import CampusReceptionScoreCard from '../components/reentry/CampusReceptionScoreCard'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CapacitySettingsModal from '../components/daep/CapacitySettingsModal'
import { formatStudentName, formatDate, formatGradeLevel, getSchoolYearLabel } from '../lib/utils'
import { INCIDENT_STATUS_LABELS, INCIDENT_STATUS_COLORS, SCHEDULING_STATUS_LABELS, SCHEDULING_STATUS_COLORS, ROLE_LABELS } from '../lib/constants'
import { formatTime12h } from '../lib/orientationUtils'

const CHART_COLORS = ['#f97316', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function DaepDashboardPage() {
  const [activeTab, setActiveTab] = useState('operations')

  return (
    <div>
      <Topbar
        title="DAEP Dashboard"
        subtitle={`${getSchoolYearLabel()} School Year`}
      />
      <div className="px-6 pt-4">
        {/* Tab toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: 'operations', label: 'Live Operations' },
            { key: 'analytics', label: 'Analytics' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'operations' && (
        <div className="p-6 space-y-6">
          <CapacityWarningBanner />
          <SummaryCards />
          <CapacityTrackerWidget />
          <ReturningThisWeekWidget />
          <ActiveEnrollmentsTable />
          <ApprovalFlowTable />
          <MissedOrientationsWidget />
          <PendingPlacementStartWidget />
          <ScheduledOrientationsTable />
          <ApprovedPlacementsTable />
          <PendingPlacementsTable />
          <SubPopulationCharts />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="p-6 space-y-6">
          <CapacityTrackerWidget />
          <EnrollmentByGradeTable />
          <CampusReceptionScoreCard />
          <TexasBenchmarkCard />
        </div>
      )}
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
    { label: 'Active Enrolled', value: stats?.activeEnrollments, color: 'text-orange-600', href: '/incidents?status=active&consequence=daep' },
    { label: 'Pending Placement', value: stats?.pendingPlacements, color: 'text-orange-600', href: '/incidents?status=submitted,under_review&consequence=daep' },
    { label: 'Completed YTD', value: stats?.completedYtd, color: 'text-green-600', href: '/incidents?status=completed&consequence=daep' },
    { label: 'Compliance Holds', value: stats?.complianceHolds, color: 'text-red-600', href: '/compliance' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(card => (
        <Link key={card.label} to={card.href} className="block">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
            <p className="text-xs text-gray-500 truncate">{card.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>
              {card.value ?? '--'}
            </p>
          </div>
        </Link>
      ))}
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
                      <StudentFlags
                        student={row.student}
                        hasSeparation={Array.isArray(row.incident_separations) ? row.incident_separations.length > 0 : false}
                      />
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

function StudentFlags({ student, hasSeparation }) {
  if (!student) return null
  const flags = []
  if (student.is_sped) flags.push({ label: 'SPED', color: 'purple' })
  if (student.is_504) flags.push({ label: '504', color: 'blue' })
  if (student.is_ell) flags.push({ label: 'ELL', color: 'orange' })
  if (student.is_homeless) flags.push({ label: 'HML', color: 'red' })
  if (student.is_foster_care) flags.push({ label: 'FC', color: 'red' })
  if (hasSeparation) flags.push({ label: 'SEP', color: 'orange', title: 'Separation order on file' })
  if (!flags.length) return null

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map(f => (
        <Badge key={f.label} color={f.color} size="sm" title={f.title}>{f.label}</Badge>
      ))}
    </div>
  )
}

// =================== APPROVAL FLOW TABLE ===================

const APPROVAL_CHAIN_ROLES = ['cbc', 'counselor', 'sped_coordinator', 'section_504_coordinator', 'sss', 'director_student_affairs']

function ApprovalFlowTable() {
  const { approvals, loading } = usePendingApprovals()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [myOnly, setMyOnly] = useState(false)

  const showToggle = APPROVAL_CHAIN_ROLES.includes(profile?.role)

  const filtered = useMemo(() => {
    if (!myOnly || !profile?.role) return approvals
    return approvals.filter(a => a.current_step === profile.role)
  }, [approvals, myOnly, profile?.role])

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Approval Flow</CardTitle>
        {showToggle && (
          <button
            onClick={() => setMyOnly(!myOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              myOnly
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {myOnly ? 'My Approvals' : 'All Approvals'}
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No pending approval chains.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Offense</th>
                <th className="px-3 py-2">Current Step</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(chain => {
                const incident = Array.isArray(chain.incident) ? chain.incident[0] : chain.incident
                const student = incident?.student
                const offense = incident?.offense
                const steps = (chain.steps || []).sort((a, b) => a.step_order - b.step_order)

                return (
                  <tr
                    key={chain.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => incident?.id && navigate(`/incidents/${incident.id}`)}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {student ? formatStudentName(student) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {student?.student_id_number || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {offense?.title || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge color="orange" size="sm">
                        {ROLE_LABELS[chain.current_step] || chain.current_step}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {formatDate(chain.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {steps.map(step => {
                          const color = step.status === 'approved' ? 'bg-green-500'
                            : step.status === 'denied' ? 'bg-red-500'
                            : step.status === 'returned' ? 'bg-orange-500'
                            : step.status === 'pending' ? 'bg-yellow-400'
                            : 'bg-gray-300'
                          return (
                            <div
                              key={step.id}
                              className={`w-3 h-3 rounded-full ${color}`}
                              title={`${ROLE_LABELS[step.step_role] || step.step_role}: ${step.status}`}
                            />
                          )
                        })}
                      </div>
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

// =================== MISSED ORIENTATIONS WIDGET ===================

function MissedOrientationsWidget() {
  const { missed, loading } = useMissedOrientations()
  const navigate = useNavigate()

  if (loading || missed.length === 0) return null

  return (
    <div className="rounded-xl border border-red-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-red-600">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-white">Missed Orientations ({missed.length})</p>
            <p className="text-xs text-red-100">Scheduled orientation date passed — reschedule required</p>
          </div>
        </div>
        <Link to="/daep/orientations" className="text-xs text-red-100 hover:text-white underline">
          View All Orientations
        </Link>
      </div>
      <div className="bg-red-50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-red-200">
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Scheduled Date</th>
              <th className="px-4 py-2">Days Overdue</th>
              <th className="px-4 py-2">Campus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-100">
            {missed.map(row => {
              const inc = Array.isArray(row.incident) ? row.incident[0] : row.incident
              const daysOverdue = row.orientation_scheduled_date
                ? Math.max(0, Math.floor((Date.now() - new Date(row.orientation_scheduled_date + 'T00:00:00').getTime()) / 86400000))
                : null
              return (
                <tr
                  key={row.id}
                  className="hover:bg-red-100 cursor-pointer"
                  onClick={() => inc?.id && navigate(`/incidents/${inc.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {row.student ? `${row.student.last_name}, ${row.student.first_name}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.student?.student_id_number || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-red-700 font-medium whitespace-nowrap">
                    {row.orientation_scheduled_date
                      ? new Date(row.orientation_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {daysOverdue != null
                      ? <Badge color="red" size="sm">{daysOverdue}d overdue</Badge>
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {inc?.campus?.name || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =================== PENDING PLACEMENT START WIDGET ===================

function PendingPlacementStartWidget() {
  const { pending, loading } = usePendingPlacementStart()
  const navigate = useNavigate()

  if (loading || pending.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Orientation Complete — Awaiting Kiosk Check-In ({pending.length})</p>
            <p className="text-xs text-amber-600">These students completed orientation but have not signed in on the daily check-in kiosk.</p>
          </div>
        </div>
        <Link to="/daep/orientations" className="text-xs text-amber-600 hover:text-amber-800 underline">
          View All Orientations
        </Link>
      </div>
      <div className="bg-amber-50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-amber-200">
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Orientation Completed</th>
              <th className="px-4 py-2">Days Since</th>
              <th className="px-4 py-2">Campus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {pending.map(row => {
              const inc = Array.isArray(row.incident) ? row.incident[0] : row.incident
              const daysSince = row.orientation_completed_date
                ? Math.max(0, Math.floor((Date.now() - new Date(row.orientation_completed_date + 'T00:00:00').getTime()) / 86400000))
                : null
              return (
                <tr
                  key={row.id}
                  className="hover:bg-amber-100 cursor-pointer"
                  onClick={() => inc?.id && navigate(`/incidents/${inc.id}`)}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {row.student ? `${row.student.last_name}, ${row.student.first_name}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.student?.student_id_number || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.orientation_completed_date
                      ? new Date(row.orientation_completed_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {daysSince != null
                      ? <Badge color={daysSince >= 3 ? 'red' : 'yellow'} size="sm">{daysSince}d</Badge>
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {inc?.campus?.name || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =================== SCHEDULED ORIENTATIONS TABLE ===================

function ScheduledOrientationsTable() {
  const { orientations, loading } = useScheduledOrientations()

  return (
    <Card>
      <CardTitle>Scheduled Orientations</CardTitle>
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : orientations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No upcoming orientation sessions.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orientations.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {row.student ? formatStudentName(row.student) : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {row.student?.student_id_number || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {row.orientation_scheduled_date
                      ? new Date(row.orientation_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {row.orientation_scheduled_time
                      ? formatTime12h(row.orientation_scheduled_time)
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={SCHEDULING_STATUS_COLORS[row.orientation_status] || 'blue'} size="sm">
                      {SCHEDULING_STATUS_LABELS[row.orientation_status] || row.orientation_status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// =================== APPROVED PLACEMENTS TABLE ===================

function ApprovedPlacementsTable() {
  const navigate = useNavigate()
  const { placements, loading } = useApprovedDaepPlacements()

  return (
    <Card>
      <CardTitle>Approved Placements</CardTitle>
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : placements.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No approved DAEP placements awaiting scheduling.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Offense</th>
                <th className="px-3 py-2">Assigned Days</th>
                <th className="px-3 py-2">ARD Status</th>
                <th className="px-3 py-2">Orientation Status</th>
                <th className="px-3 py-2">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {placements.map(row => {
                const sched = Array.isArray(row.scheduling) ? row.scheduling[0] : row.scheduling
                return (
                  <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/incidents/${row.id}`)}>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {row.student ? formatStudentName(row.student) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {row.student?.student_id_number || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.offense?.title || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.consequence_days || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {sched?.ard_required ? (
                        <Badge color={SCHEDULING_STATUS_COLORS[sched.ard_status] || 'gray'} size="sm">
                          {SCHEDULING_STATUS_LABELS[sched.ard_status] || 'Pending'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={SCHEDULING_STATUS_COLORS[sched?.orientation_status] || 'yellow'} size="sm">
                        {SCHEDULING_STATUS_LABELS[sched?.orientation_status] || 'Pending'}
                      </Badge>
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

// =================== CAPACITY WARNING BANNER ===================

function CapacityWarningBanner() {
  const { stats, loading } = useDaepEnrollmentStats()
  const { campuses, loading: campusesLoading } = useCampuses()

  if (loading || campusesLoading) return null

  const daepCampuses = campuses.filter(c => c.campus_type === 'daep')
  const totalSeats = daepCampuses.reduce((sum, c) => sum + (c.settings?.daep_seats || 0), 0)
  if (!totalSeats) return null

  const committed = (stats?.occupied?.length ?? 0) + (stats?.reserved?.length ?? 0)
  if (committed <= totalSeats) return null

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
      <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">
          DAEP Over Capacity — {committed} committed of {totalSeats} total seats
        </p>
        <p className="text-xs text-red-600 mt-0.5">
          New placements should be paused. Review the capacity tracker below for a per-campus breakdown.
        </p>
      </div>
    </div>
  )
}

// =================== CAPACITY TRACKER WIDGET ===================

function CapacityTrackerWidget() {
  const { districtId, profile } = useAuth()
  const { stats, loading } = useDaepEnrollmentStats()
  const { campuses, loading: campusesLoading } = useCampuses()
  const [modalOpen, setModalOpen] = useState(false)

  const canEdit = ['admin', 'principal', 'waypoint_admin'].includes(profile?.role)
  const daepCampuses = campuses.filter(c => c.campus_type === 'daep')
  const byCampus = stats?.byCampus || {}

  // District totals
  const occupied = stats?.occupied?.length ?? 0
  const reserved = stats?.reserved?.length ?? 0
  const committed = occupied + reserved
  const totalSeats = daepCampuses.reduce((sum, c) => sum + (c.settings?.daep_seats || 0), 0)
  const anyConfigured = daepCampuses.some(c => c.settings?.daep_seats > 0)
  const overCapacity = anyConfigured && committed > totalSeats

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-orange-600">
        <p className="text-sm font-semibold text-white">DAEP Seat Capacity</p>
        {canEdit && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs text-orange-100 hover:text-white underline"
          >
            {anyConfigured ? 'Edit Capacity' : 'Set Up Capacity'}
          </button>
        )}
      </div>

      <div className="p-4 bg-white">
        {(loading || campusesLoading) ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : daepCampuses.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No DAEP campuses configured.</p>
            <p className="text-xs text-gray-400 mt-1">Add a campus with type "DAEP" in Settings → Campuses.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* District totals */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{occupied}</p>
                <p className="text-xs text-gray-500 mt-0.5">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{reserved}</p>
                <p className="text-xs text-gray-500 mt-0.5">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-700">{committed}</p>
                <p className="text-xs text-gray-500 mt-0.5">Committed</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${overCapacity ? 'text-red-600' : 'text-green-600'}`}>
                  {anyConfigured ? totalSeats - committed : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
              </div>
            </div>

            {overCapacity && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-700 font-medium">Over capacity — committed seats exceed total available</p>
              </div>
            )}

            {/* Per-campus rows */}
            <div className="space-y-3">
              {daepCampuses.map(campus => {
                const seats = campus.settings?.daep_seats || 0
                const campusStats = byCampus[campus.id] || { occupied: 0, reserved: 0, total: 0 }
                const unassigned = byCampus['unassigned'] || { occupied: 0, reserved: 0, total: 0 }
                const campusCommitted = campusStats.occupied + campusStats.reserved
                const campusOver = seats > 0 && campusCommitted > seats

                return (
                  <div key={campus.id} className={`rounded-lg border p-3 ${campusOver ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{campus.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span><strong className="text-orange-600">{campusStats.occupied}</strong> active</span>
                        <span><strong className="text-amber-500">{campusStats.reserved}</strong> approved</span>
                        <span>
                          {seats > 0
                            ? <><strong className={campusOver ? 'text-red-600' : 'text-green-600'}>{seats - campusCommitted}</strong> of {seats} remaining</>
                            : <span className="text-gray-400 italic">No capacity set</span>
                          }
                        </span>
                      </div>
                    </div>
                    {seats > 0 && (
                      <CapacityBar occupied={campusStats.occupied} reserved={campusStats.reserved} total={seats} />
                    )}
                  </div>
                )
              })}

              {/* Unassigned students */}
              {(byCampus['unassigned']?.total > 0) && (
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-yellow-800">Unassigned to DAEP Campus</p>
                    <div className="flex items-center gap-3 text-xs text-yellow-700">
                      <span><strong>{byCampus['unassigned'].occupied}</strong> active</span>
                      <span><strong>{byCampus['unassigned'].reserved}</strong> approved</span>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">These students need a DAEP campus assignment on their incident record.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <CapacitySettingsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          districtId={districtId}
          daepCampuses={daepCampuses}
        />
      )}
    </div>
  )
}

function CapacityBar({ occupied, reserved, total, label }) {
  if (!total) return null
  const occupiedPct = Math.min(100, Math.round((occupied / total) * 100))
  const reservedPct = Math.min(100 - occupiedPct, Math.round((reserved / total) * 100))
  return (
    <div className="space-y-1">
      <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
        <div className="bg-orange-500 transition-all" style={{ width: `${occupiedPct}%` }} title={`Occupied: ${occupied}`} />
        <div className="bg-amber-400 transition-all" style={{ width: `${reservedPct}%` }} title={`Reserved: ${reserved}`} />
      </div>
      {label && <p className="text-xs text-gray-500">{label}</p>}
    </div>
  )
}

// =================== ENROLLMENT BY GRADE TABLE ===================

function gradeLabel(g) {
  const num = parseInt(g)
  if (num === -1) return 'Pre-K'
  if (num === 0) return 'K'
  return `Grade ${num}`
}

function gradeLevel(g) {
  const num = parseInt(g)
  if (num >= 9 && num <= 12) return 'high'
  if (num >= 6 && num <= 8) return 'middle'
  return 'elementary'
}

function EnrollmentByGradeTable() {
  const { stats, loading } = useDaepEnrollmentStats()

  if (loading) {
    return (
      <Card>
        <CardTitle>Enrollment by Grade</CardTitle>
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      </Card>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardTitle>Enrollment by Grade</CardTitle>
        <p className="text-sm text-gray-400 text-center py-8">
          No active or approved DAEP enrollments.
        </p>
      </Card>
    )
  }

  const sortedGrades = Object.keys(stats.byGrade).sort((a, b) => parseInt(a) - parseInt(b))

  const sections = [
    { label: 'Elementary', level: 'elementary', grades: sortedGrades.filter(g => gradeLevel(g) === 'elementary') },
    { label: 'Middle School (6–8)', level: 'middle', grades: sortedGrades.filter(g => gradeLevel(g) === 'middle') },
    { label: 'High School (9–12)', level: 'high', grades: sortedGrades.filter(g => gradeLevel(g) === 'high') },
  ].filter(s => s.grades.length > 0)

  const cols = ['Grade', 'Occupied', 'Reserved', 'Total', 'SPED', '504', 'ELL', 'Homeless', 'FC', 'Military', 'Gifted']

  const SubtotalRow = ({ label: rowLabel, counts }) => (
    <tr className="bg-orange-50 font-semibold text-sm">
      <td className="px-3 py-2 text-gray-800">{rowLabel}</td>
      <td className="px-3 py-2 text-center text-orange-700">{counts.occupied}</td>
      <td className="px-3 py-2 text-center text-amber-600">{counts.reserved}</td>
      <td className="px-3 py-2 text-center text-gray-800">{counts.total}</td>
      <td className="px-3 py-2 text-center text-purple-700">{counts.sped}</td>
      <td className="px-3 py-2 text-center text-blue-700">{counts.is504}</td>
      <td className="px-3 py-2 text-center text-orange-600">{counts.ell}</td>
      <td className="px-3 py-2 text-center text-red-600">{counts.homeless}</td>
      <td className="px-3 py-2 text-center text-red-600">{counts.fosterCare}</td>
      <td className="px-3 py-2 text-center text-gray-600">{counts.military}</td>
      <td className="px-3 py-2 text-center text-gray-600">{counts.gifted}</td>
    </tr>
  )

  const grand = { total: 0, occupied: 0, reserved: 0, sped: 0, is504: 0, ell: 0, homeless: 0, fosterCare: 0, military: 0, gifted: 0 }
  Object.values(stats.byGrade).forEach(c => {
    Object.keys(grand).forEach(k => { grand[k] += c[k] || 0 })
  })

  return (
    <Card>
      <CardTitle>Enrollment by Grade</CardTitle>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
              {cols.map(c => (
                <th key={c} className="px-3 py-2 text-center first:text-left">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sections.flatMap(section => [
              ...section.grades.map(g => {
                const c = stats.byGrade[g]
                return (
                  <tr key={g} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{gradeLabel(g)}</td>
                    <td className="px-3 py-2 text-center text-orange-600 font-medium">{c.occupied}</td>
                    <td className="px-3 py-2 text-center text-amber-500 font-medium">{c.reserved}</td>
                    <td className="px-3 py-2 text-center text-gray-700 font-medium">{c.total}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.sped || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.is504 || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.ell || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.homeless || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.fosterCare || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.military || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.gifted || '—'}</td>
                  </tr>
                )
              }),
              <SubtotalRow
                key={`sub-${section.level}`}
                label={section.label}
                counts={stats.byLevel[section.level]}
              />,
            ])}
            <tr className="bg-gray-100 font-bold text-sm border-t-2 border-gray-200">
              <td className="px-3 py-2 text-gray-900">Grand Total</td>
              <td className="px-3 py-2 text-center text-orange-700">{grand.occupied}</td>
              <td className="px-3 py-2 text-center text-amber-600">{grand.reserved}</td>
              <td className="px-3 py-2 text-center text-gray-900">{grand.total}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.sped}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.is504}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.ell}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.homeless}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.fosterCare}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.military}</td>
              <td className="px-3 py-2 text-center text-gray-700">{grand.gifted}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 px-1">
        <span>FC = Foster Care</span>
        <span>·</span>
        <span>Occupied = status active</span>
        <span>·</span>
        <span>Reserved = approved, not yet started</span>
      </div>
    </Card>
  )
}

// =================== RETURNING THIS WEEK ===================

function ReturningThisWeekWidget() {
  const { plans, loading } = useReturningThisWeek()

  if (loading) return null
  const returning = plans?.returning || []
  const needsCheckin = plans?.returned || []

  if (!returning.length && !needsCheckin.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Returning this week */}
      {returning.length > 0 && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <CardTitle>Returning This Week ({returning.length})</CardTitle>
          </div>
          <div className="divide-y divide-gray-100">
            {returning.map(p => {
              const cl = p.reentry_checklist?.[0]
              const isReady = cl?.is_ready
              const briefSent = cl?.brief_sent_at
              return (
                <Link
                  key={p.id}
                  to={`/plans/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {p.student?.first_name} {p.student?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Returns {new Date(p.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!briefSent && (
                      <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                        Brief not sent
                      </span>
                    )}
                    {isReady ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        Ready
                      </span>
                    ) : (
                      <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                        Checklist incomplete
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {/* Returned — check-in overdue */}
      {needsCheckin.length > 0 && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <CardTitle>Check-in Needed ({needsCheckin.length})</CardTitle>
          </div>
          <div className="divide-y divide-gray-100">
            {needsCheckin.map(p => (
              <Link
                key={p.id}
                to={`/plans/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-900">
                  {p.student?.first_name} {p.student?.last_name}
                </p>
                <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                  {p.daysSinceCheckin === null
                    ? 'No check-ins yet'
                    : `${p.daysSinceCheckin}d since check-in`}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Texas Benchmarking Card ───────────────────────────────────────────────
// Static Texas state averages derived from TEA PEIMS Public Reports (2022-23)

const TX_BENCHMARKS = [
  {
    metric:    'DAEP placement rate',
    txAvg:     '2.3%',
    note:      'Of enrolled students statewide. Consistent referral rates above this may indicate over-reliance on DAEP.',
  },
  {
    metric:    'Average DAEP placement length',
    txAvg:     '42 days',
    note:      'Statewide median. Placements significantly longer may warrant review of individual plan appropriateness.',
  },
  {
    metric:    'SPED students as share of DAEP',
    txAvg:     '21%',
    note:      'SPED students are overrepresented statewide. Rates above 25% may trigger IDEA disproportionality review.',
  },
  {
    metric:    'Re-referral within 90 days',
    txAvg:     '18%',
    note:      'Students re-entering DAEP within 90 days of return. Lower rates indicate stronger campus re-integration.',
  },
  {
    metric:    'Out-of-school suspension rate',
    txAvg:     '4.1%',
    note:      'Of enrolled students (all grades). Districts above this should review OSS as first-response practices.',
  },
]

function TexasBenchmarkCard() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Texas State Benchmarks</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Statewide averages to help contextualize your district's data
          </p>
        </div>
        <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 shrink-0 ml-3">
          TEA 2022–23
        </span>
      </div>

      <div className="space-y-3">
        {TX_BENCHMARKS.map(b => (
          <div key={b.metric} className="flex items-start gap-4 py-2 border-b border-gray-800 last:border-0">
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-200">{b.metric}</span>
              <p className="text-xs text-gray-500 mt-0.5">{b.note}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-sm font-bold text-orange-400">{b.txAvg}</span>
              <p className="text-xs text-gray-600">TX avg</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 mt-4 pt-3 border-t border-gray-800">
        Source: TEA PEIMS discipline data products — tea.texas.gov. Benchmarks are statewide aggregates and do not represent any individual district.
      </p>
    </div>
  )
}
