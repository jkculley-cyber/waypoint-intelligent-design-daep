import { useMemo, useEffect } from 'react'
import { useDisciplineMatrix } from '../../hooks/useOffenseCodes'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import AlertBanner from '../ui/AlertBanner'
import { CONSEQUENCE_TYPE_LABELS } from '../../lib/constants'

const CONSEQUENCE_ORDER = ['warning', 'detention', 'iss', 'oss', 'daep', 'expulsion']

export default function ConsequenceSuggestion({
  offenseCodeId,
  offenseCode,
  studentIncidentCount = 0,
  selectedConsequence,
  onMatrixLoaded,
  isOverride,
  overrideJustification,
  onOverrideJustificationChange,
  cumulativeDays,
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

  // Notify parent when matrix entry is determined
  useEffect(() => {
    onMatrixLoaded?.(suggestedEntry)
  }, [suggestedEntry]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check if selected consequence falls outside the suggested range
  const isMismatch = useMemo(() => {
    if (!suggestedEntry || !selectedConsequence || isOverride) return false
    const selectedIdx = CONSEQUENCE_ORDER.indexOf(selectedConsequence)
    const minIdx = CONSEQUENCE_ORDER.indexOf(suggestedEntry.min_consequence)
    const maxIdx = CONSEQUENCE_ORDER.indexOf(suggestedEntry.max_consequence)
    if (selectedIdx === -1 || minIdx === -1 || maxIdx === -1) return false
    return selectedIdx < minIdx || selectedIdx > maxIdx
  }, [suggestedEntry, selectedConsequence, isOverride])

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
            <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <p className="font-medium text-orange-600">{CONSEQUENCE_TYPE_LABELS[suggestedEntry.default_consequence] || suggestedEntry.default_consequence}</p>
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

      {/* Override warning with required justification */}
      {isOverride && (
        <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Policy Override Warning</p>
              <p className="text-sm text-red-700 mt-1">
                You are selecting a consequence outside the district discipline matrix range.
                A written justification is <strong>required</strong> to proceed.
              </p>
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-red-800">
              Override Justification <span className="text-red-600">*</span>
            </span>
            <textarea
              className="mt-1 block w-full rounded-md border-red-300 bg-white shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
              rows={3}
              placeholder="Explain why a consequence outside the matrix range is warranted..."
              value={overrideJustification || ''}
              onChange={(e) => onOverrideJustificationChange?.(e.target.value)}
              required
            />
          </label>
          {overrideJustification?.trim() === '' || !overrideJustification ? (
            <p className="text-xs text-red-600 mt-1">Justification is required to continue.</p>
          ) : null}
        </div>
      )}

      {/* Mismatch warning (non-override, just a soft warning) */}
      {isMismatch && !isOverride && (
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

      {/* SPED/504 cumulative removal days info */}
      {cumulativeDays != null && (
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          Current school year removal days: <strong>{cumulativeDays}</strong>
        </p>
      )}
    </div>
  )
}
