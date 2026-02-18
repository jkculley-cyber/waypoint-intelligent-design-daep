import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useIncident } from '../hooks/useIncidents'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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
} from '../lib/utils'

export default function ParentIncidentViewPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { incident, loading } = useIncident(id)

  // FERPA ownership check: verify this incident belongs to one of the parent's children
  const [authorized, setAuthorized] = useState(null) // null=checking, true=ok, false=denied
  useEffect(() => {
    if (!incident || !user?.id) return
    const studentId = incident.student?.id
    if (!studentId) { setAuthorized(false); return }
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('id', studentId)
      .eq('parent_user_id', user.id)
      .then(({ count }) => setAuthorized((count || 0) > 0))
  }, [incident, user?.id])

  // Fetch check-in count for this placement
  const [daysServed, setDaysServed] = useState(0)
  useEffect(() => {
    if (!incident?.student?.id || !incident.consequence_start) return
    const fetchCount = async () => {
      let query = supabase
        .from('daily_behavior_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', incident.student.id)
        .gte('tracking_date', incident.consequence_start)
      if (incident.consequence_end) {
        query = query.lte('tracking_date', incident.consequence_end)
      }
      const { count } = await query
      setDaysServed(count || 0)
    }
    fetchCount()
  }, [incident?.student?.id, incident?.consequence_start, incident?.consequence_end])

  if (loading || (incident && authorized === null)) return <PageLoader message="Loading record..." />
  if (!incident || authorized === false) {
    return (
      <div>
        <Topbar title="Record Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This record could not be found.</p>
          <Link to="/parent" className="text-orange-600 hover:underline text-sm mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const student = incident.student
  const offense = incident.offense
  const totalAssigned = incident.consequence_days || 0
  const remaining = totalAssigned > 0 ? Math.max(0, totalAssigned - daysServed) : null
  const isCompleted = remaining === 0 && totalAssigned > 0

  return (
    <div>
      <Topbar
        title="Discipline Record"
        subtitle={`${formatStudentNameShort(student)} | ${formatDate(incident.incident_date)}`}
        actions={
          <Link to="/parent">
            <button className="text-sm text-orange-600 hover:text-orange-700">
              Back to Dashboard
            </button>
          </Link>
        }
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Compliance Hold Explanation */}
        {incident.status === 'compliance_hold' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800">Placement on Hold — Compliance Review in Progress</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your child's placement is currently on hold while the school completes a required compliance review.
              This review ensures that all legal requirements for students with disabilities are met before any
              placement decision is finalized. You will be notified once the review is complete. If you have
              questions, please contact the campus SPED Coordinator.
            </p>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-3">
          <Badge color={INCIDENT_STATUS_COLORS[incident.status]} dot size="lg">
            {INCIDENT_STATUS_LABELS[incident.status]}
          </Badge>
          {remaining !== null && ['active', 'approved'].includes(incident.status) && (
            <span className="text-sm text-gray-500">
              {isCompleted ? 'Placement completed' : `${remaining} days remaining (${daysServed}/${totalAssigned} served)`}
            </span>
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
              value={totalAssigned ? `${totalAssigned} days` : '—'}
            />
            <DetailRow label="Start Date" value={formatDate(incident.consequence_start)} />
            <DetailRow label="End Date" value={formatDate(incident.consequence_end)} />
          </dl>

          {/* Progress bar for active consequences */}
          {['active', 'approved'].includes(incident.status) && totalAssigned > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{daysServed}/{totalAssigned} days served</span>
                <span>{isCompleted ? 'Completed' : `${remaining} days remaining`}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : 'bg-orange-500'}`}
                  style={{
                    width: `${Math.min(100, (daysServed / totalAssigned) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Important Notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-orange-800">Your Rights</h3>
          <p className="text-sm text-orange-700 mt-1">
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
