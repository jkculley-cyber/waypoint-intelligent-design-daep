import { useState } from 'react'
import toast from 'react-hot-toast'
import Card, { CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useApprovalChain, useApprovalChainActions } from '../../hooks/useApprovalChain'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../lib/utils'
import { APPROVAL_STEP_STATUS } from '../../lib/constants'

export default function ApprovalChainTracker({ incidentId, onUpdate }) {
  const { chain, steps, loading, refetch } = useApprovalChain(incidentId)
  const { approveStep, denyStep, returnStep, resubmitChain, loading: actionLoading } = useApprovalChainActions()
  const { profile } = useAuth()

  const [modalType, setModalType] = useState(null) // 'deny' | 'return' | 'approve'
  const [modalStepId, setModalStepId] = useState(null)
  const [comments, setComments] = useState('')

  if (loading) {
    return (
      <Card>
        <CardTitle>DAEP Approval Chain</CardTitle>
        <div className="mt-4 flex items-center justify-center py-8 text-gray-400 text-sm">
          Loading approval chain...
        </div>
      </Card>
    )
  }

  if (!chain) return null

  const handleApprove = (stepId) => {
    setModalType('approve')
    setModalStepId(stepId)
    setComments('')
  }

  const handleDeny = (stepId) => {
    setModalType('deny')
    setModalStepId(stepId)
    setComments('')
  }

  const handleReturn = (stepId) => {
    setModalType('return')
    setModalStepId(stepId)
    setComments('')
  }

  const handleModalConfirm = async () => {
    if ((modalType === 'deny' || modalType === 'return') && !comments.trim()) {
      toast.error('Please provide a reason')
      return
    }

    let result
    if (modalType === 'approve') {
      result = await approveStep(modalStepId, comments.trim() || null)
    } else if (modalType === 'deny') {
      result = await denyStep(modalStepId, comments.trim())
    } else if (modalType === 'return') {
      result = await returnStep(modalStepId, comments.trim())
    }

    if (result?.error) {
      toast.error(`Failed to ${modalType} step: ${result.error.message}`)
    } else {
      const labels = { approve: 'Step approved', deny: 'DAEP referral denied', return: 'Returned to submitter' }
      toast.success(labels[modalType])
      setModalType(null)
      refetch()
      onUpdate?.()
    }
  }

  const handleResubmit = async () => {
    const { error } = await resubmitChain(chain.id)
    if (error) {
      toast.error(`Failed to resubmit: ${error.message}`)
    } else {
      toast.success('Referral resubmitted for approval')
      refetch()
      onUpdate?.()
    }
  }

  const canResubmit = chain.chain_status === 'returned' && chain.submitted_by === profile?.id
  const userRole = profile?.role

  const modalTitles = {
    approve: 'Approve Step',
    deny: 'Deny DAEP Referral',
    return: 'Return to Submitter',
  }

  const modalDescriptions = {
    approve: 'Add optional comments for this approval.',
    deny: 'This will stop the DAEP placement process. Please provide a reason.',
    return: 'This will reset all approvals and return the referral to the original submitter. Please provide a reason.',
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>DAEP Approval Chain</CardTitle>
          <Badge
            color={
              chain.chain_status === 'approved' ? 'green' :
              chain.chain_status === 'denied' ? 'red' :
              chain.chain_status === 'returned' ? 'orange' :
              'yellow'
            }
            size="sm"
          >
            {chain.chain_status === 'in_progress' ? 'In Progress' :
             chain.chain_status.charAt(0).toUpperCase() + chain.chain_status.slice(1)}
          </Badge>
        </div>

        <div className="mt-5 relative">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              isCurrentUserStep={step.status === APPROVAL_STEP_STATUS.WAITING && userRole === step.step_role}
              onApprove={() => handleApprove(step.id)}
              onDeny={() => handleDeny(step.id)}
              onReturn={() => handleReturn(step.id)}
            />
          ))}
        </div>

        {/* Denial info */}
        {chain.chain_status === 'denied' && chain.denied_reason && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800">Denied</p>
            <p className="text-sm text-red-700 mt-1">{chain.denied_reason}</p>
          </div>
        )}

        {/* Return info + resubmit */}
        {chain.chain_status === 'returned' && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm font-medium text-orange-800">Returned for Revision</p>
            {chain.return_reason && (
              <p className="text-sm text-orange-700 mt-1">{chain.return_reason}</p>
            )}
            {canResubmit && (
              <div className="mt-3">
                <Button size="sm" variant="primary" onClick={handleResubmit} loading={actionLoading}>
                  Resubmit for Approval
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Action Modal */}
      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={modalTitles[modalType]}
        description={modalDescriptions[modalType]}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant={modalType === 'deny' ? 'danger' : modalType === 'return' ? 'warning' : 'success'}
              onClick={handleModalConfirm}
              loading={actionLoading}
            >
              {modalType === 'approve' ? 'Approve' : modalType === 'deny' ? 'Deny' : 'Return'}
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {modalType === 'approve' ? 'Comments (optional)' : 'Reason (required)'}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder={
              modalType === 'approve' ? 'Optional comments...' :
              modalType === 'deny' ? 'Reason for denial...' :
              'Reason for returning...'
            }
          />
        </div>
      </Modal>
    </>
  )
}

