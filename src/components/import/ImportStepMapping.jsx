import { useState } from 'react'
import { IMPORT_TEMPLATES } from '../../lib/importTemplates'

export default function ImportStepMapping({
  importType,
  fileHeaders,
  columnMapping,
  rawRows,
  onConfirm,
  onBack,
  validating,
}) {
  const [mapping, setMapping] = useState(columnMapping)
  const template = IMPORT_TEMPLATES[importType]

  if (!template) return null

  const targetFields = template.headers
  const previewRows = rawRows.slice(0, 3)

  const handleMappingChange = (targetField, sourceHeader) => {
    setMapping(prev => ({
      ...prev,
      [targetField]: sourceHeader || undefined,
    }))
  }

  const unmappedRequired = targetFields.filter(f => {
    const instr = template.instructions.find(i => i.field === f)
    const isRequired = instr?.description?.toLowerCase().includes('required')
    return isRequired && !mapping[f]
  })

  const mappedCount = targetFields.filter(f => mapping[f]).length

  return (
    <div className="space-y-6">
      {/* Mapping Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Column Mapping</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mappedCount} of {targetFields.length} columns mapped
            {unmappedRequired.length > 0 && (
              <span className="text-red-600 ml-2">
                ({unmappedRequired.length} required columns unmapped)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Target Field</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Source Column</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {targetFields.map((field) => {
              const instruction = template.instructions.find(i => i.field === field)
              const isRequired = instruction?.description?.toLowerCase().includes('required')
              const sourceCol = mapping[field]
              const previewValue = sourceCol && previewRows[0] ? previewRows[0][sourceCol] : ''

              return (
                <tr key={field} className={!sourceCol && isRequired ? 'bg-red-50' : ''}>
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-gray-900">
                      {field}
                      {isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {instruction?.description}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={sourceCol || ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className={`block w-full text-sm border rounded-md px-2 py-1.5 focus:ring-orange-500 focus:border-orange-500 ${
                        sourceCol ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Skip --</option>
                      {fileHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs text-gray-600 truncate max-w-xs">
                      {previewValue !== undefined && previewValue !== null
                        ? String(previewValue instanceof Date ? previewValue.toISOString().split('T')[0] : previewValue)
                        : <span className="text-gray-400 italic">--</span>
                      }
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      {previewRows.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Data Preview ({rawRows.length} rows total)</h4>
          <div className="border rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {fileHeaders.slice(0, 8).map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 truncate max-w-[120px]">
                      {h}
                    </th>
                  ))}
                  {fileHeaders.length > 8 && <th className="px-3 py-2 text-gray-400">+{fileHeaders.length - 8} more</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {fileHeaders.slice(0, 8).map(h => (
                      <td key={h} className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                        {row[h] instanceof Date ? row[h].toISOString().split('T')[0] : String(row[h] ?? '')}
                      </td>
                    ))}
                    {fileHeaders.length > 8 && <td className="px-3 py-2 text-gray-400">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={unmappedRequired.length > 0 || validating}
          onClick={() => onConfirm(mapping)}
          className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {validating ? 'Validating...' : 'Next: Validate'}
        </button>
      </div>
    </div>
  )
}
