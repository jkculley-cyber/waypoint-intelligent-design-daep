import { useState, useCallback } from 'react'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import { useTodayCheckIns } from '../hooks/useKiosk'
import { useCampuses } from '../hooks/useCampuses'
import { SelectField } from '../components/ui/FormField'
import { formatStudentName, formatGradeLevel } from '../lib/utils'
import { format } from 'date-fns'
import { exportToPdf, exportToExcel } from '../lib/exportUtils'

export default function PhoneReturnPage() {
  const { profile, campusIds } = useAuth()
  const { campuses } = useCampuses()
  // Always default to 'all' — DAEP admins need to see check-ins from all campuses
  // because students may be checked in under their home campus
  const [selectedCampus, setSelectedCampus] = useState('all')
  const { records, loading, refetch } = useTodayCheckIns(selectedCampus || 'all')
  const [search, setSearch] = useState('')

  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  // Filter to only records with bag numbers, or show all with search
  const filtered = records.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = r.students ? `${r.students.first_name} ${r.students.last_name}`.toLowerCase() : ''
      const sid = r.students?.student_id_number?.toLowerCase() || ''
      const bag = r.phone_bag_number?.toLowerCase() || ''
      return name.includes(q) || sid.includes(q) || bag.includes(q)
    }
    return true
  })

  const withBag = filtered.filter(r => r.phone_bag_number)
  const withoutBag = filtered.filter(r => !r.phone_bag_number)

  const exportHeaders = ['Bag #', 'Student', 'Student ID', 'Grade', 'Check-In Time', 'Status']
  const buildExportRows = useCallback(() => {
    return filtered.map(r => [
      r.phone_bag_number || '—',
      r.students ? formatStudentName(r.students) : '—',
      r.students?.student_id_number || '—',
      r.students ? formatGradeLevel(r.students.grade_level) : '—',
      r.check_in_time ? format(new Date(r.check_in_time), 'h:mm a') : '—',
      r.check_out_time ? 'Checked Out' : 'Checked In',
    ])
  }, [filtered])

  const handleExportPdf = () => {
    exportToPdf('Phone Return List', exportHeaders, buildExportRows(), {
      subtitle: today,
      generatedBy: profile?.full_name,
    })
  }

  const handleExportExcel = () => {
    exportToExcel('Phone Return List', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }

  const campusOptions = [
    { value: 'all', label: 'All Campuses' },
    ...campuses
      .filter(c => campusIds?.length ? campusIds.includes(c.id) : true)
      .map(c => ({ value: c.id, label: c.name })),
  ]

  return (
    <div>
      <Topbar
        title="Phone Return"
        subtitle={today}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export PDF">
              PDF
            </button>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export Excel">
              Excel
            </button>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Refresh
            </button>
          </div>
        }
      />

      <div className="p-6">
        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Campus"
                name="campus"
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                options={campusOptions}
              />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, or bag number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Total Check-Ins</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{records.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">With Bag #</p>
            <p className="text-2xl font-bold text-orange-600 mt-0.5">{records.filter(r => r.phone_bag_number).length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Checked Out</p>
            <p className="text-2xl font-bold text-green-600 mt-0.5">{records.filter(r => r.check_out_time).length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Still on Campus</p>
            <p className="text-2xl font-bold text-orange-600 mt-0.5">{records.filter(r => !r.check_out_time).length}</p>
          </div>
        </div>

        {/* Phone Bag List */}
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <CardTitle>Today's Check-Ins</CardTitle>
            <span className="text-xs text-gray-400">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No check-ins found for today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="px-4 py-2.5 w-24">Bag #</th>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Student ID</th>
                    <th className="px-4 py-2.5">Grade</th>
                    <th className="px-4 py-2.5">Check-In</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* Students WITH bag numbers first, sorted by bag number */}
                  {withBag
                    .sort((a, b) => {
                      const aNum = parseInt(a.phone_bag_number, 10)
                      const bNum = parseInt(b.phone_bag_number, 10)
                      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
                      return (a.phone_bag_number || '').localeCompare(b.phone_bag_number || '')
                    })
                    .map(r => (
                      <PhoneReturnRow key={r.id} record={r} />
                    ))
                  }
                  {/* Students WITHOUT bag numbers */}
                  {withoutBag.map(r => (
                    <PhoneReturnRow key={r.id} record={r} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function PhoneReturnRow({ record }) {
  const student = record.students

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5">
        {record.phone_bag_number ? (
          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-orange-100 text-orange-700 font-bold font-mono text-base rounded-lg">
            {record.phone_bag_number}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
        {student ? formatStudentName(student) : '—'}
      </td>
      <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">
        {student?.student_id_number || '—'}
      </td>
      <td className="px-4 py-2.5 text-gray-600">
        {student ? formatGradeLevel(student.grade_level) : '—'}
      </td>
      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
        {record.check_in_time ? format(new Date(record.check_in_time), 'h:mm a') : '—'}
      </td>
      <td className="px-4 py-2.5">
        {record.check_out_time ? (
          <Badge color="green" size="sm" dot>Checked Out</Badge>
        ) : (
          <Badge color="orange" size="sm" dot>On Campus</Badge>
        )}
      </td>
    </tr>
  )
}
