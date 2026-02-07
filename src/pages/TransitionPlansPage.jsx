import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransitionPlans } from '../hooks/useTransitionPlans'
import { useCampuses } from '../hooks/useCampuses'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SelectField } from '../components/ui/FormField'
import DataTable from '../components/ui/DataTable'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import StudentFlags from '../components/students/StudentFlags'
import {
  PLAN_STATUS,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_COLORS,
  PLAN_TYPE_LABELS,
} from '../lib/constants'
import { formatStudentNameShort, formatDate, daysRemaining } from '../lib/utils'

export default function TransitionPlansPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { plans, loading } = useTransitionPlans({
    status: statusFilter || undefined,
    plan_type: typeFilter || undefined,
  })
  const { campuses } = useCampuses()

  const canCreate = hasRole(['admin', 'principal', 'ap', 'counselor'])

  // Stats
  const stats = useMemo(() => {
    const all = plans
    return {
      total: all.length,
      active: all.filter((p) => p.status === 'active').length,
      draft: all.filter((p) => p.status === 'draft').length,
      review: all.filter((p) => p.status === 'under_review').length,
      completed: all.filter((p) => p.status === 'completed').length,
    }
  }, [plans])

  const statusOptions = Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const typeOptions = Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">
            {formatStudentNameShort(row.students)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-500">
              {row.students?.student_id_number}
            </span>
            <StudentFlags student={row.students} compact />
          </div>
        </div>
      ),
    },
    {
      key: 'plan_type',
      header: 'Type',
      render: (val) => (
        <span className="text-sm text-gray-700">
          {PLAN_TYPE_LABELS[val] || val}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <Badge color={PLAN_STATUS_COLORS[val]} dot size="sm">
          {PLAN_STATUS_LABELS[val]}
        </Badge>
      ),
    },
    {
      key: 'start_date',
      header: 'Start',
      render: (val) => <span className="text-sm text-gray-600">{formatDate(val)}</span>,
    },
    {
      key: 'end_date',
      header: 'End',
      render: (val) => <span className="text-sm text-gray-600">{formatDate(val)}</span>,
    },
    {
      key: 'days_left',
      header: 'Days Left',
      render: (_, row) => {
        if (row.status === 'completed' || row.status === 'failed') {
          return <span className="text-xs text-gray-400">--</span>
        }
        const days = daysRemaining(row.end_date)
        if (days === null) return <span className="text-xs text-gray-400">--</span>
        return (
          <Badge color={days <= 7 ? 'red' : days <= 14 ? 'yellow' : 'green'} size="sm">
            {days} days
          </Badge>
        )
      },
    },
    {
      key: 'next_review',
      header: 'Next Review',
      render: (_, row) => {
        if (!row.next_review_date) return <span className="text-xs text-gray-400">--</span>
        const days = daysRemaining(row.next_review_date)
        return (
          <span className={`text-xs ${days <= 3 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {formatDate(row.next_review_date)}
          </span>
        )
      },
    },
  ]

  return (
    <div>
      <Topbar
        title="Transition Plans"
        subtitle="Student transition and re-entry plans"
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/plans/new')}>
              + New Plan
            </Button>
          )
        }
      />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MiniStat label="Total Plans" value={stats.total} />
          <MiniStat label="Active" value={stats.active} color="green" />
          <MiniStat label="Draft" value={stats.draft} color="gray" />
          <MiniStat label="Under Review" value={stats.review} color="yellow" />
          <MiniStat label="Completed" value={stats.completed} color="blue" />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <SelectField
                name="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
                placeholder="All Statuses"
              />
            </div>
            <div className="w-full sm:w-48">
              <SelectField
                name="type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={typeOptions}
                placeholder="All Types"
              />
            </div>
          </div>
        </Card>

        {/* Plans Table */}
        <Card>
          <DataTable
            columns={columns}
            data={plans}
            loading={loading}
            emptyMessage="No transition plans found"
            onRowClick={(row) => navigate(`/plans/${row.id}`)}
          />
        </Card>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color = 'gray' }) {
  const textColor = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${textColor[color]}`}>{value}</p>
    </div>
  )
}
