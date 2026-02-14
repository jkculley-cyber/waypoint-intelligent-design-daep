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
  MANIFESTATION_RESULT,
  MANIFESTATION_RESULT_LABELS,
} from '../../lib/constants'
import { COMPLIANCE_GUIDANCE, TEC_37_006_F_FACTORS, IDEA_SPECIAL_CIRCUMSTANCES } from '../../lib/complianceGuidance'

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
  const [expandedGuidance, setExpandedGuidance] = useState({})
  const [placementJustification, setPlacementJustification] = useState(checklist?.placement_justification || '')
  const [savingJustification, setSavingJustification] = useState(false)

  if (!checklist) return null

  const isCompleted = checklist.status === 'completed'
  const isBlocked = checklist.placement_blocked && !checklist.block_overridden

  const toggleGuidance = (field) => {
    setExpandedGuidance(prev => ({ ...prev, [field]: !prev[field] }))
  }

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

  const handleLREToggle = async () => {
    const { error } = await updateChecklist(checklist.id, {
      least_restrictive_considered: !checklist.least_restrictive_considered,
    })

    if (error) {
      toast.error('Failed to update LRE consideration')
    } else {
      toast.success(checklist.least_restrictive_considered ? 'LRE unchecked' : 'LRE consideration documented')
      onUpdate?.()
    }
  }

  const handleSavePlacementJustification = async () => {
    setSavingJustification(true)
    const { error } = await updateChecklist(checklist.id, {
      placement_justification: placementJustification,
    })

    if (error) {
      toast.error('Failed to save placement justification')
    } else {
      toast.success('Placement justification saved')
      onUpdate?.()
    }
    setSavingJustification(false)
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
    <div className="space-y-4">
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
                {/* Show required actions when IS manifestation */}
                {COMPLIANCE_GUIDANCE.manifestation_determination.manifestationIsYes && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs font-semibold text-red-700 mb-1">Required Actions:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {COMPLIANCE_GUIDANCE.manifestation_determination.manifestationIsYes.actions.map((a, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full bg-red-200 text-red-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : checklist.manifestation_result === 'not_manifestation' ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  Behavior is NOT a manifestation of the student's disability
                </p>
                <p className="text-xs text-green-600 mt-1">
                  DAEP placement may proceed once all remaining checklist items are completed.
                </p>
                {COMPLIANCE_GUIDANCE.manifestation_determination.manifestationIsNo && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs font-semibold text-green-700 mb-1">Next Steps:</p>
                    <ul className="text-xs text-green-700 space-y-1">
                      {COMPLIANCE_GUIDANCE.manifestation_determination.manifestationIsNo.actions.map((a, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full bg-green-200 text-green-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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

        {/* IDEA Special Circumstances Notice */}
        {checklist.manifestation_result === 'is_manifestation' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800">{IDEA_SPECIAL_CIRCUMSTANCES.title}</p>
            <p className="text-xs text-blue-600 mt-1">{IDEA_SPECIAL_CIRCUMSTANCES.code} — {IDEA_SPECIAL_CIRCUMSTANCES.overview}</p>
            <ul className="mt-2 space-y-1">
              {IDEA_SPECIAL_CIRCUMSTANCES.circumstances.map((c, i) => (
                <li key={i} className="text-xs text-blue-700 flex gap-1.5">
                  <span className="font-semibold flex-shrink-0">{c.type}:</span>
                  <span>{c.description}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-blue-500 mt-2 italic">{IDEA_SPECIAL_CIRCUMSTANCES.note}</p>
          </div>
        )}

        {/* Checklist items with guidance panels */}
        <div className="space-y-1">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = !!checklist[item.field]
            const guidance = COMPLIANCE_GUIDANCE[item.field]
            const isExpanded = expandedGuidance[item.field]

            return (
              <div key={item.field}>
                <div
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
                        : 'border-gray-300 hover:border-orange-500'
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
                      {guidance && (
                        <button
                          type="button"
                          onClick={() => toggleGuidance(item.field)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                            isExpanded
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="View TEC guidance"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                          </svg>
                          {isExpanded ? 'Hide Guide' : 'TEC Guide'}
                        </button>
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

                {/* Expandable Guidance Panel */}
                {guidance && isExpanded && (
                  <GuidancePanel guidance={guidance} />
                )}
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

      {/* Placement Justification & LRE Section */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <CardTitle>Placement Analysis</CardTitle>
          <Badge color="blue" size="sm">TEC &sect;37.006</Badge>
        </div>

        {/* LRE Consideration */}
        <div className="mb-4">
          <div
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              checklist.least_restrictive_considered ? 'bg-green-50' : 'hover:bg-gray-50'
            }`}
          >
            <button
              type="button"
              onClick={handleLREToggle}
              disabled={isCompleted}
              className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                checklist.least_restrictive_considered
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-orange-500'
              } ${isCompleted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {checklist.least_restrictive_considered && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${checklist.least_restrictive_considered ? 'text-green-800' : 'text-gray-900'}`}>
                  Least Restrictive Environment (LRE) Considered
                </p>
                <Badge color="red" size="sm">Required</Badge>
                <button
                  type="button"
                  onClick={() => toggleGuidance('least_restrictive_environment')}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    expandedGuidance.least_restrictive_environment
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  {expandedGuidance.least_restrictive_environment ? 'Hide Guide' : 'TEC Guide'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                The ARD committee has considered the full continuum of placement options and documented why less restrictive alternatives are insufficient.
              </p>
            </div>
          </div>
          {expandedGuidance.least_restrictive_environment && (
            <GuidancePanel guidance={COMPLIANCE_GUIDANCE.least_restrictive_environment} />
          )}
        </div>

        {/* Placement Justification */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-gray-900">Placement Justification</p>
            <button
              type="button"
              onClick={() => toggleGuidance('placement_justification')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                expandedGuidance.placement_justification
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              {expandedGuidance.placement_justification ? 'Hide Guide' : 'TEC Guide'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Document the rationale for DAEP placement, including the TEC offense category and why less restrictive alternatives were insufficient.
          </p>

          {expandedGuidance.placement_justification && (
            <GuidancePanel guidance={COMPLIANCE_GUIDANCE.placement_justification} />
          )}

          {/* TEC §37.006(f) Factor Checklist */}
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-2">TEC &sect;37.001(a)(4) — Mitigating Factors Required in All Discipline Decisions:</p>
            <div className="space-y-1.5">
              {TEC_37_006_F_FACTORS.map((factor, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="flex-shrink-0 w-4 h-4 rounded bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <span className="font-medium text-gray-700">{factor.factor}</span>
                    <span className="text-gray-500"> — {factor.description}</span>
                    <span className="text-gray-400 ml-1">({factor.code})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <textarea
            value={placementJustification}
            onChange={(e) => setPlacementJustification(e.target.value)}
            disabled={isCompleted}
            placeholder="Document the justification for DAEP placement. Include the specific TEC offense category, prior interventions attempted, analysis of §37.006(f) factors, and why DAEP is the appropriate placement..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[120px] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          {!isCompleted && placementJustification !== (checklist.placement_justification || '') && (
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handleSavePlacementJustification}
                loading={savingJustification}
              >
                Save Justification
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

/**
 * Expandable guidance panel showing TEC-aligned documentation
 */
function GuidancePanel({ guidance }) {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'legal', label: 'Legal References' },
    { key: 'steps', label: 'Steps' },
    { key: 'documentation', label: 'Documentation' },
    { key: 'considerations', label: 'Key Considerations' },
  ]

  return (
    <div className="mx-3 mb-2 border border-blue-200 rounded-lg bg-blue-50/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-100/60 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900">{guidance.title}</p>
            <p className="text-[11px] text-blue-600">{guidance.subtitle}</p>
          </div>
        </div>
        {guidance.timeline && (
          <div className="mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] text-blue-700 font-medium">{guidance.timeline}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-blue-200 bg-blue-50/80 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                : 'text-blue-500 hover:text-blue-700 hover:bg-blue-100/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-3">
        {activeTab === 'overview' && (
          <p className="text-xs text-gray-700 leading-relaxed">{guidance.overview}</p>
        )}

        {activeTab === 'legal' && (
          <div className="space-y-3">
            {guidance.legalReferences?.map((ref, i) => (
              <div key={i} className="p-2.5 bg-white rounded border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{ref.code}</span>
                  <span className="text-xs font-medium text-gray-800">{ref.title}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{ref.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'steps' && (
          <ol className="space-y-2">
            {guidance.steps?.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {activeTab === 'documentation' && (
          <ul className="space-y-1.5">
            {guidance.requiredDocumentation?.map((doc, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700">
                <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        )}

        {activeTab === 'considerations' && (
          <ul className="space-y-1.5">
            {guidance.keyConsiderations?.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-700">
                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
