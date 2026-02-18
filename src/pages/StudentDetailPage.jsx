import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import DataTable from '../components/ui/DataTable'
import { PageLoader } from '../components/ui/LoadingSpinner'
import StudentFlags from '../components/students/StudentFlags'
import { useStudent } from '../hooks/useStudents'
import { useIncidents } from '../hooks/useIncidents'
import { useTransitionPlans } from '../hooks/useTransitionPlans'
import { useRecidivism } from '../hooks/useRecidivism'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  formatStudentName,
  formatStudentNameShort,
  formatGradeLevel,
  formatDate,
} from '../lib/utils'
import {
  SPED_ELIGIBILITY_CODES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
  PLAN_TYPE_LABELS,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_COLORS,
} from '../lib/constants'

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { student, loading } = useStudent(id)
  const { hasFeature } = useAuth()
  const { incidents, loading: incidentsLoading } = useIncidents({ student_id: id })
  const { plans, loading: plansLoading } = useTransitionPlans({ student_id: id })
  const showRecidivism = hasFeature('recidivism')
  const { assessment, loading: riskLoading } = useRecidivism(showRecidivism ? id : null)

  // Fetch the most recent DAEP orientation form for this student
  const [orientationForm, setOrientationForm] = useState(null)
  useEffect(() => {
    if (!id) return
    supabase
      .from('daep_placement_scheduling')
      .select('id, orientation_status, orientation_completed_date, orientation_form_data, incident:incidents(id, campus:campuses!campus_id(id, name))')
      .eq('student_id', id)
      .not('orientation_form_data', 'is', null)
      .order('orientation_completed_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setOrientationForm(data))
  }, [id])

  if (loading) return <PageLoader message="Loading student record..." />
  if (!student) {
    return (
      <div>
        <Topbar title="Student Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This student record could not be found.</p>
          <Link to="/students" className="text-orange-600 hover:underline text-sm mt-2 inline-block">
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

        {/* Recidivism Risk Assessment */}
        {showRecidivism && <Card>
          <CardTitle>Recidivism Risk Assessment</CardTitle>
          {riskLoading ? (
            <div className="mt-4 text-sm text-gray-400">Calculating risk...</div>
          ) : !assessment ? (
            <div className="mt-4 text-sm text-gray-400">Unable to calculate risk assessment.</div>
          ) : (
            <div className="mt-4 space-y-6">
              {/* Score Display */}
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-gray-900">
                  {assessment.score}<span className="text-lg text-gray-400">/100</span>
                </div>
                <Badge
                  color={assessment.riskLevel === 'High' ? 'red' : assessment.riskLevel === 'Medium' ? 'yellow' : 'green'}
                  size="md"
                >
                  {assessment.riskLevel} Risk
                </Badge>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${
                      assessment.score > 66 ? 'bg-red-500' : assessment.score > 33 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${assessment.score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">Low</span>
                  <span className="text-xs text-gray-400">Medium</span>
                  <span className="text-xs text-gray-400">High</span>
                </div>
              </div>

              {/* Contributing Factors */}
              {assessment.score === 0 ? (
                <p className="text-sm text-gray-500">No incidents on record.</p>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Contributing Factors</h4>
                  <div className="space-y-2">
                    {[...assessment.factors]
                      .sort((a, b) => b.points - a.points)
                      .map((factor) => (
                        <div key={factor.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{factor.label}</p>
                            <p className="text-xs text-gray-500">{factor.description}</p>
                          </div>
                          <Badge
                            color={factor.points === 0 ? 'green' : factor.points >= factor.maxPoints * 0.7 ? 'red' : 'yellow'}
                            size="sm"
                          >
                            +{factor.points}pts
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Suggested Interventions */}
              {hasFeature('interventions') && assessment.suggestions && assessment.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggested Interventions</h4>
                  <div className="space-y-2">
                    {assessment.suggestions.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <Badge color="orange" size="sm">Tier {s.tier}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>}

        {/* Transition Plans */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <CardTitle>Transition Plans</CardTitle>
          </div>
          {plansLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No transition plans for this student.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {plans.map((plan) => {
                const nextDate = plan.next_review_date || plan.review_30_date || plan.review_60_date || plan.review_90_date
                const isOverdue = nextDate && new Date(nextDate) < new Date()
                return (
                  <Link
                    key={plan.id}
                    to={`/plans/${plan.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge color={PLAN_STATUS_COLORS[plan.status] || 'gray'} size="sm">
                          {PLAN_STATUS_LABELS[plan.status] || plan.status}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {isOverdue && plan.status === 'active' && (
                          <Badge color="red" size="sm">Review Overdue</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        {/* Orientation Reflection & Behavior Plan */}
        {orientationForm?.orientation_form_data && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Orientation Reflection &amp; Behavior Plan</CardTitle>
              <div className="flex items-center gap-2">
                <Badge color="green" size="sm">Completed</Badge>
                {orientationForm.orientation_completed_date && (
                  <span className="text-xs text-gray-400">
                    {new Date(orientationForm.orientation_completed_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            {orientationForm.orientation_form_data.reflection && (
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Student Reflection</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {orientationForm.orientation_form_data.reflection}
                </div>
              </div>
            )}

            {orientationForm.orientation_form_data.behavior_plan?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Behavior Plan Goals</h4>
                <div className="space-y-3">
                  {orientationForm.orientation_form_data.behavior_plan.map((goal, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-orange-600 mb-2">Goal {idx + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Behavior to Improve</p>
                          <p className="text-gray-800">{goal.behavior || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Supports Needed</p>
                          <p className="text-gray-800">{goal.supports || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Interventions Needed</p>
                          <p className="text-gray-800">{goal.interventions || '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Incident History */}
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <CardTitle>Incident History</CardTitle>
            <Link
              to={`/incidents/new?student=${student.id}`}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              + New Incident
            </Link>
          </div>
          <DataTable
            columns={incidentColumns}
            data={incidents}
            loading={incidentsLoading}
            onRowClick={(incident) => navigate(`/incidents/${incident.id}`)}
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
