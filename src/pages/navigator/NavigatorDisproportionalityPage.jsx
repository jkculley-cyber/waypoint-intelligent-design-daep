import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import toast from 'react-hot-toast'
import Topbar from '../../components/layout/Topbar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useDisproportionality } from '../../hooks/useNavigator'

// Color scale for referral rate bars — white → amber → red
function rateColor(rate, max) {
  if (!rate || max === 0) return '#e5e7eb'
  const pct = rate / max
  if (pct >= 0.75) return '#ef4444'
  if (pct >= 0.5)  return '#f97316'
  if (pct >= 0.25) return '#fbbf24'
  return '#60a5fa'
}

export default function NavigatorDisproportionalityPage() {
  const { districtId, isDemoReadonly } = useAuth()
  const { campusData, gradeData, loading, error, refetch } = useDisproportionality()
  const [expandedCampus, setExpandedCampus] = useState(null)
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false)
  const [campuses, setCampuses] = useState([])
  const [enrollmentForm, setEnrollmentForm] = useState({})
  const [savingEnrollment, setSavingEnrollment] = useState(false)

  useEffect(() => {
    if (!districtId) return
    supabase.from('campuses').select('id, name, settings, campus_type').eq('district_id', districtId)
      .then(({ data }) => {
        setCampuses(data || [])
        const form = {}
        ;(data || []).forEach(c => {
          form[c.id] = {
            enrollment: c.settings?.enrollment || '',
            grades: c.settings?.enrollment_by_grade || {},
          }
        })
        setEnrollmentForm(form)
      })
  }, [districtId])

  const saveEnrollment = async () => {
    setSavingEnrollment(true)
    for (const campus of campuses) {
      const f = enrollmentForm[campus.id]
      if (!f) continue
      const settings = { ...(campus.settings || {}), enrollment: f.enrollment ? Number(f.enrollment) : null, enrollment_by_grade: f.grades }
      await supabase.from('campuses').update({ settings }).eq('id', campus.id)
    }
    setSavingEnrollment(false)
    setShowEnrollmentModal(false)
    toast.success('Enrollment updated')
    refetch()
  }

  const maxCampusRate = Math.max(...campusData.map(c => c.rate || 0), 0)
  const maxGradeRate  = Math.max(...gradeData.map(g => g.rate || 0), 0)
  const avgCampusRate = campusData.length > 0
    ? (campusData.reduce((s, c) => s + (c.rate || 0), 0) / campusData.length).toFixed(1)
    : null
  const avgGradeRate = gradeData.length > 0
    ? gradeData.reduce((s, x) => s + (x.rate || 0), 0) / gradeData.length
    : 0
  const expandedCampusObj = expandedCampus
    ? campusData.find(c => c.campus_id === expandedCampus)
    : null

  return (
    <div>
      <Topbar
        title="Disproportionality Radar"
        subtitle="Referral concentration by campus and grade — rolling 90-day window"
        actions={
          <div className="flex items-center gap-2">
            {!isDemoReadonly && (
              <button
                onClick={() => setShowEnrollmentModal(true)}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Set Enrollment
              </button>
            )}
            <button
              onClick={refetch}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Loading disproportionality data...
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500 text-sm">{error}</div>
        ) : campusData.length === 0 && gradeData.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">No referral data in the last 90 days</p>
            <p className="text-gray-400 text-sm mt-1">Create referrals to see campus and grade concentration patterns.</p>
          </div>
        ) : (
          <>
            {/* Campus Section */}
            {campusData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Referral Rate by Campus</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Referrals ÷ enrolled students × 100. District avg: {avgCampusRate ?? '—'}%</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">90-day window</span>
                </div>

                <ResponsiveContainer width="100%" height={Math.max(160, campusData.length * 40)}>
                  <BarChart
                    layout="vertical"
                    data={campusData}
                    margin={{ top: 4, right: 40, left: 120, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#374151' }}
                      tickLine={false}
                      axisLine={false}
                      width={115}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Referral Rate']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    {avgCampusRate && (
                      <ReferenceLine x={parseFloat(avgCampusRate)} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Avg', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                    )}
                    <Bar dataKey="rate" radius={[0,4,4,0]} cursor="pointer" onClick={(d) => setExpandedCampus(expandedCampus === d.campus_id ? null : d.campus_id)}>
                      {campusData.map((entry) => (
                        <Cell key={entry.campus_id} fill={rateColor(entry.rate, maxCampusRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Campus table */}
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Campus</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Referrals</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Enrollment</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Rate</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">vs. Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campusData.map(c => {
                      const diff = avgCampusRate ? (c.rate - parseFloat(avgCampusRate)).toFixed(1) : null
                      const isExpanded = expandedCampus === c.campus_id
                      return (
                        <tr key={c.campus_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedCampus(isExpanded ? null : c.campus_id)}>
                          <td className="py-2 font-medium text-gray-800">
                            <span className="flex items-center gap-1.5">
                              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                              {c.name}
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-600">{c.referrals}</td>
                          <td className="py-2 text-right text-gray-500">{c.enrollment || '—'}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">{c.rate != null ? `${c.rate}%` : '—'}</td>
                          <td className="py-2 text-right text-xs">
                            {diff != null && (
                              <span className={parseFloat(diff) > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                                {parseFloat(diff) > 0 ? `+${diff}` : diff}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {expandedCampusObj?.students?.length > 0 && (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Students at {expandedCampusObj.name} — {expandedCampusObj.students.length} referred
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {expandedCampusObj.students.map(s => (
                                <Link
                                  key={s.id}
                                  to={`/navigator/students/${s.id}`}
                                  className="flex items-center justify-between px-3 py-1.5 bg-white rounded border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span className="font-medium text-gray-800">{s.first_name} {s.last_name}</span>
                                  <span className="text-xs text-gray-500">Gr {s.grade_level} · {s.referral_count} ref{s.referral_count !== 1 ? 's' : ''}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grade Section */}
            {gradeData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Referral Rate by Grade Level</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Identifies grade bands with elevated incident rates (K-12)</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">90-day window</span>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={gradeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="%" allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name) => [name === 'rate' ? `${value}%` : value, name === 'rate' ? 'Referral Rate' : 'Referrals']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Bar dataKey="rate" radius={[4,4,0,0]}>
                      {gradeData.map((entry) => (
                        <Cell key={entry.grade} fill={rateColor(entry.rate, maxGradeRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Grade detail table */}
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Grade</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Referrals</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Enrollment</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Rate</th>
                      <th className="py-2 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">vs. Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gradeData.map(g => {
                      const diff = g.rate != null ? (g.rate - avgGradeRate).toFixed(1) : null
                      return (
                        <tr key={g.grade} className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-800">{g.label}</td>
                          <td className="py-2 text-right text-gray-600">{g.referrals}</td>
                          <td className="py-2 text-right text-gray-500">{g.enrollment || '\u2014'}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">{g.rate != null ? `${g.rate}%` : '\u2014'}</td>
                          <td className="py-2 text-right text-xs">
                            {diff != null && (
                              <span className={parseFloat(diff) > 0 ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                                {parseFloat(diff) > 0 ? `+${diff}` : diff}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Rate color scale:</span>
              {[
                { color: '#60a5fa', label: 'Low' },
                { color: '#fbbf24', label: 'Moderate' },
                { color: '#f97316', label: 'Elevated' },
                { color: '#ef4444', label: 'High' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-400">
              Rate = referrals ÷ enrollment × 100. Click "Set Enrollment" to enter your campus enrollment for accurate rates.
              Without enrollment data, rates are calculated from students in the system only.
            </p>
          </>
        )}
      </div>

      {/* Enrollment Modal */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEnrollmentModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Set Campus Enrollment</h2>
            <p className="text-xs text-gray-500 mb-4">Enter total enrollment and grade-level breakdown for accurate referral rate calculations.</p>
            {campuses.map(c => {
              const f = enrollmentForm[c.id] || { enrollment: '', grades: {} }
              return (
                <div key={c.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800 mb-2">{c.name}</p>
                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-500">Total Enrollment</label>
                    <input
                      type="number" min="0" placeholder="e.g., 820"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                      value={f.enrollment}
                      onChange={e => setEnrollmentForm(prev => ({ ...prev, [c.id]: { ...f, enrollment: e.target.value } }))}
                    />
                  </div>
                  <label className="text-xs font-medium text-gray-500">By Grade (optional)</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {[...(c.campus_type === 'elementary' ? [-1,0,1,2,3,4,5] : c.campus_type === 'middle' ? [6,7,8] : [9,10,11,12])].map(g => (
                      <div key={g}>
                        <label className="text-[10px] text-gray-500">{g === -1 ? 'PK' : g === 0 ? 'K' : `Gr ${g}`}</label>
                        <input
                          type="number" min="0" placeholder="0"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          value={f.grades[String(g)] || ''}
                          onChange={e => {
                            const grades = { ...f.grades, [String(g)]: e.target.value ? Number(e.target.value) : undefined }
                            if (!e.target.value) delete grades[String(g)]
                            setEnrollmentForm(prev => ({ ...prev, [c.id]: { ...f, grades } }))
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowEnrollmentModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveEnrollment} disabled={savingEnrollment} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg">
                {savingEnrollment ? 'Saving...' : 'Save Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
