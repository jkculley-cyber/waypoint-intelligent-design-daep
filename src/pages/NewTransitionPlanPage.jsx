import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { addDays, format } from 'date-fns'
import { useTransitionPlanActions, useInterventions } from '../hooks/useTransitionPlans'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import FormField, { SelectField } from '../components/ui/FormField'
import StudentSearch from '../components/students/StudentSearch'
import StudentFlags from '../components/students/StudentFlags'
import {
  PLAN_TYPE,
  PLAN_TYPE_LABELS,
  INTERVENTION_CATEGORY_LABELS,
} from '../lib/constants'
import { formatStudentNameShort } from '../lib/utils'

const PLAN_TYPE_OPTIONS = Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const TIER_COLORS = { 1: 'green', 2: 'yellow', 3: 'red' }

const STEPS = ['Student', 'Plan Type', 'Goals & Metrics', 'Interventions', 'Review']

// Default goals/metrics templates by plan type
const TEMPLATES = {
  [PLAN_TYPE.DAEP_EXIT]: {
    goals: `1. Demonstrate improved behavioral self-regulation upon return to home campus
2. Maintain zero office referrals for the first 30 days
3. Complete all assigned academic catch-up work
4. Attend all scheduled check-ins with counselor`,
    success_metrics: `- Office referrals: 0 in first 30 days, ≤1 in 60 days
- Attendance: ≥95% for 90-day monitoring period
- Academic: Passing all core subjects
- Behavioral: CICO scores averaging ≥80%`,
    escalation_protocol: `If student receives 2+ referrals within 30 days:
1. Immediate parent conference
2. Review current interventions with campus team
3. Consider additional Tier 2/3 supports
4. If no improvement in 14 days, convene SST meeting`,
    parent_engagement_plan: `- Initial parent meeting before campus return
- Weekly phone/email check-in for first 30 days
- Monthly check-in for remaining monitoring period
- Parent invited to all review meetings`,
    duration: 90,
  },
  [PLAN_TYPE.DAEP_ENTRY]: {
    goals: `1. Successfully transition to DAEP with minimal behavioral disruption
2. Continue progress on IEP goals (if applicable)
3. Complete daily behavior tracking with ≥80% positive scores
4. Participate in assigned intervention programs`,
    success_metrics: `- Daily behavior scores: ≥80% average
- DAEP attendance: 100%
- Assignment completion: ≥90%
- Zero additional disciplinary incidents at DAEP`,
    escalation_protocol: `If student behavior scores drop below 60% for 3+ consecutive days:
1. Counselor conference
2. Parent notification
3. Review and adjust interventions
4. Consider mental health referral`,
    parent_engagement_plan: `- Orientation meeting within first 3 days of placement
- Weekly progress reports sent home
- Parent portal access for daily behavior tracking
- Monthly conference calls`,
    duration: 45,
  },
  [PLAN_TYPE.ISS_REENTRY]: {
    goals: `1. Return to regular class schedule without disruption
2. Complete restorative conference with affected parties
3. Demonstrate understanding of behavioral expectations
4. Maintain positive behavior for 30-day monitoring period`,
    success_metrics: `- Zero repeat offenses in 30 days
- Attendance: ≥95%
- Teacher feedback: Positive for ≥80% of classes
- Restorative tasks completed`,
    escalation_protocol: `If student commits same offense within 30 days:
1. Immediate administrator conference
2. Parent notification
3. Escalate to more intensive intervention
4. Consider Tier 2/3 supports`,
    parent_engagement_plan: `- Phone contact on re-entry day
- Written progress update at 15 days
- Final follow-up at 30 days`,
    duration: 30,
  },
  [PLAN_TYPE.BEHAVIORAL]: {
    goals: `1. Reduce target behavior frequency by 50% within 30 days
2. Demonstrate use of replacement behavior strategies
3. Complete assigned social-emotional learning modules
4. Maintain positive teacher interactions`,
    success_metrics: `- Target behavior frequency: Reduced 50%
- Replacement behavior usage: Documented daily
- SEL modules: Completed on schedule
- Teacher reports: Improved by 60-day mark`,
    escalation_protocol: `If no improvement after 30 days:
1. Review FBA data
2. Modify BIP strategies
3. Consider SPED referral
4. Schedule SST meeting`,
    parent_engagement_plan: `- Biweekly behavior reports
- Monthly parent conference
- Parent training on reinforcement strategies`,
    duration: 60,
  },
  [PLAN_TYPE.CUSTOM]: {
    goals: '',
    success_metrics: '',
    escalation_protocol: '',
    parent_engagement_plan: '',
    duration: 90,
  },
}

