import { useState } from 'react'
import { downloadErrorsCsv } from '../../lib/importUtils'

export default function ImportStepValidation({
  importType,
  validationResults,
  onConfirm,
  onBack,
  onCancel,
}) {
  const [activeTab, setActiveTab] = useState('summary')

  if (!validationResults) return null

  const { valid, errors, warnings, totalRows } = validationResults
  const hasErrors = errors.length > 0

  const tabs = [
    { id: 'summary', label: 'Summary', count: null },
    { id: 'valid', label: 'Valid', count: valid.length },
    { id: 'errors', label: 'Errors', count: errors.length },
    { id: 'warnings', label: 'Warnings', count: warnings.length },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Total Rows" value={totalRows} color="gray" />
        <SummaryCard label="Valid" value={valid.length} color="green" />
        <SummaryCard label="Errors" value={errors.length} color="red" />
        <SummaryCard label="Warnings" value={warnings.length} color="yellow" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {valid.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">{valid.length} rows</span> passed validation and are ready to import.
                </p>
              </div>
            )}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">{errors.length} rows</span> have errors and will be skipped.
                </p>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">{warnings.length} rows</span> have warnings but will still be imported.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <div>
            {errors.length > 0 ? (
              <>
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => downloadErrorsCsv(errors, importType)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download Error Report
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {errors.map((row, i) => (
                        <tr key={i} className="bg-red-50">
                          <td className="px-4 py-2 text-gray-900 font-medium">{row.rowNumber}</td>
                          <td className="px-4 py-2">
                            <ul className="list-disc list-inside text-red-700 text-xs space-y-0.5">
                              {row.errors.map((err, j) => (
                                <li key={j}>{err}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No errors found.</p>
            )}
          </div>
        )}

        {activeTab === 'valid' && (
          <div className="text-sm text-gray-600">
            <p className="mb-2">{valid.length} rows ready for import.</p>
            {valid.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Data Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {valid.slice(0, 20).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-900">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-lg">
                          {Object.entries(row.parsed).slice(0, 4).map(([k, v]) =>
                            `${k}: ${v}`
                          ).join(', ')}
                        </td>
                      </tr>
                    ))}
                    {valid.length > 20 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-center text-gray-400">
                          ... and {valid.length - 20} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'warnings' && (
          <div>
            {warnings.length > 0 ? (
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {warnings.map((row, i) => (
                      <tr key={i} className="bg-yellow-50">
                        <td className="px-4 py-2 text-gray-900 font-medium">{row.rowNumber}</td>
                        <td className="px-4 py-2">
                          <ul className="list-disc list-inside text-yellow-700 text-xs space-y-0.5">
                            {row.warnings.map((w, j) => (
                              <li key={j}>{w}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No warnings.</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={valid.length === 0}
          onClick={onConfirm}
          className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Import {valid.length} Rows
        </button>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-900',
    green: 'bg-green-50 text-green-900',
    red: 'bg-red-50 text-red-900',
    yellow: 'bg-yellow-50 text-yellow-900',
  }

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
    </div>
  )
}
