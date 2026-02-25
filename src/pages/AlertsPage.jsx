import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { SelectField } from '../components/ui/FormField'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/LoadingSpinner'
import AlertCard from '../components/alerts/AlertCard'
import { useAlerts } from '../hooks/useAlerts'
import { useSeparationOrdersSummary } from '../hooks/useSeparations'
import { useCampuses } from '../hooks/useCampuses'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from '../hooks/useAccessScope'
import { ALERT_TRIGGER_LABELS, INCIDENT_STATUS_LABELS } from '../lib/constants'
import { exportToPdf, exportToExcel } from '../lib/exportUtils'
import { formatStudentName, formatDate } from '../lib/utils'

// =================== SEPARATION ORDERS HOT BOX ===================

function SeparationOrdersHotBox() {
  const { grouped, studentCount, loading } = useSeparationOrdersSummary()
  const navigate = useNavigate()

  if (loading || grouped.length === 0) return null

  return (
    <div className="rounded-xl border border-orange-300 overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <div>
            <span className="text-sm font-semibold text-orange-900">
              Separation Orders
            </span>
            <Badge color="orange" size="sm" className="ml-2">{studentCount} student{studentCount !== 1 ? 's' : ''}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-orange-600 bg-orange-100 border border-orange-200 rounded px-2 py-0.5 font-medium">
            🔒 FERPA — Staff Only
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b border-orange-100">
              <th className="px-4 py-2">Placed Student</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Campus</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Must Be Kept Away From</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50">
            {grouped.map(({ incident, separations }) => {
              const student = Array.isArray(incident.student) ? incident.student[0] : incident.student
              const campus = Array.isArray(incident.campus) ? incident.campus[0] : incident.campus
              return (
                <tr
                  key={incident.id}
                  className="hover:bg-orange-50 cursor-pointer"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {student ? `${student.last_name}, ${student.first_name}` : '—'}
                    {(student?.is_sped || student?.is_504) && (
                      <Badge color={student.is_sped ? 'purple' : 'blue'} size="sm" className="ml-1.5">
                        {student.is_sped ? 'SPED' : '504'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {student?.student_id_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {campus?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={
                      incident.status === 'active' ? 'indigo' :
                      incident.status === 'approved' ? 'blue' :
                      incident.status === 'pending_approval' ? 'yellow' :
                      'gray'
                    } size="sm">
                      {INCIDENT_STATUS_LABELS[incident.status] || incident.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {separations.map(sep => {
                        const other = sep.other_student
                        return other ? (
                          <span
                            key={sep.id}
                            className="inline-flex items-center text-xs bg-red-50 border border-red-200 text-red-700 rounded px-1.5 py-0.5"
                            title={sep.notes || ''}
                          >
                            {other.last_name}, {other.first_name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-orange-600 hover:text-orange-800 font-medium">
                      View / Edit →
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// =================== MAIN PAGE ===================

export default function AlertsPage() {
  const [levelFilter, setLevelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')
  const { profile } = useAuth()
  const { scope } = useAccessScope()

  const filters = useMemo(() => {
    const f = {}
    if (!scope.isDistrictWide && scope.scopedCampusIds?.length) {
      f._campusScope = scope.scopedCampusIds
    }
    if (scope.spedOnly) f._spedOnly = true
    if (levelFilter) f.alert_level = levelFilter
    if (statusFilter) f.status = statusFilter
    if (campusFilter) f.campus_id = campusFilter
    if (triggerFilter) f.trigger_type = triggerFilter
    return f
  }, [levelFilter, statusFilter, campusFilter, triggerFilter, scope])

  const { alerts, loading, refetch } = useAlerts(filters)
  const { campuses } = useCampuses()
  const { redCount, yellowCount, refreshCounts } = useNotifications()

  const handleUpdate = () => {
    refetch()
    refreshCounts()
  }

  const exportHeaders = ['Student', 'Alert Level', 'Trigger', 'Status', 'Date']

  const buildExportRows = useCallback(() => {
    return alerts.map(a => [
      a.student ? formatStudentName(a.student) : '—',
      a.alert_level === 'red' ? 'Red' : 'Yellow',
      ALERT_TRIGGER_LABELS[a.trigger_type] || a.trigger_type,
      a.status,
      formatDate(a.created_at),
    ])
  }, [alerts])

  const handleExportPdf = useCallback(() => {
    exportToPdf('Repeat Offender Alerts', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  const handleExportExcel = useCallback(() => {
    exportToExcel('Repeat Offender Alerts', exportHeaders, buildExportRows(), {
      generatedBy: profile?.full_name,
    })
  }, [buildExportRows, profile])

  // Stats
  const activeAlerts = alerts.filter(a => ['active', 'acknowledged', 'in_progress'].includes(a.status))
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' || a.status === 'dismissed')

  if (loading) return <PageLoader message="Loading alerts..." />

  return (
    <div>
      <Topbar
        title="Repeat Offender Alerts"
        subtitle={`${activeAlerts.length} active alert${activeAlerts.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-1.5">
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export PDF">
              PDF
            </button>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" title="Export Excel">
              Excel
            </button>
          </div>
        }
      />

      <div className="p-3 md:p-6">
        {/* Separation Orders Hot Box */}
        <SeparationOrdersHotBox />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Red Flags</p>
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{redCount}</p>
            <p className="text-xs text-red-600 mt-0.5">2nd DAEP or 3+ ISS in 30 days</p>
          </div>
          <div className="p-4 rounded-xl border bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Yellow Flags</p>
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{yellowCount}</p>
            <p className="text-xs text-yellow-600 mt-0.5">Same offense 3+ or 5+ referrals</p>
          </div>
          <div className="p-4 rounded-xl border bg-orange-50 border-orange-200">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">
              {alerts.filter(a => a.status === 'in_progress').length}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">Being reviewed by team</p>
          </div>
          <div className="p-4 rounded-xl border bg-green-50 border-green-200">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{resolvedAlerts.length}</p>
            <p className="text-xs text-green-600 mt-0.5">Resolved this period</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectField
              label="Alert Level"
              name="level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              options={[
                { value: 'red', label: 'Red Flags' },
                { value: 'yellow', label: 'Yellow Flags' },
              ]}
              placeholder="All Levels"
            />
            <SelectField
              label="Status"
              name="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: 'New' },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'dismissed', label: 'Dismissed' },
              ]}
              placeholder="All Statuses"
            />
            <SelectField
              label="Campus"
              name="campus"
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              options={
                scope.isDistrictWide
                  ? campuses.map(c => ({ value: c.id, label: c.name }))
                  : campuses.filter(c => scope.scopedCampusIds?.includes(c.id)).map(c => ({ value: c.id, label: c.name }))
              }
              placeholder={scope.isDistrictWide ? 'All Campuses' : 'My Campus'}
            />
            <SelectField
              label="Trigger Type"
              name="trigger"
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              options={Object.entries(ALERT_TRIGGER_LABELS).map(([val, label]) => ({ value: val, label }))}
              placeholder="All Triggers"
            />
          </div>
        </Card>

        {/* Alert List */}
        {alerts.length === 0 ? (
          <EmptyState
            title="No Alerts"
            message="No repeat offender alerts match your current filters. Alerts are automatically generated when students meet trigger conditions."
          />
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
