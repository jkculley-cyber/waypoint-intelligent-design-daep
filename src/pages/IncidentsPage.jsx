import { useState, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { SelectField } from '../components/ui/FormField'
import { StudentFlagsSummary } from '../components/students/StudentFlags'
import { useIncidents } from '../hooks/useIncidents'
import { useCampuses } from '../hooks/useCampuses'
import { useAuth } from '../contexts/AuthContext'
import { formatStudentName, formatDate } from '../lib/utils'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
  INCIDENT_STATUS,
  ROLE_LABELS,
} from '../lib/constants'
import { useAccessScope } from '../hooks/useAccessScope'
import { canImport, getImportTier } from '../lib/importPermissions'
import { exportToPdf, exportToExcel } from '../lib/exportUtils'

export default function IncidentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [consequenceFilter, setConsequenceFilter] = useState('')
  const [myApprovalsOnly, setMyApprovalsOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const { scope } = useAccessScope()
  const { profile, hasRole } = useAuth()

  const filters = useMemo(() => {
    const f = {}
    if (!scope.isDistrictWide && scope.scopedCampusIds?.length) {
      f._campusScope = scope.scopedCampusIds
    }
    if (scope.spedOnly) f._spedOnly = true
    if (statusFilter) f.status = statusFilter
    if (campusFilter) f.campus_id = campusFilter
    if (consequenceFilter) f.consequence_type = consequenceFilter
    return f
  }, [statusFilter, campusFilter, consequenceFilter, scope])

  const { incidents: rawIncidents, loading } = useIncidents(filters)
  const { campuses } = useCampuses()

  // Client-side search and "My Pending Approvals" filter
  const incidents = useMemo(() => {
    let filtered = rawIncidents

    // My Pending Approvals filter — show incidents where the approval chain current_step matches user's role
    if (myApprovalsOnly && profile?.role) {
      filtered = filtered.filter(inc =>
        inc.approval_chain?.current_step === profile.role &&
        inc.status === 'pending_approval'
      )
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(inc => {
        const studentName = inc.student ? `${inc.student.first_name} ${inc.student.last_name}`.toLowerCase() : ''
        const offenseTitle = inc.offense?.title?.toLowerCase() || ''
        const studentId = inc.student?.student_id_number?.toLowerCase() || ''
        return studentName.includes(q) || offenseTitle.includes(q) || studentId.includes(q)
      })
    }

    return filtered
  }, [rawIncidents, search, myApprovalsOnly, profile?.role])

  const allSelected = incidents.length > 0 && incidents.every(i => selectedIds.has(i.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(incidents.map(i => i.id)))
    }
  }
  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedIncidents = incidents.filter(i => selectedIds.has(i.id))

  const buildExportRowsForSelection = useCallback((subset) => {
    const campusMap = Object.fromEntries(campuses.map(c => [c.id, c.name]))
    return subset.map(inc => [
      inc.student ? formatStudentName(inc.student) : '—',
      formatDate(inc.incident_date),
      inc.offense?.title || '—',
      CONSEQUENCE_TYPE_LABELS[inc.consequence_type] || inc.consequence_type || '—',
      INCIDENT_STATUS_LABELS[inc.status] || inc.status,
      campusMap[inc.campus_id] || '—',
    ])
  }, [campuses])

  const handleBulkExportPdf = useCallback(() => {
    exportToPdf('Incidents (Selected)', exportHeaders, buildExportRowsForSelection(selectedIncidents), {
      generatedBy: profile?.full_name, landscape: true,
    })
  }, [buildExportRowsForSelection, selectedIncidents, profile])

  const handleBulkExportExcel = useCallback(() => {
    exportToExcel('Incidents (Selected)', exportHeaders, buildExportRowsForSelection(selectedIncidents), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRowsForSelection, selectedIncidents, profile])

  const columns = [
    {
      key: '__checkbox',
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
          title="Select all"
        />
      ),
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleOne(row.id)}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
        />
      ),
      sortable: false,
    },
    {
      key: 'incident_date',
      header: 'Date',
      render: (val) => <span className="text-sm whitespace-nowrap">{formatDate(val)}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (_, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {row.student ? formatStudentName(row.student) : '—'}
          </p>
          {row.student && (
            <div className="mt-0.5">
              <StudentFlagsSummary student={row.student} />
            </div>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      key: 'campus',
      header: 'Campus',
      render: (_, row) => (
        <span className="text-sm text-gray-600 whitespace-nowrap">{row.campus?.name || '—'}</span>
      ),
      sortable: false,
    },
    {
      key: 'offense',
      header: 'Offense',
      render: (_, row) => (
        <span className="text-sm">{row.offense?.title || '—'}</span>
      ),
      sortable: false,
    },
    {
      key: 'consequence_type',
      header: 'Consequence',
      render: (val, row) => (
        <div>
          <span className="text-sm">{CONSEQUENCE_TYPE_LABELS[val] || val}</span>
          {row.consequence_days && (
            <span className="text-xs text-gray-400 ml-1">({row.consequence_days}d)</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Badge color={INCIDENT_STATUS_COLORS[val] || 'gray'} size="sm" dot>
              {INCIDENT_STATUS_LABELS[val] || val}
            </Badge>
            {row.sped_compliance_required && !row.compliance_cleared && (
              <Badge color="red" size="sm">SPED</Badge>
            )}
          </div>
          {val === 'pending_approval' && row.approval_chain?.current_step && (
            <span className="text-xs text-orange-600">
              Awaiting {ROLE_LABELS[row.approval_chain.current_step] || row.approval_chain.current_step}
            </span>
          )}
        </div>
      ),
    },
  ]

  const statusOptions = Object.entries(INCIDENT_STATUS_LABELS).map(([val, label]) => ({
    value: val,
    label,
  }))

  const consequenceOptions = Object.entries(CONSEQUENCE_TYPE_LABELS).map(([val, label]) => ({
    value: val,
    label,
  }))

  const exportHeaders = ['Student', 'Date', 'Offense', 'Consequence', 'Status', 'Campus']

  const buildExportRows = useCallback(() => {
    const campusMap = Object.fromEntries(campuses.map(c => [c.id, c.name]))
    return incidents.map(inc => [
      inc.student ? formatStudentName(inc.student) : '—',
      formatDate(inc.incident_date),
      inc.offense?.title || '—',
      CONSEQUENCE_TYPE_LABELS[inc.consequence_type] || inc.consequence_type || '—',
      INCIDENT_STATUS_LABELS[inc.status] || inc.status,
      campusMap[inc.campus_id] || '—',
    ])
  }, [incidents, campuses])

  const handleExportPdf = useCallback(() => {
    exportToPdf('Incidents', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
      landscape: true,
    })
  }, [buildExportRows, profile])

  const handleExportExcel = useCallback(() => {
    exportToExcel('Incidents', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  return (
    <div>
      <Topbar
        title="Incidents"
        subtitle={`${incidents.length} incident${incidents.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={handleExportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export PDF">
                PDF
              </button>
              <button onClick={handleExportExcel} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export Excel">
                Excel
              </button>
            </div>
            {canImport({ role: scope.role, importType: 'incidents', tier: getImportTier() }).allowed && (
              <Link
                to="/settings/import-data"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import
              </Link>
            )}
            {!hasRole(['teacher']) && (
              <Link to="/incidents/new">
                <Button size="sm">+ New Incident</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <div className="mb-4">
            <label htmlFor="incident-search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              id="incident-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, ID, or offense..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Status"
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              placeholder="All Statuses"
            />
            <SelectField
              label="Campus"
              name="campus"
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              options={
                scope.isDistrictWide
                  ? campuses.map(c => ({ value: c.id, label: c.name }))
                  : campuses.filter(c => scope.scopedCampusIds?.includes(c.id)).map(c => ({ value: c.id, label: c.name }))
              }
              placeholder={scope.isDistrictWide ? 'All Campuses' : 'My Campus'}
            />
            <SelectField
              label="Consequence"
              name="consequence"
              value={consequenceFilter}
              onChange={(e) => setConsequenceFilter(e.target.value)}
              options={consequenceOptions}
              placeholder="All Consequences"
            />
          </div>
          {/* Quick filter for approval-chain roles */}
          {['cbc', 'counselor', 'sped_coordinator', 'section_504_coordinator', 'sss'].includes(profile?.role) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setMyApprovalsOnly(!myApprovalsOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  myApprovalsOnly
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                My Pending Approvals
              </button>
            </div>
          )}
        </Card>

        {/* Incidents Table */}
        <Card padding={false}>
          <DataTable
            columns={columns}
            data={incidents}
            loading={loading}
            onRowClick={(incident) => navigate(`/incidents/${incident.id}`)}
            emptyMessage="No incidents found. Create a new incident to get started."
          />
        </Card>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-gray-700">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="w-px h-5 bg-gray-600" />
            <button
              onClick={handleBulkExportPdf}
              className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Export PDF
            </button>
            <button
              onClick={handleBulkExportExcel}
              className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Export Excel
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-400 hover:text-white transition-colors ml-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
