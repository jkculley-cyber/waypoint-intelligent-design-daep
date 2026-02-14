import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import FormField, { SelectField } from '../components/ui/FormField'
import AlertBanner from '../components/ui/AlertBanner'
import StudentSearch from '../components/students/StudentSearch'
import StudentFlags from '../components/students/StudentFlags'
import OffenseCodeSelector from '../components/incidents/OffenseCodeSelector'
import ConsequenceSuggestion from '../components/incidents/ConsequenceSuggestion'
import RestorativeAlternatives from '../components/incidents/RestorativeAlternatives'
import { useIncidentActions } from '../hooks/useIncidents'
import { useOffenseCodes, useStudentOffenseCount } from '../hooks/useOffenseCodes'
import { useInterventions } from '../hooks/useTransitionPlans'
import { useAuth } from '../contexts/AuthContext'
import { requiresSpedCompliance, formatStudentNameShort } from '../lib/utils'
import { supabase } from '../lib/supabase'
import {
  CONSEQUENCE_TYPE_LABELS,
  CONSEQUENCE_TYPES,
  INCIDENT_LOCATIONS,
} from '../lib/constants'

const STEPS = ['Student', 'Offense', 'Consequence', 'Details', 'Review']
const CONSEQUENCE_ORDER = ['warning', 'detention', 'iss', 'oss', 'daep', 'expulsion']
const OVERRIDE_VALUE = '__override__'

