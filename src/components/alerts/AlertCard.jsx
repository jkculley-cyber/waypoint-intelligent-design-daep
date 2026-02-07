import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import FormField from '../ui/FormField'
import { StudentFlagsSummary } from '../students/StudentFlags'
import AlertActionChecklist from './AlertActionChecklist'
import { useAlertActions } from '../../hooks/useAlerts'
import {
  formatStudentName,
  formatDate,
  formatDateTime,
  formatTimeAgo,
  formatGradeLevel,
} from '../../lib/utils'
import {
  ALERT_LEVEL_LABELS,
  ALERT_TRIGGER_LABELS,
} from '../../lib/constants'

export default function AlertCard({ alert, onUpdate, expanded = false }) {
  const [isExpanded, setIsExpanded] = useState(expanded)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolving, setResolving] = useState(false)
  const { acknowledgeAlert, startProgress, resolveAlert, dismissAlert } = useAlertActions()

  const isActive = alert.status === 'active'
  const isAcknowledged = alert.status === 'acknowledged'
  const isInProgress = alert.status === 'in_progress'
  const isResolved = alert.status === 'resolved' || alert.status === 'dismissed'
  const isRed = alert.alert_level === 'red'

  const borderColor = isRed ? 'border-l-red-500' : 'border-l-yellow-500'
  const bgColor = isResolved ? 'bg-gray-50' : isRed ? 'bg-red-50/30' : 'bg-yellow-50/30'

  const handleAcknowledge = async () => {
    const { error } = await acknowledgeAlert(alert.id)
    if (error) {
      toast.error('Failed to acknowledge alert')
    } else {
      toast.success('Alert acknowledged')
      onUpdate?.()
    }
  }

  const handleStartProgress = async () => {
    const { error } = await startProgress(alert.id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Alert marked as in progress')
      onUpdate?.()
    }
  }

  const handleResolve = async () => {
    setResolving(true)
    const { error } = await resolveAlert(alert.id, resolutionNotes)
    if (error) {
      toast.error('Failed to resolve alert')
    } else {
      toast.success('Alert resolved')
      setResolveModalOpen(false)
      onUpdate?.()
    }
    setResolving(false)
  }

  const handleDismiss = async () => {
    setResolving(true)
    const { error } = await dismissAlert(alert.id, resolutionNotes)
    if (error) {
      toast.error('Failed to dismiss alert')
    } else {
      toast.success('Alert dismissed')
      setResolveModalOpen(false)
      onUpdate?.()
    }
    setResolving(false)
  }

  const statusBadge = () => {
    const map = {
      active: { color: 'red', label: 'New' },
      acknowledged: { color: 'yellow', label: 'Acknowledged' },
      in_progress: { color: 'blue', label: 'In Progress' },
      resolved: { color: 'green', label: 'Resolved' },
      dismissed: { color: 'gray', label: 'Dismissed' },
    }
    const s = map[alert.status] || map.active
    return <Badge color={s.color} size="sm" dot>{s.label}</Badge>
  }

  return (
    <>
      <Card padding={false} className={`border-l-4 ${borderColor} ${bgColor}`}>
        {/* Header */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {/* Alert level icon */}
              <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${
                isRed ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {isRed ? (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={isRed ? 'red' : 'yellow'} size="sm">
                    {ALERT_LEVEL_LABELS[alert.alert_level]}
                  </Badge>
                  {statusBadge()}
                  <span className="text-xs text-gray-400">{formatTimeAgo(alert.created_at)}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {alert.trigger_description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Link
                    to={`/students/${alert.student?.id}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {formatStudentName(alert.student)}
                  </Link>
                  <span className="text-xs text-gray-400">
                    Grade {formatGradeLevel(alert.student?.grade_level)} | {alert.campus?.name}
                  </span>
                </div>
                <div className="mt-1">
                  <StudentFlagsSummary student={alert.student} />
                </div>
              </div>
            </div>

            {/* Expand button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Action buttons (when not expanded) */}
          {!isExpanded && !isResolved && (
            <div className="flex items-center gap-2 mt-3 ml-11">
              {isActive && (
                <Button size="sm" variant="secondary" onClick={handleAcknowledge}>
                  Acknowledge
                </Button>
              )}
              {isAcknowledged && (
                <Button size="sm" onClick={handleStartProgress}>
                  Start Review
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(true)}
              >
                View Details
              </Button>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-5 pb-5 border-t border-gray-200/60 pt-4 space-y-4">
            {/* Trigger details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Trigger</h4>
              <p className="text-sm text-gray-600">
                {ALERT_TRIGGER_LABELS[alert.trigger_type] || alert.trigger_type}
              </p>
            </div>

            {/* Suggested interventions */}
            {alert.suggested_interventions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggested Interventions</h4>
                <div className="flex flex-wrap gap-2">
                  {alert.suggested_interventions.map((intervention, i) => (
                    <Badge key={i} color="blue" size="md">{intervention}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action checklist */}
            <AlertActionChecklist alert={alert} onUpdate={onUpdate} />

            {/* Resolution info */}
            {isResolved && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {alert.status === 'resolved' ? 'Resolved' : 'Dismissed'} by {alert.resolved_by_profile?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(alert.resolved_at)}
                </p>
                {alert.resolution_notes && (
                  <p className="text-sm text-gray-600 mt-2">{alert.resolution_notes}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {!isResolved && (
              <div className="flex items-center gap-2 pt-2">
                {isActive && (
                  <Button size="sm" variant="secondary" onClick={handleAcknowledge}>
                    Acknowledge
                  </Button>
                )}
                {isAcknowledged && (
                  <Button size="sm" onClick={handleStartProgress}>
                    Start Review
                  </Button>
                )}
                {(isAcknowledged || isInProgress) && (
                  <Button size="sm" variant="success" onClick={() => setResolveModalOpen(true)}>
                    Resolve
                  </Button>
                )}
                {!isResolved && (
                  <Button size="sm" variant="ghost" onClick={() => setResolveModalOpen(true)}>
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Resolve/Dismiss Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Alert"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveModalOpen(false)} disabled={resolving}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={handleDismiss} loading={resolving}>
              Dismiss
            </Button>
            <Button variant="success" onClick={handleResolve} loading={resolving}>
              Resolve
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Document the actions taken and outcome for this alert.
          </p>
          <FormField
            label="Resolution Notes"
            name="resolution_notes"
            type="textarea"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Describe what actions were taken and the outcome..."
          />
        </div>
      </Modal>
    </>
  )
}
