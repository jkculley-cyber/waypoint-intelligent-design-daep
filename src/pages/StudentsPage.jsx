import { useState, useMemo } from 'react'
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

export default function StudentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [flagFilter, setFlagFilter] = useState('')

  const filters = useMemo(() => {
    const f = {}
    if (search) f.search = search
    if (campusFilter) f.campus_id = campusFilter
    if (gradeFilter !== '') f.grade_level = parseInt(gradeFilter)
    if (flagFilter === 'sped') f.is_sped = true
    if (flagFilter === '504') f.is_504 = true
    if (flagFilter === 'ell') f.is_ell = true
    return f
  }, [search, campusFilter, gradeFilter, flagFilter])

  const { students, loading } = useStudents(filters)
  const { campuses } = useCampuses()

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
  ]

  return (
    <div>
      <Topbar
        title="Students"
        subtitle={`${students.length} student${students.length !== 1 ? 's' : ''}`}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <SelectField
              label="Campus"
              name="campus"
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              options={campuses.map(c => ({ value: c.id, label: c.name }))}
              placeholder="All Campuses"
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
