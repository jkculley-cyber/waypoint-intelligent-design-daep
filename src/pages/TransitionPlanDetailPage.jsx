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
  PROGRESS_RATING_LABELS,
  PROGRESS_RATING_COLORS,
} from '../lib/constants'
import {
  formatStudentName,
  formatStudentNameShort,
  formatDate,
  daysRemaining,
  daysElapsed,
  calcPercentage,
} from '../lib/utils'

function formatJsonField(val) {
  if (!val) return null
  if (typeof val === 'string') return val
  if (Array.isArray(val) && val.length === 0) return null
  if (typeof val === 'object' && Object.keys(val).length === 0) return null
  if (Array.isArray(val)) return val.join('\n')
  return JSON.stringify(val, null, 2)
}

function getNextReviewDate(plan, reviews) {
  const reviewDates = [
    { type: '30_day', date: plan.review_30_date },
    { type: '60_day', date: plan.review_60_date },
    { type: '90_day', date: plan.review_90_date },
  ]
  const completedTypes = new Set(reviews.map(r => r.review_type))
  const today = new Date().toISOString().slice(0, 10)

  for (const rd of reviewDates) {
    if (rd.date && !completedTypes.has(rd.type)) {
      return rd.date
    }
  }
  return null
}

function isReviewOverdue(date) {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const reviewDate = new Date(date)
  reviewDate.setHours(0, 0, 0, 0)
  return reviewDate <= today
}

function isReviewDueSoon(date) {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const reviewDate = new Date(date)
  reviewDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((reviewDate - today) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= 7
}

export default function TransitionPlanDetailPage() {
  const { id } = useParams()
  const { plan, reviews, interventions, loading, refetch } = useTransitionPlan(id)
  const { activatePlan, completePlan } = useTransitionPlanActions()
  const { hasRole, districtId } = useAuth()
  const [showReviewForm, setShowReviewForm] = useState(false)

  if (loading) return <PageLoader message="Loading plan..." />
  if (!plan) {
    return (
      <div>
        <Topbar title="Plan Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This transition plan could not be found.</p>
          <Link to="/plans" className="text-orange-600 hover:underline text-sm mt-2 inline-block">
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
  const nextReview = getNextReviewDate(plan, reviews)
  const metricsText = plan.metrics || formatJsonField(plan.success_metrics)
  const escalationText = formatJsonField(plan.escalation_protocol)

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
        subtitle={`${PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type} | ${formatDate(plan.start_date)} – ${formatDate(plan.end_date)}`}
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
        {/* Review Due Alert */}
        {isActive && nextReview && isReviewOverdue(nextReview) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Review Overdue</p>
              <p className="text-sm text-red-600">A review was due on {formatDate(nextReview)}. Please complete the review as soon as possible.</p>
            </div>
            {canManage && (
              <Button size="sm" variant="danger" onClick={() => setShowReviewForm(true)} className="ml-auto">
                Complete Review
              </Button>
            )}
          </div>
        )}
        {isActive && nextReview && isReviewDueSoon(nextReview) && !isReviewOverdue(nextReview) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-800">Review Due Soon</p>
              <p className="text-sm text-yellow-700">Next review is due on {formatDate(nextReview)}.</p>
            </div>
          </div>
        )}

        {/* Status + Progress Bar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge color={PLAN_STATUS_COLORS[plan.status]} dot size="lg">
                {PLAN_STATUS_LABELS[plan.status]}
              </Badge>
              <span className="text-sm text-gray-500">
                {PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}
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
                <DetailRow label="Plan Type" value={PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type} />
                <DetailRow label="Start Date" value={formatDate(plan.start_date)} />
                <DetailRow label="End Date" value={formatDate(plan.end_date)} />
                <DetailRow label="Next Review" value={nextReview ? formatDate(nextReview) : 'Not scheduled'} />
                {incident && (
                  <>
                    <DetailRow label="Related Incident" value={
                      <Link to={`/incidents/${incident.id}`} className="text-orange-600 hover:underline">
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
              {metricsText && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Success Metrics</h4>
                  <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700 whitespace-pre-wrap">
                    {metricsText}
                  </div>
                </div>
              )}

              {/* Escalation Protocol */}
              {escalationText && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Escalation Protocol</h4>
                  <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800 whitespace-pre-wrap">
                    {escalationText}
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
                  className="text-base font-medium text-orange-600 hover:underline"
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
                {[
                  { type: '30_day', label: '30-Day Review', date: plan.review_30_date },
                  { type: '60_day', label: '60-Day Review', date: plan.review_60_date },
                  { type: '90_day', label: '90-Day Review', date: plan.review_90_date },
                ].map(({ type, label, date }) => {
                  const review = reviews.find((r) => r.review_type === type)
                  const isCompleted = !!review
                  const overdue = !isCompleted && isActive && isReviewOverdue(date)
                  const dueSoon = !isCompleted && isActive && isReviewDueSoon(date)

                  return (
                    <div
                      key={type}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isCompleted ? 'bg-green-50' : overdue ? 'bg-red-50' : dueSoon ? 'bg-yellow-50' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <span className="text-sm text-gray-700">{label}</span>
                        {date && (
                          <p className="text-xs text-gray-500">{formatDate(date)}</p>
                        )}
                      </div>
                      {isCompleted ? (
                        <Badge color="green" size="sm">Complete</Badge>
                      ) : overdue ? (
                        <Badge color="red" size="sm">Overdue</Badge>
                      ) : dueSoon ? (
                        <Badge color="yellow" size="sm">Due Soon</Badge>
                      ) : (
                        <Badge color="gray" size="sm">Pending</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Latest Review Summary */}
            {reviews.length > 0 && (
              <Card>
                <CardTitle>Latest Review</CardTitle>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Progress</span>
                    <Badge
                      color={PROGRESS_RATING_COLORS[reviews[reviews.length - 1].overall_progress] || 'gray'}
                      size="sm"
                    >
                      {PROGRESS_RATING_LABELS[reviews[reviews.length - 1].overall_progress] || reviews[reviews.length - 1].overall_progress || '—'}
                    </Badge>
                  </div>
                  {reviews[reviews.length - 1].intervention_effectiveness && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Effectiveness</span>
                      <span className="text-xs font-medium text-gray-700">
                        {reviews[reviews.length - 1].intervention_effectiveness.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {reviews[reviews.length - 1].implementation_fidelity && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Fidelity</span>
                      <span className="text-xs font-medium text-gray-700">
                        {reviews[reviews.length - 1].implementation_fidelity.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {reviews[reviews.length - 1].escalation_needed && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700 font-medium">
                      Escalation Needed
                    </div>
                  )}
                </div>
              </Card>
            )}

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
          studentId={plan.student_id}
          districtId={plan.district_id}
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
