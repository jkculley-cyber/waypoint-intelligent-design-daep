import { useImportHistory } from '../../hooks/useImportHistory'
import { IMPORT_TYPE_LABELS, IMPORT_STATUS_CONFIG } from '../../lib/constants'

export default function ImportHistoryTable() {
  const { imports, loading, error } = useImportHistory()

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading import history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        Failed to load import history.
      </div>
    )
  }

  if (imports.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No imports yet</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rows</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imported By</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {imports.map((imp) => {
            const statusConfig = IMPORT_STATUS_CONFIG[imp.status] || { label: imp.status, color: 'gray' }
            return (
              <tr key={imp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">
                    {IMPORT_TYPE_LABELS[imp.import_type] || imp.import_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 truncate block max-w-[200px]">{imp.file_name}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={imp.status} config={statusConfig} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    <span className="text-green-600 font-medium">{imp.success_count}</span>
                    {imp.error_count > 0 && (
                      <span className="text-red-600 ml-1">/ {imp.error_count} err</span>
                    )}
                    {imp.skipped_count > 0 && (
                      <span className="text-gray-400 ml-1">/ {imp.skipped_count} skip</span>
                    )}
                    <span className="text-gray-400 ml-1">of {imp.total_rows}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {imp.imported_by_profile?.full_name || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(imp.created_at).toLocaleDateString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status, config }) {
  const colorMap = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
    orange: 'bg-orange-100 text-orange-800',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[config.color] || colorMap.gray}`}>
      {config.label}
    </span>
  )
}
