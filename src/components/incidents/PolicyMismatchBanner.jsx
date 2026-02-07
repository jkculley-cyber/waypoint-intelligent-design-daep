import { useMemo } from 'react'
import { useDisciplineMatrix } from '../../hooks/useOffenseCodes'
import { useAuth } from '../../contexts/AuthContext'
import AlertBanner from '../ui/AlertBanner'
import Badge from '../ui/Badge'
import { CONSEQUENCE_TYPE_LABELS } from '../../lib/constants'

const CONSEQUENCE_ORDER = ['warning', 'detention', 'iss', 'oss', 'daep', 'expulsion']

/**
 * Shows a policy mismatch warning on an incident detail page
 * when the assigned consequence falls outside the district matrix range.
 */
export default function PolicyMismatchBanner({ incident }) {
  const { districtId } = useAuth()
  const { matrixEntries, loading } = useDisciplineMatrix(
    incident?.offense_code_id,
    districtId
  )

  const mismatch = useMemo(() => {
    if (!incident || !matrixEntries.length || !incident.consequence_type) return null

    // Determine which occurrence this is (simplified - use occurrence field if available)
    // Otherwise default to 1st
    const occurrence = incident.offense_occurrence || 1
    const exact = matrixEntries.find((e) => e.occurrence === occurrence)
    const entry = exact || [...matrixEntries].sort((a, b) => b.occurrence - a.occurrence)[0]

    if (!entry) return null

    const selectedIdx = CONSEQUENCE_ORDER.indexOf(incident.consequence_type)
    const minIdx = CONSEQUENCE_ORDER.indexOf(entry.min_consequence)
    const maxIdx = CONSEQUENCE_ORDER.indexOf(entry.max_consequence)

    if (selectedIdx === -1 || minIdx === -1 || maxIdx === -1) return null

    if (selectedIdx < minIdx) {
      return {
        type: 'below',
        entry,
        message: `The assigned consequence (${CONSEQUENCE_TYPE_LABELS[incident.consequence_type]}) is BELOW the minimum district guideline (${CONSEQUENCE_TYPE_LABELS[entry.min_consequence]}).`,
      }
    }

    if (selectedIdx > maxIdx) {
      return {
        type: 'above',
        entry,
        message: `The assigned consequence (${CONSEQUENCE_TYPE_LABELS[incident.consequence_type]}) EXCEEDS the maximum district guideline (${CONSEQUENCE_TYPE_LABELS[entry.max_consequence]}).`,
      }
    }

    return null
  }, [incident, matrixEntries])

  if (loading || !mismatch) return null

  return (
    <AlertBanner
      variant="warning"
      title="Policy Mismatch Detected"
    >
      <p>{mismatch.message}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span>District Matrix Range:</span>
        <Badge color="gray" size="sm">
          {CONSEQUENCE_TYPE_LABELS[mismatch.entry.min_consequence]}
        </Badge>
        <span>to</span>
        <Badge color="gray" size="sm">
          {CONSEQUENCE_TYPE_LABELS[mismatch.entry.max_consequence]}
        </Badge>
        <span className="text-gray-400 ml-1">
          (Occurrence #{mismatch.entry.occurrence})
        </span>
      </div>
    </AlertBanner>
  )
}
