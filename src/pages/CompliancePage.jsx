import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { SelectField } from '../components/ui/FormField'
import { StudentFlagsSummary } from '../components/students/StudentFlags'
import { useComplianceChecklists } from '../hooks/useCompliance'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from '../hooks/useAccessScope'
import { formatStudentName, formatDate, formatDateTime } from '../lib/utils'
import { CONSEQUENCE_TYPE_LABELS } from '../lib/constants'
import { exportToPdf, exportToExcel } from '../lib/exportUtils'

export default function CompliancePage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const { profile } = useAuth()
  const { scope } = useAccessScope()

  const filters = useMemo(() => {
    const f = {}
    if (!scope.isDistrictWide && scope.scopedCampusIds?.length) {
      f._campusScope = scope.scopedCampusIds
    }
    if (statusFilter) f.status = statusFilter
    return f
  }, [statusFilter, scope])

  const { checklists, loading } = useComplianceChecklists(filters)

  // Stats
  const blocked = checklists.filter(c => c.placement_blocked && !c.block_overridden).length
  const inProgress = checklists.filter(c => c.status === 'in_progress').length
  const completed = checklists.filter(c => c.status === 'completed').length
  const overridden = checklists.filter(c => c.block_overridden).length

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {row.student ? formatStudentName(row.student) : '—'}
          </p>
          <div className="mt-0.5">
            {row.student && <StudentFlagsSummary student={row.student} />}
          </div>
        </div>
      ),
      sortable: false,
    },
    {
      key: 'incident',
      header: 'Incident',
      render: (_, row) => (
        <div className="text-sm">
          <p>{row.incident?.offense?.title || '—'}</p>
          <p className="text-xs text-gray-500">{formatDate(row.incident?.incident_date)}</p>
        </div>
      ),
      sortable: false,
    },
    {
      key: 'consequence',
      header: 'Consequence',
      render: (_, row) => (
        <span className="text-sm">
          {CONSEQUENCE_TYPE_LABELS[row.incident?.consequence_type] || '—'}
        </span>
      ),
      sortable: false,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (_, row) => {
        const items = [
          row.ard_committee_notified,
          row.manifestation_determination,
          row.parent_notified,
          row.fape_plan_documented,
        ]
        const completed = items.filter(Boolean).length
        const total = items.length
        const pct = Math.round((completed / total) * 100)

        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{completed}/{total}</span>
          </div>
        )
      },
      sortable: false,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => {
        if (row.block_overridden) {
          return <Badge color="yellow" size="sm" dot>Overridden</Badge>
        }
        const colors = {
          incomplete: 'red',
          in_progress: 'yellow',
          completed: 'green',
          waived: 'gray',
        }
        const labels = {
          incomplete: 'Blocked',
          in_progress: 'In Progress',
          completed: 'Cleared',
          waived: 'Waived',
        }
        return (
          <Badge color={colors[val] || 'gray'} size="sm" dot>
            {labels[val] || val}
          </Badge>
        )
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (val) => <span className="text-xs text-gray-500">{formatDate(val)}</span>,
    },
  ]

  const exportHeaders = ['Student', 'Incident Date', 'Consequence', 'Compliance Status', 'Items Complete']

  const statusLabels = {
    incomplete: 'Blocked',
    in_progress: 'In Progress',
    completed: 'Cleared',
    waived: 'Waived',
  }

  const buildExportRows = useCallback(() => {
    return checklists.map(c => {
      const items = [
        c.ard_committee_notified,
        c.manifestation_determination,
        c.parent_notified,
        c.fape_plan_documented,
      ]
      const done = items.filter(Boolean).length
      const displayStatus = c.block_overridden ? 'Overridden' : (statusLabels[c.status] || c.status)
      return [
        c.student ? formatStudentName(c.student) : '—',
        formatDate(c.incident?.incident_date),
        CONSEQUENCE_TYPE_LABELS[c.incident?.consequence_type] || '—',
        displayStatus,
        `${done}/4`,
      ]
    })
  }, [checklists])

  const handleExportPdf = useCallback(() => {
    exportToPdf('SPED Compliance', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  const handleExportExcel = useCallback(() => {
    exportToExcel('SPED Compliance', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  return (
    <div>
      <Topbar
        title="SPED Compliance"
        subtitle="Manage compliance checklists for SPED/504 students recommended for DAEP"
        actions={
          <div className="flex items-center gap-1.5">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export PDF">
              PDF
            </button>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export Excel">
              Excel
            </button>
          </div>
        }
      />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Blocked Placements" value={blocked} color="red" />
          <StatCard label="In Progress" value={inProgress} color="yellow" />
          <StatCard label="Completed" value={completed} color="green" />
          <StatCard label="Overridden" value={overridden} color="orange" />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Status"
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'incomplete', label: 'Blocked (Incomplete)' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'waived', label: 'Waived' },
              ]}
              placeholder="All Statuses"
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          <DataTable
            columns={columns}
            data={checklists}
            loading={loading}
            onRowClick={(checklist) => navigate(`/incidents/${checklist.incident_id}`)}
            emptyMessage="No compliance checklists found. Checklists are automatically created when SPED/504 students are recommended for DAEP."
          />
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const bgColors = {
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
  }
  const textColors = {
    red: 'text-red-700',
    yellow: 'text-yellow-700',
    green: 'text-green-700',
    orange: 'text-orange-700',
  }

  return (
    <div className={`p-4 rounded-xl border ${bgColors[color]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
    </div>
  )
}
