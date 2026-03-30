import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useAccessScope } from '../hooks/useAccessScope'
import { applyCampusScope } from '../lib/accessControl'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import SetupChecklist from '../components/ui/SetupChecklist'
import { ROLE_LABELS, ROLES, APPROVAL_CHAIN_STEPS, STAFF_ROLES, INCIDENT_STATUS_COLORS } from '../lib/constants'
import { getSchoolYearLabel, getSchoolYearStart, formatDate } from '../lib/utils'

const APPROVAL_ROLES = APPROVAL_CHAIN_STEPS.map(s => s.role)

export default function DashboardPage() {
  const { profile, hasRole, districtId, district } = useAuth()
  const { redCount, yellowCount, alertCount } = useNotifications()
  const { scope, loading: scopeLoading } = useAccessScope()
  const isAdmin = hasRole([ROLES.ADMIN])

  // Fetch live dashboard counts, scoped by campus
  const [stats, setStats] = useState({ incidents: null, holds: null, plans: null, daepApproved: null })
  useEffect(() => {
    if (!districtId || scopeLoading) return
    const fetchStats = async () => {
      let incQuery = supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .in('status', ['submitted', 'under_review', 'compliance_hold', 'approved', 'active'])
      incQuery = applyCampusScope(incQuery, scope)

      let holdQuery = supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .eq('status', 'compliance_hold')
      holdQuery = applyCampusScope(holdQuery, scope)

      let planQuery = supabase
        .from('transition_plans')
        .select('id', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .in('status', ['active', 'under_review'])
      // transition_plans don't have campus_id, so no server-side scope here

      let daepApprovedQuery = supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .eq('consequence_type', 'daep')
        .eq('status', 'approved')
      daepApprovedQuery = applyCampusScope(daepApprovedQuery, scope)

      const [incRes, holdRes, planRes, daepRes] = await Promise.all([incQuery, holdQuery, planQuery, daepApprovedQuery])
      setStats({
        incidents: incRes.count ?? 0,
        holds: holdRes.count ?? 0,
        plans: planRes.count ?? 0,
        daepApproved: daepRes.count ?? 0,
      })
    }
    fetchStats()
  }, [districtId, scopeLoading, scope])

  // Fetch denied/returned DAEP referrals — campus needs to take action
  const [needsAction, setNeedsAction] = useState([])
  useEffect(() => {
    if (!districtId || scopeLoading) return
    const fetchNeedsAction = async () => {
      let q = supabase
        .from('incidents')
        .select(`
          id, incident_date, status,
          student:students(id, first_name, last_name),
          offense:offense_codes(id, title),
          approval_chain:daep_approval_chains!fk_incidents_approval_chain(id, current_step)
        `)
        .eq('district_id', districtId)
        .eq('consequence_type', 'daep')
        .in('status', ['denied', 'returned'])
        .order('incident_date', { ascending: false })
        .limit(10)
      q = applyCampusScope(q, scope)
      const { data } = await q
      setNeedsAction(data || [])
    }
    fetchNeedsAction()
  }, [districtId, scopeLoading, scope])

  // Fetch pending approvals for roles in the approval chain
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const isApprovalRole = profile?.role && APPROVAL_ROLES.includes(profile.role)
  useEffect(() => {
    if (!districtId || !isApprovalRole || !profile?.role) return
    const fetchPending = async () => {
      setPendingLoading(true)
      let q = supabase
        .from('incidents')
        .select(`
          id, incident_date,
          student:students(id, first_name, last_name),
          approval_chain:daep_approval_chains!fk_incidents_approval_chain(id, current_step, chain_status)
        `)
        .eq('district_id', districtId)
        .eq('status', 'pending_approval')
        .order('incident_date', { ascending: false })
        .limit(5)
      q = applyCampusScope(q, scope)
      const { data } = await q
      const mine = (data || []).filter(inc => inc.approval_chain?.current_step === profile.role)
      setPendingApprovals(mine)
      setPendingLoading(false)
    }
    fetchPending()
  }, [districtId, profile?.role, isApprovalRole, scope])

  // ── My Action Items ────────────────────────────────────────────────────────
  const [actionItems, setActionItems] = useState({ pendingApproval: 0, teacherDrafts: 0, returned: 0 })
  const [actionItemsLoaded, setActionItemsLoaded] = useState(false)
  useEffect(() => {
    if (!districtId || !profile?.id || scopeLoading) return
    const fetchActionItems = async () => {
      const role = profile.role
      const promises = []

      // 1. Incidents pending approval at the user's step in the approval chain
      if (APPROVAL_ROLES.includes(role)) {
        const p = (async () => {
          let q = supabase
            .from('incidents')
            .select('id, approval_chain:daep_approval_chains!fk_incidents_approval_chain(id, current_step)')
            .eq('district_id', districtId)
            .eq('status', 'pending_approval')
          q = applyCampusScope(q, scope)
          const { data } = await q
          return (data || []).filter(inc => inc.approval_chain?.current_step === role).length
        })()
        promises.push(p)
      } else {
        promises.push(Promise.resolve(0))
      }

      // 2. Teacher-submitted drafts needing consequence (admin/principal/ap only)
      if ([ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.AP].includes(role)) {
        const p = (async () => {
          let q = supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('district_id', districtId)
            .eq('status', 'draft')
            .is('consequence_type', null)
          q = applyCampusScope(q, scope)
          const { count } = await q
          return count ?? 0
        })()
        promises.push(p)
      } else {
        promises.push(Promise.resolve(0))
      }

      // 3. User's own returned incidents
      {
        const p = (async () => {
          let q = supabase
            .from('incidents')
            .select('id', { count: 'exact', head: true })
            .eq('district_id', districtId)
            .eq('status', 'returned')
            .eq('reported_by', profile.id)
          const { count } = await q
          return count ?? 0
        })()
        promises.push(p)
      }

      const [pendingApproval, teacherDrafts, returned] = await Promise.all(promises)
      setActionItems({ pendingApproval, teacherDrafts, returned })
      setActionItemsLoaded(true)
    }
    fetchActionItems()
  }, [districtId, profile?.id, profile?.role, scopeLoading, scope])

  const actionTotal = actionItems.pendingApproval + actionItems.teacherDrafts + actionItems.returned

  // ── Compliance ROI Widget ──────────────────────────────────────────────────
  const [roiStats, setRoiStats] = useState({ blocked: 0, approaching: 0, spedIncidents: 0 })
  const [roiLoaded, setRoiLoaded] = useState(false)
  useEffect(() => {
    if (!districtId || scopeLoading) return
    const schoolYearStart = getSchoolYearStart().toISOString()
    const fetchRoi = async () => {
      // 1. Placements blocked by compliance
      let blockedQuery = supabase
        .from('compliance_checklists')
        .select('id, incidents!fk_incidents_compliance!inner(campus_id)', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .eq('placement_blocked', true)
        .gte('created_at', schoolYearStart)
      if (!scope.isDistrictWide && scope.scopedCampusIds?.length) {
        blockedQuery = blockedQuery.in('incidents.campus_id', scope.scopedCampusIds)
      }
      const { count: blockedCount } = await blockedQuery

      // 2. Students at 7+ cumulative removal days this school year
      let removalQuery = supabase
        .from('incidents')
        .select('student_id, consequence_days')
        .eq('district_id', districtId)
        .in('consequence_type', ['oss', 'iss', 'daep', 'expulsion'])
        .gte('incident_date', schoolYearStart)
      removalQuery = applyCampusScope(removalQuery, scope)
      const { data: removalIncidents } = await removalQuery
      const daysByStudent = {}
      ;(removalIncidents || []).forEach(inc => {
        if (!inc.consequence_days) return
        daysByStudent[inc.student_id] = (daysByStudent[inc.student_id] || 0) + inc.consequence_days
      })
      const approachingCount = Object.values(daysByStudent).filter(d => d >= 7).length

      // 3. SPED/504 students with DAEP incidents this school year
      let spedQuery = supabase
        .from('incidents')
        .select('student_id, students!inner(is_sped, is_504)')
        .eq('district_id', districtId)
        .in('consequence_type', ['daep', 'expulsion'])
        .gte('incident_date', schoolYearStart)
      spedQuery = applyCampusScope(spedQuery, scope)
      const { data: spedInc } = await spedQuery
      const spedStudentIds = new Set()
      ;(spedInc || []).forEach(inc => {
        if (inc.students?.is_sped || inc.students?.is_504) {
          spedStudentIds.add(inc.student_id)
        }
      })

      setRoiStats({
        blocked: blockedCount ?? 0,
        approaching: approachingCount,
        spedIncidents: spedStudentIds.size,
      })
      setRoiLoaded(true)
    }
    fetchRoi()
  }, [districtId, scopeLoading, scope])

  const roiTotal = roiStats.blocked + roiStats.approaching + roiStats.spedIncidents

  // ── District Impact Report PDF ─────────────────────────────────────────────
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const generateImpactReport = useCallback(async () => {
    if (!districtId) return
    setPdfGenerating(true)
    try {
      const schoolYearStart = getSchoolYearStart().toISOString()
      const districtName = district?.name || 'District'

      // Fetch metrics
      const [totalRes, blockedRes, alertsRes, approvedRes, ackRes, campusesRes, incidentsCampusRes] = await Promise.all([
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('district_id', districtId).gte('incident_date', schoolYearStart),
        supabase.from('compliance_checklists').select('id', { count: 'exact', head: true }).eq('district_id', districtId).eq('placement_blocked', true).gte('created_at', schoolYearStart),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('district_id', districtId).gte('created_at', schoolYearStart),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('district_id', districtId).eq('status', 'approved').gte('incident_date', schoolYearStart),
        supabase.from('notification_log').select('id', { count: 'exact', head: true }).eq('district_id', districtId).eq('channel', 'parent_ack').gte('created_at', schoolYearStart),
        supabase.from('campuses').select('id, name').eq('district_id', districtId),
        supabase.from('incidents').select('id, campus_id, consequence_type, students!inner(is_sped, is_504)').eq('district_id', districtId).gte('incident_date', schoolYearStart),
      ])

      const campuses = campusesRes.data || []
      const allInc = incidentsCampusRes.data || []

      // Per-campus breakdown
      const campusMap = {}
      campuses.forEach(c => { campusMap[c.id] = { name: c.name, total: 0, daep: 0, sped: 0 } })
      allInc.forEach(inc => {
        const entry = campusMap[inc.campus_id]
        if (!entry) return
        entry.total++
        if (inc.consequence_type === 'daep') entry.daep++
        if (inc.students?.is_sped || inc.students?.is_504) entry.sped++
      })

      // Build PDF
      const FERPA_NOTICE = 'CONFIDENTIAL \u2014 FERPA Protected Student Records \u2014 Authorized Personnel Only'
      const doc = new jsPDF()
      const pw = doc.internal.pageSize.width
      const ph = doc.internal.pageSize.height

      // FERPA banner
      doc.setFillColor(220, 38, 38)
      doc.rect(0, 0, pw, 8, 'F')
      doc.setFontSize(7)
      doc.setTextColor(255, 255, 255)
      doc.text(FERPA_NOTICE, pw / 2, 5.5, { align: 'center' })
      doc.setTextColor(0)

      // Title
      doc.setFontSize(18)
      doc.setFont(undefined, 'bold')
      doc.text('Waypoint \u2014 District Impact Report', 14, 20)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(11)
      doc.setTextColor(80)
      doc.text(`${districtName}  |  ${getSchoolYearLabel()} School Year  |  Generated ${new Date().toLocaleDateString()}`, 14, 28)
      doc.setTextColor(0)

      // Key metrics
      doc.setFontSize(13)
      doc.setFont(undefined, 'bold')
      doc.text('Key Metrics', 14, 40)
      doc.setFont(undefined, 'normal')
      const metrics = [
        ['Total Incidents', String(totalRes.count ?? 0)],
        ['SPED/504 Compliance Blocks', String(blockedRes.count ?? 0)],
        ['Alerts Triggered', String(alertsRes.count ?? 0)],
        ['Approved Placements', String(approvedRes.count ?? 0)],
        ['Parent Acknowledgments', String(ackRes.count ?? 0)],
      ]
      autoTable(doc, {
        startY: 44,
        head: [['Metric', 'Value']],
        body: metrics,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
      })

      // Per-campus breakdown
      const campusRows = Object.values(campusMap)
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .map(c => [c.name, String(c.total), String(c.daep), String(c.sped)])

      if (campusRows.length > 0) {
        const afterMetrics = doc.lastAutoTable?.finalY ?? 90
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        doc.text('Per-Campus Breakdown', 14, afterMetrics + 12)
        doc.setFont(undefined, 'normal')
        autoTable(doc, {
          startY: afterMetrics + 16,
          head: [['Campus', 'Total Incidents', 'DAEP', 'SPED/504']],
          body: campusRows,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          theme: 'grid',
        })
      }

      // Footer on every page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFillColor(31, 41, 55)
        doc.rect(0, ph - 14, pw, 14, 'F')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text('Generated by Waypoint \u2014 Campus Discipline Command Center  |  clearpathedgroup.com', pw / 2, ph - 7, { align: 'center' })
        doc.setFontSize(7)
        doc.text(`Page ${i} of ${pageCount}`, pw - 14, ph - 3, { align: 'right' })
        doc.setTextColor(0)
      }

      doc.save(`Waypoint_Impact_Report_${getSchoolYearLabel()}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setPdfGenerating(false)
    }
  }, [districtId, district])

  return (
    <div>
      <Topbar
        title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'User'}`}
        subtitle={`${ROLE_LABELS[profile?.role] || 'Staff'} \u2022 ${getSchoolYearLabel()} School Year`}
      />

      <div className="p-3 md:p-6">
        {/* Onboarding Checklist — admin only, shown at top for new districts */}
        {isAdmin && <SetupChecklist />}

        {/* Action Items — role-aware, shows what the user needs to do */}
        {actionItemsLoaded && actionTotal > 0 && (
          <div className="mb-6 bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Action Items</h2>
            <div className="space-y-2">
              {actionItems.pendingApproval > 0 && (
                <Link to="/incidents?status=pending_approval&myApprovals=1" className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors no-underline">
                  <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{actionItems.pendingApproval}</span>
                  <span className="text-sm font-medium text-gray-800">incident{actionItems.pendingApproval !== 1 ? 's' : ''} awaiting your approval</span>
                </Link>
              )}
              {actionItems.teacherDrafts > 0 && (
                <Link to="/incidents?status=draft" className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors no-underline">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{actionItems.teacherDrafts}</span>
                  <span className="text-sm font-medium text-gray-800">teacher referral{actionItems.teacherDrafts !== 1 ? 's' : ''} need consequence assignment</span>
                </Link>
              )}
              {actionItems.returned > 0 && (
                <Link to="/incidents?status=returned" className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg hover:bg-orange-100 transition-colors no-underline">
                  <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{actionItems.returned}</span>
                  <span className="text-sm font-medium text-gray-800">returned incident{actionItems.returned !== 1 ? 's' : ''} — update required</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Active Incidents"
            value={stats.incidents ?? '--'}
            description="Pending review"
            color="blue"
            href="/incidents"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
          <StatCard
            title="Compliance Holds"
            value={stats.holds ?? '--'}
            description="Awaiting completion"
            color="red"
            href="/compliance"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
          />
          <StatCard
            title="DAEP Approved"
            value={stats.daepApproved ?? '--'}
            description="Awaiting placement start"
            color="blue"
            href="/daep"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            }
          />
          <StatCard
            title="Active Alerts"
            value={alertCount}
            description={`${redCount} red, ${yellowCount} yellow`}
            color="yellow"
            href="/alerts"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            }
          />
          <StatCard
            title="Active Plans"
            value={stats.plans ?? '--'}
            description="Transition plans"
            color="green"
            href="/plans"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          />
        </div>

        {/* Compliance Protection ROI Widget — shown when any count > 0 */}
        {roiLoaded && roiTotal > 0 && (
          <div className="mb-6">
            <div className="border-l-4 border-green-500 bg-green-50 rounded-r-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide">Compliance Protection</h3>
                  <span className="text-xs text-green-600 font-medium">{getSchoolYearLabel()} School Year</span>
                </div>
                {isAdmin && (
                  <Link to="/compliance-dashboard" className="text-xs text-green-700 hover:text-green-900 font-medium">
                    View details &rarr;
                  </Link>
                )}
              </div>
              <div className="space-y-1.5">
                {roiStats.blocked > 0 && (
                  <p className="text-sm text-green-900 flex items-center gap-2">
                    <span className="text-base">&#x1F6E1;&#xFE0F;</span>
                    <span><strong>{roiStats.blocked}</strong> placement{roiStats.blocked !== 1 ? 's' : ''} blocked until compliance met</span>
                  </p>
                )}
                {roiStats.approaching > 0 && (
                  <p className="text-sm text-green-900 flex items-center gap-2">
                    <span className="text-base">&#x26A0;&#xFE0F;</span>
                    <span><strong>{roiStats.approaching}</strong> student{roiStats.approaching !== 1 ? 's' : ''} flagged at 7+ removal days</span>
                  </p>
                )}
                {roiStats.spedIncidents > 0 && (
                  <p className="text-sm text-green-900 flex items-center gap-2">
                    <span className="text-base">&#x1F4CB;</span>
                    <span><strong>{roiStats.spedIncidents}</strong> SPED/504 incident{roiStats.spedIncidents !== 1 ? 's' : ''} with auto-checklists</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-green-700 mt-3 italic">These protections are not available in your SIS.</p>
            </div>
          </div>
        )}

        {/* District Impact Report PDF — admin only */}
        {isAdmin && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={generateImpactReport}
              disabled={pdfGenerating}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {pdfGenerating ? 'Generating...' : 'District Impact Report'}
            </button>
          </div>
        )}

        {/* Role-specific quick-start guidance — non-admin staff only */}
        {!isAdmin && profile?.role && <StaffQuickStart role={profile.role} name={profile.full_name?.split(' ')[0]} />}

        {/* Referrals Needing Attention — denied or returned for corrections */}
        {needsAction.length > 0 && (
          <div className="mb-6">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <CardTitle>DAEP Referrals Needing Attention</CardTitle>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                    {needsAction.length}
                  </span>
                </div>
                <Link to="/incidents" className="text-xs text-orange-600 hover:text-orange-800">
                  View all incidents →
                </Link>
              </div>
              <div className="space-y-2">
                {needsAction.map(inc => {
                  const isDenied = inc.status === 'denied'
                  return (
                    <Link
                      key={inc.id}
                      to={`/incidents/${inc.id}`}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${
                        isDenied
                          ? 'border-red-200 bg-red-50 hover:bg-red-100'
                          : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {inc.student ? `${inc.student.first_name} ${inc.student.last_name}` : 'Unknown Student'}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isDenied ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {isDenied ? 'Denied' : 'Returned for Corrections'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {inc.offense?.title || 'DAEP Referral'} &bull; {formatDate(inc.incident_date)}
                        </p>
                        <p className="text-xs mt-1 font-medium" style={{ color: isDenied ? '#dc2626' : '#ea580c' }}>
                          {isDenied
                            ? 'This referral was denied. Open to review the decision.'
                            : 'An approver returned this for corrections. Open to review and resubmit.'}
                        </p>
                      </div>
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Pending Approvals Widget — only shown for approval-chain roles */}
        {isApprovalRole && (
          <div className="mb-6">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Pending Your Approval</CardTitle>
                {pendingApprovals.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold">
                    {pendingApprovals.length}
                  </span>
                )}
              </div>
              {pendingLoading ? (
                <p className="text-sm text-gray-400 py-2">Loading...</p>
              ) : pendingApprovals.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No items awaiting your approval.</p>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.map(inc => (
                    <Link
                      key={inc.id}
                      to={`/incidents/${inc.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-orange-700">
                          {inc.student ? `${inc.student.first_name} ${inc.student.last_name}` : 'Unknown Student'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(inc.incident_date)}</p>
                      </div>
                      <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Review</span>
                    </Link>
                  ))}
                  <Link
                    to="/incidents"
                    className="block text-center text-xs text-orange-600 hover:text-orange-800 pt-1"
                  >
                    View all pending →
                  </Link>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardTitle>Quick Actions</CardTitle>
            <div className="mt-4 space-y-2">
              <QuickAction
                label="Report New Incident"
                description="Document a discipline incident"
                href="/incidents/new"
              />
              <QuickAction
                label="Search Students"
                description="Look up student records"
                href="/students"
              />
              <QuickAction
                label="View Discipline Matrix"
                description="Check consequence guidelines"
                href="/matrix"
              />
              {isAdmin && (
                <QuickAction
                  label="Student Kiosk"
                  description="Open the student check-in kiosk"
                  href="/kiosk"
                  external
                />
              )}
            </div>
          </Card>

          {/* Recent Activity removed — incidents list provides this view */}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, description, color, icon, href }) {
  const colorClasses = {
    blue: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
  }

  const content = (
    <Card className={href ? 'hover:border-orange-300 hover:shadow-md transition-all cursor-pointer' : ''}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  )

  if (href) {
    return <Link to={href} className="block">{content}</Link>
  }
  return content
}

function QuickAction({ label, description, href, external }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors group"
      >
        <div>
          <p className="text-sm font-medium text-gray-900 group-hover:text-orange-600">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <svg className="h-4 w-4 text-gray-400 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    )
  }

  return (
    <Link
      to={href}
      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors group"
    >
      <div>
        <p className="text-sm font-medium text-gray-900 group-hover:text-orange-600">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <svg className="h-4 w-4 text-gray-400 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

const STAFF_GUIDANCE = {
  counselor: {
    color: 'blue',
    intro: 'As counselor, your focus is student support and reentry.',
    actions: [
      { label: 'Log a reentry check-in', desc: 'Record how a returned student is adjusting', href: '/plans' },
      { label: 'Review active alerts', desc: 'Check for students flagged for follow-up', href: '/alerts' },
      { label: 'View transition plans', desc: 'See students returning from DAEP this week', href: '/plans' },
    ],
  },
  teacher: {
    color: 'green',
    intro: 'As a teacher, you play a key role in welcoming students back and referring concerns.',
    actions: [
      { label: 'Submit a referral', desc: 'Log a behavioral concern for a student', href: '/incidents/new' },
      { label: 'View your students', desc: 'See students at your campus', href: '/students' },
      { label: 'Behavior kiosk', desc: 'Open the student daily check-in kiosk', href: '/kiosk' },
    ],
  },
  principal: {
    color: 'orange',
    intro: 'As principal, you approve DAEP referrals and oversee campus compliance.',
    actions: [
      { label: 'Pending your approval', desc: 'DAEP referrals awaiting your sign-off', href: '/incidents?status=pending_approval' },
      { label: 'Compliance holds', desc: 'Incidents blocked by SPED or 504 requirements', href: '/compliance' },
      { label: 'DAEP dashboard', desc: 'Active enrollments and orientation status', href: '/daep' },
    ],
  },
  ap: {
    color: 'orange',
    intro: 'As AP, you handle referrals and campus discipline.',
    actions: [
      { label: 'Submit an incident', desc: 'Start a new DAEP or OSS referral', href: '/incidents/new' },
      { label: 'Pending approvals', desc: 'Referrals waiting on your review', href: '/incidents?status=pending_approval' },
      { label: 'Active incidents', desc: 'All open referrals at your campus', href: '/incidents' },
    ],
  },
  sped_coordinator: {
    color: 'purple',
    intro: 'As SPED coordinator, you manage manifestation determinations and compliance timelines.',
    actions: [
      { label: 'Compliance holds', desc: 'SPED incidents blocked pending your action', href: '/compliance' },
      { label: 'Active alerts', desc: 'SPED-related flags requiring attention', href: '/alerts' },
      { label: 'Transition plans', desc: 'SPED students with active DAEP placements', href: '/plans' },
    ],
  },
  cbc: {
    color: 'teal',
    intro: 'As campus behavior coordinator, you facilitate referrals and student support.',
    actions: [
      { label: 'Submit an incident', desc: 'Log a new behavioral referral', href: '/incidents/new' },
      { label: 'Active incidents', desc: 'Open referrals at your campus', href: '/incidents' },
      { label: 'Student roster', desc: 'View and search all students', href: '/students' },
    ],
  },
  director_student_affairs: {
    color: 'orange',
    intro: 'As Director of Student Affairs, you oversee district-wide discipline and compliance.',
    actions: [
      { label: 'DAEP dashboard', desc: 'District-wide enrollment and operations', href: '/daep' },
      { label: 'Reports', desc: 'Disproportionality and recidivism analytics', href: '/reports' },
      { label: 'Compliance holds', desc: 'All open SPED/504 compliance items', href: '/compliance' },
    ],
  },
}

function StaffQuickStart({ role, name }) {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(`quickstart_dismissed_${role}`) === '1'
  )
  const config = STAFF_GUIDANCE[role]
  if (!config || dismissed) return null

  const colorMap = {
    blue:   { border: 'border-blue-700/30',   bg: 'bg-blue-900/20',   dot: 'bg-blue-500',   text: 'text-blue-400'   },
    green:  { border: 'border-green-700/30',  bg: 'bg-green-900/20',  dot: 'bg-green-500',  text: 'text-green-400'  },
    orange: { border: 'border-orange-700/30', bg: 'bg-orange-900/20', dot: 'bg-orange-500', text: 'text-orange-400' },
    purple: { border: 'border-purple-700/30', bg: 'bg-purple-900/20', dot: 'bg-purple-500', text: 'text-purple-400' },
    teal:   { border: 'border-teal-700/30',   bg: 'bg-teal-900/20',   dot: 'bg-teal-500',   text: 'text-teal-400'   },
  }
  const c = colorMap[config.color] || colorMap.orange

  return (
    <div className={`mb-6 rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${c.text} mb-0.5`}>Getting Started</p>
          <p className="text-sm text-gray-300">{name ? `${name}, ` : ''}{config.intro}</p>
        </div>
        <button
          onClick={() => { localStorage.setItem(`quickstart_dismissed_${role}`, '1'); setDismissed(true) }}
          className="text-gray-600 hover:text-gray-400 transition-colors ml-4 flex-shrink-0 text-xs"
        >
          Dismiss
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {config.actions.map(action => (
          <Link
            key={action.href}
            to={action.href}
            className="flex items-start gap-2 bg-gray-900/50 hover:bg-gray-900/80 border border-gray-800 rounded-lg p-3 transition-colors group"
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${c.dot}`} />
            <div>
              <p className="text-xs font-medium text-gray-200 group-hover:text-white">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
