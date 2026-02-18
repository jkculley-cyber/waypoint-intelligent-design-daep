import { useAuth } from '../../contexts/AuthContext'
import { FEATURE_LABELS, FEATURE_TIER } from '../../lib/tierConfig'
import { TIER_LABELS } from '../../lib/constants'

export default function RequireTier({ feature, children }) {
  const { hasFeature } = useAuth()

  if (!hasFeature(feature)) {
    return <UpgradePrompt feature={feature} />
  }

  return children
}

function UpgradePrompt({ feature }) {
  const requiredTier = FEATURE_TIER[feature]
  const featureLabel = FEATURE_LABELS[feature] || feature
  const tierLabel = TIER_LABELS[requiredTier] || requiredTier

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {featureLabel} requires {tierLabel}
      </h2>
      <p className="text-gray-500 max-w-md">
        This feature is available on the <span className="font-medium text-orange-600">{tierLabel}</span> plan and above.
        Contact your district administrator to upgrade your subscription.
      </p>
    </div>
  )
}
