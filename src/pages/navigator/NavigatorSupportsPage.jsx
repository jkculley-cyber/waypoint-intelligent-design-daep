import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { useNavigatorSupports } from '../../hooks/useNavigator'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const SUPPORT_TYPES = [
  { key: '', label: 'All' },
  { key: 'cico', label: 'CICO' },
  { key: 'behavior_contract', label: 'Behavior Contracts' },
  { key: 'counseling_referral', label: 'Counseling' },
  { key: 'parent_contact', label: 'Parent Contacts' },
  { key: 'mentoring', label: 'Mentoring' },
  { key: 'other', label: 'Other' },
]

const SUPPORT_TYPE_LABELS = {
  cico: 'CICO',
  behavior_contract: 'Behavior Contract',
  counseling_referral: 'Counseling Referral',
  parent_contact: 'Parent Contact',
  mentoring: 'Mentoring',
  other: 'Other',
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  discontinued: 'bg-red-100 text-red-600',
}

export default function NavigatorSupportsPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingSupport, setEditingSupport] = useState(null)
  const { supports, loading, refetch } = useNavigatorSupports()

  const filtered = typeFilter ? supports.filter(s => s.support_type === typeFilter) : supports
  const activeSupports = filtered.filter(s => s.status === 'active')
  const pastSupports = filtered.filter(s => s.status !== 'active')

  return (
    <div>
      <Topbar
        title="Navigator — Supports"
        subtitle="Proactive behavioral support tracking"
        actions={
          <button
            onClick={() => setShowDrawer(true)}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            + New Support
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Type filter tabs */}
        <div className="flex flex-wrap gap-2">
          {SUPPORT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active supports */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Active Supports</h2>
            <span className="text-xs text-gray-400">{activeSupports.length} record{activeSupports.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : activeSupports.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No active supports.</div>
          ) : (
            <SupportsTable supports={activeSupports} onEdit={setEditingSupport} />
          )}
        </div>

        {/* Past supports */}
        {pastSupports.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Past Supports</h2>
              <span className="text-xs text-gray-400">{pastSupports.length} record{pastSupports.length !== 1 ? 's' : ''}</span>
            </div>
            <SupportsTable supports={pastSupports} onEdit={setEditingSupport} />
          </div>
        )}
      </div>

      {showDrawer && (
        <NewSupportDrawer
          onClose={() => setShowDrawer(false)}
          onSaved={() => { setShowDrawer(false); refetch() }}
        />
      )}

      {editingSupport && (
        <EditSupportDrawer
          support={editingSupport}
          onClose={() => setEditingSupport(null)}
          onSaved={() => { setEditingSupport(null); refetch() }}
        />
      )}
    </div>
  )
}

function SupportsTable({ supports, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned To</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Start</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {supports.map(s => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link to={`/navigator/students/${s.student_id}`} className="font-medium text-gray-900 hover:text-orange-600">
                  {s.students ? `${s.students.first_name} ${s.students.last_name}` : '—'}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{s.campuses?.name || '—'}</td>
              <td className="px-4 py-3 text-gray-700 font-medium text-xs">{SUPPORT_TYPE_LABELS[s.support_type] || s.support_type}</td>
              <td className="px-4 py-3 text-gray-600">{s.assignee?.full_name || s.assigner?.full_name || '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {s.start_date ? format(parseISO(s.start_date), 'MMM d, yyyy') : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {s.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={s.notes || ''}>
                {s.notes || '—'}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onEdit(s)}
                  className="text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── New Support Drawer ───────────────────────────────────────────────────────

function NewSupportDrawer({ onClose, onSaved }) {
  const { districtId, profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [staff, setStaff] = useState([])
  const [campuses, setCampuses] = useState([])
  const [form, setForm] = useState({
    campus_id: '',
    support_type: 'cico',
    assigned_to: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notes: '',
    contact_method: '',
  })

  useEffect(() => {
    if (!districtId) return
    supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name')
      .then(({ data }) => setCampuses(data || []))
    supabase.from('profiles').select('id, full_name').eq('district_id', districtId).eq('is_active', true).order('full_name')
      .then(({ data }) => setStaff(data || []))
  }, [districtId])

  const searchStudents = async (q) => {
    if (q.length < 2) { setStudents([]); return }
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade_level')
      .eq('district_id', districtId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(8)
    setStudents(data || [])
  }

  const handleSave = async () => {
    if (!selectedStudent || !form.campus_id) {
      setError('Student and campus are required.')
      return
    }
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('navigator_supports').insert({
      district_id: districtId,
      campus_id: form.campus_id,
      student_id: selectedStudent.id,
      assigned_by: profile.id,
      assigned_to: form.assigned_to || null,
      support_type: form.support_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
      contact_method: form.contact_method || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Support</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {/* Student search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Student *</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                <button onClick={() => { setSelectedStudent(null); setStudents([]) }} className="text-xs text-gray-400">Change</button>
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
                      <button key={s.id} className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50" onClick={() => { setSelectedStudent(s); setStudents([]) }}>
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
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400" value={form.campus_id} onChange={e => setForm(f => ({ ...f, campus_id: e.target.value }))}>
              <option value="">Select campus...</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Support Type *</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400" value={form.support_type} onChange={e => setForm(f => ({ ...f, support_type: e.target.value }))}>
              {Object.entries(SUPPORT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>

          {form.support_type === 'parent_contact' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact Method</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400" placeholder="e.g. Phone, Email, In-person" value={form.contact_method} onChange={e => setForm(f => ({ ...f, contact_method: e.target.value }))} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving…' : 'Save Support'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Support Drawer ──────────────────────────────────────────────────────

function EditSupportDrawer({ support, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    status: support.status || 'active',
    outcome_notes: support.outcome_notes || '',
    incidents_before: support.incidents_before ?? '',
    incidents_after: support.incidents_after ?? '',
    notes: support.notes || '',
  })

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('navigator_supports').update({
      status: form.status,
      outcome_notes: form.outcome_notes || null,
      incidents_before: form.incidents_before !== '' ? Number(form.incidents_before) : null,
      incidents_after: form.incidents_after !== '' ? Number(form.incidents_after) : null,
      notes: form.notes || null,
    }).eq('id', support.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const studentName = support.students ? `${support.students.first_name} ${support.students.last_name}` : 'Support'

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Support — {studentName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{SUPPORT_TYPE_LABELS[support.support_type] || support.support_type}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Effectiveness fields — shown when completed */}
          {form.status === 'completed' && (
            <>
              <div className="pt-1 pb-1 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Effectiveness Data</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Incidents Before</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="0"
                    value={form.incidents_before}
                    onChange={e => setForm(f => ({ ...f, incidents_before: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Incidents After</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                    placeholder="0"
                    value={form.incidents_after}
                    onChange={e => setForm(f => ({ ...f, incidents_after: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Outcome Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={3}
                  placeholder="Describe what changed, what worked, what didn't..."
                  value={form.outcome_notes}
                  onChange={e => setForm(f => ({ ...f, outcome_notes: e.target.value }))}
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
