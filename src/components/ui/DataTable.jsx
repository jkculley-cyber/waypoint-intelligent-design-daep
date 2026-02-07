import { useState, useMemo } from 'react'
import { cn } from '../../lib/utils'
import EmptyState from './EmptyState'
import LoadingSpinner from './LoadingSpinner'

export default function DataTable({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon,
  onRowClick,
  sortable = true,
  className,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal == null) return 1
      if (bVal == null) return -1

      let comparison = 0
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number') {
        comparison = aVal - bVal
      } else if (aVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime()
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig, sortable])

  const handleSort = (key) => {
    if (!sortable) return
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data.length) {
    return <EmptyState message={emptyMessage} icon={emptyIcon} />
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  col.sortable !== false && sortable && 'cursor-pointer hover:text-gray-700 select-none',
                  col.className
                )}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {sortConfig.key === col.key && (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                      {sortConfig.direction === 'asc' ? (
                        <path d="M6 2l4 5H2z" />
                      ) : (
                        <path d="M6 10l4-5H2z" />
                      )}
                    </svg>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'hover:bg-gray-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3 text-sm text-gray-700', col.cellClassName)}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