export default function NewTransitionPlanPage() {
  const navigate = useNavigate()
  const { createPlan } = useTransitionPlanActions()
  const { interventions: catalog } = useInterventions()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    student: null,
    plan_type: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    goals: '',
    success_metrics: '',
    escalation_protocol: '',
    parent_engagement_plan: '',
    selected_interventions: [],
    notes: '',
  })

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePlanTypeChange = (planType) => {
    const template = TEMPLATES[planType] || TEMPLATES[PLAN_TYPE.CUSTOM]
    const startDate = form.start_date || format(new Date(), 'yyyy-MM-dd')
    const endDate = format(addDays(new Date(startDate), template.duration), 'yyyy-MM-dd')

    setForm((prev) => ({
      ...prev,
      plan_type: planType,
      end_date: endDate,
      goals: template.goals,
      success_metrics: template.success_metrics,
      escalation_protocol: template.escalation_protocol,
      parent_engagement_plan: template.parent_engagement_plan,
    }))
  }

  const handleInterventionToggle = (interventionId) => {
    setForm((prev) => ({
      ...prev,
      selected_interventions: prev.selected_interventions.includes(interventionId)
        ? prev.selected_interventions.filter((id) => id !== interventionId)
        : [...prev.selected_interventions, interventionId],
    }))
  }

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.student
      case 1: return !!form.plan_type && !!form.start_date && !!form.end_date
      case 2: return !!form.goals
      case 3: return true
      case 4: return true
      default: return false
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    const { data, error } = await createPlan({
      student_id: form.student.id,
      plan_type: form.plan_type,
      start_date: form.start_date,
      end_date: form.end_date,
      goals: form.goals,
      success_metrics: form.success_metrics || null,
      escalation_protocol: form.escalation_protocol || null,
      parent_engagement_plan: form.parent_engagement_plan || null,
      notes: form.notes || null,
      status: 'draft',
      next_review_date: format(addDays(new Date(form.start_date), 30), 'yyyy-MM-dd'),
    })

    if (error) {
      toast.error(error.message || 'Failed to create plan')
    } else {
      toast.success('Transition plan created')
      navigate(`/plans/${data.id}`)
    }
    setSaving(false)
  }

  return (
    <div>
      <Topbar
        title="New Transition Plan"
        subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
      />

      <div className="p-6">
        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-initial">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i < step
                      ? 'bg-green-500 text-white'
                      : i === step
                      ? 'bg-orange-500 text-white'
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
                <span className={`ml-2 text-sm hidden sm:block ${i === step ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="max-w-3xl mx-auto">
          {/* Step 0: Student */}
          {step === 0 && (
            <div>
              <CardTitle>Select Student</CardTitle>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Search for the student who needs a transition plan.
              </p>
              <StudentSearch
                onSelect={(student) => handleFieldChange('student', student)}
                selected={form.student}
              />
              {form.student && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {formatStudentNameShort(form.student)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ID: {form.student.student_id_number} | Grade: {form.student.grade_level}
                  </p>
                  <div className="mt-2">
                    <StudentFlags student={form.student} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Plan Type */}
          {step === 1 && (
            <div>
              <CardTitle>Plan Configuration</CardTitle>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Select the plan type and monitoring period.
              </p>
              <div className="space-y-4">
                <SelectField
                  label="Plan Type"
                  name="plan_type"
                  value={form.plan_type}
                  onChange={(e) => handlePlanTypeChange(e.target.value)}
                  options={PLAN_TYPE_OPTIONS}
                  placeholder="Select plan type..."
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Start Date"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => handleFieldChange('start_date', e.target.value)}
                    required
                  />
                  <FormField
                    label="End Date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => handleFieldChange('end_date', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goals & Metrics */}
          {step === 2 && (
            <div>
              <CardTitle>Goals, Metrics & Protocols</CardTitle>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {form.plan_type !== PLAN_TYPE.CUSTOM
                  ? 'Pre-populated based on plan type. Customize as needed.'
                  : 'Define the goals and success criteria for this plan.'}
              </p>
              <div className="space-y-4">
                <FormField
                  label="Goals"
                  name="goals"
                  type="textarea"
                  value={form.goals}
                  onChange={(e) => handleFieldChange('goals', e.target.value)}
                  required
                  rows={5}
                />
                <FormField
                  label="Success Metrics"
                  name="success_metrics"
                  type="textarea"
                  value={form.success_metrics}
                  onChange={(e) => handleFieldChange('success_metrics', e.target.value)}
                  rows={4}
                />
                <FormField
                  label="Escalation Protocol"
                  name="escalation_protocol"
                  type="textarea"
                  value={form.escalation_protocol}
                  onChange={(e) => handleFieldChange('escalation_protocol', e.target.value)}
                  rows={4}
                />
                <FormField
                  label="Parent Engagement Plan"
                  name="parent_engagement_plan"
                  type="textarea"
                  value={form.parent_engagement_plan}
                  onChange={(e) => handleFieldChange('parent_engagement_plan', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Interventions */}
          {step === 3 && (
            <div>
              <CardTitle>Select Interventions</CardTitle>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Choose the behavioral and academic interventions to include in this plan.
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {catalog.map((intervention) => {
                  const isSelected = form.selected_interventions.includes(intervention.id)
                  return (
                    <label
                      key={intervention.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleInterventionToggle(intervention.id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <Badge color={TIER_COLORS[intervention.tier]} size="sm">
                        Tier {intervention.tier}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{intervention.name}</p>
                        <p className="text-xs text-gray-500">
                          {INTERVENTION_CATEGORY_LABELS[intervention.category]}
                          {intervention.description && ` — ${intervention.description}`}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {form.selected_interventions.length} intervention{form.selected_interventions.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <CardTitle>Review Plan</CardTitle>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Review all details before creating the transition plan.
              </p>
              <div className="space-y-4">
                <ReviewRow label="Student" value={formatStudentNameShort(form.student)} />
                <ReviewRow label="Plan Type" value={PLAN_TYPE_LABELS[form.plan_type]} />
                <ReviewRow label="Period" value={`${form.start_date} to ${form.end_date}`} />
                <ReviewRow label="Goals" value={form.goals} multiline />
                <ReviewRow label="Success Metrics" value={form.success_metrics} multiline />
                <ReviewRow label="Escalation Protocol" value={form.escalation_protocol} multiline />
                <ReviewRow label="Parent Engagement" value={form.parent_engagement_plan} multiline />
                <ReviewRow
                  label="Interventions"
                  value={
                    form.selected_interventions.length > 0
                      ? `${form.selected_interventions.length} selected`
                      : 'None selected'
                  }
                />

                <FormField
                  label="Additional Notes"
                  name="notes"
                  type="textarea"
                  value={form.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Any additional notes for this plan..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => step === 0 ? navigate('/plans') : setStep(step - 1)}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={saving}
                disabled={!canProceed()}
              >
                Create Plan
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ReviewRow({ label, value, multiline }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className={`text-sm text-gray-900 mt-0.5 ${multiline ? 'whitespace-pre-wrap bg-gray-50 rounded p-2' : ''}`}>
        {value || <span className="text-gray-400">Not specified</span>}
      </dd>
    </div>
  )
}
