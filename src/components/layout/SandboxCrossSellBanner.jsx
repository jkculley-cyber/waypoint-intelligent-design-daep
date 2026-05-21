import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const DISMISS_KEY_PREFIX = 'sandbox_cross_sell_dismissed_'

export default function SandboxCrossSellBanner() {
  const { district } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  const products = district?.settings?.products || []
  const hasWaypoint = products.includes('waypoint')
  const hasNavigator = products.includes('navigator')

  // Per-district dismiss key — dismissing on one sandbox must not suppress
  // the banner on the other sandbox (same browser, same localStorage origin).
  const dismissKey = district?.id ? `${DISMISS_KEY_PREFIX}${district.id}` : null

  useEffect(() => {
    if (dismissKey) {
      setDismissed(localStorage.getItem(dismissKey) === '1')
    }
  }, [dismissKey])

  if (!district?.settings?.is_sandbox) return null
  if (dismissed) return null

  let copy = null
  if (hasWaypoint && !hasNavigator) {
    copy = {
      tone: 'orange',
      label: "You're exploring Waypoint",
      body: 'Navigator (campus-level discipline support tracking) is a separate product.',
      cta: 'See Navigator →',
      href: 'https://clearpathedgroup.com/navigator',
    }
  } else if (hasNavigator && !hasWaypoint) {
    copy = {
      tone: 'blue',
      label: "You're exploring Navigator",
      body: 'Waypoint (district-wide DAEP & compliance management) is a separate product.',
      cta: 'See Waypoint →',
      href: 'https://clearpathedgroup.com/waypoint',
    }
  } else {
    return null
  }

  const colors = copy.tone === 'blue'
    ? { bg: 'bg-blue-50', border: 'border-blue-200', label: 'text-blue-900', body: 'text-blue-800', cta: 'text-blue-700 hover:text-blue-900' }
    : { bg: 'bg-orange-50', border: 'border-orange-200', label: 'text-orange-900', body: 'text-orange-800', cta: 'text-orange-700 hover:text-orange-900' }

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, '1')
    setDismissed(true)
  }

  return (
    <div className={`${colors.bg} border-b ${colors.border} px-4 py-2 flex items-center gap-3 text-sm`}>
      <span className={`font-semibold ${colors.label}`}>{copy.label}.</span>
      <span className={`${colors.body} hidden sm:inline`}>{copy.body}</span>
      <a
        href={copy.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`ml-auto font-semibold ${colors.cta}`}
      >
        {copy.cta}
      </a>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={`${colors.body} hover:opacity-70 text-lg leading-none px-1`}
      >
        ×
      </button>
    </div>
  )
}
