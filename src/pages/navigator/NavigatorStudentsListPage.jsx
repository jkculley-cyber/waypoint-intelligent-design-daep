import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Topbar from '../../components/layout/Topbar'

export default function NavigatorStudentsListPage() {
  const { districtId, campusIds, isAdmin, hasProduct } = useAuth()
  const showDaep = hasProduct('waypoint')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | at_daep | prior_daep | active_support

  const fetchStudents = useCallback(async () => {
    if (!districtId) return
    setLoading(true)

    // Get all students who have any Navigator activity (referrals, placements, or supports)
    const [refRes, plcRes, supRes] = await Promise.all([
      supabase.from('navigator_referrals').select('student_id').eq('district_id', districtId),
      supabase.from('navigator_placements').select('student_id').eq('district_id', districtId),
      supabase.from('navigator_supports').select('student_id, status').eq('district_id', districtId),
    ])

    const studentIds = new Set()
    ;(refRes.data || []).forEach(r => studentIds.add(r.student_id))
    ;(plcRes.data || []).forEach(r => studentIds.add(r.student_id))
    ;(supRes.data || []).forEach(r => studentIds.add(r.student_id))

    // Track active supports per student
    const activeSupportCount = {}
    ;(supRes.data || []).forEach(s => {
      if (s.status === 'active') activeSupportCount[s.student_id] = (activeSupportCount[s.student_id] || 0) + 1
    })

    if (studentIds.size === 0) { setStudents([]); setLoading(false); return }

    // Fetch student details
    let studentQ = supabase
      .from('students')
      .select('id, first_name, last_name, grade_level, campus_id, is_sped, is_504, is_ell, is_mtss, campus:campuses!campus_id(id, name)')
      .in('id', [...studentIds])
      .eq('is_active', true)
      .order('last_name')
    if (!isAdmin && campusIds?.length) studentQ = studentQ.in('campus_id', campusIds)
    const { data: studentData } = await studentQ

    // Fetch DAEP incidents for these students
    const { data: daepInc } = await supabase
      .from('incidents')
      .select('student_id, status, consequence_days, incident_date')
      .eq('district_id', districtId)
      .eq('consequence_type', 'daep')
      .in('status', ['active', 'approved', 'completed'])
      .in('student_id', [...studentIds])

    const daepByStudent = {}
    ;(daepInc || []).forEach(i => {
      if (!daepByStudent[i.student_id]) daepByStudent[i.student_id] = { active: false, completed: 0 }
      if (i.status === 'active' || i.status === 'approved') daepByStudent[i.student_id].active = true
      if (i.status === 'completed') daepByStudent[i.student_id].completed++
    })

    // Count referrals + placements per student
    const refCount = {}
    const plcCount = {}
    ;(refRes.data || []).forEach(r => { refCount[r.student_id] = (refCount[r.student_id] || 0) + 1 })
    ;(plcRes.data || []).forEach(r => { plcCount[r.student_id] = (plcCount[r.student_id] || 0) + 1 })

    const enriched = (studentData || []).map(s => ({
      ...s,
      referralCount: refCount[s.id] || 0,
      placementCount: plcCount[s.id] || 0,
      activeSupportCount: activeSupportCount[s.id] || 0,
      atDaep: daepByStudent[s.id]?.active || false,
      priorDaepCount: daepByStudent[s.id]?.completed || 0,
    }))

    setStudents(enriched)
    setLoading(false)
  }, [districtId, campusIds, isAdmin])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const filtered = students.filter(s => {
    if (filter === 'at_daep') return s.atDaep
    if (filter === 'prior_daep') return s.priorDaepCount > 0
    if (filter === 'active_support') return s.activeSupportCount > 0
    return true
  })

  return (
    <div>
      <Topbar
        title="Navigator — Students"
        subtitle={`${filtered.length} student${filtered.length !== 1 ? 's' : ''} with Navigator activity`}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All Students' },
            ...(showDaep ? [
              { key: 'at_daep', label: 'At DAEP', color: 'orange' },
              { key: 'prior_daep', label: 'Prior DAEP', color: 'gray' },
            ] : []),
            { key: 'active_support', label: 'Active Supports', color: 'green' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  ({f.key === 'at_daep' ? students.filter(s => s.atDaep).length
                    : f.key === 'prior_daep' ? students.filter(s => s.priorDaepCount > 0).length
                    : students.filter(s => s.activeSupportCount > 0).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-500">No students match this filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Referrals</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Placements</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Supports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/navigator/students/${s.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {s.last_name}, {s.first_name}
                        </Link>
                        <div className="flex gap-1 mt-0.5">
                          {s.is_sped && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">SPED</span>}
                          {s.is_504 && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">504</span>}
                          {s.is_ell && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">EB</span>}
                          {s.is_mtss && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700">MTSS</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.campus?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.grade_level || '—'}</td>
                      <td className="px-4 py-3">
                        {s.atDaep && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">AT DAEP</span>}
                        {!s.atDaep && s.priorDaepCount > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">PRIOR DAEP ({s.priorDaepCount})</span>}
                        {!s.atDaep && s.priorDaepCount === 0 && s.activeSupportCount > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">ACTIVE SUPPORT</span>}
                        {!s.atDaep && s.priorDaepCount === 0 && s.activeSupportCount === 0 && <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{s.referralCount}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{s.placementCount}</td>
                      <td className="px-4 py-3 text-center">
                        {s.activeSupportCount > 0 ? (
                          <span className="font-semibold text-green-600">{s.activeSupportCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
