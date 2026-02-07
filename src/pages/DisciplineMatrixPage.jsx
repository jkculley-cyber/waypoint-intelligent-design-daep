import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOffenseCodes, useFullDisciplineMatrix } from '../hooks/useOffenseCodes'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { SelectField } from '../components/ui/FormField'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import {
  OFFENSE_CATEGORIES,
  OFFENSE_CATEGORY_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  CONSEQUENCE_TYPE_LABELS,
  ROLES,
} from '../lib/constants'

export default function DisciplineMatrixPage() {
  const { hasRole } = useAuth()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedOffense, setExpandedOffense] = useState(null)

  const { offenseCodes, loading: codesLoading } = useOffenseCodes({
    category: categoryFilter || undefined,
  })
  const { entries: matrixEntries, loading: matrixLoading } = useFullDisciplineMatrix({
    category: categoryFilter || undefined,
  })

  const isAdmin = hasRole([ROLES.ADMIN])
  const loading = codesLoading || matrixLoading

  // Group matrix entries by offense code
  const matrixByOffense = useMemo(() => {
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
    return grouped
  }, [matrixEntries])

  // Merge offense codes (some may not have matrix entries yet)
  const allOffenses = useMemo(() => {
    const result = offenseCodes.map((code) => ({
      offenseCode: code,
      entries: matrixByOffense[code.id]?.entries || [],
      hasMatrix: !!matrixByOffense[code.id],
    }))

    // Apply search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      return result.filter(
        (item) =>
          item.offenseCode.name.toLowerCase().includes(lower) ||
          item.offenseCode.code?.toLowerCase().includes(lower) ||
          item.offenseCode.tec_reference?.toLowerCase().includes(lower)
      )
    }

    return result
  }, [offenseCodes, matrixByOffense, searchTerm])

  // Stats
  const stats = useMemo(() => {
    const totalOffenses = offenseCodes.length
    const configuredOffenses = Object.keys(matrixByOffense).length
    const totalEntries = matrixEntries.length
    const mandatory = offenseCodes.filter(
      (c) => c.is_mandatory_daep || c.is_mandatory_expulsion
    ).length
    return { totalOffenses, configuredOffenses, totalEntries, mandatory }
  }, [offenseCodes, matrixByOffense, matrixEntries])

  // Category options for filter
  const categoryOptions = Object.entries(OFFENSE_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  return (
    <div>
      <Topbar
        title="Discipline Matrix"
        subtitle="Offense-to-consequence guidelines"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.href = '/matrix/editor'}
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit Matrix
            </Button>
          )
        }
      />

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Offense Codes" value={stats.totalOffenses} color="blue" />
          <StatCard label="Matrix Configured" value={`${stats.configuredOffenses}/${stats.totalOffenses}`} color="green" />
          <StatCard label="Total Matrix Rules" value={stats.totalEntries} color="indigo" />
          <StatCard label="Mandatory Placements" value={stats.mandatory} color="red" />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search offense codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>
        </Card>

        {/* Matrix Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : allOffenses.length === 0 ? (
          <EmptyState
            title="No Offense Codes Found"
            message={searchTerm || categoryFilter
              ? 'No offense codes match your search criteria. Try adjusting your filters.'
              : 'No offense codes have been configured for this district yet.'
            }
          />
        ) : (
          <div className="space-y-3">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Matrix configured
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                No matrix rules
              </span>
              <span className="flex items-center gap-1">
                <Badge color="red" size="sm">M-DAEP</Badge>
                Mandatory DAEP
              </span>
              <span className="flex items-center gap-1">
                <Badge color="red" size="sm">M-EXP</Badge>
                Mandatory Expulsion
              </span>
            </div>

            {/* Offense List */}
            {allOffenses.map(({ offenseCode, entries, hasMatrix }) => (
              <OffenseMatrixRow
                key={offenseCode.id}
                offenseCode={offenseCode}
                entries={entries}
                hasMatrix={hasMatrix}
                isExpanded={expandedOffense === offenseCode.id}
                onToggle={() =>
                  setExpandedOffense(
                    expandedOffense === offenseCode.id ? null : offenseCode.id
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OffenseMatrixRow({ offenseCode, entries, hasMatrix, isExpanded, onToggle }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Expand/Collapse icon */}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        {/* Status indicator */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            hasMatrix ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />

        {/* Offense info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {offenseCode.name}
            </span>
            {offenseCode.code && (
              <span className="text-xs text-gray-400 font-mono">{offenseCode.code}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge color={SEVERITY_COLORS[offenseCode.severity]} size="sm">
            {SEVERITY_LABELS[offenseCode.severity]}
          </Badge>
          <Badge color="gray" size="sm">
            {OFFENSE_CATEGORY_LABELS[offenseCode.category]}
          </Badge>
          {offenseCode.is_mandatory_daep && (
            <Badge color="red" size="sm">M-DAEP</Badge>
          )}
          {offenseCode.is_mandatory_expulsion && (
            <Badge color="red" size="sm">M-EXP</Badge>
          )}
          {entries.length > 0 && (
            <span className="text-xs text-gray-400">
              {entries.length} rule{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {/* Expanded Matrix Detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {offenseCode.tec_reference && (
            <p className="text-xs text-gray-500 mb-3">
              Texas Education Code: {offenseCode.tec_reference}
            </p>
          )}

          {offenseCode.description && (
            <p className="text-sm text-gray-600 mb-3">{offenseCode.description}</p>
          )}

          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">
              No matrix rules configured for this offense. Admin can add rules in the Matrix Editor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2 font-medium">Occurrence</th>
                    <th className="px-3 py-2 font-medium">Min Consequence</th>
                    <th className="px-3 py-2 font-medium">Recommended</th>
                    <th className="px-3 py-2 font-medium">Max Consequence</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Required Supports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="bg-white">
                      <td className="px-3 py-2">
                        <Badge color="blue" size="sm">
                          {getOrdinal(entry.occurrence)} Offense
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {CONSEQUENCE_TYPE_LABELS[entry.min_consequence] || entry.min_consequence}
                      </td>
                      <td className="px-3 py-2 font-medium text-blue-600">
                        {CONSEQUENCE_TYPE_LABELS[entry.default_consequence] || entry.default_consequence}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {CONSEQUENCE_TYPE_LABELS[entry.max_consequence] || entry.max_consequence}
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {entry.consequence_days_min || entry.consequence_days_max
                          ? `${entry.consequence_days_min || '—'} – ${entry.consequence_days_max || '—'} days`
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
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(' ')[1] || 'text-gray-900'}`}>
        {value}
      </p>
    </Card>
  )
}

function getOrdinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const mod = n % 100
  return n + (suffixes[(mod - 20) % 10] || suffixes[mod] || suffixes[0])
}
