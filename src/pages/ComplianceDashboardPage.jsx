import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import { getSchoolYearLabel, getSchoolYearStart } from '../lib/utils'

export default function ComplianceDashboardPage() {
  const { districtId } = useAuth()
  const [campusData, setCampusData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!districtId) return
    const schoolYearStart = getSchoolYearStart().toISOString()

    const fetchData = async () => {
      setLoading(true)

      const [campusesRes, incidentsRes, checklistsRes] = await Promise.all([
        supabase.from('campuses').select('id, name').eq('district_id', districtId),
        supabase
          .from('incidents')
          .select('id, campus_id, student_id, consequence_type, consequence_days, status, students!inner(is_sped, is_504), compliance_checklists!fk_incidents_compliance(id, status, placement_blocked)')
          .eq('district_id', districtId)
          .in('consequence_type', ['daep', 'expulsion', 'iss', 'oss'])
          .gte('incident_date', schoolYearStart),
        supabase
          .from('compliance_checklists')
          .select('id, incident_id, status, district_id')
          .eq('district_id', districtId)
          .in('status', ['pending', 'in_progress'])
          .gte('created_at', schoolYearStart),
      ])

      const campuses = campusesRes.data || []
      const incidents = incidentsRes.data || []
      const checklists = checklistsRes.data || []

      // Build a set of incident IDs with pending checklists for reference
      const pendingChecklistByIncident = {}
      checklists.forEach(cl => {
        pendingChecklistByIncident[cl.incident_id] = (pendingChecklistByIncident[cl.incident_id] || 0) + 1
      })

      // Aggregate per campus
      const campusMap = {}
      campuses.forEach(c => {
        campusMap[c.id] = {
          id: c.id,
          name: c.name,
          overdueMdr: 0,
          approaching10: 0,
          atOrOver10: 0,
          pendingChecklists: 0,
        }
      })

      // Track cumulative days per student per campus
      const studentDays = {} // student_id -> total days
      const studentCampus = {} // student_id -> campus_id (use first seen)

      incidents.forEach(inc => {
        const cid = inc.campus_id
        if (!campusMap[cid]) return

        // Track cumulative removal days
        if (inc.consequence_days) {
          studentDays[inc.student_id] = (studentDays[inc.student_id] || 0) + inc.consequence_days
          if (!studentCampus[inc.student_id]) studentCampus[inc.student_id] = cid
        }

        // Overdue MDR: SPED/504 student with DAEP consequence but compliance checklist not completed
        const isSped = inc.students?.is_sped || inc.students?.is_504
        if (isSped && (inc.consequence_type === 'daep' || inc.consequence_type === 'expulsion')) {
          const cl = inc.compliance_checklists
          if (!cl || cl.status === 'pending' || cl.status === 'in_progress') {
            campusMap[cid].overdueMdr++
          }
        }
      })

      // Assign approaching/at-or-over 10-day counts to campuses
      Object.entries(studentDays).forEach(([sid, days]) => {
        const cid = studentCampus[sid]
        if (!cid || !campusMap[cid]) return
        if (days >= 10) {
          campusMap[cid].atOrOver10++
        } else if (days >= 7) {
          campusMap[cid].approaching10++
        }
      })

      // Count pending checklists per campus (via incidents)
      incidents.forEach(inc => {
        const cid = inc.campus_id
        if (!campusMap[cid]) return
        if (pendingChecklistByIncident[inc.id]) {
          campusMap[cid].pendingChecklists += pendingChecklistByIncident[inc.id]
        }
      })

      const sorted = Object.values(campusMap).sort((a, b) => {
        const aScore = a.overdueMdr * 3 + a.atOrOver10 * 2 + a.approaching10 + a.pendingChecklists
        const bScore = b.overdueMdr * 3 + b.atOrOver10 * 2 + b.approaching10 + b.pendingChecklists
        return bScore - aScore
      })

      setCampusData(sorted)
      setLoading(false)
    }

    fetchData()
  }, [districtId])

  // Summary totals
  const totals = campusData.reduce(
    (acc, c) => ({
      overdue: acc.overdue + c.overdueMdr + c.atOrOver10,
      approaching: acc.approaching + c.approaching10,
      clear: acc.clear + (c.overdueMdr === 0 && c.atOrOver10 === 0 && c.approaching10 === 0 && c.pendingChecklists === 0 ? 1 : 0),
    }),
    { overdue: 0, approaching: 0, clear: 0 }
  )

  function getCampusColor(campus) {
    if (campus.overdueMdr > 0 || campus.atOrOver10 > 0) return 'red'
    if (campus.approaching10 > 0 || campus.pendingChecklists > 0) return 'amber'
    return 'green'
  }

  const colorStyles = {
    red: { border: 'border-red-300', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    amber: { border: 'border-amber-300', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    green: { border: 'border-green-300', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  }

  return (
    <div>
      <Topbar
        title="District Compliance Overview"
        subtitle={`${getSchoolYearLabel()} School Year`}
      />

      <div className="p-3 md:p-6">
        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{totals.overdue}</p>
            <p className="text-xs font-medium text-red-600 mt-1">Overdue / At Limit</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">{totals.approaching}</p>
            <p className="text-xs font-medium text-amber-600 mt-1">Approaching Limit</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{totals.clear}</p>
            <p className="text-xs font-medium text-green-600 mt-1">All Clear</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campusData.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500 text-center py-8">No campus data available for this school year.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campusData.map(campus => {
              const color = getCampusColor(campus)
              const styles = colorStyles[color]
              return (
                <div
                  key={campus.id}
                  className={`rounded-xl border ${styles.border} ${styles.bg} p-5 shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{campus.name}</h3>
                    <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
                  </div>
                  <div className="space-y-2">
                    <MetricRow
                      label="Overdue MDRs"
                      value={campus.overdueMdr}
                      danger={campus.overdueMdr > 0}
                    />
                    <MetricRow
                      label="Approaching 10-day limit (7-9 days)"
                      value={campus.approaching10}
                      warn={campus.approaching10 > 0}
                    />
                    <MetricRow
                      label="At/over 10-day limit"
                      value={campus.atOrOver10}
                      danger={campus.atOrOver10 > 0}
                    />
                    <MetricRow
                      label="Pending checklists"
                      value={campus.pendingChecklists}
                      warn={campus.pendingChecklists > 0}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/compliance" className="text-sm text-orange-600 hover:text-orange-800 font-medium">
            &larr; Back to Compliance
          </Link>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, danger, warn }) {
  let valueClass = 'text-gray-700'
  if (danger && value > 0) valueClass = 'text-red-700 font-bold'
  else if (warn && value > 0) valueClass = 'text-amber-700 font-bold'

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}
