import Badge from '../ui/Badge'
import Card, { CardTitle } from '../ui/Card'
import {
  REVIEW_TYPE_LABELS,
  PROGRESS_RATING_LABELS,
  PROGRESS_RATING_COLORS,
} from '../../lib/constants'
import { formatDate } from '../../lib/utils'

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
        {reviews.map((review, index) => (
          <div
            key={review.id}
            className="relative pl-6 pb-4 last:pb-0 border-l-2 border-gray-200 last:border-transparent"
          >
            {/* Timeline dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
              review.progress_rating === 'exceeding' ? 'bg-green-500' :
              review.progress_rating === 'on_track' ? 'bg-blue-500' :
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

              <div className="space-y-2 text-sm">
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
                  <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700 text-xs">
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
