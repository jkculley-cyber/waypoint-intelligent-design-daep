import { useParams, Link } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import DataTable from '../components/ui/DataTable'
import { PageLoader } from '../components/ui/LoadingSpinner'
import StudentFlags from '../components/students/StudentFlags'
import { useStudent } from '../hooks/useStudents'
import { useIncidents } from '../hooks/useIncidents'
import {
  formatStudentName,
  formatStudentNameShort,
  formatGradeLevel,
  formatDate,
  getColorClasses,
} from '../lib/utils'
import {
  SPED_ELIGIBILITY_CODES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
} from '../lib/constants'

export default function StudentDetailPage() {
  const { id } = useParams()
  const { student, loading } = useStudent(id)
  const { incidents, loading: incidentsLoading } = useIncidents({ student_id: id })

  if (loading) return <PageLoader message="Loading student record..." />
  if (!student) {
    return (
      <div>
        <Topbar title="Student Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This student record could not be found.</p>
          <Link to="/students" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Back to Students
          </Link>
        </div>
      </div>
    )
  }

  const incidentColumns = [
    {
      key: 'incident_date',
      header: 'Date',
      render: (val) => <span className="text-sm">{formatDate(val)}</span>,
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
      render: (val) => (
        <span className="text-sm">{CONSEQUENCE_TYPE_LABELS[val] || val}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const color = INCIDENT_STATUS_COLORS[val] || 'gray'
        return <Badge color={color} size="sm" dot>{INCIDENT_STATUS_LABELS[val] || val}</Badge>
      },
    },
  ]

  return (
    <div>
      <Topbar
        title={formatStudentNameShort(student)}
        subtitle={`Grade ${formatGradeLevel(student.grade_level)} | ID: ${student.student_id_number}`}
      />

      <div className="p-6 space-y-6">
        {/* Student Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Demographics */}
          <Card>
            <CardTitle>Student Information</CardTitle>
            <dl className="mt-4 space-y-3">
              <InfoRow label="Full Name" value={formatStudentName(student)} />
              <InfoRow label="Student ID" value={student.student_id_number} />
              <InfoRow label="Grade" value={formatGradeLevel(student.grade_level)} />
              <InfoRow label="Date of Birth" value={formatDate(student.date_of_birth)} />
              <InfoRow label="Gender" value={student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : student.gender || '—'} />
              <InfoRow label="Campus" value={student.campus?.name || '—'} />
            </dl>
          </Card>

          {/* Special Populations */}
          <Card>
            <CardTitle>Special Populations</CardTitle>
            <div className="mt-4">
              <StudentFlags student={student} size="lg" />
              {student.is_sped && student.sped_eligibility && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-800">SPED Eligibility</p>
                  <p className="text-sm text-purple-600">
                    {SPED_ELIGIBILITY_CODES[student.sped_eligibility] || student.sped_eligibility}
                    {` (${student.sped_eligibility})`}
                  </p>
                </div>
              )}
              {!student.is_sped && !student.is_504 && !student.is_ell && !student.is_homeless && !student.is_foster_care && (
                <p className="text-sm text-gray-400">No special population flags</p>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardTitle>Discipline Summary</CardTitle>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Incidents</span>
                <span className="text-lg font-semibold text-gray-900">{incidents.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Active Incidents</span>
                <span className="text-lg font-semibold text-gray-900">
                  {incidents.filter(i => ['submitted', 'under_review', 'compliance_hold', 'approved', 'active'].includes(i.status)).length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">DAEP Placements</span>
                <span className="text-lg font-semibold text-gray-900">
                  {incidents.filter(i => i.consequence_type === 'daep').length}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Incident History */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <CardTitle>Incident History</CardTitle>
            <Link
              to={`/incidents/new?student=${student.id}`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + New Incident
            </Link>
          </div>
          <DataTable
            columns={incidentColumns}
            data={incidents}
            loading={incidentsLoading}
            onRowClick={(incident) => window.location.href = `/incidents/${incident.id}`}
            emptyMessage="No discipline incidents on record."
          />
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value || '—'}</dd>
    </div>
  )
}
