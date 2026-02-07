import { useState } from 'react'
import toast from 'react-hot-toast'
import Card, { CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { SelectField } from '../ui/FormField'
import { ConfirmDialog } from '../ui/Modal'
import { useComplianceActions } from '../../hooks/useCompliance'
import { formatDateTime } from '../../lib/utils'
import {
  COMPLIANCE_STATUS,
  MANIFESTATION_RESULT,
  MANIFESTATION_RESULT_LABELS,
} from '../../lib/constants'

const CHECKLIST_ITEMS = [
  {
    field: 'ard_committee_notified',
    label: 'ARD Committee Notified',
    description: 'ARD committee members have been notified of the pending DAEP recommendation',
    required: true,
  },
  {
    field: 'manifestation_determination',
    label: 'Manifestation Determination Conducted',
    description: 'ARD committee has conducted a manifestation determination review',
    required: true,
    hasResult: true,
  },
  {
    field: 'bip_reviewed',
    label: 'Current BIP Reviewed',
    description: 'Current Behavior Intervention Plan reviewed for implementation fidelity',
    required: false,
  },
  {
    field: 'fba_conducted',
    label: 'FBA Conducted (within last year)',
    description: 'Functional Behavior Assessment has been conducted within the past 12 months',
    required: false,
  },
  {
    field: 'parent_notified',
    label: 'Parents Notified of Procedural Safeguards',
    description: 'Parents/guardians have been provided notice of procedural safeguards',
    required: true,
  },
  {
    field: 'fape_plan_documented',
    label: 'FAPE Plan for DAEP Documented',
    description: 'Plan to provide Free Appropriate Public Education during DAEP placement has been documented',
    required: true,
  },
  {
    field: 'iep_goals_reviewed',
    label: 'IEP Goals Reviewed',
    description: 'Current IEP goals reviewed and DAEP service plan aligned',
    required: false,
  },
  {
    field: 'educational_services_arranged',
    label: 'Educational Services Arranged at DAEP',
    description: 'Special education services have been arranged at the DAEP campus',
    required: false,
  },
]

export default function ComplianceChecklist({ checklist, onUpdate }) {
  const { updateChecklistItem, updateChecklist, overrideBlock } = useComplianceActions()
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overriding, setOverriding] = useState(false)

  if (!checklist) return null

  const isCompleted = checklist.status === 'completed'
  const isBlocked = checklist.placement_blocked && !checklist.block_overridden

  const handleToggleItem = async (field) => {
    if (isCompleted) return

    const currentValue = checklist[field]
    const newValue = currentValue ? null : new Date().toISOString()

    const { error } = await updateChecklistItem(checklist.id, field, newValue)

    if (error) {
      toast.error('Failed to update checklist item')
    } else {
      toast.success(newValue ? 'Item completed' : 'Item unchecked')
      onUpdate?.()
    }
  }

  const handleManifestationResult = async (result) => {
    const { error } = await updateChecklist(checklist.id, {
      manifestation_result: result,
    })

    if (error) {
      toast.error('Failed to update manifestation result')
    } else {
      toast.success('Manifestation determination result recorded')
      onUpdate?.()
    }
  }

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error('Override reason is required')
      return
    }

    setOverriding(true)
    const { error } = await overrideBlock(checklist.id, overrideReason)

    if (error) {
      toast.error('Failed to override block')
    } else {
      toast.success('Compliance block overridden')
      setOverrideDialogOpen(false)
      onUpdate?.()
    }
    setOverriding(false)
  }

  const statusColor = {
    incomplete: 'red',
    in_progress: 'yellow',
    completed: 'green',
    waived: 'gray',
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CardTitle>SPED Compliance Checklist</CardTitle>
          <Badge color={statusColor[checklist.status]} dot>
            {checklist.status === 'incomplete' ? 'Incomplete' :
             checklist.status === 'in_progress' ? 'In Progress' :
             checklist.status === 'completed' ? 'Completed' : 'Waived'}
          </Badge>
        </div>
        {isBlocked && !isCompleted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOverrideDialogOpen(true)}
          >
            Override Block
          </Button>
        )}
      </div>

      {/* Manifestation Determination Result */}
      {checklist.manifestation_determination && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Manifestation Determination Result:</p>
          {checklist.manifestation_result === 'is_manifestation' ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">
                Behavior IS a manifestation of the student's disability
              </p>
              <p className="text-xs text-red-600 mt-1">
                DAEP placement cannot proceed. The student must remain at the home campus
                with appropriate BIP modifications.
              </p>
            </div>
          ) : checklist.manifestation_result === 'not_manifestation' ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                Behavior is NOT a manifestation of the student's disability
              </p>
              <p className="text-xs text-green-600 mt-1">
                DAEP placement may proceed once all remaining checklist items are completed.
              </p>
            </div>
          ) : (
            <SelectField
              name="manifestation_result"
              value={checklist.manifestation_result || ''}
              onChange={(e) => handleManifestationResult(e.target.value)}
              options={[
                { value: MANIFESTATION_RESULT.IS_MANIFESTATION, label: MANIFESTATION_RESULT_LABELS[MANIFESTATION_RESULT.IS_MANIFESTATION] },
                { value: MANIFESTATION_RESULT.NOT_MANIFESTATION, label: MANIFESTATION_RESULT_LABELS[MANIFESTATION_RESULT.NOT_MANIFESTATION] },
              ]}
              placeholder="Select result..."
            />
          )}
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-1">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = !!checklist[item.field]

          return (
            <div
              key={item.field}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                isChecked ? 'bg-green-50' : 'hover:bg-gray-50'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleItem(item.field)}
                disabled={isCompleted}
                className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-blue-500'
                } ${isCompleted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
                  {item.required && (
                    <Badge color="red" size="sm">Required</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                {isChecked && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed: {formatDateTime(checklist[item.field])}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Override completed info */}
      {checklist.block_overridden && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">Block Override Applied</p>
          <p className="text-xs text-yellow-600 mt-1">
            Reason: {checklist.override_reason}
          </p>
        </div>
      )}

      {/* Override dialog */}
      <ConfirmDialog
        isOpen={overrideDialogOpen}
        onClose={() => setOverrideDialogOpen(false)}
        onConfirm={handleOverride}
        title="Override Compliance Block"
        variant="warning"
        confirmLabel="Override Block"
        loading={overriding}
        message={
          <div className="space-y-3">
            <p>
              Overriding the compliance block allows the DAEP placement to proceed
              without completing the full SPED compliance checklist. This action is
              logged in the audit trail.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Override <span className="text-red-500">*</span>
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Document the reason for overriding the compliance block..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]"
              />
            </div>
          </div>
        }
      />
    </Card>
  )
}
