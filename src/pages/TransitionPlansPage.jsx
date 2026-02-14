import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransitionPlans } from '../hooks/useTransitionPlans'
import { useCampuses } from '../hooks/useCampuses'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from '../hooks/useAccessScope'
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
import { exportToPdf, exportToExcel } from '../lib/exportUtils'

export default function TransitionPlansPage() {
  const navigate = useNavigate()
  const { hasRole, profile } = useAuth()
  const { scope } = useAccessScope()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filters = useMemo(() => {
    const f = {}
    if (!scope.isDistrictWide && scope.scopedCampusIds?.length) {
      f._campusScope = scope.scopedCampusIds
    }
    if (scope.spedOnly) f._spedOnly = true
    if (statusFilter) f.status = statusFilter
    if (typeFilter) f.plan_type = typeFilter
    return f
  }, [statusFilter, typeFilter, scope])

  const { plans, loading } = useTransitionPlans(filters)
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

  const exportHeaders = ['Student', 'Plan Type', 'Status', 'Start Date', 'End Date', 'Next Review']

  const buildExportRows = useCallback(() => {
    return plans.map(p => [
      formatStudentNameShort(p.students),
      PLAN_TYPE_LABELS[p.plan_type] || p.plan_type,
      PLAN_STATUS_LABELS[p.status] || p.status,
      formatDate(p.start_date),
      formatDate(p.end_date),
      p.next_review_date ? formatDate(p.next_review_date) : '—',
    ])
  }, [plans])

  const handleExportPdf = useCallback(() => {
    exportToPdf('Transition Plans', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
      landscape: true,
    })
  }, [buildExportRows, profile])

  const handleExportExcel = useCallback(() => {
    exportToExcel('Transition Plans', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  return (
    <div>
      <Topbar
        title="Transition Plans"
        subtitle="Student transition and re-entry plans"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={handleExportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export PDF">
                PDF
              </button>
              <button onClick={handleExportExcel} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export Excel">
                Excel
              </button>
            </div>
            {canCreate && (
              <Button size="sm" onClick={() => navigate('/plans/new')}>
                + New Plan
              </Button>
            )}
          </div>
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
    blue: 'text-orange-600',
    red: 'text-red-600',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${textColor[color]}`}>{value}</p>
    </div>
  )
}
