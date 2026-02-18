import { useState, useEffect } from 'react'
import { IMPORT_TEMPLATES } from '../../lib/importTemplates'
import { detectMappingConfidence } from '../../lib/importUtils'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Saved mapping profiles are stored under district settings:
 *   districts.settings.import_mapping_profiles = {
 *     "Skyward Students": { importType: 'students', mapping: { ... } },
 *     ...
 *   }
 */

function ConfidenceBadge({ confidence }) {
  if (confidence === 'exact') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Exact
      </span>
    )
  }
  if (confidence === 'alias') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707a1 1 0 00-1.414-1.414L9 11.172 7.707 9.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Auto-matched
      </span>
    )
  }
  return null
}

export default function ImportStepMapping({
  importType,
  fileHeaders,
  columnMapping,
  rawRows,
  onConfirm,
  onBack,
  validating,
}) {
  const { districtId } = useAuth()
  const [mapping, setMapping] = useState(columnMapping)
  const [savedProfiles, setSavedProfiles] = useState({})
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [saveProfileName, setSaveProfileName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null) // { type: 'success'|'error', text }
  const [selectedProfileName, setSelectedProfileName] = useState('')

  const template = IMPORT_TEMPLATES[importType]
  if (!template) return null

  const targetFields = template.headers
  const requiredFields = new Set(template.requiredFields || [])
  const previewRows = rawRows.slice(0, 3)

  // Confidence for each field
  const confidence = detectMappingConfidence(fileHeaders, targetFields, mapping)

  // ── Load saved profiles from district settings ─────────────────
  useEffect(() => {
    if (!districtId) return
    const load = async () => {
      const { data } = await supabase
        .from('districts')
        .select('settings')
        .eq('id', districtId)
        .single()
      const profiles = data?.settings?.import_mapping_profiles || {}
      setSavedProfiles(profiles)
      setProfilesLoaded(true)
    }
    load()
  }, [districtId])

  // ── Profiles for this import type ─────────────────────────────
  const relevantProfiles = Object.entries(savedProfiles).filter(
    ([, p]) => p.importType === importType
  )

  const handleMappingChange = (targetField, sourceHeader) => {
    setMapping(prev => ({
      ...prev,
      [targetField]: sourceHeader || undefined,
    }))
  }

  // ── Load a saved profile ────────────────────────────────────────
  const handleProfileSelect = (profileName) => {
    setSelectedProfileName(profileName)
    if (profileName) handleLoadProfile(profileName)
  }

  const handleLoadProfile = (profileName) => {
    const profile = savedProfiles[profileName]
    if (!profile) return
    // Only apply mappings for headers that still exist in the current file
    const applied = {}
    for (const [field, header] of Object.entries(profile.mapping || {})) {
      if (fileHeaders.includes(header)) {
        applied[field] = header
      }
    }
    setMapping(applied)
    setProfileMsg({ type: 'success', text: `Loaded profile "${profileName}". Unmapped fields that aren't in this file were skipped.` })
    setTimeout(() => setProfileMsg(null), 4000)
  }

  // ── Save current mapping as a named profile ────────────────────
  const handleSaveProfile = async () => {
    const name = saveProfileName.trim()
    if (!name) return
    setSavingProfile(true)
    try {
      const { data } = await supabase
        .from('districts')
        .select('settings')
        .eq('id', districtId)
        .single()

      const currentSettings = data?.settings || {}
      const existingProfiles = currentSettings.import_mapping_profiles || {}
      const updatedProfiles = {
        ...existingProfiles,
        [name]: { importType, mapping },
      }

      const { error } = await supabase
        .from('districts')
        .update({ settings: { ...currentSettings, import_mapping_profiles: updatedProfiles } })
        .eq('id', districtId)

      if (error) throw error
      setSavedProfiles(updatedProfiles)
      setSaveProfileName('')
      setShowSaveInput(false)
      setProfileMsg({ type: 'success', text: `Mapping saved as "${name}". It will be available for future imports.` })
      setTimeout(() => setProfileMsg(null), 4000)
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to save profile. Please try again.' })
      setTimeout(() => setProfileMsg(null), 4000)
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Delete a saved profile ──────────────────────────────────────
  const handleDeleteProfile = async (profileName) => {
    if (!profileName) return
    try {
      const { data } = await supabase
        .from('districts')
        .select('settings')
        .eq('id', districtId)
        .single()
      const currentSettings = data?.settings || {}
      const updated = { ...(currentSettings.import_mapping_profiles || {}) }
      delete updated[profileName]
      await supabase
        .from('districts')
        .update({ settings: { ...currentSettings, import_mapping_profiles: updated } })
        .eq('id', districtId)
      setSavedProfiles(updated)
      setSelectedProfileName('')
      setProfileMsg({ type: 'success', text: `Profile "${profileName}" deleted.` })
      setTimeout(() => setProfileMsg(null), 3000)
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to delete profile.' })
      setTimeout(() => setProfileMsg(null), 3000)
    }
  }

  const unmappedRequired = targetFields.filter(f => requiredFields.has(f) && !mapping[f])
  const mappedCount = targetFields.filter(f => mapping[f]).length

  return (
    <div className="space-y-6">
      {/* ── Profile feedback message ─────────────────────────────── */}
      {profileMsg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm ${
          profileMsg.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {profileMsg.text}
        </div>
      )}

      {/* ── Header: summary + profile controls ──────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Column Mapping</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mappedCount} of {targetFields.length} columns mapped
            {unmappedRequired.length > 0 && (
              <span className="text-red-600 ml-2">
                · {unmappedRequired.length} required field{unmappedRequired.length !== 1 ? 's' : ''} not yet mapped
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Exact column name match
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              Auto-matched via alias
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-300 inline-block" />
              Required — select manually
            </span>
          </div>
        </div>

        {/* Saved profiles panel */}
        {profilesLoaded && (
          <div className="flex flex-col items-end gap-2 min-w-[240px]">
            {relevantProfiles.length > 0 && (
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Load a saved mapping profile
                </label>
                <div className="flex items-center gap-2">
                  <select
                    className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                    value={selectedProfileName}
                    onChange={(e) => handleProfileSelect(e.target.value)}
                  >
                    <option value="">Select profile…</option>
                    {relevantProfiles.map(([name]) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {selectedProfileName && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(selectedProfileName)}
                      className="text-xs text-red-500 hover:text-red-700 underline whitespace-nowrap"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Save current mapping */}
            {!showSaveInput ? (
              <button
                type="button"
                onClick={() => setShowSaveInput(true)}
                className="text-xs text-orange-600 hover:text-orange-700 underline whitespace-nowrap"
              >
                Save this mapping as a profile
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={saveProfileName}
                  onChange={(e) => setSaveProfileName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProfile() }}
                  placeholder="Profile name (e.g. Skyward Students)"
                  className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-orange-500 focus:border-orange-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={!saveProfileName.trim() || savingProfile}
                  className="px-2.5 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSaveInput(false); setSaveProfileName('') }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mapping table ─────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                Target Field
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                Source Column
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                Sample Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {targetFields.map((field) => {
              const instruction = template.instructions.find(i => i.field === field)
              const isRequired = requiredFields.has(field)
              const sourceCol = mapping[field]
              const conf = confidence[field]
              const previewValue = sourceCol && previewRows[0] ? previewRows[0][sourceCol] : undefined
              const rowUnmappedRequired = isRequired && !sourceCol

              return (
                <tr
                  key={field}
                  className={
                    rowUnmappedRequired
                      ? 'bg-red-50'
                      : conf === 'exact'
                      ? 'bg-green-50/40'
                      : conf === 'alias'
                      ? 'bg-yellow-50/40'
                      : ''
                  }
                >
                  {/* Target field info */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {field}
                      </span>
                      {isRequired && (
                        <span className="text-red-500 text-xs font-semibold">Required</span>
                      )}
                      {sourceCol && <ConfidenceBadge confidence={conf} />}
                    </div>
                    {instruction?.description && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">
                        {instruction.description.replace(/ \(required.*?\)| \(optional.*?\)/i, '')}
                      </div>
                    )}
                  </td>

                  {/* Source column dropdown */}
                  <td className="px-4 py-2.5">
                    <select
                      value={sourceCol || ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className={`block w-full text-sm border rounded-md px-2 py-1.5 focus:ring-orange-500 focus:border-orange-500 ${
                        sourceCol
                          ? conf === 'exact'
                            ? 'border-green-400 bg-white'
                            : 'border-yellow-400 bg-white'
                          : rowUnmappedRequired
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">— Skip this field —</option>
                      {fileHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Sample value from first data row */}
                  <td className="px-4 py-2.5">
                    {previewValue !== undefined && previewValue !== null && previewValue !== '' ? (
                      <span className="text-xs text-gray-700 font-mono bg-gray-100 px-1.5 py-0.5 rounded truncate block max-w-[160px]">
                        {String(previewValue instanceof Date
                          ? previewValue.toISOString().split('T')[0]
                          : previewValue
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Data preview (raw first 3 rows from file) ─────────────── */}
      {previewRows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            File Preview — {rawRows.length} total rows
          </h4>
          <div className="border rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {fileHeaders.slice(0, 8).map(h => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium text-gray-500 truncate max-w-[120px]"
                      title={h}
                    >
                      {h}
                    </th>
                  ))}
                  {fileHeaders.length > 8 && (
                    <th className="px-3 py-2 text-gray-400">
                      +{fileHeaders.length - 8} more cols
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {fileHeaders.slice(0, 8).map(h => (
                      <td key={h} className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                        {row[h] instanceof Date
                          ? row[h].toISOString().split('T')[0]
                          : String(row[h] ?? '')}
                      </td>
                    ))}
                    {fileHeaders.length > 8 && (
                      <td className="px-3 py-2 text-gray-400">…</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Showing first {previewRows.length} of {rawRows.length} rows.
          </p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {unmappedRequired.length > 0 && (
            <p className="text-xs text-red-600">
              Map all required fields to continue.
            </p>
          )}
          <button
            type="button"
            disabled={unmappedRequired.length > 0 || validating}
            onClick={() => onConfirm(mapping)}
            className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {validating ? 'Validating…' : 'Next: Validate'}
          </button>
        </div>
      </div>
    </div>
  )
}
