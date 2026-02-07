import AlertBanner from '../ui/AlertBanner'
import Badge from '../ui/Badge'

export default function ComplianceBlockBanner({ checklist, student }) {
  if (!checklist || !checklist.placement_blocked) return null

  const isOverridden = checklist.block_overridden

  if (isOverridden) {
    return (
      <AlertBanner variant="warning" title="Compliance Override Applied">
        <p>
          The compliance block was overridden. Reason: {checklist.override_reason || 'Not specified'}
        </p>
      </AlertBanner>
    )
  }

  const completedItems = [
    checklist.ard_committee_notified,
    checklist.manifestation_determination,
    checklist.parent_notified,
    checklist.fape_plan_documented,
  ].filter(Boolean).length

  const totalRequired = 4

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            DAEP Placement Blocked — SPED Compliance Required
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {student?.first_name} {student?.last_name} is identified as{' '}
            <Badge color="purple" size="sm">
              {student?.is_sped ? 'SPED' : '504'}
            </Badge>
            . Federal law (IDEA) requires completion of the compliance checklist below before
            this student can be placed in DAEP.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-red-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-red-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(completedItems / totalRequired) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-red-700">
              {completedItems}/{totalRequired} completed
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
