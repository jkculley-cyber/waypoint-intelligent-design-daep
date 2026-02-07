import { useParams, Link } from 'react-router-dom'
import { useTransitionPlan } from '../hooks/useTransitionPlans'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { PageLoader } from '../components/ui/LoadingSpinner'
import ReviewTimeline from '../components/plans/ReviewTimeline'
import PlanProgressChart from '../components/plans/PlanProgressChart'
import {
  PLAN_STATUS_LABELS,
  PLAN_STATUS_COLORS,
  PLAN_TYPE_LABELS,
  INTERVENTION_CATEGORY_LABELS,
  PROGRESS_RATING_LABELS,
  PROGRESS_RATING_COLORS,
} from '../lib/constants'
import { formatStudentNameShort, formatDate, daysRemaining, calcPercentage, daysElapsed } from '../lib/utils'

const TIER_COLORS = { 1: 'green', 2: 'yellow', 3: 'red' }

export default function ParentPlanViewPage() {
  const { id } = useParams()
  const { plan, reviews, interventions, loading } = useTransitionPlan(id)

  if (loading) return <PageLoader message="Loading plan..." />
  if (!plan) {
    return (
      <div>
        <Topbar title="Plan Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This plan could not be found.</p>
          <Link to="/parent" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const student = plan.students
  const remaining = daysRemaining(plan.end_date)
  const elapsed = daysElapsed(plan.start_date)
  const totalDays = elapsed + (remaining || 0)
  const progressPct = totalDays > 0 ? calcPercentage(elapsed, totalDays) : 0
  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null

  return (
    <div>
      <Topbar
        title={`Transition Plan — ${formatStudentNameShort(student)}`}
        subtitle={PLAN_TYPE_LABELS[plan.plan_type]}
        actions={
          <Link to="/parent">
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Back to Dashboard
            </button>
          </Link>
        }
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Status + Progress */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Badge color={PLAN_STATUS_COLORS[plan.status]} dot size="lg">
              {PLAN_STATUS_LABELS[plan.status]}
            </Badge>
            {remaining !== null && (
              <span className={`text-lg font-bold ${remaining <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                {remaining} days remaining
              </span>
            )}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                progressPct >= 90 ? 'bg-red-500' : progressPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatDate(plan.start_date)}</span>
            <span>{formatDate(plan.end_date)}</span>
          </div>

          {/* Latest Rating */}
          {latestReview && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              <span className="text-sm text-gray-500">Latest Progress:</span>
              <Badge color={PROGRESS_RATING_COLORS[latestReview.progress_rating]} size="lg">
                {PROGRESS_RATING_LABELS[latestReview.progress_rating]}
              </Badge>
              <span className="text-xs text-gray-400">
                ({formatDate(latestReview.review_date)})
              </span>
            </div>
          )}
        </Card>

        {/* Goals */}
        {plan.goals && (
          <Card>
            <CardTitle>Goals</CardTitle>
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
              {plan.goals}
            </div>
          </Card>
        )}

        {/* Success Metrics */}
        {plan.success_metrics && (
          <Card>
            <CardTitle>How We Measure Success</CardTitle>
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 rounded-lg p-4">
              {plan.success_metrics}
            </div>
          </Card>
        )}

        {/* Interventions */}
        {interventions.length > 0 && (
          <Card>
            <CardTitle>Assigned Supports & Interventions</CardTitle>
            <div className="mt-3 space-y-2">
              {interventions.map((si) => {
                const intervention = si.interventions
                return (
                  <div key={si.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Badge color={TIER_COLORS[intervention?.tier]} size="sm">
                      Tier {intervention?.tier}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{intervention?.name}</p>
                      <p className="text-xs text-gray-500">
                        {INTERVENTION_CATEGORY_LABELS[intervention?.category]}
                      </p>
                    </div>
                    <Badge
                      color={si.status === 'active' ? 'green' : 'gray'}
                      size="sm"
                      className="ml-auto"
                    >
                      {si.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* How You Can Help */}
        {plan.parent_engagement_plan && (
          <Card>
            <CardTitle>How You Can Help</CardTitle>
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap bg-green-50 rounded-lg p-4">
              {plan.parent_engagement_plan}
            </div>
          </Card>
        )}

        {/* Progress Chart */}
        {reviews.length > 0 && <PlanProgressChart reviews={reviews} />}

        {/* Review History */}
        <ReviewTimeline reviews={reviews} />

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800">Questions?</h3>
          <p className="text-sm text-blue-700 mt-1">
            Contact your child's counselor or campus administration if you have questions about
            this transition plan or would like to schedule a conference.
          </p>
        </div>
      </div>
    </div>
  )
}
