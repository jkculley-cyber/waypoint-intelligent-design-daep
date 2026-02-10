import { useState, useMemo, useCallback } from 'react'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { SelectField } from '../components/ui/FormField'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/LoadingSpinner'
import AlertCard from '../components/alerts/AlertCard'
import { useAlerts } from '../hooks/useAlerts'
import { useCampuses } from '../hooks/useCampuses'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { ALERT_TRIGGER_LABELS } from '../lib/constants'
import { exportToPdf, exportToExcel } from '../lib/exportUtils'
import { formatStudentName, formatDate } from '../lib/utils'

export default function AlertsPage() {
  const [levelFilter, setLevelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [campusFilter, setCampusFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')
  const { profile } = useAuth()

  const filters = useMemo(() => {
    const f = {}
    if (levelFilter) f.alert_level = levelFilter
    if (statusFilter) f.status = statusFilter
    if (campusFilter) f.campus_id = campusFilter
    if (triggerFilter) f.trigger_type = triggerFilter
    return f
  }, [levelFilter, statusFilter, campusFilter, triggerFilter])

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

      <div className="p-6">
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
              options={campuses.map(c => ({ value: c.id, label: c.name }))}
              placeholder="All Campuses"
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