export default function NewIncidentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { campusIds } = useAuth()
  const { createIncident } = useIncidentActions()
  const { offenseCodes } = useOffenseCodes()
  const { interventions: interventionCatalog } = useInterventions()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [matrixEntry, setMatrixEntry] = useState(null)
  const [isMatrixOverride, setIsMatrixOverride] = useState(false)
  const [formData, setFormData] = useState({
    student: null,
    campus_id: campusIds?.[0] || '',
    offense_code_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '',
    location: '',
    description: '',
    consequence_type: '',
    consequence_days: '',
    consequence_start: '',
    consequence_end: '',
    notes: '',
    override_justification: '',
    restorative_ids: [],
  })

  const selectedOffenseCode = useMemo(() => {
    return offenseCodes.find(c => c.id === formData.offense_code_id)
  }, [offenseCodes, formData.offense_code_id])

  // Count prior incidents for this student + offense
  const { count: priorOffenseCount } = useStudentOffenseCount(
    formData.student?.id,
    formData.offense_code_id
  )

  const spedRequired = requiresSpedCompliance(formData.student)
  const isDaepOrExpulsion = ['daep', 'expulsion'].includes(formData.consequence_type)
  const isOverride = isMatrixOverride
  const isRemovalConsequence = ['iss', 'oss', 'daep'].includes(formData.consequence_type)

  // SPED/504 cumulative removal days tracking
  const [cumulativeDays, setCumulativeDays] = useState(0)
  useEffect(() => {
    if (!formData.student?.id || !spedRequired || !isRemovalConsequence) {
      setCumulativeDays(0)
      return
    }
    // Calculate school year start (Aug 1)
    const now = new Date()
    const yearStart = now.getMonth() >= 7
      ? `${now.getFullYear()}-08-01`
      : `${now.getFullYear() - 1}-08-01`

    const fetchCumulativeDays = async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('consequence_days')
        .eq('student_id', formData.student.id)
        .in('consequence_type', ['iss', 'oss', 'daep'])
        .gte('incident_date', yearStart)
        .not('status', 'in', '("overturned","draft")')

      if (error) {
        console.error('Error fetching cumulative days:', error)
        return
      }
      const sum = (data || []).reduce((acc, r) => acc + (r.consequence_days || 0), 0)
      setCumulativeDays(sum)
    }
    fetchCumulativeDays()
  }, [formData.student?.id, spedRequired, isRemovalConsequence]) // eslint-disable-line react-hooks/exhaustive-deps

  const enteredDays = parseInt(formData.consequence_days) || 0
  const projectedTotal = cumulativeDays + enteredDays

  // Build filtered consequence options based on matrix
  const consequenceOptions = useMemo(() => {
    if (!matrixEntry) {
      // No matrix data — show all options
      return Object.entries(CONSEQUENCE_TYPE_LABELS).map(([val, label]) => ({ value: val, label }))
    }

    const minIdx = CONSEQUENCE_ORDER.indexOf(matrixEntry.min_consequence)
    const maxIdx = CONSEQUENCE_ORDER.indexOf(matrixEntry.max_consequence)

    if (minIdx === -1 || maxIdx === -1) {
      return Object.entries(CONSEQUENCE_TYPE_LABELS).map(([val, label]) => ({ value: val, label }))
    }

    const filtered = CONSEQUENCE_ORDER
      .filter((_, i) => i >= minIdx && i <= maxIdx)
      .map(val => ({ value: val, label: CONSEQUENCE_TYPE_LABELS[val] }))

    // Add override option at the bottom
    filtered.push({ value: OVERRIDE_VALUE, label: 'Other (Override Policy)' })

    return filtered
  }, [matrixEntry])

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleConsequenceChange = (value) => {
    if (value === OVERRIDE_VALUE) {
      // Enter override mode — don't set consequence_type to the placeholder
      setIsMatrixOverride(true)
      setFormData(prev => ({ ...prev, consequence_type: '' }))
    } else {
      // Normal selection or picking from override dropdown
      if (!isMatrixOverride) {
        // Normal selection — clear any override state
        setFormData(prev => ({ ...prev, consequence_type: value, override_justification: '' }))
      } else {
        // Picking the actual consequence in override mode — keep justification
        setFormData(prev => ({ ...prev, consequence_type: value }))
      }
    }
  }

  const handleCancelOverride = () => {
    setIsMatrixOverride(false)
    setFormData(prev => ({ ...prev, consequence_type: '', override_justification: '' }))
  }

  const handleMatrixLoaded = useCallback((entry) => {
    setMatrixEntry(entry)
  }, [])

  const handleRestorativeToggle = (interventionId) => {
    setFormData(prev => {
      const ids = prev.restorative_ids
      const next = ids.includes(interventionId)
        ? ids.filter(id => id !== interventionId)
        : [...ids, interventionId]
      return { ...prev, restorative_ids: next }
    })
  }

  const canProceed = () => {
    switch (step) {
      case 0: return !!formData.student
      case 1: return !!formData.offense_code_id
      case 2: {
        if (!formData.consequence_type) return false
        // If override mode, require justification
        if (isMatrixOverride && !formData.override_justification?.trim()) return false
        // Block if days are outside matrix range (non-override)
        if (!isMatrixOverride && matrixEntry && formData.consequence_days) {
          const days = parseInt(formData.consequence_days)
          if (matrixEntry.consequence_days_min && days < matrixEntry.consequence_days_min) return false
          if (matrixEntry.consequence_days_max && days > matrixEntry.consequence_days_max) return false
        }
        return true
      }
      case 3: return !!formData.description && !!formData.incident_date
      case 4: return true
      default: return false
    }
  }

  // Build notes with override justification and restorative selections
  const buildFinalNotes = () => {
    const parts = []

    if (isMatrixOverride && formData.override_justification?.trim()) {
      parts.push(`[MATRIX OVERRIDE] ${formData.override_justification.trim()}`)
    }

    if (formData.restorative_ids.length > 0) {
      const names = formData.restorative_ids
        .map(id => interventionCatalog.find(i => i.id === id)?.name)
        .filter(Boolean)
      if (names.length) {
        parts.push(`[RESTORATIVE ALTERNATIVES] ${names.join(', ')}`)
      }
    }

    if (formData.notes?.trim()) {
      parts.push(formData.notes.trim())
    }

    return parts.join('\n\n')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { data, error } = await createIncident({
        campus_id: formData.student.campus_id || formData.campus_id,
        student_id: formData.student.id,
        offense_code_id: formData.offense_code_id,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || null,
        location: formData.location,
        description: formData.description,
        consequence_type: formData.consequence_type,
        consequence_days: formData.consequence_days ? parseInt(formData.consequence_days) : null,
        consequence_start: formData.consequence_start || null,
        consequence_end: formData.consequence_end || null,
        notes: buildFinalNotes(),
      })

      if (error) throw error

      if (data.sped_compliance_required) {
        toast.success('Incident created. SPED compliance review required before placement.', { duration: 5000 })
      } else {
        toast.success('Incident submitted successfully')
      }

      navigate(`/incidents/${data.id}`)
    } catch (err) {
      console.error('Error creating incident:', err)
      toast.error('Failed to create incident: ' + (err.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Topbar title="Report New Incident" subtitle="Create a discipline incident record" />

      <div className="p-6 max-w-3xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i < step
                      ? 'bg-orange-500 text-white'
                      : i === step
                      ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs mt-1 ${i <= step ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-1 ${i < step ? 'bg-orange-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <Card>
          {/* Step 1: Select Student */}
          {step === 0 && (
            <div className="space-y-4">
              <CardTitle>Select Student</CardTitle>
              <StudentSearch
                selectedStudent={formData.student}
                onSelect={(student) => updateField('student', student)}
              />
              {formData.student && spedRequired && isDaepOrExpulsion && (
                <AlertBanner variant="warning" title="SPED/504 Student">
                  This student has special education protections. If a DAEP or expulsion consequence
                  is selected, a compliance checklist will be required before placement can proceed.
                </AlertBanner>
              )}
              {formData.student && (
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-1">Special Populations:</p>
                  <StudentFlags student={formData.student} />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Offense */}
          {step === 1 && (
            <div className="space-y-4">
              <CardTitle>Select Offense</CardTitle>
              <OffenseCodeSelector
                value={formData.offense_code_id}
                onChange={(id) => updateField('offense_code_id', id)}
              />
            </div>
          )}

          {/* Step 3: Consequence */}
          {step === 2 && (
            <div className="space-y-4">
              <CardTitle>Assign Consequence</CardTitle>

              {/* SPED warning if selecting DAEP/expulsion */}
              {spedRequired && (
                <AlertBanner variant="info" title="SPED/504 Compliance Notice">
                  If DAEP or expulsion is selected, the system will automatically create a compliance
                  checklist and block placement until all requirements are met.
                </AlertBanner>
              )}

              {/* Matrix suggestion */}
              <ConsequenceSuggestion
                offenseCodeId={formData.offense_code_id}
                offenseCode={selectedOffenseCode}
                studentIncidentCount={priorOffenseCount}
                selectedConsequence={formData.consequence_type}
                onMatrixLoaded={handleMatrixLoaded}
                isOverride={isOverride}
                overrideJustification={formData.override_justification}
                onOverrideJustificationChange={(val) => updateField('override_justification', val)}
                cumulativeDays={spedRequired && isRemovalConsequence ? cumulativeDays : null}
              />

              {!isOverride ? (
                <SelectField
                  label="Consequence Type"
                  name="consequence_type"
                  value={formData.consequence_type}
                  onChange={(e) => handleConsequenceChange(e.target.value)}
                  options={consequenceOptions}
                  required
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Override Consequence Type <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleCancelOverride}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Cancel override
                    </button>
                  </div>
                  <SelectField
                    label=""
                    name="override_consequence_type"
                    value={formData.consequence_type}
                    onChange={(e) => handleConsequenceChange(e.target.value)}
                    options={Object.entries(CONSEQUENCE_TYPE_LABELS).map(([val, label]) => ({ value: val, label }))}
                    required
                  />
                  <p className="text-xs text-red-600">
                    Selecting a consequence outside the district matrix range.
                  </p>
                </div>
              )}

              {['iss', 'oss', 'daep', 'expulsion'].includes(formData.consequence_type) && (
                <div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      label="Days"
                      name="consequence_days"
                      type="number"
                      value={formData.consequence_days}
                      onChange={(e) => updateField('consequence_days', e.target.value)}
                      min={!isOverride && matrixEntry?.consequence_days_min ? matrixEntry.consequence_days_min : 1}
                      max={!isOverride && matrixEntry?.consequence_days_max ? matrixEntry.consequence_days_max : undefined}
                      helpText={
                        matrixEntry?.consequence_days_min || matrixEntry?.consequence_days_max
                          ? `Matrix range: ${matrixEntry.consequence_days_min || 1}–${matrixEntry.consequence_days_max || '∞'} days`
                          : undefined
                      }
                    />
                    <FormField
                      label="Start Date"
                      name="consequence_start"
                      type="date"
                      value={formData.consequence_start}
                      onChange={(e) => updateField('consequence_start', e.target.value)}
                    />
                    <FormField
                      label="End Date"
                      name="consequence_end"
                      type="date"
                      value={formData.consequence_end}
                      onChange={(e) => updateField('consequence_end', e.target.value)}
                    />
                  </div>
                  {!isOverride && matrixEntry && formData.consequence_days && (() => {
                    const days = parseInt(formData.consequence_days)
                    const outOfRange =
                      (matrixEntry.consequence_days_min && days < matrixEntry.consequence_days_min) ||
                      (matrixEntry.consequence_days_max && days > matrixEntry.consequence_days_max)
                    return outOfRange ? (
                      <p className="text-xs text-orange-600 mt-1">
                        Days entered is outside the matrix range ({matrixEntry.consequence_days_min || 1}–{matrixEntry.consequence_days_max || '∞'}). Adjust or use Override to proceed.
                      </p>
                    ) : null
                  })()}
                </div>
              )}

              {/* SPED/504 Cumulative Removal Day Warnings */}
              {spedRequired && isRemovalConsequence && projectedTotal >= 10 && (
                <AlertBanner variant="error" title="MDR Required — IDEA Compliance">
                  This placement will bring cumulative removal days to <strong>{projectedTotal}</strong>.
                  A Manifestation Determination Review (MDR) is required under IDEA before proceeding.
                </AlertBanner>
              )}
              {spedRequired && isRemovalConsequence && projectedTotal >= 5 && projectedTotal < 10 && (
                <AlertBanner variant="warning" title="Cumulative Removal Days Warning">
                  This will bring cumulative removal days to <strong>{projectedTotal}</strong> for this school year.
                  An MDR is required at 10 cumulative days.
                </AlertBanner>
              )}

              {/* Restorative Alternatives panel */}
              <RestorativeAlternatives
                selectedIds={formData.restorative_ids}
                onToggle={handleRestorativeToggle}
              />
            </div>
          )}

          {/* Step 4: Details */}
          {step === 3 && (
            <div className="space-y-4">
              <CardTitle>Incident Details</CardTitle>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Incident Date"
                  name="incident_date"
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => updateField('incident_date', e.target.value)}
                  required
                />
                <FormField
                  label="Incident Time"
                  name="incident_time"
                  type="time"
                  value={formData.incident_time}
                  onChange={(e) => updateField('incident_time', e.target.value)}
                />
              </div>

              <SelectField
                label="Location"
                name="location"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                options={INCIDENT_LOCATIONS.map(l => ({ value: l, label: l }))}
              />

              <FormField
                label="Description"
                name="description"
                type="textarea"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe what happened..."
                required
              />

              <FormField
                label="Additional Notes"
                name="notes"
                type="textarea"
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Any additional information..."
              />
            </div>
          )}

          {/* Step 5: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <CardTitle>Review & Submit</CardTitle>

              {spedRequired && isDaepOrExpulsion && (
                <AlertBanner variant="warning" title="SPED Compliance Required">
                  This incident will be placed on <strong>compliance hold</strong>. A SPED compliance
                  checklist must be completed before the placement can proceed. The SPED coordinator
                  will be notified automatically.
                </AlertBanner>
              )}

              {formData.override_justification?.trim() && (
                <AlertBanner variant="warning" title="Matrix Override">
                  This consequence deviates from the discipline matrix. Justification has been recorded.
                </AlertBanner>
              )}

              <div className="divide-y divide-gray-100">
                <ReviewRow label="Student" value={formatStudentNameShort(formData.student)} />
                <ReviewRow label="Student ID" value={formData.student?.student_id_number} />
                <ReviewRow label="Offense" value={selectedOffenseCode?.title} />
                <ReviewRow label="Offense Code" value={selectedOffenseCode?.code} />
                <ReviewRow label="Prior Occurrences" value={priorOffenseCount > 0 ? `${priorOffenseCount} prior incident(s)` : 'First offense'} />
                <ReviewRow label="Consequence" value={CONSEQUENCE_TYPE_LABELS[formData.consequence_type]} />
                {formData.consequence_days && (
                  <ReviewRow label="Duration" value={`${formData.consequence_days} days`} />
                )}
                <ReviewRow label="Incident Date" value={formData.incident_date} />
                {formData.location && <ReviewRow label="Location" value={formData.location} />}
                <ReviewRow label="Description" value={formData.description} />
                {formData.restorative_ids.length > 0 && (
                  <ReviewRow
                    label="Restorative Options"
                    value={formData.restorative_ids
                      .map(id => interventionCatalog.find(i => i.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  />
                )}
                {formData.override_justification?.trim() && (
                  <ReviewRow label="Override Justification" value={formData.override_justification} />
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => step === 0 ? navigate('/incidents') : setStep(step - 1)}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting} disabled={!canProceed()}>
                Submit Incident
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}
