import { useState } from 'react'
import toast from 'react-hot-toast'
import Card, { CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { SelectField } from '../ui/FormField'
import {
  useInterventions,
  useStudentInterventionActions,
} from '../../hooks/useTransitionPlans'
import {
  INTERVENTION_CATEGORY_LABELS,
} from '../../lib/constants'
import { formatDate } from '../../lib/utils'

const TIER_COLORS = { 1: 'green', 2: 'yellow', 3: 'red' }
const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3' }

export default function InterventionList({
  interventions,
  planId,
  studentId,
  canManage,
  onUpdate,
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedIntervention, setSelectedIntervention] = useState('')
  const [saving, setSaving] = useState(false)

  const { interventions: catalog, loading: catalogLoading } = useInterventions()
  const { assignIntervention } = useStudentInterventionActions()

  const catalogOptions = catalog
    .filter((i) => !interventions.some((si) => si.intervention_id === i.id))
    .map((i) => ({
      value: i.id,
      label: `[T${i.tier}] ${i.name} (${INTERVENTION_CATEGORY_LABELS[i.category] || i.category})`,
    }))

  const handleAdd = async () => {
    if (!selectedIntervention) {
      toast.error('Please select an intervention')
      return
    }

    setSaving(true)
    const { error } = await assignIntervention({
      student_id: studentId,
      intervention_id: selectedIntervention,
      plan_id: planId,
      start_date: new Date().toISOString(),
    })

    if (error) {
      toast.error('Failed to assign intervention')
    } else {
      toast.success('Intervention assigned')
      setShowAddModal(false)
      setSelectedIntervention('')
      onUpdate?.()
    }
    setSaving(false)
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Assigned Interventions</CardTitle>
          {canManage && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(true)}>
              + Add Intervention
            </Button>
          )}
        </div>

        {interventions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No interventions assigned yet.
          </p>
        ) : (
          <div className="space-y-2">
            {interventions.map((si) => {
              const intervention = si.interventions
              return (
                <div
                  key={si.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge color={TIER_COLORS[intervention?.tier]} size="sm">
                      {TIER_LABELS[intervention?.tier]}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {intervention?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {INTERVENTION_CATEGORY_LABELS[intervention?.category] || intervention?.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      color={si.status === 'active' ? 'green' : si.status === 'completed' ? 'blue' : 'gray'}
                      size="sm"
                    >
                      {si.status}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(si.start_date)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Add Intervention Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Intervention"
        description="Assign an intervention from the catalog to this student's plan."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={saving}>
              Assign Intervention
            </Button>
          </>
        }
      >
        <SelectField
          label="Select Intervention"
          name="intervention_id"
          value={selectedIntervention}
          onChange={(e) => setSelectedIntervention(e.target.value)}
          options={catalogOptions}
          placeholder="Choose an intervention..."
          required
        />
        {selectedIntervention && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            {(() => {
              const selected = catalog.find((i) => i.id === selectedIntervention)
              if (!selected) return null
              return (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color={TIER_COLORS[selected.tier]} size="sm">
                      {TIER_LABELS[selected.tier]}
                    </Badge>
                    <Badge color="gray" size="sm">
                      {INTERVENTION_CATEGORY_LABELS[selected.category]}
                    </Badge>
                  </div>
                  {selected.description && (
                    <p className="text-gray-600 mt-2">{selected.description}</p>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </Modal>
    </>
  )
}
