import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTransitionPlan, useTransitionPlanActions } from '../hooks/useTransitionPlans'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { PageLoader } from '../components/ui/LoadingSpinner'
import StudentFlags from '../components/students/StudentFlags'
import ReviewForm from '../components/plans/ReviewForm'
import ReviewTimeline from '../components/plans/ReviewTimeline'
import InterventionList from '../components/plans/InterventionList'
import PlanProgressChart from '../components/plans/PlanProgressChart'
import {
  PLAN_STATUS_LABELS,
  PLAN_STATUS_COLORS,
  PLAN_TYPE_LABELS,
  CONSEQUENCE_TYPE_LABELS,
} from '../lib/constants'
import {
  formatStudentName,
  formatStudentNameShort,
  formatDate,
  daysRemaining,
  daysElapsed,
  calcPercentage,
} from '../lib/utils'

export default function TransitionPlanDetailPage() {
  const { id } = useParams()
  const { plan, reviews, interventions, loading, refetch } = useTransitionPlan(id)
  const { activatePlan, completePlan } = useTransitionPlanActions()
  const { hasRole } = useAuth()
  const [showReviewForm, setShowReviewForm] = useState(false)

  if (loading) return <PageLoader message="Loading plan..." />
  if (!plan) {
    return (
      <div>
        <Topbar title="Plan Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This transition plan could not be found.</p>
          <Link to="/plans" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Back to Plans
          </Link>
        </div>
      </div>
    )
  }

  const student = plan.students
  const incident = plan.incidents
  const canManage = hasRole(['admin', 'principal', 'ap', 'counselor'])
  const isActive = plan.status === 'active'
  const isDraft = plan.status === 'draft'
  const remaining = daysRemaining(plan.end_date)
  const elapsed = daysElapsed(plan.start_date)
  const totalDays = elapsed + (remaining || 0)
  const progressPct = totalDays > 0 ? calcPercentage(elapsed, totalDays) : 0

  const handleActivate = async () => {
    const { error } = await activatePlan(plan.id)
    if (error) toast.error('Failed to activate plan')
    else {
      toast.success('Plan activated')
      refetch()
    }
  }

  const handleComplete = async () => {
    const { error } = await completePlan(plan.id)
    if (error) toast.error('Failed to complete plan')
    else {
      toast.success('Plan completed')
      refetch()
    }
  }

  return (
    <div>
      <Topbar
        title={`Transition Plan — ${formatStudentNameShort(student)}`}
        subtitle={`${PLAN_TYPE_LABELS[plan.plan_type]} | ${formatDate(plan.start_date)} – ${formatDate(plan.end_date)}`}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && canManage && (
              <Button size="sm" variant="success" onClick={handleActivate}>
                Activate Plan
              </Button>
            )}
            {isActive && canManage && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowReviewForm(true)}>
                  Add Review
                </Button>
                <Button size="sm" onClick={handleComplete}>
                  Mark Complete
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Status + Progress Bar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge color={PLAN_STATUS_COLORS[plan.status]} dot size="lg">
                {PLAN_STATUS_LABELS[plan.status]}
              </Badge>
              <span className="text-sm text-gray-500">
                {PLAN_TYPE_LABELS[plan.plan_type]}
              </span>
            </div>
            {remaining !== null && isActive && (
              <div className="text-right">
                <p className={`text-lg font-bold ${remaining <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                  {remaining} days remaining
                </p>
                <p className="text-xs text-gray-500">{elapsed} days elapsed</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct >= 90 ? 'bg-red-500' : progressPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatDate(plan.start_date)}</span>
            <span>{formatDate(plan.end_date)}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Details */}
            <Card>
              <CardTitle>Plan Details</CardTitle>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailRow label="Plan Type" value={PLAN_TYPE_LABELS[plan.plan_type]} />
                <DetailRow label="Start Date" value={formatDate(plan.start_date)} />
                <DetailRow label="End Date" value={formatDate(plan.end_date)} />
                <DetailRow label="Next Review" value={formatDate(plan.next_review_date) || 'Not scheduled'} />
                {incident && (
                  <>
                    <DetailRow label="Related Incident" value={
                      <Link to={`/incidents/${incident.id}`} className="text-blue-600 hover:underline">
                        View Incident
                      </Link>
                    } />
                    <DetailRow label="Consequence" value={
                      CONSEQUENCE_TYPE_LABELS[incident.consequence_type] || incident.consequence_type
                    } />
                  </>
                )}
                <DetailRow label="Created By" value={plan.profiles?.full_name || '—'} />
                <DetailRow label="Created" value={formatDate(plan.created_at)} />
              </dl>

              {/* Goals */}
              {plan.goals && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Goals</h4>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {plan.goals}
                  </div>
                </div>
              )}

              {/* Success Metrics */}
              {plan.success_metrics && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Success Metrics</h4>
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700 whitespace-pre-wrap">
                    {plan.success_metrics}
                  </div>
                </div>
              )}

              {/* Escalation Protocol */}
              {plan.escalation_protocol && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Escalation Protocol</h4>
                  <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800 whitespace-pre-wrap">
                    {plan.escalation_protocol}
                  </div>
                </div>
              )}
            </Card>

            {/* Interventions */}
            <InterventionList
              interventions={interventions}
              planId={plan.id}
              studentId={plan.student_id}
              canManage={canManage && isActive}
              onUpdate={refetch}
            />

            {/* Review Timeline */}
            <ReviewTimeline reviews={reviews} />

            {/* Progress Chart */}
            {reviews.length > 0 && (
              <PlanProgressChart reviews={reviews} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Student */}
            <Card>
              <CardTitle>Student</CardTitle>
              <div className="mt-4 space-y-3">
                <Link
                  to={`/students/${student?.id}`}
                  className="text-base font-medium text-blue-600 hover:underline"
                >
                  {formatStudentName(student)}
                </Link>
                <p className="text-sm text-gray-600">ID: {student?.student_id_number}</p>
                <p className="text-sm text-gray-600">Grade: {student?.grade_level}</p>
                <StudentFlags student={student} />
              </div>
            </Card>

            {/* Review Schedule */}
            <Card>
              <CardTitle>Review Schedule</CardTitle>
              <div className="mt-4 space-y-2">
                {['30_day', '60_day', '90_day'].map((type) => {
                  const review = reviews.find((r) => r.review_type === type)
                  const isCompleted = !!review
                  return (
                    <div
                      key={type}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isCompleted ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-sm text-gray-700">
                        {type.replace('_', '-').replace('day', ' Day')} Review
                      </span>
                      {isCompleted ? (
                        <Badge color="green" size="sm">Complete</Badge>
                      ) : (
                        <Badge color="gray" size="sm">Pending</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Parent Engagement */}
            {plan.parent_engagement_plan && (
              <Card>
                <CardTitle>Parent Engagement</CardTitle>
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {plan.parent_engagement_plan}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm
          planId={plan.id}
          onClose={() => setShowReviewForm(false)}
          onComplete={() => {
            setShowReviewForm(false)
            refetch()
          }}
        />
      )}
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
