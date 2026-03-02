import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { useNavigatorReferrals } from '../../hooks/useNavigator'
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

const SKILL_GAP_LABELS = {
  emotional_regulation: 'Emotional Regulation',
  executive_functioning: 'Executive Functioning',
  peer_conflict_resolution: 'Peer Conflict Resolution',
  academic_frustration_tolerance: 'Academic Frustration Tolerance',
  impulse_control: 'Impulse Control',
  adult_communication: 'Adult Communication',
}

export default function NavigatorReferralsPage() {
  const { districtId } = useAuth()
  const [filters, setFilters] = useState({ status: '', campus_id: '', date_from: '', date_to: '' })
  const [showDrawer, setShowDrawer] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [campuses, setCampuses] = useState([])
  const { referrals, loading, refetch } = useNavigatorReferrals(filters)

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
            onClick={() => { setSelectedReferral(null); setShowDrawer(true) }}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-orange-400"
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
                        <Link to={`/navigator/students/${r.student_id}`} className="font-medium text-gray-900 hover:text-orange-600">
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
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {OUTCOME_LABELS[r.outcome] || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedReferral(r); setShowDrawer(true) }}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
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
          onClose={() => setShowDrawer(false)}
          onSaved={() => { setShowDrawer(false); refetch() }}
        />
      )}
    </div>
  )
}

// ─── New / Review Drawer ──────────────────────────────────────────────────────

function ReferralDrawer({ referral, onClose, onSaved }) {
  const { districtId, profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Form state (new referral)
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
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
      .select('id, first_name, last_name, grade_level')
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
    onSaved()
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
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? 'New Referral' : `Review — ${referral.students ? `${referral.students.first_name} ${referral.students.last_name}` : 'Referral'}`}
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
                  <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                    <button onClick={() => { setSelectedStudent(null); setStudents([]) }} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                      placeholder="Search by name..."
                      value={studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); searchStudents(e.target.value) }}
                    />
                    {students.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        {students.map(s => (
                          <button
                            key={s.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors"
                            onClick={() => { setSelectedStudent(s); setStudents([]) }}
                          >
                            {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">(Grade {s.grade_level})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Campus *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  value={form.referral_date}
                  onChange={e => setForm(f => ({ ...f, referral_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. Hallway, Cafeteria"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={3}
                  placeholder="Describe the incident..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Witnesses</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={3}
                  value={reviewForm.admin_notes}
                  onChange={e => setReviewForm(f => ({ ...f, admin_notes: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Skill Gap Identified</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
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
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium"
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
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : isNew ? 'Submit Referral' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
