import { useState, useMemo } from 'react'
import { useOffenseCodes } from '../../hooks/useOffenseCodes'
import Badge from '../ui/Badge'
import { OFFENSE_CATEGORY_LABELS, SEVERITY_COLORS, SEVERITY_LABELS } from '../../lib/constants'

export default function OffenseCodeSelector({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const { offenseCodes, loading } = useOffenseCodes()

  const filteredCodes = useMemo(() => {
    let codes = offenseCodes
    if (categoryFilter) {
      codes = codes.filter(c => c.category === categoryFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      codes = codes.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      )
    }
    return codes
  }, [offenseCodes, categoryFilter, search])

  const categories = useMemo(() => {
    const cats = [...new Set(offenseCodes.map(c => c.category))]
    return cats.sort()
  }, [offenseCodes])

  const selectedCode = offenseCodes.find(c => c.id === value)

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Offense Code <span className="text-red-500">*</span>
      </label>

      {/* Selected offense display */}
      {selectedCode && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedCode.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{selectedCode.code}</span>
                <Badge color={SEVERITY_COLORS[selectedCode.severity]} size="sm">
                  {SEVERITY_LABELS[selectedCode.severity]}
                </Badge>
                {selectedCode.is_mandatory_daep && (
                  <Badge color="red" size="sm">Mandatory DAEP</Badge>
                )}
                {selectedCode.is_mandatory_expulsion && (
                  <Badge color="red" size="sm">Mandatory Expulsion</Badge>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {selectedCode.description && (
            <p className="text-xs text-gray-600 mt-2">{selectedCode.description}</p>
          )}
          {selectedCode.tec_reference && (
            <p className="text-xs text-gray-400 mt-1">Reference: {selectedCode.tec_reference}</p>
          )}
        </div>
      )}

      {/* Search and filter (show when nothing selected) */}
      {!selectedCode && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search offense codes..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{OFFENSE_CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </select>
          </div>

          {/* Offense code list */}
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading offense codes...</div>
            ) : filteredCodes.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No offense codes match your search</div>
            ) : (
              filteredCodes.map((code) => (
                <button
                  key={code.id}
                  type="button"
                  onClick={() => onChange(code.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{code.title}</p>
                    <div className="flex items-center gap-1">
                      <Badge color={SEVERITY_COLORS[code.severity]} size="sm">
                        {SEVERITY_LABELS[code.severity]}
                      </Badge>
                      {code.is_mandatory_daep && (
                        <Badge color="red" size="sm">DAEP</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {code.code} | {OFFENSE_CATEGORY_LABELS[code.category] || code.category}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
