import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'

const PERIODS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const BEHAVIOR_OPTIONS = [
  { value: 'on_task', label: 'On Task', color: '#22c55e', emoji: '✓' },
  { value: 'off_task', label: 'Off Task', color: '#f59e0b', emoji: '⚠' },
  { value: 'refusal', label: 'Refusal', color: '#ef4444', emoji: '✗' },
  { value: 'sleeping', label: 'Sleeping', color: '#6b7280', emoji: '💤' },
  { value: 'disruptive', label: 'Disruptive', color: '#dc2626', emoji: '!' },
]
const WORK_OPTIONS = [
  { value: 'completed', label: 'Completed', color: '#22c55e' },
  { value: 'partial', label: 'Partial', color: '#f59e0b' },
  { value: 'not_attempted', label: 'Not Attempted', color: '#ef4444' },
  { value: 'no_work', label: 'No Work Provided', color: '#9ca3af' },
]

function getKioskCampusId() {
  return new URLSearchParams(window.location.search).get('campus') || null
}

export default function ISSKioskPage() {
  const { districtId, profile } = useAuth()
  const campusId = getKioskCampusId() || profile?.campus_ids?.[0] || null
  const today = format(new Date(), 'yyyy-MM-dd')

  const [students, setStudents] = useState([])
  const [tracking, setTracking] = useState({}) // { [studentId]: { periods: { '1st': { behavior, work } }, attendance, notes, breaks: [] } }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [campusName, setCampusName] = useState('')

  // Load today's ISS roster from active Navigator placements
  const loadRoster = useCallback(async () => {
    if (!districtId) return
    setLoading(true)

    // Get campus name
    if (campusId) {
      const { data: campus } = await supabase.from('campuses').select('name').eq('id', campusId).single()
      if (campus) setCampusName(campus.name)
    }

    // Get active ISS placements
    let query = supabase
      .from('navigator_placements')
      .select('id, student_id, placement_type, start_date, students(id, first_name, last_name, grade_level, student_id_number)')
      .eq('district_id', districtId)
      .eq('placement_type', 'iss')
      .is('end_date', null) // active = no end date

    if (campusId) query = query.eq('campus_id', campusId)

    const { data: placements } = await query

    const roster = (placements || [])
      .filter(p => p.students)
      .map(p => ({
        id: p.students.id,
        placementId: p.id,
        name: `${p.students.last_name}, ${p.students.first_name}`,
        firstName: p.students.first_name,
        grade: p.students.grade_level,
        studentId: p.students.student_id_number,
        startDate: p.start_date,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    setStudents(roster)

    // Load existing tracking for today
    const { data: existing } = await supabase
      .from('iss_daily_tracking')
      .select('*')
      .eq('tracking_date', today)
      .eq('district_id', districtId)
      .in('student_id', roster.map(s => s.id))

    const trackingMap = {}
    roster.forEach(s => {
      const record = (existing || []).find(e => e.student_id === s.id)
      trackingMap[s.id] = record ? {
        attendance: record.attendance || 'present',
        periods: record.period_data || {},
        notes: record.notes || '',
        breaks: record.breaks || [],
        reflection_complete: record.reflection_complete || false,
        id: record.id,
      } : {
        attendance: 'present',
        periods: {},
        notes: '',
        breaks: [],
        reflection_complete: false,
        id: null,
      }
    })
    setTracking(trackingMap)
    setLoading(false)
  }, [districtId, campusId, today])

  useEffect(() => { loadRoster() }, [loadRoster])

  function updatePeriod(studentId, period, field, value) {
    setTracking(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        periods: {
          ...prev[studentId]?.periods,
          [period]: {
            ...(prev[studentId]?.periods?.[period] || {}),
            [field]: value,
          },
        },
      },
    }))
    setSaved(false)
  }

  function updateField(studentId, field, value) {
    setTracking(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }))
    setSaved(false)
  }

  function addBreak(studentId) {
    setTracking(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        breaks: [...(prev[studentId]?.breaks || []), { time: format(new Date(), 'h:mm a'), type: 'restroom', returned: false }],
      },
    }))
    setSaved(false)
  }

  function markBreakReturned(studentId, breakIndex) {
    setTracking(prev => {
      const breaks = [...(prev[studentId]?.breaks || [])]
      breaks[breakIndex] = { ...breaks[breakIndex], returned: true, returnTime: format(new Date(), 'h:mm a') }
      return { ...prev, [studentId]: { ...prev[studentId], breaks } }
    })
    setSaved(false)
  }

  async function handleSaveAll() {
    setSaving(true)
    for (const student of students) {
      const t = tracking[student.id]
      if (!t) continue

      const record = {
        district_id: districtId,
        campus_id: campusId,
        student_id: student.id,
        placement_id: student.placementId,
        tracking_date: today,
        attendance: t.attendance,
        period_data: t.periods,
        notes: t.notes || null,
        breaks: t.breaks || [],
        reflection_complete: t.reflection_complete || false,
        recorded_by: profile?.id || null,
      }

      if (t.id) {
        await supabase.from('iss_daily_tracking').update(record).eq('id', t.id)
      } else {
        const { data } = await supabase.from('iss_daily_tracking').insert(record).select('id').single()
        if (data) {
          setTracking(prev => ({
            ...prev,
            [student.id]: { ...prev[student.id], id: data.id },
          }))
        }
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Compute summary stats
  const totalStudents = students.length
  const presentCount = students.filter(s => tracking[s.id]?.attendance === 'present').length
  const periodsLogged = students.reduce((sum, s) => sum + Object.keys(tracking[s.id]?.periods || {}).length, 0)

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>ISS Kiosk</div>
        <div style={{ color: '#6b7280' }}>Loading roster...</div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>ISS Daily Tracking</div>
          <div style={styles.headerSub}>{campusName || 'Campus'} · {format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={styles.statBadge}>{presentCount}/{totalStudents} present</div>
          <div style={styles.statBadge}>{periodsLogged} period entries</div>
          <button onClick={handleSaveAll} disabled={saving} style={styles.saveBtn}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {students.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>No active ISS placements</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Students with active ISS placements in Navigator will appear here.</div>
        </div>
      ) : (
        <div style={styles.rosterGrid}>
          {students.map(student => {
            const t = tracking[student.id] || {}
            return (
              <div key={student.id} style={styles.studentCard}>
                {/* Student header */}
                <div style={styles.studentHeader}>
                  <div style={styles.avatar}>{student.firstName?.charAt(0) || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.studentName}>{student.name}</div>
                    <div style={styles.studentMeta}>Grade {student.grade} · ID: {student.studentId || '—'} · ISS since {student.startDate}</div>
                  </div>
                  {/* Attendance toggle */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['present', 'absent', 'late'].map(status => (
                      <button key={status} onClick={() => updateField(student.id, 'attendance', status)} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                        background: t.attendance === status
                          ? status === 'present' ? '#dcfce7' : status === 'absent' ? '#fef2f2' : '#fef3c7'
                          : '#f3f4f6',
                        color: t.attendance === status
                          ? status === 'present' ? '#15803d' : status === 'absent' ? '#dc2626' : '#92400e'
                          : '#9ca3af',
                      }}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period grid */}
                <div style={styles.periodGrid}>
                  <div style={styles.periodHeader}>
                    <span style={{ width: 48 }}>Period</span>
                    <span style={{ flex: 1 }}>Behavior</span>
                    <span style={{ flex: 1 }}>Work</span>
                  </div>
                  {PERIODS.map(period => {
                    const pd = t.periods?.[period] || {}
                    return (
                      <div key={period} style={styles.periodRow}>
                        <span style={{ width: 48, fontWeight: 600, fontSize: 13, color: '#374151' }}>{period}</span>
                        <div style={{ flex: 1, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {BEHAVIOR_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => updatePeriod(student.id, period, 'behavior', opt.value)} style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                              background: pd.behavior === opt.value ? opt.color : '#f3f4f6',
                              color: pd.behavior === opt.value ? '#fff' : '#6b7280',
                            }} title={opt.label}>
                              {opt.emoji}
                            </button>
                          ))}
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {WORK_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => updatePeriod(student.id, period, 'work', opt.value)} style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                              background: pd.work === opt.value ? opt.color : '#f3f4f6',
                              color: pd.work === opt.value ? '#fff' : '#6b7280',
                            }} title={opt.label}>
                              {opt.label.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Breaks + Notes + Reflection */}
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={styles.miniLabel}>Breaks</div>
                    {(t.breaks || []).map((brk, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                        <span>{brk.time} — {brk.type}</span>
                        {brk.returned
                          ? <span style={{ color: '#22c55e', fontSize: 11 }}>returned {brk.returnTime}</span>
                          : <button onClick={() => markBreakReturned(student.id, i)} style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark returned</button>
                        }
                      </div>
                    ))}
                    <button onClick={() => addBreak(student.id)} style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>+ Add break</button>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={styles.miniLabel}>Notes</div>
                    <textarea
                      value={t.notes || ''}
                      onChange={e => updateField(student.id, 'notes', e.target.value)}
                      placeholder="Observations, incidents, positive behavior..."
                      style={styles.notesInput}
                      rows={2}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                      <input type="checkbox" checked={t.reflection_complete || false} onChange={e => updateField(student.id, 'reflection_complete', e.target.checked)} style={{ accentColor: '#3b82f6' }} />
                      Reflection complete
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>Behavior Key</div>
        <div style={styles.legendItems}>
          {BEHAVIOR_OPTIONS.map(opt => (
            <span key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: opt.color, textAlign: 'center', fontSize: 10, lineHeight: '14px', color: '#fff', fontWeight: 700 }}>{opt.emoji}</span>
              {opt.label}
            </span>
          ))}
        </div>
        <div style={styles.legendTitle}>Work Key</div>
        <div style={styles.legendItems}>
          {WORK_OPTIONS.map(opt => (
            <span key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: opt.color, textAlign: 'center', fontSize: 10, lineHeight: '14px', color: '#fff', fontWeight: 700 }}>{opt.label.charAt(0)}</span>
              {opt.label}
            </span>
          ))}
        </div>
      </div>

      {/* Floating save button (mobile) */}
      <button onClick={handleSaveAll} disabled={saving} style={styles.floatingSave}>
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save All Records'}
      </button>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 80 },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  header: { background: '#1e3a5f', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  statBadge: { background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  saveBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 48, textAlign: 'center', margin: '24px auto', maxWidth: 500 },
  rosterGrid: { padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  studentCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  studentHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 },
  studentName: { fontSize: 15, fontWeight: 700, color: '#111827' },
  studentMeta: { fontSize: 12, color: '#6b7280' },
  periodGrid: { display: 'flex', flexDirection: 'column', gap: 0 },
  periodHeader: { display: 'flex', gap: 8, padding: '4px 0', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f3f4f6', marginBottom: 4 },
  periodRow: { display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #fafafa' },
  miniLabel: { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  notesInput: { width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, resize: 'vertical', fontFamily: 'inherit' },
  legend: { margin: '24px auto', maxWidth: 700, padding: '16px 24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 },
  legendTitle: { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, marginTop: 8 },
  legendItems: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 },
  floatingSave: { position: 'fixed', bottom: 20, right: 20, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.4)', zIndex: 20 },
}
