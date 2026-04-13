import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import Topbar from '../../components/layout/Topbar'
import { useNavigatorReferrals, SKILL_GAP_LABELS } from '../../hooks/useNavigator'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
  escalated_to_daep: 'bg-red-100 text-red-700',
}

const OUTCOME_LABELS = {
  iss: 'ISS',
  oss: 'OSS',
  conference: 'Conference',
  support_assigned: 'Support Assigned',
  no_action: 'No Action',
  escalated_to_daep: 'Escalated to DAEP',
}

const OUTCOME_COLORS = {
  iss: 'bg-blue-100 text-blue-700',
  oss: 'bg-red-100 text-red-700',
  conference: 'bg-green-100 text-green-700',
  support_assigned: 'bg-purple-100 text-purple-700',
  no_action: 'bg-gray-100 text-gray-600',
  escalated_to_daep: 'bg-red-100 text-red-700',
}


export default function NavigatorReferralsPage() {
  const { districtId, isDemoReadonly } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({ status: '', campus_id: '', date_from: '', date_to: '' })
  const [showDrawer, setShowDrawer] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [campuses, setCampuses] = useState([])
  const { referrals, loading, refetch } = useNavigatorReferrals(filters)
  const prefilledStudentId = searchParams.get('student')

  // Auto-open drawer when navigated with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setSelectedReferral(null)
      setShowDrawer(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (!districtId) return
    supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name')
      .then(({ data }) => setCampuses(data || []))
  }, [districtId])

  return (
    <div>
      <Topbar
        title="Navigator — Referrals"
        subtitle="Discipline referrals and behavioral incidents"
        actions={
          <button
            onClick={isDemoReadonly ? undefined : () => { setSelectedReferral(null); setShowDrawer(true) }}
            disabled={isDemoReadonly}
            title={isDemoReadonly ? 'Available in your pilot account' : ''}
            className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-blue-400 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            + New Referral
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="closed">Closed</option>
              <option value="escalated_to_daep">Escalated to DAEP</option>
            </select>
            <select
              value={filters.campus_id}
              onChange={e => setFilters(f => ({ ...f, campus_id: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
            >
              <option value="">All Campuses</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => setFilters({ status: '', campus_id: '', date_from: '', date_to: '' })}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Referrals table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading referrals...</div>
          ) : referrals.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No referrals match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Offense</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Outcome</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {referrals.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/navigator/students/${r.student_id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {r.students ? `${r.students.first_name} ${r.students.last_name}` : '—'}
                        </Link>
                        <p className="text-xs text-gray-400">{r.students?.grade_level || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.campuses?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.offense_codes
                          ? <span title={r.offense_codes.description}>{r.offense_codes.code}</span>
                          : <span className="text-gray-400 italic">{r.description?.slice(0, 30) || '—'}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.referral_date ? format(new Date(r.referral_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status?.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.outcome ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${OUTCOME_COLORS[r.outcome] || 'bg-gray-100 text-gray-600'}`}>
                            {OUTCOME_LABELS[r.outcome] || r.outcome}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedReferral(r); setShowDrawer(true) }}
                          className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDrawer && (
        <ReferralDrawer
          referral={selectedReferral}
          prefilledStudentId={prefilledStudentId}
          onClose={() => setShowDrawer(false)}
          onSaved={(result) => {
            setShowDrawer(false)
            refetch()
            if (result?.isNew) {
              toast.success('Referral created')
            } else if (result?.outcome === 'iss' || result?.outcome === 'oss') {
              toast((t) => (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Referral reviewed — {result.outcome.toUpperCase()} assigned</span>
                  <button
                    onClick={() => { toast.dismiss(t.id); navigate(`/navigator/placements?new=1&student=${result.studentId}`) }}
                    className="text-sm text-blue-600 font-semibold hover:underline text-left"
                  >Create {result.outcome.toUpperCase()} placement now →</button>
                </div>
              ), { duration: 6000, icon: '✓' })
            } else if (result?.outcome === 'support_assigned') {
              toast((t) => (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Referral reviewed — support assigned</span>
                  <button
                    onClick={() => { toast.dismiss(t.id); navigate(`/navigator/supports?new=1&student=${result.studentId}`) }}
                    className="text-sm text-blue-600 font-semibold hover:underline text-left"
                  >Create support now →</button>
                </div>
              ), { duration: 6000, icon: '✓' })
            } else {
              toast.success('Referral updated')
            }
          }}
        />
      )}
    </div>
  )
}

// ─── New / Review Drawer ──────────────────────────────────────────────────────

function ReferralDrawer({ referral, onClose, onSaved, prefilledStudentId }) {
  const { districtId, profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Form state (new referral)
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', grade_level: '' })

  // Auto-load prefilled student
  useEffect(() => {
    if (!prefilledStudentId || !districtId || referral) return
    supabase.from('students').select('id, first_name, last_name, grade_level, campus_id, is_sped, is_504')
      .eq('id', prefilledStudentId).single()
      .then(({ data }) => {
        if (data) {
          setSelectedStudent(data)
          setForm(f => ({ ...f, campus_id: data.campus_id || f.campus_id }))
        }
      })
  }, [prefilledStudentId, districtId, referral])
  const [campuses, setCampuses] = useState([])
  const [offenseCodes, setOffenseCodes] = useState([])
  const [form, setForm] = useState({
    campus_id: '',
    offense_code_id: '',
    referral_date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    description: '',
    witnesses: '',
  })

  // Review state (existing referral)
  const [reviewForm, setReviewForm] = useState({
    status: referral?.status || 'pending',
    outcome: referral?.outcome || '',
    admin_notes: referral?.admin_notes || '',
    skill_gap: referral?.skill_gap || '',
    skill_gap_notes: referral?.skill_gap_notes || '',
  })

  const isNew = !referral

  // Load campuses and offense codes on mount
  useEffect(() => {
    if (!districtId) return
    supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name')
      .then(({ data }) => setCampuses(data || []))
    supabase.from('offense_codes').select('id, code, description').eq('district_id', districtId).order('code')
      .then(({ data }) => setOffenseCodes(data || []))
  }, [districtId])

  const searchStudents = useCallback(async (q) => {
    if (q.length < 2) { setStudents([]); return }
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade_level, is_sped, is_504')
      .eq('district_id', districtId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(8)
    setStudents(data || [])
  }, [districtId])

  const handleSubmitNew = async () => {
    if (!selectedStudent || !form.campus_id) {
      setError('Student and campus are required.')
      return
    }
    if (new Date(form.referral_date) > new Date()) {
      setError('Referral date cannot be in the future.')
      return
    }
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('navigator_referrals').insert({
      district_id: districtId,
      campus_id: form.campus_id,
      student_id: selectedStudent.id,
      reported_by: profile.id,
      offense_code_id: form.offense_code_id || null,
      referral_date: form.referral_date,
      location: form.location || null,
      description: form.description || null,
      witnesses: form.witnesses || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved({ isNew: true })
  }

  const handleSubmitReview = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('navigator_referrals').update({
      status: reviewForm.status,
      outcome: reviewForm.outcome || null,
      admin_notes: reviewForm.admin_notes || null,
      skill_gap: reviewForm.skill_gap || null,
      skill_gap_notes: reviewForm.skill_gap_notes || null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', referral.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved({ outcome: reviewForm.outcome, studentId: referral.student_id })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 flex items-center flex-wrap gap-1.5">
            {isNew ? 'New Referral' : `Review — ${referral.students ? `${referral.students.first_name} ${referral.students.last_name}` : 'Referral'}`}
            {!isNew && referral.students?.is_sped && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">SPED</span>}
            {!isNew && referral.students?.is_504 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">504</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {isNew ? (
            <>
              {/* Student search */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Student *</label>
                {selectedStudent ? (
                  <div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                        {selectedStudent.is_sped && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">SPED</span>}
                        {selectedStudent.is_504 && <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">504</span>}
                      </span>
                      <button onClick={() => { setSelectedStudent(null); setStudents([]) }} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
                    </div>
                    {selectedStudent.is_sped && (
                      <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                        <span><strong>SPED student</strong> — IDEA protections apply. If suspension (ISS/OSS) exceeds 10 cumulative days, an IEP/manifestation review is required before DAEP placement.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      placeholder="Search by name..."
                      value={studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); searchStudents(e.target.value) }}
                    />
                    {students.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        {students.map(s => (
                          <button
                            key={s.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                            onClick={() => { setSelectedStudent(s); setStudents([]) }}
                          >
                            {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">(Grade {s.grade_level})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {studentSearch.length >= 2 && students.length === 0 && !showAddStudent && (
                      <button
                        onClick={() => { setShowAddStudent(true); setNewStudent(ns => ({ ...ns, last_name: studentSearch })) }}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Student not found? + Add new student
                      </button>
                    )}
                    {showAddStudent && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                        <p className="text-xs font-semibold text-blue-800">Quick Add Student</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="First name" className="px-2 py-1.5 border border-gray-300 rounded text-sm" value={newStudent.first_name} onChange={e => setNewStudent(ns => ({ ...ns, first_name: e.target.value }))} />
                          <input placeholder="Last name" className="px-2 py-1.5 border border-gray-300 rounded text-sm" value={newStudent.last_name} onChange={e => setNewStudent(ns => ({ ...ns, last_name: e.target.value }))} />
                        </div>
                        <select className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" value={newStudent.grade_level} onChange={e => setNewStudent(ns => ({ ...ns, grade_level: e.target.value }))}>
                          <option value="">Grade level...</option>
                          {[...Array(14)].map((_, i) => <option key={i} value={i === 0 ? -1 : i - 1}>{i === 0 ? 'PK' : i === 1 ? 'K' : `Grade ${i - 1}`}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button
                            disabled={!newStudent.first_name || !newStudent.last_name || newStudent.grade_level === '' || !form.campus_id}
                            onClick={async () => {
                              const { data, error: err } = await supabase.from('students').insert({
                                district_id: districtId,
                                campus_id: form.campus_id,
                                student_id_number: `NAV-${Date.now()}`,
                                first_name: newStudent.first_name,
                                last_name: newStudent.last_name,
                                grade_level: parseInt(newStudent.grade_level),
                              }).select('id, first_name, last_name, grade_level').single()
                              if (err) { setError(err.message); return }
                              setSelectedStudent(data)
                              setShowAddStudent(false)
                              setStudentSearch('')
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            {!form.campus_id ? 'Select campus first' : 'Add Student'}
                          </button>
                          <button onClick={() => setShowAddStudent(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Campus *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  value={form.campus_id}
                  onChange={e => setForm(f => ({ ...f, campus_id: e.target.value }))}
                >
                  <option value="">Select campus...</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Offense Code</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  value={form.offense_code_id}
                  onChange={e => setForm(f => ({ ...f, offense_code_id: e.target.value }))}
                >
                  <option value="">Select offense code...</option>
                  {offenseCodes.map(o => <option key={o.id} value={o.id}>{o.code} — {o.description}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  value={form.referral_date}
                  onChange={e => setForm(f => ({ ...f, referral_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="e.g. Hallway, Cafeteria"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  rows={3}
                  placeholder="Describe the incident..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Witnesses</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Names of witnesses"
                  value={form.witnesses}
                  onChange={e => setForm(f => ({ ...f, witnesses: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
              {/* Review existing referral */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <p><span className="font-medium">Date:</span> {referral.referral_date ? format(new Date(referral.referral_date), 'MMMM d, yyyy') : '—'}</p>
                <p><span className="font-medium">Campus:</span> {referral.campuses?.name || '—'}</p>
                {referral.offense_codes && <p><span className="font-medium">Offense:</span> {referral.offense_codes.code} — {referral.offense_codes.description}</p>}
                {referral.description && <p><span className="font-medium">Description:</span> {referral.description}</p>}
                {referral.location && <p><span className="font-medium">Location:</span> {referral.location}</p>}
                {referral.witnesses && <p><span className="font-medium">Witnesses:</span> {referral.witnesses}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  value={reviewForm.status}
                  onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="closed">Closed</option>
                  <option value="escalated_to_daep">Escalated to DAEP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Outcome</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  value={reviewForm.outcome}
                  onChange={e => setReviewForm(f => ({ ...f, outcome: e.target.value }))}
                >
                  <option value="">No outcome assigned</option>
                  <option value="iss">ISS</option>
                  <option value="oss">OSS</option>
                  <option value="conference">Conference</option>
                  <option value="support_assigned">Support Assigned</option>
                  <option value="no_action">No Action</option>
                  <option value="escalated_to_daep">Escalated to DAEP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Admin Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  rows={3}
                  value={reviewForm.admin_notes}
                  onChange={e => setReviewForm(f => ({ ...f, admin_notes: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Skill Gap Identified</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  value={reviewForm.skill_gap}
                  onChange={e => setReviewForm(f => ({ ...f, skill_gap: e.target.value }))}
                >
                  <option value="">None identified</option>
                  {Object.entries(SKILL_GAP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {reviewForm.skill_gap && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Skill Gap Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                    rows={2}
                    placeholder="Observations about this skill gap..."
                    value={reviewForm.skill_gap_notes}
                    onChange={e => setReviewForm(f => ({ ...f, skill_gap_notes: e.target.value }))}
                  />
                </div>
              )}

              <div className="pt-1">
                <Link
                  to={`/navigator/students/${referral.student_id}`}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  View Student History →
                </Link>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={isNew ? handleSubmitNew : handleSubmitReview}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : isNew ? 'Submit Referral' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
