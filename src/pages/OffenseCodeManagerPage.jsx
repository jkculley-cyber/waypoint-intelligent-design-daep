import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useOffenseCodes, useOffenseCodeActions } from '../hooks/useOffenseCodes'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import FormField, { SelectField } from '../components/ui/FormField'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import {
  OFFENSE_CATEGORIES,
  OFFENSE_CATEGORY_LABELS,
  SEVERITY,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from '../lib/constants'

const CATEGORY_OPTIONS = Object.entries(OFFENSE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const SEVERITY_OPTIONS = Object.entries(SEVERITY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const EMPTY_FORM = {
  name: '',
  code: '',
  category: '',
  severity: '',
  description: '',
  tec_reference: '',
  is_mandatory_daep: false,
  is_mandatory_expulsion: false,
}

export default function OffenseCodeManagerPage() {
  const navigate = useNavigate()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const { offenseCodes, loading, refetch } = useOffenseCodes({
    category: categoryFilter || undefined,
    is_active: showInactive ? undefined : true,
    search: searchTerm || undefined,
  })
  const { createOffenseCode, updateOffenseCode, toggleOffenseCode } = useOffenseCodeActions()

  // Group by category
  const groupedCodes = useMemo(() => {
    const grouped = {}
    offenseCodes.forEach((code) => {
      const cat = code.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(code)
    })

    // Sort categories
    return Object.entries(grouped)
      .sort(([a], [b]) => (OFFENSE_CATEGORY_LABELS[a] || a).localeCompare(OFFENSE_CATEGORY_LABELS[b] || b))
  }, [offenseCodes])

  const stats = useMemo(() => ({
    total: offenseCodes.length,
    active: offenseCodes.filter((c) => c.is_active).length,
    system: offenseCodes.filter((c) => !c.district_id).length,
    custom: offenseCodes.filter((c) => c.district_id).length,
    mandatory: offenseCodes.filter((c) => c.is_mandatory_daep || c.is_mandatory_expulsion).length,
  }), [offenseCodes])

  const handleAdd = () => {
    setForm(EMPTY_FORM)
    setSelectedCode(null)
    setEditModalOpen(true)
  }

  const handleEdit = (code) => {
    setForm({
      name: code.name || '',
      code: code.code || '',
      category: code.category || '',
      severity: code.severity || '',
      description: code.description || '',
      tec_reference: code.tec_reference || '',
      is_mandatory_daep: code.is_mandatory_daep || false,
      is_mandatory_expulsion: code.is_mandatory_expulsion || false,
    })
    setSelectedCode(code)
    setEditModalOpen(true)
  }

  const handleToggleActive = async (code) => {
    if (!code.district_id) {
      toast.error('System offense codes cannot be deactivated')
      return
    }
    const { error } = await toggleOffenseCode(code.id, !code.is_active)
    if (error) {
      toast.error('Failed to update offense code')
    } else {
      toast.success(code.is_active ? 'Offense code deactivated' : 'Offense code activated')
      refetch()
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Offense name is required')
      return
    }
    if (!form.category) {
      toast.error('Category is required')
      return
    }
    if (!form.severity) {
      toast.error('Severity is required')
      return
    }

    setSaving(true)
    let result
    if (selectedCode) {
      // Only allow editing custom (district-specific) codes
      if (!selectedCode.district_id) {
        toast.error('System offense codes cannot be edited. Create a custom code instead.')
        setSaving(false)
        return
      }
      result = await updateOffenseCode(selectedCode.id, form)
    } else {
      result = await createOffenseCode({ ...form, is_active: true })
    }

    if (result.error) {
      toast.error(result.error.message || 'Failed to save offense code')
    } else {
      toast.success(selectedCode ? 'Offense code updated' : 'Offense code created')
      setEditModalOpen(false)
      refetch()
    }
    setSaving(false)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <Topbar
        title="Offense Code Manager"
        subtitle="Manage district offense codes and TEC references"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/settings')}>
            Back to Settings
          </Button>
        }
      />

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MiniStat label="Total Codes" value={stats.total} />
          <MiniStat label="Active" value={stats.active} />
          <MiniStat label="System (TEC)" value={stats.system} />
          <MiniStat label="Custom" value={stats.custom} />
          <MiniStat label="Mandatory" value={stats.mandatory} />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search offense codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <SelectField
                name="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={CATEGORY_OPTIONS}
                placeholder="All Categories"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-orange-600"
              />
              Show inactive
            </label>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              + Add Custom Code
            </Button>
          </div>
        </Card>

        {/* Offense Code List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : groupedCodes.length === 0 ? (
          <EmptyState
            title="No Offense Codes Found"
            message="No offense codes match your criteria."
          />
        ) : (
          <div className="space-y-6">
            {groupedCodes.map(([category, codes]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  {OFFENSE_CATEGORY_LABELS[category] || category}
                  <Badge color="gray" size="sm">{codes.length}</Badge>
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {codes.map((code) => (
                    <div
                      key={code.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        !code.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Severity indicator */}
                      <div
                        className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                          {
                            minor: 'bg-orange-400',
                            moderate: 'bg-yellow-400',
                            serious: 'bg-orange-400',
                            severe: 'bg-red-500',
                          }[code.severity] || 'bg-gray-300'
                        }`}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{code.name}</span>
                          {code.code && (
                            <span className="text-xs font-mono text-gray-400">{code.code}</span>
                          )}
                          {!code.district_id && (
                            <Badge color="gray" size="sm">System</Badge>
                          )}
                          {code.district_id && (
                            <Badge color="blue" size="sm">Custom</Badge>
                          )}
                          {!code.is_active && (
                            <Badge color="red" size="sm">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {code.tec_reference && (
                            <span className="text-xs text-gray-500">{code.tec_reference}</span>
                          )}
                          {code.is_mandatory_daep && (
                            <Badge color="red" size="sm">M-DAEP</Badge>
                          )}
                          {code.is_mandatory_expulsion && (
                            <Badge color="red" size="sm">M-EXP</Badge>
                          )}
                        </div>
                      </div>

                      {/* Severity Badge */}
                      <Badge color={SEVERITY_COLORS[code.severity]} size="sm">
                        {SEVERITY_LABELS[code.severity]}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {code.district_id && (
                          <button
                            onClick={() => handleEdit(code)}
                            className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        )}
                        {code.district_id && (
                          <button
                            onClick={() => handleToggleActive(code)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              code.is_active
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={code.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {code.is_active ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedCode ? 'Edit Offense Code' : 'Add Custom Offense Code'}
        description="Custom offense codes are district-specific and supplement the system TEC codes."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {selectedCode ? 'Update Code' : 'Create Code'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField
            label="Offense Name"
            name="name"
            value={form.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="e.g., Unauthorized Use of Cell Phone"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Offense Code"
              name="code"
              value={form.code}
              onChange={(e) => handleFormChange('code', e.target.value)}
              placeholder="e.g., CELL-01"
              helpText="Short code for quick reference"
            />
            <FormField
              label="TEC Reference"
              name="tec_reference"
              value={form.tec_reference}
              onChange={(e) => handleFormChange('tec_reference', e.target.value)}
              placeholder="e.g., TEC 37.006"
              helpText="Texas Education Code section"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Category"
              name="category"
              value={form.category}
              onChange={(e) => handleFormChange('category', e.target.value)}
              options={CATEGORY_OPTIONS}
              placeholder="Select category..."
              required
            />
            <SelectField
              label="Severity"
              name="severity"
              value={form.severity}
              onChange={(e) => handleFormChange('severity', e.target.value)}
              options={SEVERITY_OPTIONS}
              placeholder="Select severity..."
              required
            />
          </div>

          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={form.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Describe the offense and any relevant details..."
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_mandatory_daep}
                onChange={(e) => handleFormChange('is_mandatory_daep', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Mandatory DAEP Placement
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_mandatory_expulsion}
                onChange={(e) => handleFormChange('is_mandatory_expulsion', e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Mandatory Expulsion
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
