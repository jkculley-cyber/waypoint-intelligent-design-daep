import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useStudentActions } from '../../hooks/useStudents'
import { formatStudentName, formatGradeLevel } from '../../lib/utils'
import { StudentFlagsSummary } from './StudentFlags'

export default function StudentSearch({ onSelect, selectedStudent, placeholder = 'Search by name or ID...' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { districtId, campusIds, isAdmin, hasRole } = useAuth()
  const canAddStudent = hasRole(['admin', 'principal', 'ap', 'counselor'])
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const debounceTimer = setTimeout(async () => {
      setLoading(true)
      let q = supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, student_id_number, grade_level, is_sped, is_504, is_ell, is_homeless, is_foster_care, sped_eligibility, campus_id')
        .eq('district_id', districtId)
        .eq('is_active', true)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id_number.ilike.%${query}%`)
      if (!isAdmin() && campusIds && campusIds.length > 0) {
        q = q.in('campus_id', campusIds)
      }
      const { data } = await q.limit(10)

      setResults(data || [])
      setIsOpen(true)
      setLoading(false)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, districtId])

  const handleSelect = (student) => {
    onSelect(student)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Student <span className="text-red-500">*</span>
      </label>

      {selectedStudent ? (
        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {formatStudentName(selectedStudent)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                Grade {formatGradeLevel(selectedStudent.grade_level)} | ID: {selectedStudent.student_id_number}
              </span>
              <StudentFlagsSummary student={selectedStudent} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => handleSelect(student)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <p className="text-sm font-medium text-gray-900">
                {formatStudentName(student)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">
                  Grade {formatGradeLevel(student.grade_level)} | ID: {student.student_id_number}
                </span>
                <StudentFlagsSummary student={student} />
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">No students found for "{query}"</p>
          {canAddStudent && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); setShowAddForm(true) }}
              className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              + Add New Student
            </button>
          )}
        </div>
      )}

      {showAddForm && (
        <QuickAddStudent
          campusIds={campusIds}
          districtId={districtId}
          onCreated={(student) => { setShowAddForm(false); onSelect(student) }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

function QuickAddStudent({ campusIds, districtId, onCreated, onCancel }) {
  const { createStudent } = useStudentActions()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    student_id_number: '',
    grade_level: '',
    campus_id: campusIds?.[0] || '',
    date_of_birth: '',
    is_sped: false,
    is_504: false,
  })

  const canSave = form.first_name.trim() && form.last_name.trim() && form.student_id_number.trim() && form.grade_level

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { data, error: err } = await createStudent({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      student_id_number: form.student_id_number.trim(),
      grade_level: form.grade_level,
      campus_id: form.campus_id || null,
      date_of_birth: form.date_of_birth || null,
      is_sped: form.is_sped,
      is_504: form.is_504,
      is_active: true,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      onCreated(data)
    }
  }

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="mt-2 border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Add New Student</p>
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">First Name *</label>
          <input type="text" value={form.first_name} onChange={e => update('first_name', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Last Name *</label>
          <input type="text" value={form.last_name} onChange={e => update('last_name', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Student ID *</label>
          <input type="text" value={form.student_id_number} onChange={e => update('student_id_number', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Grade Level *</label>
          <select value={form.grade_level} onChange={e => update('grade_level', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
            <option value="">Select...</option>
            {['PK','KG','1','2','3','4','5','6','7','8','9','10','11','12'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Date of Birth</label>
          <input type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
        </div>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" checked={form.is_sped} onChange={e => update('is_sped', e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
            SPED
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" checked={form.is_504} onChange={e => update('is_504', e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
            504
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {saving ? 'Adding...' : 'Add Student & Select'}
      </button>
    </div>
  )
}
