import { useParams, Link } from 'react-router-dom'
import { useIncident } from '../hooks/useIncidents'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { PageLoader } from '../components/ui/LoadingSpinner'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  OFFENSE_CATEGORY_LABELS,
} from '../lib/constants'
import {
  formatStudentNameShort,
  formatDate,
  daysRemaining,
} from '../lib/utils'

export default function ParentIncidentViewPage() {
  const { id } = useParams()
  const { incident, loading } = useIncident(id)

  if (loading) return <PageLoader message="Loading record..." />
  if (!incident) {
    return (
      <div>
        <Topbar title="Record Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This record could not be found.</p>
          <Link to="/parent" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const student = incident.student
  const offense = incident.offense
  const remaining = daysRemaining(incident.consequence_end)

  return (
    <div>
      <Topbar
        title="Discipline Record"
        subtitle={`${formatStudentNameShort(student)} | ${formatDate(incident.incident_date)}`}
        actions={
          <Link to="/parent">
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Back to Dashboard
            </button>
          </Link>
        }
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <Badge color={INCIDENT_STATUS_COLORS[incident.status]} dot size="lg">
            {INCIDENT_STATUS_LABELS[incident.status]}
          </Badge>
          {remaining !== null && incident.status === 'active' && (
            <span className="text-sm text-gray-500">{remaining} days remaining</span>
          )}
        </div>

        {/* Incident Info */}
        <Card>
          <CardTitle>Incident Information</CardTitle>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailRow label="Date" value={formatDate(incident.incident_date)} />
            <DetailRow label="Location" value={incident.location || '—'} />
            <DetailRow label="Offense" value={offense?.title || offense?.name || '—'} />
            <DetailRow label="Category" value={OFFENSE_CATEGORY_LABELS[offense?.category] || '—'} />
            <DetailRow label="Severity" value={
              <Badge color={SEVERITY_COLORS[offense?.severity]} size="sm">
                {SEVERITY_LABELS[offense?.severity]}
              </Badge>
            } />
            <div className="sm:col-span-2">
              <dt className="text-sm text-gray-500">Description</dt>
              <dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                {incident.description || 'No description provided.'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Consequence */}
        <Card>
          <CardTitle>Consequence</CardTitle>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailRow
              label="Type"
              value={CONSEQUENCE_TYPE_LABELS[incident.consequence_type] || incident.consequence_type || '—'}
            />
            <DetailRow
              label="Duration"
              value={incident.consequence_days ? `${incident.consequence_days} days` : '—'}
            />
            <DetailRow label="Start Date" value={formatDate(incident.consequence_start)} />
            <DetailRow label="End Date" value={formatDate(incident.consequence_end)} />
          </dl>

          {/* Progress bar for active consequences */}
          {incident.status === 'active' && incident.consequence_start && incident.consequence_end && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{remaining} days remaining</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((incident.consequence_days - remaining) / incident.consequence_days) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800">Your Rights</h3>
          <p className="text-sm text-blue-700 mt-1">
            You have the right to review your child's discipline records and appeal any decisions.
            Contact the school administration or your child's counselor if you have questions or
            wish to schedule a meeting.
          </p>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">
        {typeof value === 'string' ? value || '—' : value}
      </dd>
    </div>
  )
}
