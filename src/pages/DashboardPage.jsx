import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useAccessScope } from '../hooks/useAccessScope'
import { applyCampusScope } from '../lib/accessControl'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import { ROLE_LABELS, ROLES } from '../lib/constants'
import { getSchoolYearLabel } from '../lib/utils'

export default function DashboardPage() {
  const { profile, hasRole, districtId } = useAuth()
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

  return (
    <div>
      <Topbar
        title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'User'}`}
        subtitle={`${ROLE_LABELS[profile?.role] || 'Staff'} \u2022 ${getSchoolYearLabel()} School Year`}
      />

      <div className="p-6">
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

          <Card>
            <CardTitle>Recent Activity</CardTitle>
            <div className="mt-4 text-sm text-gray-500 text-center py-8">
              <p>No recent activity to display.</p>
              <p className="text-xs mt-1">Activity will appear here once incidents are created.</p>
            </div>
          </Card>
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
