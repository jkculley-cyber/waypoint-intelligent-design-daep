import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import FormField, { SelectField } from '../ui/FormField'
import { useReviewActions } from '../../hooks/useTransitionPlans'
import {
  REVIEW_TYPE,
  REVIEW_TYPE_LABELS,
  PROGRESS_RATING,
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

export default function ReviewForm({ planId, onClose, onComplete }) {
  const { createReview } = useReviewActions()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    review_type: '',
    progress_rating: '',
    behavioral_notes: '',
    academic_notes: '',
    parent_contact_notes: '',
    recommendations: '',
    next_steps: '',
  })

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.review_type) {
      toast.error('Please select a review type')
      return
    }
    if (!form.progress_rating) {
      toast.error('Please select a progress rating')
      return
    }

    setSaving(true)
    const { error } = await createReview({
      plan_id: planId,
      review_type: form.review_type,
      progress_rating: form.progress_rating,
      behavioral_notes: form.behavioral_notes || null,
      academic_notes: form.academic_notes || null,
      parent_contact_notes: form.parent_contact_notes || null,
      recommendations: form.recommendations || null,
      next_steps: form.next_steps || null,
    })

    if (error) {
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
      description="Document the student's progress at this review checkpoint."
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
      <div className="space-y-4">
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
            label="Progress Rating"
            name="progress_rating"
            value={form.progress_rating}
            onChange={(e) => handleChange('progress_rating', e.target.value)}
            options={RATING_OPTIONS}
            placeholder="Select rating..."
            required
          />
        </div>

        <FormField
          label="Behavioral Progress Notes"
          name="behavioral_notes"
          type="textarea"
          value={form.behavioral_notes}
          onChange={(e) => handleChange('behavioral_notes', e.target.value)}
          placeholder="Describe the student's behavioral progress since the last review..."
        />

        <FormField
          label="Academic Progress Notes"
          name="academic_notes"
          type="textarea"
          value={form.academic_notes}
          onChange={(e) => handleChange('academic_notes', e.target.value)}
          placeholder="Describe the student's academic progress..."
        />

        <FormField
          label="Parent Contact Notes"
          name="parent_contact_notes"
          type="textarea"
          value={form.parent_contact_notes}
          onChange={(e) => handleChange('parent_contact_notes', e.target.value)}
          placeholder="Document parent/guardian communication..."
        />

        <FormField
          label="Recommendations"
          name="recommendations"
          type="textarea"
          value={form.recommendations}
          onChange={(e) => handleChange('recommendations', e.target.value)}
          placeholder="Recommendations for next steps..."
        />

        <FormField
          label="Next Steps"
          name="next_steps"
          type="textarea"
          value={form.next_steps}
          onChange={(e) => handleChange('next_steps', e.target.value)}
          placeholder="Specific action items for the next review period..."
        />
      </div>
    </Modal>
  )
}
