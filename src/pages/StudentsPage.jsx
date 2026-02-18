import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { SelectField } from '../components/ui/FormField'
import { StudentFlagsSummary } from '../components/students/StudentFlags'
import { useStudents } from '../hooks/useStudents'
import { useCampuses } from '../hooks/useCampuses'
import { formatStudentName, formatGradeLevel } from '../lib/utils'
import { GRADE_LEVELS } from '../lib/constants'
import { useAccessScope } from '../hooks/useAccessScope'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { canImport, getImportTier } from '../lib/importPermissions'
import { exportToPdf, exportToExcel } from '../lib/exportUtils'
import { useStudentsRecidivismBatch } from '../hooks/useRecidivism'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [flagFilter, setFlagFilter] = useState('')
  const { scope } = useAccessScope()
  const { districtId, profile } = useAuth()

  const filters = useMemo(() => {
    const f = {}
    if (!scope.isDistrictWide && scope.scopedCampusIds?.length) {
      f._campusScope = scope.scopedCampusIds
    }
    if (scope.spedOnly) f._spedOnly = true
    if (search) f.search = search
    if (campusFilter) f.campus_id = campusFilter
    if (gradeFilter !== '') f.grade_level = parseInt(gradeFilter)
    if (flagFilter === 'sped') f.is_sped = true
    if (flagFilter === '504') f.is_504 = true
    if (flagFilter === 'ell') f.is_ell = true
    return f
  }, [search, campusFilter, gradeFilter, flagFilter, scope])

  const { students, loading } = useStudents(filters)
  const { campuses } = useCampuses()
  const { assessments: riskAssessments } = useStudentsRecidivismBatch(students)

  const columns = [
    {
      key: 'name',
      header: 'Student',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{formatStudentName(row)}</p>
          <p className="text-xs text-gray-500">ID: {row.student_id_number}</p>
        </div>
      ),
    },
    {
      key: 'grade_level',
      header: 'Grade',
      render: (val) => (
        <span className="text-gray-700">{formatGradeLevel(val)}</span>
      ),
    },
    {
      key: 'campus',
      header: 'Campus',
      render: (_, row) => (
        <span className="text-gray-600 text-sm">{row.campus?.name || '—'}</span>
      ),
      sortable: false,
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (_, row) => <StudentFlagsSummary student={row} />,
      sortable: false,
    },
    {
      key: 'risk',
      header: 'Risk',
      render: (_, row) => {
        const risk = riskAssessments.get(row.id)
        if (!risk) return <div className="text-center"><span className="text-gray-300 text-sm">—</span></div>
        const color = risk.riskLevel === 'High' ? 'red' : risk.riskLevel === 'Medium' ? 'yellow' : 'green'
        const label = risk.riskLevel === 'Medium' ? 'Med' : risk.riskLevel
        return (
          <div className="text-center">
            <Badge color={color} size="sm">{label}</Badge>
          </div>
        )
      },
      sortable: false,
    },
    {
      key: 'days_remaining',
      header: 'Days Remaining',
      render: (_, row) => {
        const daepIncident = row.incidents?.find(
          i => i.consequence_type === 'daep' &&
            ['active', 'approved', 'completed', 'submitted', 'under_review', 'compliance_hold'].includes(i.status)
        )
        if (!daepIncident) return <div className="text-center"><span className="text-gray-300 text-sm">—</span></div>

        // Compliance hold
        if (daepIncident.status === 'compliance_hold') {
          return <div className="text-center"><Badge color="red" size="sm">Compliance Hold</Badge></div>
        }

        // SPED compliance blocked
        if (daepIncident.sped_compliance_required && !daepIncident.compliance_cleared &&
            ['submitted', 'under_review'].includes(daepIncident.status)) {
          return (
            <div className="text-center">
              <Badge color="red" size="sm">Blocked</Badge>
              <p className="text-[10px] text-red-400 mt-0.5">SPED Compliance</p>
            </div>
          )
        }

        // Other pending placements
        if (['submitted', 'under_review'].includes(daepIncident.status)) {
          return <div className="text-center"><Badge color="purple" size="sm">Pending</Badge></div>
        }

        // Completed placements
        if (daepIncident.status === 'completed') {
          return <div className="text-center"><Badge color="green" size="sm">Completed</Badge></div>
        }

        // Approved but not started
        if (daepIncident.status === 'approved') {
          return <div className="text-center"><Badge color="blue" size="sm">Approved</Badge></div>
        }

        // Active — calculate days remaining from check-ins
        const totalAssigned = daepIncident.consequence_days
        if (!totalAssigned) return <div className="text-center"><span className="text-gray-400 text-sm">N/A</span></div>

        const checkIns = (row.daily_behavior_tracking || []).filter(d => {
          if (!daepIncident.consequence_start) return true
          return d.tracking_date >= daepIncident.consequence_start &&
            (!daepIncident.consequence_end || d.tracking_date <= daepIncident.consequence_end)
        })
        const daysServed = checkIns.length
        const daysRemaining = Math.max(0, totalAssigned - daysServed)

        if (daysRemaining === 0) {
          return <div className="text-center"><Badge color="green" size="sm">Completed</Badge></div>
        }
        const color = daysRemaining <= 5 ? 'red' : daysRemaining <= 15 ? 'yellow' : 'green'
        return (
          <div className="text-center">
            <Badge color={color} size="sm">{daysRemaining}d</Badge>
            <p className="text-[10px] text-gray-400 mt-0.5">{daysServed}/{totalAssigned} served</p>
          </div>
        )
      },
      sortable: false,
    },
  ]

  const exportHeaders = ['Name', 'Student ID', 'Grade', 'Campus', 'SPED', '504', 'ELL', 'Risk Level']

  const buildExportRows = useCallback(() => {
    return students.map(s => [
      formatStudentName(s),
      s.student_id_number || '—',
      formatGradeLevel(s.grade_level),
      s.campus?.name || '—',
      s.is_sped ? 'Yes' : 'No',
      s.is_504 ? 'Yes' : 'No',
      s.is_ell ? 'Yes' : 'No',
      riskAssessments.get(s.id)?.riskLevel || '—',
    ])
  }, [students, riskAssessments])

  const handleExportPdf = useCallback(() => {
    exportToPdf('Students', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
      landscape: true,
    })
  }, [buildExportRows, profile])

  const handleExportExcel = useCallback(() => {
    exportToExcel('Students', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  return (
    <div>
      <Topbar
        title="Students"
        subtitle={`${students.length} student${students.length !== 1 ? 's' : ''}`}
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
            {canImport({ role: scope.role, importType: 'students', tier: getImportTier() }).allowed && (
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
          </div>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or student ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
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
              label="Grade"
              name="grade"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              options={GRADE_LEVELS.map(g => ({ value: g.value.toString(), label: g.label }))}
              placeholder="All Grades"
            />
            <SelectField
              label="Special Population"
              name="flag"
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              options={[
                { value: 'sped', label: 'SPED' },
                { value: '504', label: '504' },
                { value: 'ell', label: 'ELL' },
              ]}
              placeholder="All Students"
            />
          </div>
        </Card>

        {/* Student Table */}
        <Card padding={false}>
          <DataTable
            columns={columns}
            data={students}
            loading={loading}
            onRowClick={(student) => navigate(`/students/${student.id}`)}
            emptyMessage="No students found. Adjust your filters or add students to the system."
          />
        </Card>
      </div>
    </div>
  )
}
