import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SelectField } from '../components/ui/FormField'
import { StudentFlagsSummary } from '../components/students/StudentFlags'
import { useIncidents } from '../hooks/useIncidents'
import { useCampuses } from '../hooks/useCampuses'
import { formatStudentName, formatDate } from '../lib/utils'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
  INCIDENT_STATUS,
} from '../lib/constants'

export default function IncidentsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [consequenceFilter, setConsequenceFilter] = useState('')

  const filters = useMemo(() => {
    const f = {}
    if (statusFilter) f.status = statusFilter
    if (campusFilter) f.campus_id = campusFilter
    if (consequenceFilter) f.consequence_type = consequenceFilter
    return f
  }, [statusFilter, campusFilter, consequenceFilter])

  const { incidents, loading } = useIncidents(filters)
  const { campuses } = useCampuses()

  const columns = [
    {
      key: 'incident_date',
      header: 'Date',
      render: (val) => <span className="text-sm whitespace-nowrap">{formatDate(val)}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {row.student ? formatStudentName(row.student) : '—'}
          </p>
          {row.student && (
            <div className="mt-0.5">
              <StudentFlagsSummary student={row.student} />
            </div>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      key: 'offense',
      header: 'Offense',
      render: (_, row) => (
        <span className="text-sm">{row.offense?.title || '—'}</span>
      ),
      sortable: false,
    },
    {
      key: 'consequence_type',
      header: 'Consequence',
      render: (val, row) => (
        <div>
          <span className="text-sm">{CONSEQUENCE_TYPE_LABELS[val] || val}</span>
          {row.consequence_days && (
            <span className="text-xs text-gray-400 ml-1">({row.consequence_days}d)</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => (
        <div className="flex items-center gap-1">
          <Badge color={INCIDENT_STATUS_COLORS[val] || 'gray'} size="sm" dot>
            {INCIDENT_STATUS_LABELS[val] || val}
          </Badge>
          {row.sped_compliance_required && !row.compliance_cleared && (
            <Badge color="red" size="sm">SPED</Badge>
          )}
        </div>
      ),
    },
  ]

  const statusOptions = Object.entries(INCIDENT_STATUS_LABELS).map(([val, label]) => ({
    value: val,
    label,
  }))

  const consequenceOptions = Object.entries(CONSEQUENCE_TYPE_LABELS).map(([val, label]) => ({
    value: val,
    label,
  }))

  return (
    <div>
      <Topbar
        title="Incidents"
        subtitle={`${incidents.length} incident${incidents.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/incidents/new">
            <Button size="sm">+ New Incident</Button>
          </Link>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Status"
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="All Statuses"
            />
            <SelectField
              label="Campus"
              name="campus"
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              options={campuses.map(c => ({ value: c.id, label: c.name }))}
              placeholder="All Campuses"
            />
            <SelectField
              label="Consequence"
              name="consequence"
              value={consequenceFilter}
              onChange={(e) => setConsequenceFilter(e.target.value)}
              options={consequenceOptions}
              placeholder="All Consequences"
            />
          </div>
        </Card>

        {/* Incidents Table */}
        <Card padding={false}>
          <DataTable
            columns={columns}
            data={incidents}
            loading={loading}
            onRowClick={(incident) => navigate(`/incidents/${incident.id}`)}
            emptyMessage="No incidents found. Create a new incident to get started."
          />
        </Card>
      </div>
    </div>
  )
}
