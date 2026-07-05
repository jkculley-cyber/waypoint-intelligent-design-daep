import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import Topbar from '../../components/layout/Topbar'
import {
  useNavigatorPlacements,
  useStudentCumulativeDays,
  useStudentMDRs,
  createMDR,
} from '../../hooks/useNavigator'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { exportToExcel } from '../../lib/exportUtils'

const PARENT_NOTIFY_METHODS = [
  { value: 'phone_call',       label: 'Phone call (parent answered)' },
  { value: 'voicemail',        label: 'Voicemail left' },
  { value: 'email',            label: 'Email sent' },
  { value: 'certified_letter', label: 'Certified letter' },
  { value: 'in_person',        label: 'In person' },
  { value: 'text_message',     label: 'Text message' },
  { value: 'other',            label: 'Other (note in field below)' },
]
const PARENT_NOTIFY_LABELS = Object.fromEntries(PARENT_NOTIFY_METHODS.map(m => [m.value, m.label]))

const TABS = [
  { key: 'active_iss', label: 'Active ISS' },
  { key: 'active_oss', label: 'Active OSS' },
  { key: 'history', label: 'History' },
]

export default function NavigatorPlacementsPage() {
  const { districtId, isDemoReadonly } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('active_iss')
  const [campusFilter, setCampusFilter] = useState('')
  const [campuses, setCampuses] = useState([])
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState(null)
  const prefilledStudentId = searchParams.get('student')

  // Auto-open drawer when navigated with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowDrawer(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (!districtId) return
    supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name')
      .then(({ data }) => setCampuses(data || []))
  }, [districtId])

  const [showOnlyImplausible, setShowOnlyImplausible] = useState(false)

  const filters = {
    placement_type: activeTab === 'history' ? '' : activeTab === 'active_iss' ? 'iss' : 'oss',
    active_only: activeTab !== 'history',
    campus_id: campusFilter,
  }
  const { placements: rawPlacements, loading, refetch } = useNavigatorPlacements(filters)

  // Round-3 audit, Sam #3: migration 069 raises on FUTURE client-set
  // parent_notified_at, but grandfathered bad data (lag < 0 days = before
  // placement, or > 30d = stale notification claim) silently persists. The
  // ParentNotifyCell already shows red on lag >= 4d; this banner counts the
  // outliers so an AP doing data hygiene can spot them en masse.
  const implausibleIds = rawPlacements.reduce((acc, p) => {
    if (!p.parent_notified_at || !p.start_date) return acc
    const startMs = new Date(p.start_date + 'T12:00:00').getTime()
    const notifiedMs = new Date(p.parent_notified_at).getTime()
    const lagDays = Math.round((notifiedMs - startMs) / 86400000)
    if (lagDays < 0 || lagDays > 30) acc.add(p.id)
    return acc
  }, new Set())

  const placements = showOnlyImplausible
    ? rawPlacements.filter(p => implausibleIds.has(p.id))
    : rawPlacements

  const handleExport = () => {
    const headers = ['Student', 'Campus', 'Type', 'Start', 'End', 'Days', 'Assigned By', 'Parent Notified']
    const rows = placements.map(p => [
      p.students ? `${p.students.first_name} ${p.students.last_name}` : '—',
      p.campuses?.name || '—',
      p.placement_type?.toUpperCase(),
      p.start_date || '—',
      p.end_date || '—',
      p.days ?? '—',
      p.assigner?.full_name || '—',
      p.parent_notified ? 'Yes' : 'No',
    ])
    exportToExcel(`Navigator ${activeTab.replace('_', ' ')}`, headers, rows, { filename: `navigator_placements_${activeTab}` })
  }

  return (
    <div>
      <Topbar
        title="Navigator — Placements"
        subtitle="ISS and OSS placement tracking"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export Excel
            </button>
            <button
              onClick={isDemoReadonly ? undefined : () => setShowDrawer(true)}
              disabled={isDemoReadonly}
              title={isDemoReadonly ? 'Available in your pilot account' : ''}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${isDemoReadonly ? 'bg-blue-400 cursor-not-allowed opacity-60' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              + New Placement
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Tabs + campus filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={campusFilter}
            onChange={e => setCampusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">All Campuses</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Implausible parent-notify audit banner — shows when grandfathered
            bad data exists. Migration 069 prevents new bad data; this surfaces
            old data needing review. */}
        {implausibleIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm text-amber-900">
              <span className="font-semibold">{implausibleIds.size}</span>{' '}
              {implausibleIds.size === 1 ? 'placement has' : 'placements have'} implausible parent-notify timestamps
              <span className="text-amber-700 ml-1">(notified before placement, or {'>'} 30 days after — likely data-entry errors).</span>
            </div>
            <button
              onClick={() => setShowOnlyImplausible(v => !v)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors flex-shrink-0"
            >
              {showOnlyImplausible ? 'Show all' : 'Review these'}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading placements...</div>
          ) : placements.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No placements found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Start</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">End</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Days</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned By</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Notified</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Re-entry Plan</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {placements.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/navigator/students/${p.student_id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {p.students ? `${p.students.first_name} ${p.students.last_name}` : '—'}
                        </Link>
                        <p className="text-xs text-gray-400">
                          Grade {p.students?.grade_level || '—'}
                          {p.navigator_referrals && (
                            <span className="ml-1 text-gray-300">· Ref {format(parseISO(p.navigator_referrals.referral_date), 'M/d')}</span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.campuses?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          p.placement_type === 'iss' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {p.placement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.start_date ? format(parseISO(p.start_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.end_date ? format(parseISO(p.end_date), 'MMM d, yyyy') : <span className="text-blue-500 font-medium">Active</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.days ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.assigner?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        {p.parent_notified ? (
                          <ParentNotifyCell placement={p} />
                        ) : (
                          <span className="text-red-500 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={p.reentry_plan || ''}>
                        {p.reentry_plan || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {Array.isArray(p.reason_history) && p.reason_history.length > 0 && (
                            <button
                              onClick={() => setEditingPlacement(p)}
                              title={`Reason field edited ${p.reason_history.length} time${p.reason_history.length === 1 ? '' : 's'} after placement. Open to view history.`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
                            >
                              edited {p.reason_history.length}×
                            </button>
                          )}
                          <button
                            onClick={() => setEditingPlacement(p)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                          >
                            Edit
                          </button>
                        </div>
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
        <NewPlacementDrawer
          prefilledStudentId={prefilledStudentId}
          onClose={() => setShowDrawer(false)}
          onSaved={() => { setShowDrawer(false); refetch(); toast.success('Placement created') }}
        />
      )}

      {editingPlacement && (
        <EditPlacementDrawer
          placement={editingPlacement}
          onClose={() => setEditingPlacement(null)}
          onSaved={(result) => {
            const studentId = editingPlacement.student_id
            const studentName = editingPlacement.students
              ? `${editingPlacement.students.first_name} ${editingPlacement.students.last_name}`
              : 'Student'
            setEditingPlacement(null)
            refetch()
            if (result?.ended) {
              toast((t) => (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Placement ended for {studentName}</span>
                  <button
                    onClick={() => { toast.dismiss(t.id); navigate(`/navigator/supports?new=1&student=${studentId}`) }}
                    className="text-sm text-blue-600 font-semibold hover:underline text-left"
                  >Create follow-up support →</button>
                </div>
              ), { duration: 6000, icon: '✓' })
            } else {
              toast.success('Placement updated')
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Parent-Notify cell — surfaces the lag between placement date and the
//     server-recorded notification time. TEC §37.009 requires same-day notice;
//     a 4-day lag is a defensibility wound a hearing officer will spot. Showing
//     it in the list view means the AP sees it without opening the drawer.
function ParentNotifyCell({ placement: p }) {
  if (!p.parent_notified_at) {
    return <span className="text-green-600 font-medium text-xs">Yes</span>
  }
  // Round-3 audit, Marsha N3: prior implementation parsed start_date as UTC
  // midnight, so a Tuesday-evening Central-time call (= Wed 00:30 UTC) was
  // computed as "1 day later" instead of "same day." Switch to the local
  // calendar-day delta so a Texas AP and the JS Date object agree on what
  // counts as "same day." The server-recorded `parent_notified_at` is still
  // the authoritative timestamp; we only re-frame the *display* delta.
  const localDayMs = (iso) => {
    const d = new Date(iso)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const startDay = p.start_date ? localDayMs(p.start_date + 'T12:00:00') : null
  const notifiedAtMs = new Date(p.parent_notified_at).getTime()
  const notifiedDayLocalMs = localDayMs(p.parent_notified_at)
  const lagDays = startDay != null ? Math.round((notifiedDayLocalMs - startDay) / 86400000) : null

  const tzLabel = (() => {
    try { return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || '' }
    catch { return '' }
  })()

  // Tooltip shows full server timestamp + placement date + local TZ label so
  // an AP can cross-reference with her wall clock (Reyes-style impeachment
  // can no longer say "your system disagrees with the AP about which day").
  const tooltip = `Server-recorded notification: ${format(new Date(p.parent_notified_at), 'MMM d, yyyy h:mm a')}${tzLabel ? ` (${tzLabel} local)` : ''}${
    p.start_date ? `\nPlacement date: ${format(parseISO(p.start_date), 'MMM d, yyyy')}` : ''
  }${lagDays != null ? `\nLogged ${lagDays === 0 ? 'same calendar day' : `${Math.abs(lagDays)} day${Math.abs(lagDays) === 1 ? '' : 's'} ${lagDays < 0 ? 'before' : 'after'}`} placement (local time).` : ''}`

  let lagText = null
  let lagColor = 'text-gray-400'
  if (lagDays != null) {
    if (lagDays <= 0) { lagText = 'same day'; lagColor = 'text-emerald-500' }
    else if (lagDays === 1) { lagText = '1d after'; lagColor = 'text-gray-400' }
    else if (lagDays <= 3) { lagText = `${lagDays}d after`; lagColor = 'text-amber-500' }
    else { lagText = `${lagDays}d after`; lagColor = 'text-red-500' }
  }

  return (
    <div className="flex flex-col" title={tooltip}>
      <span className="text-green-600 font-medium text-xs">Yes</span>
      {lagText && <span className={`text-[10px] ${lagColor}`}>{lagText}</span>}
    </div>
  )
}

// ─── New Placement Drawer ─────────────────────────────────────────────────────

function NewPlacementDrawer({ onClose, onSaved, prefilledStudentId }) {
  const { districtId, profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', grade_level: '' })

  // Auto-load prefilled student
  useEffect(() => {
    if (!prefilledStudentId || !districtId) return
    supabase.from('students').select('id, first_name, last_name, grade_level, campus_id, is_sped, is_504')
      .eq('id', prefilledStudentId).single()
      .then(({ data }) => {
        if (data) {
          setSelectedStudent(data)
          setForm(f => ({ ...f, campus_id: data.campus_id || f.campus_id }))
        }
      })
  }, [prefilledStudentId, districtId])
  const [campuses, setCampuses] = useState([])
  const [form, setForm] = useState({
    campus_id: '',
    placement_type: 'iss',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    days: '',
    location: '',
    reason: '',
    reentry_plan: '',
    parent_notified: false,
    parent_notified_method: '',
    parent_contact_notes: '',
  })
  const [showMDRModal, setShowMDRModal] = useState(false)
  const [mdrIdForPlacement, setMdrIdForPlacement] = useState(null)
  const [specialCircBasis, setSpecialCircBasis] = useState('')
  const { data: cumDays, refetch: refetchCum } = useStudentCumulativeDays(selectedStudent?.id)
  const { mdrs, refetch: refetchMDRs } = useStudentMDRs(selectedStudent?.id)

  useEffect(() => {
    if (!districtId) return
    supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name')
      .then(({ data }) => setCampuses(data || []))
  }, [districtId])

  const searchStudents = async (q) => {
    if (q.length < 2) { setStudents([]); return }
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade_level, is_sped, is_504')
      .eq('district_id', districtId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(8)
    setStudents(data || [])
  }

  // Live computation: would this placement cross the 10-day SPED threshold?
  // Mirror the DB gate (migration 086): prefer the explicit day count, else
  // derive the inclusive span from the dates, so a blank Days field can't hide
  // a dated removal from the threshold warning.
  const proposedDays = (() => {
    if (form.days) return parseInt(form.days) || 0
    if (form.start_date && form.end_date) {
      const span = Math.round((new Date(form.end_date + 'T12:00:00') - new Date(form.start_date + 'T12:00:00')) / 86400000) + 1
      return span > 0 ? span : 0
    }
    return 0
  })()
  const cumNow = cumDays?.cumulative_days || 0
  const wouldCross = selectedStudent?.is_sped && (cumNow + proposedDays) > 10
  const hasUsableMDR = mdrs.some(m => !m.is_manifestation)  // non-manifestation MDR allows continued discipline
  const mdrLinkRequired = wouldCross && !mdrIdForPlacement
  const linkedMdr = mdrs.find(m => m.id === mdrIdForPlacement) || null
  const manifestationLinked = !!linkedMdr?.is_manifestation  // §300.530(e): behavior WAS a manifestation

  const handleSave = async () => {
    if (!selectedStudent || !form.campus_id || !form.placement_type || !form.start_date) {
      setError('Student, campus, type, and start date are required.')
      return
    }
    if (form.placement_type === 'oss' && !form.reentry_plan.trim()) {
      setError('Re-entry plan is required for OSS placements.')
      return
    }
    if (form.parent_notified && !form.parent_notified_method) {
      setError('Choose how the parent was notified — TEC §37.009 same-day notice requires a method.')
      return
    }
    if (wouldCross && !mdrIdForPlacement) {
      setError('SPED student would exceed 10 cumulative removal days — link a Manifestation Determination Review before saving.')
      return
    }
    if (wouldCross && manifestationLinked && !specialCircBasis) {
      setError('The linked MDR found this behavior WAS a manifestation of the student’s disability (IDEA 34 CFR §300.530(e)). The student generally must return to placement; removal past 10 cumulative days is only permitted under the §300.530(g) special-circumstances exception (weapons, drugs, or serious bodily injury). Link a non-manifestation MDR, or select a special-circumstances basis below.')
      return
    }
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('navigator_placements').insert({
      district_id: districtId,
      campus_id: form.campus_id,
      student_id: selectedStudent.id,
      assigned_by: profile.id,
      placement_type: form.placement_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      days: form.days ? parseInt(form.days) : null,
      location: form.location || null,
      reason: form.reason || null,
      reentry_plan: form.reentry_plan || null,
      parent_notified: form.parent_notified,
      // parent_notified_at intentionally omitted — server trigger sets it.
      parent_notified_method: form.parent_notified ? form.parent_notified_method : null,
      parent_contact_notes: form.parent_notified ? (form.parent_contact_notes || null) : null,
      manifestation_determination_id: mdrIdForPlacement || null,
      special_circumstances_basis: manifestationLinked ? (specialCircBasis || null) : null,
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
          <h2 className="text-base font-semibold text-gray-900">New Placement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
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
                  <button onClick={() => { setSelectedStudent(null); setStudents([]) }} className="text-xs text-gray-400">Change</button>
                </div>
                {selectedStudent.is_sped && cumDays && (
                  <div className={`mt-2 rounded-lg border p-3 text-xs ${
                    wouldCross ? 'bg-red-50 border-red-300 text-red-800'
                    : (cumNow + proposedDays) >= 8 ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-purple-50 border-purple-200 text-purple-800'
                  }`}>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold">
                          SPED student — IDEA 34 CFR §300.530 cumulative day tracker
                        </div>
                        <div>
                          {selectedStudent.first_name} has <strong>{cumNow} cumulative ISS+OSS day{cumNow === 1 ? '' : 's'}</strong> this school year
                          {proposedDays > 0 && ` + ${proposedDays} proposed = ${cumNow + proposedDays} total`}.
                        </div>
                        {wouldCross ? (
                          <div className="font-semibold mt-1">
                            ⚠ This placement would cross the federal 10-day threshold.
                            Manifestation Determination Review (MDR) is REQUIRED before continuing.
                          </div>
                        ) : (cumNow + proposedDays) >= 8 ? (
                          <div className="mt-1">
                            Approaching threshold — schedule MDR before placement {cumNow + proposedDays}/{10}.
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {wouldCross && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        {mdrs.length > 0 && (
                          <div className="mb-2">
                            <label className="block text-[10px] font-semibold text-red-700 uppercase mb-1">Link existing MDR (most recent first)</label>
                            <select
                              className="w-full px-2 py-1.5 border border-red-300 rounded text-xs bg-white text-gray-800"
                              value={mdrIdForPlacement || ''}
                              onChange={e => setMdrIdForPlacement(e.target.value || null)}
                            >
                              <option value="">— None linked —</option>
                              {mdrs.map(m => (
                                <option key={m.id} value={m.id}>
                                  {format(parseISO(m.meeting_date), 'MMM d, yyyy')} — {m.is_manifestation ? 'IS manifestation (cannot discipline)' : 'NOT a manifestation (discipline OK)'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowMDRModal(true)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded"
                        >
                          + Log new MDR meeting
                        </button>
                        {hasUsableMDR && !mdrIdForPlacement && (
                          <p className="mt-2 text-[11px] text-red-700">
                            A non-manifestation MDR exists — link it above to proceed, or log a new one if this is a separate behavior.
                          </p>
                        )}
                        {manifestationLinked && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-[11px] text-red-800 font-semibold mb-1">
                              This MDR found the behavior WAS a manifestation. A removal past 10 cumulative days is only
                              permitted under the IDEA 34 CFR §300.530(g) special-circumstances exception.
                            </p>
                            <label className="block text-[10px] font-semibold text-red-700 uppercase mb-1">Special-circumstances basis *</label>
                            <select
                              className="w-full px-2 py-1.5 border border-red-300 rounded text-xs bg-white text-gray-800"
                              value={specialCircBasis}
                              onChange={e => setSpecialCircBasis(e.target.value)}
                            >
                              <option value="">— Select basis (required to proceed) —</option>
                              <option value="weapons">Weapon — §300.530(g)(1)</option>
                              <option value="illegal_drugs">Illegal drugs — §300.530(g)(2)</option>
                              <option value="serious_bodily_injury">Serious bodily injury — §300.530(g)(3)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {selectedStudent.is_sped && !cumDays && (
                  <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
                    <strong>SPED student</strong> — IDEA protections apply. Loading cumulative day count…
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
                      <button key={s.id} className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50" onClick={() => { setSelectedStudent(s); setStudents([]) }}>
                        {s.first_name} {s.last_name} <span className="text-gray-400 text-xs">(Grade {s.grade_level})</span>
                      </button>
                    ))}
                  </div>
                )}
                {studentSearch.length >= 2 && students.length === 0 && !showAddStudent && (
                  <button onClick={() => { setShowAddStudent(true); setNewStudent(ns => ({ ...ns, last_name: studentSearch })) }} className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
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
                            district_id: districtId, campus_id: form.campus_id, student_id_number: `NAV-${Date.now()}`,
                            first_name: newStudent.first_name, last_name: newStudent.last_name, grade_level: parseInt(newStudent.grade_level),
                          }).select('id, first_name, last_name, grade_level, is_sped, is_504').single()
                          if (err) { setError(err.message); return }
                          setSelectedStudent(data); setShowAddStudent(false); setStudentSearch('')
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-gray-300"
                      >{!form.campus_id ? 'Select campus first' : 'Add Student'}</button>
                      <button onClick={() => setShowAddStudent(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Campus *</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400" value={form.campus_id} onChange={e => setForm(f => ({ ...f, campus_id: e.target.value }))}>
                <option value="">Select...</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type *</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400" value={form.placement_type} onChange={e => setForm(f => ({ ...f, placement_type: e.target.value }))}>
                <option value="iss">ISS</option>
                <option value="oss">OSS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date *</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Days</label>
              <input type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Re-entry Plan {form.placement_type === 'oss' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none ${
                form.placement_type === 'oss' && !form.reentry_plan
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-gray-300 focus:border-blue-400'
              }`}
              rows={2}
              placeholder={form.placement_type === 'oss' ? 'Required for OSS — describe conditions for student re-entry...' : 'Optional re-entry notes...'}
              value={form.reentry_plan}
              onChange={e => setForm(f => ({ ...f, reentry_plan: e.target.value }))}
            />
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.parent_notified}
                onChange={e => setForm(f => ({
                  ...f,
                  parent_notified: e.target.checked,
                  parent_notified_method: e.target.checked ? f.parent_notified_method : '',
                  parent_contact_notes: e.target.checked ? f.parent_contact_notes : '',
                }))}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">Parent/Guardian Notified</span>
              <span className="text-xs text-gray-400">— TEC §37.009 same-day notice</span>
            </label>
            {form.parent_notified && (
              <div className="mt-3 space-y-2 pl-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">How was contact made? *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                    value={form.parent_notified_method}
                    onChange={e => setForm(f => ({ ...f, parent_notified_method: e.target.value }))}
                  >
                    <option value="">Select method...</option>
                    {PARENT_NOTIFY_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contact notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                    rows={2}
                    placeholder="e.g., Spoke to mother, confirmed receipt, re-entry conference scheduled for 3/18..."
                    value={form.parent_contact_notes}
                    onChange={e => setForm(f => ({ ...f, parent_contact_notes: e.target.value }))}
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Timestamp is set server-side at the moment you save — not adjustable.
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || mdrLinkRequired}
            title={mdrLinkRequired ? 'Link or log an MDR before saving' : ''}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
          >
            {saving ? 'Saving…' : mdrLinkRequired ? 'MDR required' : 'Save Placement'}
          </button>
        </div>
      </div>
      {showMDRModal && selectedStudent && (
        <MDRModal
          student={selectedStudent}
          districtId={districtId}
          campusId={form.campus_id}
          createdBy={profile.id}
          onClose={() => setShowMDRModal(false)}
          onSaved={(id) => {
            setShowMDRModal(false)
            setMdrIdForPlacement(id)
            refetchMDRs()
            refetchCum()
            toast.success('MDR logged')
          }}
        />
      )}
    </div>
  )
}

// ─── Manifestation Determination Modal ────────────────────────────────────────

function MDRModal({ student, districtId, campusId, createdBy, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
    attendees: '',
    behavior_description: '',
    is_manifestation: 'not_manifestation',
    decision_rationale: '',
    iep_modified: false,
    fba_required: false,
    bip_required: false,
  })

  const handleSave = async () => {
    if (!form.behavior_description.trim() || !form.decision_rationale.trim()) {
      setError('Behavior description and decision rationale are required.')
      return
    }
    if (!campusId) {
      setError('Select a campus on the placement form before logging the MDR.')
      return
    }
    setSaving(true); setError(null)
    const { data, error: err } = await createMDR({
      district_id: districtId,
      campus_id: campusId,
      student_id: student.id,
      meeting_date: form.meeting_date,
      attendees: form.attendees || null,
      behavior_description: form.behavior_description,
      is_manifestation: form.is_manifestation === 'is_manifestation',
      decision_rationale: form.decision_rationale,
      iep_modified: form.iep_modified,
      fba_required: form.fba_required,
      bip_required: form.bip_required,
      created_by: createdBy,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data?.id)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Log Manifestation Determination Review</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {student.first_name} {student.last_name} — IDEA 34 CFR §300.530(e)
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Meeting date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={form.meeting_date}
                onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Attendees</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., LEA rep, Dx Coord, Gen Ed teacher, SPED teacher, parent..."
              value={form.attendees}
              onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Behavior description *</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              placeholder="Describe the conduct that triggered the proposed disciplinary change..."
              value={form.behavior_description}
              onChange={e => setForm(f => ({ ...f, behavior_description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Determination *</label>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="mdr_det" className="mt-0.5"
                  checked={form.is_manifestation === 'not_manifestation'}
                  onChange={() => setForm(f => ({ ...f, is_manifestation: 'not_manifestation' }))} />
                <span className="text-sm">
                  <strong>NOT a manifestation</strong> of disability — discipline may proceed.
                </span>
              </label>
              <label className="flex items-start gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="mdr_det" className="mt-0.5"
                  checked={form.is_manifestation === 'is_manifestation'}
                  onChange={() => setForm(f => ({ ...f, is_manifestation: 'is_manifestation' }))} />
                <span className="text-sm">
                  <strong>IS a manifestation</strong> of disability — return to placement; review IEP/BIP.
                </span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Decision rationale *</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              placeholder="Why the IEP team reached this conclusion. Reference IEP/BIP, FBA, and the two-prong test..."
              value={form.decision_rationale}
              onChange={e => setForm(f => ({ ...f, decision_rationale: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" checked={form.fba_required} onChange={e => setForm(f => ({ ...f, fba_required: e.target.checked }))} />
              FBA ordered
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" checked={form.bip_required} onChange={e => setForm(f => ({ ...f, bip_required: e.target.checked }))} />
              BIP required / updated
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" checked={form.iep_modified} onChange={e => setForm(f => ({ ...f, iep_modified: e.target.checked }))} />
              IEP modified at this meeting
            </label>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving…' : 'Save MDR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Placement Drawer ────────────────────────────────────────────────────

function EditPlacementDrawer({ placement, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [form, setForm] = useState({
    end_date: placement.end_date || '',
    days: placement.days ?? '',
    location: placement.location || '',
    reason: placement.reason || '',
    reentry_plan: placement.reentry_plan || '',
    parent_notified: placement.parent_notified || false,
    parent_notified_method: placement.parent_notified_method || '',
    parent_contact_notes: placement.parent_contact_notes || '',
  })
  const reasonHistoryCount = Array.isArray(placement.reason_history) ? placement.reason_history.length : 0

  const studentName = placement.students
    ? `${placement.students.first_name} ${placement.students.last_name}`
    : '—'

  const endToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setForm(f => ({ ...f, end_date: today }))
  }

  const handleSave = async () => {
    if (placement.placement_type === 'oss' && !form.reentry_plan.trim()) {
      setError('Re-entry plan is required for OSS placements.')
      return
    }
    if (form.parent_notified && !form.parent_notified_method) {
      setError('Choose how the parent was notified — TEC §37.009 same-day notice requires a method.')
      return
    }
    setSaving(true); setError(null)
    const updates = {
      end_date: form.end_date || null,
      days: form.days !== '' ? parseInt(form.days) : null,
      location: form.location || null,
      reason: form.reason || null,
      reentry_plan: form.reentry_plan || null,
      parent_notified: form.parent_notified,
      parent_notified_method: form.parent_notified ? form.parent_notified_method : null,
      parent_contact_notes: form.parent_notified ? (form.parent_contact_notes || null) : null,
      // parent_notified_at intentionally omitted — server trigger sets/clears it.
    }
    const { error: err } = await supabase
      .from('navigator_placements')
      .update(updates)
      .eq('id', placement.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    const wasOpen = !placement.end_date
    const nowClosed = !!form.end_date
    onSaved({ ended: wasOpen && nowClosed })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Edit Placement</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {studentName} &mdash; <span className={`font-semibold uppercase ${placement.placement_type === 'iss' ? 'text-blue-600' : 'text-red-600'}`}>{placement.placement_type}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {/* Start date (read-only context) */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
            Started: <span className="font-medium text-gray-700">
              {placement.start_date ? format(parseISO(placement.start_date), 'MMM d, yyyy') : '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={endToday}
                className="px-3 py-2 text-xs font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                End Today
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Days Assigned</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              value={form.days}
              onChange={e => setForm(f => ({ ...f, days: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500">Reason</label>
              {reasonHistoryCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="text-[10px] text-amber-600 hover:text-amber-800 font-medium underline"
                >
                  Edited {reasonHistoryCount}× — view history
                </button>
              )}
            </div>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              rows={2}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Re-entry Plan</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              rows={3}
              value={form.reentry_plan}
              onChange={e => setForm(f => ({ ...f, reentry_plan: e.target.value }))}
            />
          </div>

          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.parent_notified}
                onChange={e => setForm(f => ({
                  ...f,
                  parent_notified: e.target.checked,
                  parent_notified_method: e.target.checked ? f.parent_notified_method : '',
                  parent_contact_notes: e.target.checked ? f.parent_contact_notes : '',
                }))}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">Parent/Guardian Notified</span>
              {placement.parent_notified_at && (
                <span className="text-[11px] text-gray-400 ml-1">
                  (server-logged {format(parseISO(placement.parent_notified_at), 'MMM d, h:mm a')})
                </span>
              )}
            </label>
            {form.parent_notified && (
              <div className="mt-3 space-y-2 pl-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">How was contact made? *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                    value={form.parent_notified_method}
                    onChange={e => setForm(f => ({ ...f, parent_notified_method: e.target.value }))}
                  >
                    <option value="">Select method...</option>
                    {PARENT_NOTIFY_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Contact notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                    rows={2}
                    placeholder="e.g., Spoke to mother, confirmed receipt..."
                    value={form.parent_contact_notes}
                    onChange={e => setForm(f => ({ ...f, parent_contact_notes: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      {showHistory && (
        <ReasonHistoryModal
          history={placement.reason_history || []}
          currentReason={form.reason}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

function ReasonHistoryModal({ history, currentReason, onClose }) {
  const [actorMap, setActorMap] = useState({})

  useEffect(() => {
    const ids = [...new Set(history.map(h => h.changed_by).filter(Boolean))]
    if (ids.length === 0) return
    supabase.from('profiles').select('id, full_name').in('id', ids)
      .then(({ data }) => setActorMap(Object.fromEntries((data || []).map(p => [p.id, p.full_name]))))
  }, [history])

  // History is appended chronologically (oldest first). Show newest-first for review.
  const ordered = [...history].reverse()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Reason — Edit History</h2>
          <p className="text-xs text-gray-500 mt-0.5">All prior values are preserved server-side in a tamper-evident audit log.</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Current value</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{currentReason || <em className="text-gray-400">(empty)</em>}</p>
          </div>
          {ordered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No prior versions on file.</p>
          ) : ordered.map((h, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Replaced {h.changed_at ? format(new Date(h.changed_at), 'MMM d, yyyy h:mm a') : '—'}
                </p>
                <p className="text-[10px] text-gray-400">
                  by {actorMap[h.changed_by] || (h.changed_by ? h.changed_by.slice(0, 8) : '—')}
                </p>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{h.reason || <em className="text-gray-400">(empty)</em>}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Close</button>
        </div>
      </div>
    </div>
  )
}
