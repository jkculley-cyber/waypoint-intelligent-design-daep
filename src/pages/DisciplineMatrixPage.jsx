import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
              onClick={() => navigate('/matrix/editor')}
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit Matrix
            </Button>
          )
        }
      />

      <div className="p-3 md:p-6">
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
            <div className="space-y-3">
              {entries.map((entry) => (
                <MatrixEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const CONSEQUENCE_SEVERITY = ['warning', 'detention', 'iss', 'oss', 'daep', 'expulsion']

const PROACTIVE_LABELS = {
  verbal_warning:           'Verbal Warning',
  teacher_conference:       'Teacher/Student Conference',
  parent_conference:        'Parent Conference',
  counselor_check_in:       'Counselor Check-In',
  behavior_contract:        'Behavior Contract',
  administrator_conference: 'Administrator Conference',
  cico:                     'Check-In/Check-Out (CICO)',
  mentoring:                'Mentoring',
  peer_mediation:           'Peer Mediation',
  restorative_conversation: 'Restorative Conversation',
  classroom_intervention:   'Classroom Intervention',
  lunch_detention:          'Lunch Detention',
}

const RESTORATIVE_LABELS = {
  restorative_circle:        'Restorative Circle',
  community_service:         'Community Service',
  written_apology:           'Written Apology / Reflection',
  conflict_resolution:       'Conflict Resolution Program',
  victim_offender_mediation: 'Victim-Offender Mediation',
  restitution:               'Restitution',
  community_conferencing:    'Community Conferencing',
  restorative_chat:          'Restorative Chat with Staff',
  service_learning:          'Service Learning Project',
  peer_mediation:            'Peer Mediation',
}

function ConsequenceScale({ min, recommended, max }) {
  const steps = [
    { key: 'warning',    label: 'Warning' },
    { key: 'detention',  label: 'Detention' },
    { key: 'iss',        label: 'ISS' },
    { key: 'oss',        label: 'OSS' },
    { key: 'daep',       label: 'DAEP' },
    { key: 'expulsion',  label: 'Expulsion' },
  ]
  const minIdx = CONSEQUENCE_SEVERITY.indexOf(min)
  const recIdx = CONSEQUENCE_SEVERITY.indexOf(recommended)
  const maxIdx = CONSEQUENCE_SEVERITY.indexOf(max)

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const inRange = i >= minIdx && i <= maxIdx
        const isRec   = i === recIdx
        const isMin   = i === minIdx
        const isMax   = i === maxIdx
        return (
          <div key={step.key} className="flex-1 text-center">
            <div
              className={`h-2 mx-0.5 rounded-sm ${
                isRec   ? 'bg-orange-500' :
                inRange ? 'bg-orange-200' :
                'bg-gray-100'
              }`}
            />
            <p className={`text-[10px] mt-1 leading-tight ${
              isRec   ? 'text-orange-600 font-bold' :
              inRange ? 'text-gray-600 font-medium' :
              'text-gray-300'
            }`}>
              {step.label}
              {isMin && !isRec && <span className="block text-[9px] text-green-600">min</span>}
              {isMax && !isRec && <span className="block text-[9px] text-red-500">max</span>}
              {isRec && <span className="block text-[9px]">recommended</span>}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function TagList({ items, labelMap, color }) {
  if (!items?.length) return <span className="text-xs text-gray-400">None configured</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <Badge key={i} color={color} size="sm">
          {labelMap[item] || item.replace(/_/g, ' ')}
        </Badge>
      ))}
    </div>
  )
}

function MatrixEntryCard({ entry }) {
  const hasDays = entry.consequence_days_min || entry.consequence_days_max

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header: occurrence + days */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <Badge color="blue" size="sm">{getOrdinal(entry.occurrence)} Offense</Badge>
        {entry.grade_group && entry.grade_group !== 'all' && (
          <Badge color="gray" size="sm">Grades {entry.grade_group}</Badge>
        )}
        {hasDays && (
          <span className="text-xs text-gray-500 ml-auto">
            Duration: {entry.consequence_days_min || '—'}–{entry.consequence_days_max || '—'} days
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Consequence scale */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Consequence Range
          </p>
          <ConsequenceScale
            min={entry.min_consequence}
            recommended={entry.default_consequence}
            max={entry.max_consequence}
          />
          <div className="flex justify-between mt-1 text-[10px] text-gray-400">
            <span className="text-green-600 font-medium">
              Min: {CONSEQUENCE_TYPE_LABELS[entry.min_consequence] || entry.min_consequence}
            </span>
            <span className="text-orange-600 font-bold">
              Recommended: {CONSEQUENCE_TYPE_LABELS[entry.default_consequence] || entry.default_consequence}
            </span>
            <span className="text-red-500 font-medium">
              Max: {CONSEQUENCE_TYPE_LABELS[entry.max_consequence] || entry.max_consequence}
            </span>
          </div>
        </div>

        {/* Three columns: Proactive | Restorative | Required Supports */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-50">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Proactive Interventions
            </p>
            <TagList items={entry.proactive_interventions} labelMap={PROACTIVE_LABELS} color="green" />
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Restorative Options
            </p>
            <TagList items={entry.restorative_options} labelMap={RESTORATIVE_LABELS} color="teal" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375" />
              </svg>
              Required Supports
            </p>
            <TagList items={entry.required_supports} labelMap={{}} color="purple" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colorMap = {
    blue: 'bg-orange-50 text-orange-600',
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
