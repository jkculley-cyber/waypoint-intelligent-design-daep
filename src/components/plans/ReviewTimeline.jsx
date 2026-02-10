import Badge from '../ui/Badge'
import Card, { CardTitle } from '../ui/Card'
import {
  REVIEW_TYPE_LABELS,
  PROGRESS_RATING_LABELS,
  PROGRESS_RATING_COLORS,
} from '../../lib/constants'
import { formatDate } from '../../lib/utils'

const EFFECTIVENESS_LABELS = {
  highly_effective: 'Highly Effective',
  effective: 'Effective',
  somewhat_effective: 'Somewhat Effective',
  ineffective: 'Ineffective',
  not_rated: 'Not Yet Rated',
}

const EFFECTIVENESS_COLORS = {
  highly_effective: 'green',
  effective: 'blue',
  somewhat_effective: 'yellow',
  ineffective: 'red',
  not_rated: 'gray',
}

const FIDELITY_LABELS = {
  full: 'Full Implementation',
  partial: 'Partial Implementation',
  minimal: 'Minimal Implementation',
  not_implemented: 'Not Implemented',
}

const FIDELITY_COLORS = {
  full: 'green',
  partial: 'blue',
  minimal: 'yellow',
  not_implemented: 'red',
}

export default function ReviewTimeline({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardTitle>Review History</CardTitle>
        <p className="mt-4 text-sm text-gray-400 text-center py-4">
          No reviews recorded yet. Reviews will appear here after the first 30-day checkpoint.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>Review History</CardTitle>
      <div className="mt-4 space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="relative pl-6 pb-4 last:pb-0 border-l-2 border-gray-200 last:border-transparent"
          >
            {/* Timeline dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
              review.progress_rating === 'exceeding' ? 'bg-green-500' :
              review.progress_rating === 'on_track' ? 'bg-orange-500' :
              review.progress_rating === 'at_risk' ? 'bg-yellow-500' :
              review.progress_rating === 'failing' ? 'bg-red-500' : 'bg-gray-400'
            }`} />

            {/* Review Content */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {REVIEW_TYPE_LABELS[review.review_type] || review.review_type}
                  </h4>
                  <Badge
                    color={PROGRESS_RATING_COLORS[review.progress_rating]}
                    size="sm"
                  >
                    {PROGRESS_RATING_LABELS[review.progress_rating]}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">{formatDate(review.review_date)}</span>
              </div>

              {/* Effectiveness & Implementation badges */}
              {(review.intervention_effectiveness || review.implementation_fidelity) && (
                <div className="flex items-center gap-2 mb-3">
                  {review.intervention_effectiveness && (
                    <Badge color={EFFECTIVENESS_COLORS[review.intervention_effectiveness] || 'gray'} size="sm">
                      {EFFECTIVENESS_LABELS[review.intervention_effectiveness]}
                    </Badge>
                  )}
                  {review.implementation_fidelity && (
                    <Badge color={FIDELITY_COLORS[review.implementation_fidelity] || 'gray'} size="sm">
                      {FIDELITY_LABELS[review.implementation_fidelity]}
                    </Badge>
                  )}
                  {review.escalation_needed && (
                    <Badge color="red" size="sm">Escalation Needed</Badge>
                  )}
                </div>
              )}

              {/* Attendance */}
              {(review.days_present != null || review.days_absent != null) && (
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
                  {review.days_present != null && (
                    <span>Present: <strong>{review.days_present}</strong> days</span>
                  )}
                  {review.days_absent != null && (
                    <span>Absent: <strong>{review.days_absent}</strong> days</span>
                  )}
                </div>
              )}

              <div className="space-y-2 text-sm">
                {review.strengths && (
                  <div>
                    <span className="font-medium text-gray-600">Strengths: </span>
                    <span className="text-gray-700">{review.strengths}</span>
                  </div>
                )}
                {review.concerns && (
                  <div>
                    <span className="font-medium text-gray-600">Concerns: </span>
                    <span className="text-gray-700">{review.concerns}</span>
                  </div>
                )}
                {review.behavioral_notes && (
                  <div>
                    <span className="font-medium text-gray-600">Behavioral: </span>
                    <span className="text-gray-700">{review.behavioral_notes}</span>
                  </div>
                )}
                {review.academic_notes && (
                  <div>
                    <span className="font-medium text-gray-600">Academic: </span>
                    <span className="text-gray-700">{review.academic_notes}</span>
                  </div>
                )}
                {review.implementation_notes && (
                  <div>
                    <span className="font-medium text-gray-600">Implementation: </span>
                    <span className="text-gray-700">{review.implementation_notes}</span>
                  </div>
                )}
                {review.parent_contact_notes && (
                  <div>
                    <span className="font-medium text-gray-600">Parent Contact: </span>
                    <span className="text-gray-700">{review.parent_contact_notes}</span>
                  </div>
                )}
                {review.recommendations && (
                  <div>
                    <span className="font-medium text-gray-600">Recommendations: </span>
                    <span className="text-gray-700">{review.recommendations}</span>
                  </div>
                )}
                {review.next_steps && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-orange-700 text-xs">
                    <span className="font-medium">Next Steps: </span>
                    {review.next_steps}
                  </div>
                )}
              </div>

              {review.profiles && (
                <p className="text-xs text-gray-400 mt-2">
                  Reviewed by {review.profiles.full_name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
