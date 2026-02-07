import { useMemo } from 'react'
import { useDisciplineMatrix } from '../../hooks/useOffenseCodes'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import AlertBanner from '../ui/AlertBanner'
import { CONSEQUENCE_TYPE_LABELS } from '../../lib/constants'

export default function ConsequenceSuggestion({
  offenseCodeId,
  offenseCode,
  studentIncidentCount = 0,
  selectedConsequence,
  onSelectConsequence,
}) {
  const { districtId } = useAuth()
  const { matrixEntries, loading } = useDisciplineMatrix(offenseCodeId, districtId)

  // Find the right matrix entry based on occurrence number
  const suggestedEntry = useMemo(() => {
    if (!matrixEntries.length) return null
    const occurrence = studentIncidentCount + 1 // current incident is the Nth occurrence
    // Find exact match or the highest occurrence entry
    const exact = matrixEntries.find(e => e.occurrence === occurrence)
    if (exact) return exact
    // If no exact match, use the highest occurrence entry (cap)
    const sorted = [...matrixEntries].sort((a, b) => b.occurrence - a.occurrence)
    return sorted[0]
  }, [matrixEntries, studentIncidentCount])

  // Check if selected consequence falls outside the suggested range
  const isMismatch = useMemo(() => {
    if (!suggestedEntry || !selectedConsequence) return false
    const consequenceOrder = ['warning', 'detention', 'iss', 'oss', 'daep', 'expulsion']
    const selectedIdx = consequenceOrder.indexOf(selectedConsequence)
    const minIdx = consequenceOrder.indexOf(suggestedEntry.min_consequence)
    const maxIdx = consequenceOrder.indexOf(suggestedEntry.max_consequence)
    if (selectedIdx === -1 || minIdx === -1 || maxIdx === -1) return false
    return selectedIdx < minIdx || selectedIdx > maxIdx
  }, [suggestedEntry, selectedConsequence])

  // Handle mandatory placements from offense code
  const isMandatory = offenseCode?.is_mandatory_daep || offenseCode?.is_mandatory_expulsion

  if (!offenseCodeId) return null

  return (
    <div className="space-y-3">
      {/* Mandatory placement alert */}
      {offenseCode?.is_mandatory_daep && (
        <AlertBanner variant="error" title="Mandatory DAEP Placement">
          This offense requires mandatory DAEP placement under {offenseCode.tec_reference}.
        </AlertBanner>
      )}

      {offenseCode?.is_mandatory_expulsion && (
        <AlertBanner variant="error" title="Mandatory Expulsion">
          This offense requires mandatory expulsion under {offenseCode.tec_reference}.
        </AlertBanner>
      )}

      {/* Matrix suggestion */}
      {suggestedEntry && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              District Matrix Suggestion (Occurrence #{suggestedEntry.occurrence})
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Minimum</p>
              <p className="font-medium">{CONSEQUENCE_TYPE_LABELS[suggestedEntry.min_consequence] || suggestedEntry.min_consequence}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Recommended</p>
              <p className="font-medium text-blue-600">{CONSEQUENCE_TYPE_LABELS[suggestedEntry.default_consequence] || suggestedEntry.default_consequence}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Maximum</p>
              <p className="font-medium">{CONSEQUENCE_TYPE_LABELS[suggestedEntry.max_consequence] || suggestedEntry.max_consequence}</p>
            </div>
          </div>

          {(suggestedEntry.consequence_days_min || suggestedEntry.consequence_days_max) && (
            <p className="text-xs text-gray-500 mt-2">
              Duration: {suggestedEntry.consequence_days_min || '—'} to {suggestedEntry.consequence_days_max || '—'} days
            </p>
          )}

          {suggestedEntry.required_supports?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Required Supports:</p>
              <div className="flex flex-wrap gap-1">
                {suggestedEntry.required_supports.map((support, i) => (
                  <Badge key={i} color="blue" size="sm">
                    {support.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mismatch warning */}
      {isMismatch && (
        <AlertBanner variant="warning" title="Policy Mismatch">
          The selected consequence falls outside the district matrix range for this offense.
          Document the reason for deviation in the notes field.
        </AlertBanner>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-gray-400">Loading discipline matrix...</p>
      )}

      {/* No matrix entries */}
      {!loading && offenseCodeId && matrixEntries.length === 0 && (
        <p className="text-xs text-gray-400">
          No discipline matrix entry found for this offense code. Admin can configure this in Settings.
        </p>
      )}
    </div>
  )
}
