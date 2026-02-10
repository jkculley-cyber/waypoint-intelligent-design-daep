import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import {
  useOffenseCodes,
  useFullDisciplineMatrix,
  useMatrixActions,
} from '../hooks/useOffenseCodes'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/Modal'
import FormField, { SelectField } from '../components/ui/FormField'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import {
  OFFENSE_CATEGORY_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  CONSEQUENCE_TYPES,
  CONSEQUENCE_TYPE_LABELS,
} from '../lib/constants'

const CONSEQUENCE_OPTIONS = Object.entries(CONSEQUENCE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const SUPPORT_OPTIONS = [
  { value: 'parent_conference', label: 'Parent Conference' },
  { value: 'behavior_contract', label: 'Behavior Contract' },
  { value: 'counselor_referral', label: 'Counselor Referral' },
  { value: 'anger_management', label: 'Anger Management' },
  { value: 'conflict_resolution', label: 'Conflict Resolution' },
  { value: 'substance_abuse_counseling', label: 'Substance Abuse Counseling' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'check_in_check_out', label: 'Check-In/Check-Out (CICO)' },
  { value: 'social_skills_group', label: 'Social Skills Group' },
  { value: 'restorative_circle', label: 'Restorative Circle' },
  { value: 'threat_assessment', label: 'Threat Assessment' },
  { value: 'safety_plan', label: 'Safety Plan' },
  { value: 'fba', label: 'Functional Behavior Assessment' },
  { value: 'bip', label: 'Behavior Intervention Plan' },
  { value: 'sped_referral', label: 'SPED Referral Consideration' },
]

const EMPTY_FORM = {
  offense_code_id: '',
  occurrence: 1,
  min_consequence: '',
  default_consequence: '',
  max_consequence: '',
  consequence_days_min: '',
  consequence_days_max: '',
  required_supports: [],
}

export default function MatrixEditorPage() {
  const navigate = useNavigate()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { offenseCodes, loading: codesLoading } = useOffenseCodes({
    category: categoryFilter || undefined,
  })
  const { entries: matrixEntries, loading: matrixLoading, refetch } = useFullDisciplineMatrix({
    category: categoryFilter || undefined,
  })
  const { createMatrixEntry, updateMatrixEntry, deleteMatrixEntry } = useMatrixActions()

  const loading = codesLoading || matrixLoading

  // Group matrix entries by offense code
  const groupedEntries = useMemo(() => {
    const grouped = {}
    matrixEntries.forEach((entry) => {
      const offenseId = entry.offense_code_id
      if (!grouped[offenseId]) {
        grouped[offenseId] = {
          offenseCode: entry.offense_codes,
          entries: [],
        }
      }
      grouped[offenseId].entries.push(entry)
    })

    // Add offense codes without matrix entries
    offenseCodes.forEach((code) => {
      if (!grouped[code.id]) {
        grouped[code.id] = {
          offenseCode: code,
          entries: [],
        }
      }
    })

    // Convert to sorted array
    let arr = Object.values(grouped).sort((a, b) =>
      a.offenseCode?.name?.localeCompare(b.offenseCode?.name)
    )

    // Apply search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      arr = arr.filter(
        (item) =>
          item.offenseCode?.name?.toLowerCase().includes(lower) ||
          item.offenseCode?.code?.toLowerCase().includes(lower)
      )
    }

    return arr
  }, [matrixEntries, offenseCodes, searchTerm])

  // Offense code options for the select
  const offenseCodeOptions = useMemo(
    () =>
      offenseCodes.map((c) => ({
        value: c.id,
        label: `${c.name}${c.code ? ` (${c.code})` : ''}`,
      })),
    [offenseCodes]
  )

  const categoryOptions = Object.entries(OFFENSE_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  // Open add modal for a specific offense code
  const handleAdd = (offenseCodeId) => {
    // Find existing entries to suggest next occurrence
    const existing = matrixEntries.filter((e) => e.offense_code_id === offenseCodeId)
    const nextOccurrence = existing.length > 0
      ? Math.max(...existing.map((e) => e.occurrence)) + 1
      : 1

    setForm({
      ...EMPTY_FORM,
      offense_code_id: offenseCodeId,
      occurrence: nextOccurrence,
    })
    setSelectedEntry(null)
    setEditModalOpen(true)
  }

  // Open edit modal
  const handleEdit = (entry) => {
    setForm({
      offense_code_id: entry.offense_code_id,
      occurrence: entry.occurrence,
      min_consequence: entry.min_consequence || '',
      default_consequence: entry.default_consequence || '',
      max_consequence: entry.max_consequence || '',
      consequence_days_min: entry.consequence_days_min || '',
      consequence_days_max: entry.consequence_days_max || '',
      required_supports: entry.required_supports || [],
    })
    setSelectedEntry(entry)
    setEditModalOpen(true)
  }

  // Open delete confirmation
  const handleDeleteClick = (entry) => {
    setSelectedEntry(entry)
    setDeleteDialogOpen(true)
  }

  // Save (create or update)
  const handleSave = async () => {
    // Validate
    if (!form.offense_code_id) {
      toast.error('Please select an offense code')
      return
    }
    if (!form.min_consequence || !form.default_consequence || !form.max_consequence) {
      toast.error('Please set minimum, recommended, and maximum consequences')
      return
    }

    // Validate consequence order
    const order = ['warning', 'detention', 'iss', 'oss', 'daep', 'expulsion']
    const minIdx = order.indexOf(form.min_consequence)
    const defIdx = order.indexOf(form.default_consequence)
    const maxIdx = order.indexOf(form.max_consequence)

    if (minIdx > defIdx || defIdx > maxIdx) {
      toast.error('Consequence order must be: Min ≤ Recommended ≤ Max')
      return
    }

    if (minIdx > maxIdx) {
      toast.error('Minimum consequence cannot be greater than maximum')
      return
    }

    setSaving(true)
    const payload = {
      offense_code_id: form.offense_code_id,
      occurrence: parseInt(form.occurrence) || 1,
      min_consequence: form.min_consequence,
      default_consequence: form.default_consequence,
      max_consequence: form.max_consequence,
      consequence_days_min: form.consequence_days_min ? parseInt(form.consequence_days_min) : null,
      consequence_days_max: form.consequence_days_max ? parseInt(form.consequence_days_max) : null,
      required_supports: form.required_supports,
    }

    let result
    if (selectedEntry) {
      result = await updateMatrixEntry(selectedEntry.id, payload)
    } else {
      result = await createMatrixEntry(payload)
    }

    if (result.error) {
      toast.error(result.error.message || 'Failed to save matrix entry')
    } else {
      toast.success(selectedEntry ? 'Matrix rule updated' : 'Matrix rule created')
      setEditModalOpen(false)
      refetch()
    }
    setSaving(false)
  }

  // Delete
  const handleDelete = async () => {
    if (!selectedEntry) return
    setDeleting(true)
    const { error } = await deleteMatrixEntry(selectedEntry.id)
    if (error) {
      toast.error('Failed to delete matrix entry')
    } else {
      toast.success('Matrix rule removed')
      setDeleteDialogOpen(false)
      refetch()
    }
    setDeleting(false)
  }

  const handleSupportToggle = (supportValue) => {
    setForm((prev) => ({
      ...prev,
      required_supports: prev.required_supports.includes(supportValue)
        ? prev.required_supports.filter((s) => s !== supportValue)
        : [...prev.required_supports, supportValue],
    }))
  }

  return (
    <div>
      <Topbar
        title="Matrix Editor"
        subtitle="Configure offense-to-consequence rules"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/matrix')}>
            Back to Matrix
          </Button>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search offense codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="w-full sm:w-64">
              <SelectField
                name="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={categoryOptions}
                placeholder="All Categories"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setForm(EMPTY_FORM)
                setSelectedEntry(null)
                setEditModalOpen(true)
              }}
            >
              Add Rule
            </Button>
          </div>
        </Card>

        {/* Matrix Entries by Offense */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : groupedEntries.length === 0 ? (
          <EmptyState
            title="No Offense Codes Found"
            message="No offense codes match your search criteria."
          />
        ) : (
          <div className="space-y-4">
            {groupedEntries.map(({ offenseCode, entries }) => (
              <Card key={offenseCode.id}>
                {/* Offense Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{offenseCode.name}</h3>
                    {offenseCode.code && (
                      <span className="text-xs font-mono text-gray-400">{offenseCode.code}</span>
                    )}
                    <Badge color={SEVERITY_COLORS[offenseCode.severity]} size="sm">
                      {SEVERITY_LABELS[offenseCode.severity]}
                    </Badge>
                    {offenseCode.is_mandatory_daep && (
                      <Badge color="red" size="sm">Mandatory DAEP</Badge>
                    )}
                    {offenseCode.is_mandatory_expulsion && (
                      <Badge color="red" size="sm">Mandatory Expulsion</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdd(offenseCode.id)}
                  >
                    + Add Rule
                  </Button>
                </div>

                {offenseCode.tec_reference && (
                  <p className="text-xs text-gray-400 mb-3">TEC: {offenseCode.tec_reference}</p>
                )}

                {/* Matrix Rules */}
                {entries.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">
                    No rules configured. Click "Add Rule" to define consequences for this offense.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                          <th className="px-3 py-2 font-medium">Occurrence</th>
                          <th className="px-3 py-2 font-medium">Min</th>
                          <th className="px-3 py-2 font-medium">Recommended</th>
                          <th className="px-3 py-2 font-medium">Max</th>
                          <th className="px-3 py-2 font-medium">Days</th>
                          <th className="px-3 py-2 font-medium">Supports</th>
                          <th className="px-3 py-2 font-medium w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <Badge color="blue" size="sm">
                                {getOrdinal(entry.occurrence)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {CONSEQUENCE_TYPE_LABELS[entry.min_consequence] || '—'}
                            </td>
                            <td className="px-3 py-2 font-medium text-orange-600">
                              {CONSEQUENCE_TYPE_LABELS[entry.default_consequence] || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {CONSEQUENCE_TYPE_LABELS[entry.max_consequence] || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs">
                              {entry.consequence_days_min || entry.consequence_days_max
                                ? `${entry.consequence_days_min || '—'}–${entry.consequence_days_max || '—'}`
                                : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {entry.required_supports?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {entry.required_supports.map((s, i) => (
                                    <Badge key={i} color="purple" size="sm">
                                      {s.replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">None</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className="p-1 text-gray-400 hover:text-orange-600 rounded transition-colors"
                                  title="Edit"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(entry)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Delete"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedEntry ? 'Edit Matrix Rule' : 'Add Matrix Rule'}
        description="Define the consequence range for a specific occurrence of an offense."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {selectedEntry ? 'Update Rule' : 'Create Rule'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Offense Code */}
          <SelectField
            label="Offense Code"
            name="offense_code_id"
            value={form.offense_code_id}
            onChange={(e) => setForm((prev) => ({ ...prev, offense_code_id: e.target.value }))}
            options={offenseCodeOptions}
            placeholder="Select offense code..."
            required
            disabled={!!selectedEntry}
          />

          {/* Occurrence */}
          <FormField
            label="Occurrence Number"
            name="occurrence"
            type="number"
            value={form.occurrence}
            onChange={(e) => setForm((prev) => ({ ...prev, occurrence: e.target.value }))}
            helpText="Which occurrence of this offense does this rule apply to? (1st, 2nd, 3rd...)"
            required
            min={1}
          />

          {/* Consequence Range */}
          <div className="grid grid-cols-3 gap-3">
            <SelectField
              label="Minimum"
              name="min_consequence"
              value={form.min_consequence}
              onChange={(e) => setForm((prev) => ({ ...prev, min_consequence: e.target.value }))}
              options={CONSEQUENCE_OPTIONS}
              placeholder="Select..."
              required
            />
            <SelectField
              label="Recommended"
              name="default_consequence"
              value={form.default_consequence}
              onChange={(e) => setForm((prev) => ({ ...prev, default_consequence: e.target.value }))}
              options={CONSEQUENCE_OPTIONS}
              placeholder="Select..."
              required
            />
            <SelectField
              label="Maximum"
              name="max_consequence"
              value={form.max_consequence}
              onChange={(e) => setForm((prev) => ({ ...prev, max_consequence: e.target.value }))}
              options={CONSEQUENCE_OPTIONS}
              placeholder="Select..."
              required
            />
          </div>

          {/* Duration Range */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Min Days"
              name="consequence_days_min"
              type="number"
              value={form.consequence_days_min}
              onChange={(e) => setForm((prev) => ({ ...prev, consequence_days_min: e.target.value }))}
              placeholder="e.g., 1"
              helpText="Minimum duration in days"
              min={0}
            />
            <FormField
              label="Max Days"
              name="consequence_days_max"
              type="number"
              value={form.consequence_days_max}
              onChange={(e) => setForm((prev) => ({ ...prev, consequence_days_max: e.target.value }))}
              placeholder="e.g., 30"
              helpText="Maximum duration in days"
              min={0}
            />
          </div>

          {/* Required Supports */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Supports
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select the supports that must be implemented along with this consequence.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    form.required_supports.includes(opt.value)
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.required_supports.includes(opt.value)}
                    onChange={() => handleSupportToggle(opt.value)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Remove Matrix Rule"
        message={`Are you sure you want to remove this matrix rule? The rule for occurrence #${selectedEntry?.occurrence} will be deactivated.`}
        confirmLabel="Remove Rule"
        loading={deleting}
      />
    </div>
  )
}

function getOrdinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const mod = n % 100
  return n + (suffixes[(mod - 20) % 10] || suffixes[mod] || suffixes[0])
}
