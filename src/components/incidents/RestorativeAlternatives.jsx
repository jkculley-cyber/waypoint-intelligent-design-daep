import { useState, useMemo } from 'react'
import { useInterventions } from '../../hooks/useTransitionPlans'
import Badge from '../ui/Badge'
import { INTERVENTION_CATEGORY_LABELS } from '../../lib/constants'

const CATEGORY_CONFIG = {
  restorative: {
    label: 'Restorative Justice',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    badgeColor: 'green',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  behavioral: {
    label: 'Proactive Interventions',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    badgeColor: 'blue',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  social_emotional: {
    label: 'Alternative Consequences',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    badgeColor: 'purple',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
}

const DISPLAY_ORDER = ['restorative', 'behavioral', 'social_emotional']

export default function RestorativeAlternatives({ selectedIds, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const { interventions, loading } = useInterventions()

  const grouped = useMemo(() => {
    const groups = {}
    for (const cat of DISPLAY_ORDER) {
      groups[cat] = interventions.filter(i => i.category === cat)
    }
    return groups
  }, [interventions])

  const hasAny = DISPLAY_ORDER.some(cat => grouped[cat]?.length > 0)

  if (loading || !hasAny) return null

  const selectedCount = selectedIds?.length || 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Restorative & Alternative Options
          </span>
          {selectedCount > 0 && (
            <Badge color="green" size="sm">{selectedCount} selected</Badge>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500">
            Consider these proactive approaches before or alongside traditional consequences.
            Selected options will be noted on the incident record.
          </p>

          {DISPLAY_ORDER.map(cat => {
            const config = CATEGORY_CONFIG[cat]
            const items = grouped[cat]
            if (!items?.length) return null

            return (
              <div key={cat}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={config.color}>{config.icon}</span>
                  <p className={`text-xs font-semibold ${config.color}`}>{config.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(item => {
                    const isSelected = selectedIds?.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onToggle?.(item.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all text-sm ${
                          isSelected
                            ? `${config.bg} border-current ring-1 ring-current`
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className={`font-medium ${isSelected ? config.color : 'text-gray-700'}`}>
                            {item.name}
                          </span>
                          {isSelected && (
                            <svg className={`h-4 w-4 flex-shrink-0 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <Badge color={config.badgeColor} size="sm" className="mt-1">
                          Tier {item.tier}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
