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
  const [offenseSearch, setOffenseSearch] = useState('')
  const [selectedOffense, setSelectedOffense] = useState(null)
  const [showReview, setShowReview] = useState(false)
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

  const filteredOffenses = offenseSearch.trim().length >= 1
    ? offenseCodes.filter(o =>
        `${o.code} ${o.title} ${o.category}`.toLowerCase().includes(offenseSearch.toLowerCase())
      ).slice(0, 10)
    : []

  const handleOffenseSelect = (offense) => {
    setSelectedOffense(offense)
    setOffenseSearch('')
    setForm(f => ({
      ...f,
      offense_code_id: offense.id,
      severity: offense.severity || f.severity,
    }))
  }

  const handleReviewSubmit = (e) => {
    e.preventDefault()
    if (!form.student_id || !form.description.trim()) {
      toast.error('Please select a student and add a description')
      return
    }
    setShowReview(true)
  }

  const handleSubmit = async () => {
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
          consequence_type: 'pending',
          status: 'submitted',
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

  if (showReview) {
    return (
      <div>
        <Topbar
          title="Review Your Referral"
          subtitle="Confirm details before submitting"
        />
        <div className="p-6 max-w-2xl space-y-6">
          <Card>
            <CardTitle>Referral Summary</CardTitle>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Student</dt>
                <dd className="font-medium text-gray-900">
                  {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="text-gray-900">{form.incident_date}</dd>
              </div>
              {form.incident_time && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Time</dt>
                  <dd className="text-gray-900">{form.incident_time}</dd>
                </div>
              )}
              {form.location && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Location</dt>
                  <dd className="text-gray-900">{form.location}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Offense</dt>
                <dd className="text-gray-900">
                  {selectedOffense ? `${selectedOffense.code} — ${selectedOffense.title}` : 'Not specified'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Severity</dt>
                <dd className="text-gray-900">{SEVERITY_LABELS[form.severity] || form.severity}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Description</dt>
                <dd className="text-gray-900 p-3 bg-gray-50 rounded-lg text-sm">{form.description}</dd>
              </div>
            </dl>
          </Card>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowReview(false)}>
              Back to Edit
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Confirm &amp; Submit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar
        title="Submit Discipline Referral"
        subtitle="Referrals are sent to your AP for review"
      />
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleReviewSubmit} className="space-y-6">
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
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                {form.incident_date > new Date().toISOString().split('T')[0] && (
                  <p className="text-xs text-red-600 mt-1">Incident date cannot be in the future.</p>
                )}
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
                {selectedOffense ? (
                  <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedOffense.code} — {selectedOffense.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedOffense.category} · Severity auto-set to: {SEVERITY_LABELS[selectedOffense.severity] || selectedOffense.severity}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedOffense(null); setForm(f => ({ ...f, offense_code_id: '' })) }}
                      className="text-xs text-gray-400 hover:text-red-500 ml-3"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={offenseSearch}
                      onChange={e => setOffenseSearch(e.target.value)}
                      placeholder="Search by offense code or title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {filteredOffenses.length > 0 && (
                      <div className="mt-1 border border-gray-200 rounded-lg divide-y max-h-44 overflow-y-auto shadow-sm">
                        {filteredOffenses.map(o => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => handleOffenseSelect(o)}
                            className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm"
                          >
                            <span className="font-medium text-orange-700">{o.code}</span>
                            {' '}&mdash; {o.title}
                            <span className="ml-2 text-xs text-gray-400">{o.category}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {offenseSearch.trim().length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">Start typing to search — or leave blank</p>
                    )}
                  </div>
                )}
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
            <Button type="submit">
              Review &amp; Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
