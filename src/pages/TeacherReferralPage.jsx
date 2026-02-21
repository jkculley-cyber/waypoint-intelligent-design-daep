import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { SEVERITY_LABELS, CONSEQUENCE_TYPE_LABELS } from '../lib/constants'

export default function TeacherReferralPage() {
  const navigate = useNavigate()
  const { profile, districtId, campusIds } = useAuth()

  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [offenseCodes, setOffenseCodes] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    student_id: '',
    offense_code_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '',
    location: '',
    description: '',
    severity: 'minor',
    consequence_type: '',
  })

  // Load offense codes
  useEffect(() => {
    if (!districtId) return
    supabase
      .from('offense_codes')
      .select('id, code, title, category, severity')
      .eq('district_id', districtId)
      .eq('is_active', true)
      .order('code')
      .then(({ data }) => setOffenseCodes(data || []))
  }, [districtId])

  // Search students
  useEffect(() => {
    if (!districtId || studentSearch.trim().length < 2) {
      setStudents([])
      return
    }
    const q = studentSearch.toLowerCase()
    const timeout = setTimeout(async () => {
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, student_id_number, grade_level, campus_id')
        .eq('district_id', districtId)
        .eq('is_active', true)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,student_id_number.ilike.%${q}%`)
        .limit(10)
      // Scope to teacher's campus
      if (campusIds?.length) {
        query = query.in('campus_id', campusIds)
      }
      const { data } = await query
      setStudents(data || [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [studentSearch, districtId, campusIds])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.student_id || !form.description.trim()) {
      toast.error('Please select a student and add a description')
      return
    }
    setSubmitting(true)
    try {
      const campusId = campusIds?.[0] || null
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          district_id: districtId,
          campus_id: campusId,
          student_id: form.student_id,
          offense_code_id: form.offense_code_id || null,
          incident_date: form.incident_date,
          incident_time: form.incident_time || null,
          location: form.location || null,
          description: form.description,
          severity: form.severity,
          consequence_type: form.consequence_type || null,
          status: 'draft',
          reported_by: profile.id,
          referred_by_teacher: true,
        })
        .select('id')
        .single()

      if (error) throw error
      toast.success('Referral submitted — your AP will review it')
      navigate(`/incidents/${data.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit referral')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedStudent = students.find(s => s.id === form.student_id)

  return (
    <div>
      <Topbar
        title="Submit Discipline Referral"
        subtitle="Referrals are sent to your AP for review"
      />
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Search */}
          <Card>
            <CardTitle>Student</CardTitle>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search by name or student ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {students.length > 0 && !form.student_id && (
                <div className="border border-gray-200 rounded-lg divide-y">
                  {students.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, student_id: s.id })); setStudentSearch('') }}
                      className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm"
                    >
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="text-gray-500 ml-2">Grade {s.grade_level} | {s.student_id_number}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedStudent && (
                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                    <p className="text-xs text-gray-500">Grade {selectedStudent.grade_level} | {selectedStudent.student_id_number}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, student_id: '' }))}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Incident Details */}
          <Card>
            <CardTitle>Incident Details</CardTitle>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={form.incident_date}
                  onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={form.incident_time}
                  onChange={e => setForm(f => ({ ...f, incident_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Classroom 204"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(SEVERITY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Offense Type</label>
                <select
                  value={form.offense_code_id}
                  onChange={e => setForm(f => ({ ...f, offense_code_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Select offense (optional) --</option>
                  {offenseCodes.map(o => (
                    <option key={o.id} value={o.id}>{o.code} — {o.title}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what happened..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/incidents')}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit Referral
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