function StepRow({ step, isLast, isCurrentUserStep, onApprove, onDeny, onReturn }) {
  const { status } = step

  const getStepIcon = () => {
    switch (status) {
      case APPROVAL_STEP_STATUS.APPROVED:
        return (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case APPROVAL_STEP_STATUS.WAITING:
        return (
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
        )
      case APPROVAL_STEP_STATUS.DENIED:
        return (
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case APPROVAL_STEP_STATUS.RETURNED:
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </div>
        )
      case APPROVAL_STEP_STATUS.SKIPPED:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs text-gray-400 font-medium">N/A</span>
          </div>
        )
      default: // pending
        return (
          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-400">{step.step_order}</span>
          </div>
        )
    }
  }

  const getStepLabel = () => {
    switch (status) {
      case APPROVAL_STEP_STATUS.APPROVED:
        return (
          <span className="text-green-700">
            Approved by {step.actor?.full_name || 'Unknown'}
          </span>
        )
      case APPROVAL_STEP_STATUS.WAITING:
        return <span className="text-orange-700 font-medium">Awaiting {step.step_label}</span>
      case APPROVAL_STEP_STATUS.DENIED:
        return <span className="text-red-700">Denied by {step.actor?.full_name || 'Unknown'}</span>
      case APPROVAL_STEP_STATUS.RETURNED:
        return <span className="text-yellow-700">Returned by {step.actor?.full_name || 'Unknown'}</span>
      case APPROVAL_STEP_STATUS.SKIPPED:
        return <span className="text-gray-400 line-through">{step.step_label} — N/A</span>
      default:
        return <span className="text-gray-500">{step.step_label}</span>
    }
  }

  return (
    <div className="flex gap-3 pb-1">
      {/* Icon + connector line */}
      <div className="flex flex-col items-center">
        {getStepIcon()}
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1 min-h-[16px]" />}
      </div>

      {/* Content */}
      <div className={`pb-4 flex-1 ${isLast ? '' : ''}`}>
        <p className="text-sm font-medium leading-8">{step.step_label}</p>
        <p className="text-xs mt-0.5">{getStepLabel()}</p>

        {step.acted_at && (
          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(step.acted_at)}</p>
        )}

        {step.comments && (
          <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1 italic">
            &ldquo;{step.comments}&rdquo;
          </p>
        )}

        {/* Action buttons for current user's step */}
        {isCurrentUserStep && (
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="success" onClick={onApprove}>
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={onDeny}>
              Deny
            </Button>
            <Button size="sm" variant="warning" onClick={onReturn}>
              Send Back
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
