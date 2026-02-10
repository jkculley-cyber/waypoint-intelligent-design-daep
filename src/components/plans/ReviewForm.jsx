import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import FormField, { SelectField } from '../ui/FormField'
import { useReviewActions } from '../../hooks/useTransitionPlans'
import {
  REVIEW_TYPE_LABELS,
  PROGRESS_RATING_LABELS,
} from '../../lib/constants'

const REVIEW_TYPE_OPTIONS = Object.entries(REVIEW_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const RATING_OPTIONS = Object.entries(PROGRESS_RATING_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const EFFECTIVENESS_OPTIONS = [
  { value: 'highly_effective', label: 'Highly Effective' },
  { value: 'effective', label: 'Effective' },
  { value: 'somewhat_effective', label: 'Somewhat Effective' },
  { value: 'ineffective', label: 'Ineffective' },
  { value: 'not_rated', label: 'Not Yet Rated' },
]

const FIDELITY_OPTIONS = [
  { value: 'full', label: 'Full Implementation' },
  { value: 'partial', label: 'Partial Implementation' },
  { value: 'minimal', label: 'Minimal Implementation' },
  { value: 'not_implemented', label: 'Not Implemented' },
]

export default function ReviewForm({ planId, studentId, districtId, onClose, onComplete }) {
  const { createReview } = useReviewActions()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    review_type: '',
    overall_progress: '',
    intervention_effectiveness: '',
    implementation_fidelity: '',
    behavioral_notes: '',
    academic_notes: '',
    implementation_notes: '',
    parent_contact_notes: '',
    recommendations: '',
    next_steps: '',
    strengths: '',
    concerns: '',
    continue_plan: true,
    escalation_needed: false,
    days_present: '',
    days_absent: '',
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.review_type) {
      toast.error('Please select a review type')
      return
    }
    if (!form.overall_progress) {
      toast.error('Please select a progress rating')
      return
    }

    setSaving(true)
    const { error } = await createReview({
      plan_id: planId,
      student_id: studentId,
      district_id: districtId,
      review_type: form.review_type,
      overall_progress: form.overall_progress,
      progress_rating: form.overall_progress,
      intervention_effectiveness: form.intervention_effectiveness || null,
      implementation_fidelity: form.implementation_fidelity || null,
      behavioral_notes: form.behavioral_notes || null,
      academic_notes: form.academic_notes || null,
      implementation_notes: form.implementation_notes || null,
      parent_contact_notes: form.parent_contact_notes || null,
      recommendations: form.recommendations || null,
      next_steps: form.next_steps || null,
      strengths: form.strengths || null,
      concerns: form.concerns || null,
      continue_plan: form.continue_plan,
      escalation_needed: form.escalation_needed,
      days_present: form.days_present ? Number(form.days_present) : null,
      days_absent: form.days_absent ? Number(form.days_absent) : null,
    })

    if (error) {
      console.error('Review save error:', error)
      toast.error('Failed to save review')
    } else {
      toast.success('Review saved successfully')
      onComplete()
    }
    setSaving(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Plan Review"
      description="Document the student's progress, plan effectiveness, and implementation fidelity."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save Review
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Review Type + Progress */}
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Review Type"
            name="review_type"
            value={form.review_type}
            onChange={(e) => handleChange('review_type', e.target.value)}
            options={REVIEW_TYPE_OPTIONS}
            placeholder="Select type..."
            required
          />
          <SelectField
            label="Overall Progress"
            name="overall_progress"
            value={form.overall_progress}
            onChange={(e) => handleChange('overall_progress', e.target.value)}
            options={RATING_OPTIONS}
            placeholder="Select rating..."
            required
          />
        </div>

        {/* Effectiveness + Implementation Fidelity */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Effectiveness & Implementation</h4>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Intervention Effectiveness"
              name="intervention_effectiveness"
              value={form.intervention_effectiveness}
              onChange={(e) => handleChange('intervention_effectiveness', e.target.value)}
              options={EFFECTIVENESS_OPTIONS}
              placeholder="Rate effectiveness..."
            />
            <SelectField
              label="Implementation Fidelity"
              name="implementation_fidelity"
              value={form.implementation_fidelity}
              onChange={(e) => handleChange('implementation_fidelity', e.target.value)}
              options={FIDELITY_OPTIONS}
              placeholder="Rate fidelity..."
            />
          </div>
          <div className="mt-3">
            <FormField
              label="Implementation Notes"
              name="implementation_notes"
              type="textarea"
              value={form.implementation_notes}
              onChange={(e) => handleChange('implementation_notes', e.target.value)}
              placeholder="Describe how interventions are being implemented, any barriers, fidelity observations..."
            />
          </div>
        </div>

        {/* Attendance during review period */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Days Present (this period)"
            name="days_present"
            type="number"
            value={form.days_present}
            onChange={(e) => handleChange('days_present', e.target.value)}
          />
          <FormField
            label="Days Absent (this period)"
            name="days_absent"
            type="number"
            value={form.days_absent}
            onChange={(e) => handleChange('days_absent', e.target.value)}
          />
        </div>

        {/* Behavioral + Academic Notes */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Progress Notes</h4>
          <div className="space-y-3">
            <FormField
              label="Strengths"
              name="strengths"
              type="textarea"
              value={form.strengths}
              onChange={(e) => handleChange('strengths', e.target.value)}
              placeholder="What is the student doing well?"
            />
            <FormField
              label="Concerns"
              name="concerns"
              type="textarea"
              value={form.concerns}
              onChange={(e) => handleChange('concerns', e.target.value)}
              placeholder="What areas still need improvement?"
            />
            <FormField
              label="Behavioral Progress"
              name="behavioral_notes"
              type="textarea"
              value={form.behavioral_notes}
              onChange={(e) => handleChange('behavioral_notes', e.target.value)}
              placeholder="Describe the student's behavioral progress since the last review..."
            />
            <FormField
              label="Academic Progress"
              name="academic_notes"
              type="textarea"
              value={form.academic_notes}
              onChange={(e) => handleChange('academic_notes', e.target.value)}
              placeholder="Describe the student's academic progress..."
            />
          </div>
        </div>

        {/* Parent + Recommendations */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recommendations & Next Steps</h4>
          <FormField
            label="Parent Contact Notes"
            name="parent_contact_notes"
            type="textarea"
            value={form.parent_contact_notes}
            onChange={(e) => handleChange('parent_contact_notes', e.target.value)}
            placeholder="Document parent/guardian communication..."
          />
          <div className="mt-3">
            <FormField
              label="Recommendations"
              name="recommendations"
              type="textarea"
              value={form.recommendations}
              onChange={(e) => handleChange('recommendations', e.target.value)}
              placeholder="Recommendations for the committee..."
            />
          </div>
          <div className="mt-3">
            <FormField
              label="Next Steps"
              name="next_steps"
              type="textarea"
              value={form.next_steps}
              onChange={(e) => handleChange('next_steps', e.target.value)}
              placeholder="Specific action items for the next review period..."
            />
          </div>
        </div>

        {/* Plan Continuation */}
        <div className="border-t border-gray-100 pt-4 flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.continue_plan}
              onChange={(e) => handleChange('continue_plan', e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            Continue current plan
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.escalation_needed}
              onChange={(e) => handleChange('escalation_needed', e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Escalation needed
          </label>
        </div>
      </div>
    </Modal>
  )
}
