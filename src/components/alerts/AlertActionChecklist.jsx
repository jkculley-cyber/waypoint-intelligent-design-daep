import toast from 'react-hot-toast'
import Badge from '../ui/Badge'
import { useAlertActions } from '../../hooks/useAlerts'
import { formatDateTime } from '../../lib/utils'

const ACTION_ITEMS = [
  {
    field: 'root_cause_analysis_completed',
    label: 'Root Cause Analysis',
    description: 'Analyze why this behavior is recurring. What factors are contributing?',
    required: true,
  },
  {
    field: 'previous_plan_reviewed',
    label: 'Previous Transition Plan Reviewed',
    description: 'Review any previous DAEP transition plan. Was it implemented with fidelity?',
    required: true,
  },
  {
    field: 'sped_referral_considered',
    label: 'SPED Referral Considered',
    description: 'If student is not already evaluated, consider referral under Child Find obligation',
    required: true,
  },
  {
    field: 'threat_assessment_completed',
    label: 'Threat Assessment Completed',
    description: 'Conduct threat assessment if behavior involves potential harm to self or others',
    required: false,
  },
  {
    field: 'mental_health_referral',
    label: 'Mental Health Referral',
    description: 'Consider referral to school counselor or community mental health provider',
    required: false,
  },
]

export default function AlertActionChecklist({ alert, onUpdate }) {
  const { updateActionItem } = useAlertActions()

  if (!alert) return null

  const isResolved = alert.status === 'resolved' || alert.status === 'dismissed'

  const handleToggle = async (field) => {
    if (isResolved) return

    const currentValue = alert[field]
    const newValue = currentValue ? null : new Date().toISOString()

    const { error } = await updateActionItem(alert.id, field, newValue)
    if (error) {
      toast.error('Failed to update action item')
    } else {
      toast.success(newValue ? 'Action completed' : 'Action unchecked')
      onUpdate?.()
    }
  }

  const completedCount = ACTION_ITEMS.filter(item => !!alert[item.field]).length
  const requiredCount = ACTION_ITEMS.filter(item => item.required).length
  const requiredCompleted = ACTION_ITEMS.filter(item => item.required && !!alert[item.field]).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Required Actions</h4>
        <span className="text-xs text-gray-500">
          {completedCount}/{ACTION_ITEMS.length} completed
        </span>
      </div>

      {requiredCompleted < requiredCount && !isResolved && (
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
          Complete all required actions before recommending further placement.
        </p>
      )}

      <div className="space-y-1">
        {ACTION_ITEMS.map((item) => {
          const isChecked = !!alert[item.field]

          return (
            <div
              key={item.field}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                isChecked ? 'bg-green-50' : 'hover:bg-gray-50'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(item.field)}
                disabled={isResolved}
                className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-blue-500'
                } ${isResolved ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                {isChecked && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${isChecked ? 'text-green-800' : 'text-gray-900'}`}>
                    {item.label}
                  </p>
                  {item.required && <Badge color="red" size="sm">Required</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                {isChecked && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed: {formatDateTime(alert[item.field])}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* SPED Referral Outcome */}
      {alert.sped_referral_considered && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
          <label className="block text-xs font-medium text-gray-600 mb-1">SPED Referral Outcome</label>
          <p className="text-sm text-gray-800">
            {alert.sped_referral_outcome || 'No outcome recorded yet'}
          </p>
        </div>
      )}
    </div>
  )
}
