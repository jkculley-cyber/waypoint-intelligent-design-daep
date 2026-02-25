import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import AlertBanner from '../components/ui/AlertBanner'
import { PageLoader } from '../components/ui/LoadingSpinner'
import StudentFlags from '../components/students/StudentFlags'
import ComplianceBlockBanner from '../components/compliance/ComplianceBlockBanner'
import ComplianceChecklist from '../components/compliance/ComplianceChecklist'
import PolicyMismatchBanner from '../components/incidents/PolicyMismatchBanner'
import ApprovalChainTracker from '../components/approvals/ApprovalChainTracker'
import PlacementScheduler from '../components/daep/PlacementScheduler'
import { useIncident, useIncidentActions } from '../hooks/useIncidents'
import { useSeparations, useStudentSearch } from '../hooks/useSeparations'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  formatStudentName,
  formatStudentNameShort,
  formatDate,
  formatDateTime,
  formatGradeLevel,
} from '../lib/utils'
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  CONSEQUENCE_TYPE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  OFFENSE_CATEGORY_LABELS,
  DAEP_DOCUMENT_LABELS,
} from '../lib/constants'

export default function IncidentDetailPage() {
  const { id } = useParams()
  const { incident, loading, refetch } = useIncident(id)
  const { approveIncident, activateIncident, completeIncident } = useIncidentActions()
  const { hasRole, profile, districtId } = useAuth()

  // Fetch check-in count for this placement — hooks must be before any early return
  const [daysServed, setDaysServed] = useState(0)
  useEffect(() => {
    if (!incident?.student?.id || !incident.consequence_start) return
    const fetchCount = async () => {
      let query = supabase
        .from('daily_behavior_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', incident.student.id)
        .gte('tracking_date', incident.consequence_start)
      if (incident.consequence_end) {
        query = query.lte('tracking_date', incident.consequence_end)
      }
      const { count } = await query
      setDaysServed(count || 0)
    }
    fetchCount()
  }, [incident?.student?.id, incident?.consequence_start, incident?.consequence_end])

  if (loading) return <PageLoader message="Loading incident..." />
  if (!incident) {
    return (
      <div>
        <Topbar title="Incident Not Found" />
        <div className="p-6 text-center text-gray-500">
          <p>This incident could not be found.</p>
          <Link to="/incidents" className="text-orange-600 hover:underline text-sm mt-2 inline-block">
            Back to Incidents
          </Link>
        </div>
      </div>
    )
  }

  const student = incident.student
  const offense = incident.offense
  const compliance = incident.compliance
  const isComplianceHold = incident.status === 'compliance_hold'
  const isDaep = incident.consequence_type === 'daep'
  const hasDaepChain = isDaep && incident.approval_chain_id
  const mdrRequired = incident.sped_compliance_required && isDaep
  const mdrCleared = incident.compliance_cleared
  const mdrBlocked = mdrRequired && !mdrCleared
  // For DAEP incidents with approval chain, don't show the single approve button — the chain handles it
  const canApprove = hasRole(['admin', 'principal', 'ap']) && incident.status === 'submitted' && !hasDaepChain
  const canActivate = hasRole(['admin', 'principal', 'ap']) && incident.status === 'approved' && !mdrBlocked
  const canComplete = hasRole(['admin', 'principal', 'ap']) && incident.status === 'active'

  const handleApprove = async () => {
    const { error } = await approveIncident(incident.id)
    if (error) {
      toast.error('Failed to approve incident')
    } else {
      toast.success('Incident approved')
      refetch()
    }
  }

  const handleActivate = async () => {
    if (mdrRequired && !mdrCleared) {
      toast.error('Cannot activate DAEP placement — MDR not complete')
      return
    }
    const { error } = await activateIncident(incident.id)
    if (error) {
      toast.error('Failed to activate incident')
    } else {
      toast.success('Consequence is now active')
      refetch()
    }
  }

  const handleComplete = async () => {
    const { error } = await completeIncident(incident.id)
    if (error) {
      toast.error('Failed to complete incident')
    } else {
      toast.success('Incident completed')
      refetch()
    }
  }

  return (
    <div>
      <Topbar
        title={`Incident — ${formatStudentNameShort(student)}`}
        subtitle={`${offense?.title || 'Unknown Offense'} | ${formatDate(incident.incident_date)}`}
        actions={
          <div className="flex items-center gap-2">
            {canApprove && (
              <Button size="sm" variant="success" onClick={handleApprove}>
                Approve
              </Button>
            )}
            {canActivate && (
              <Button size="sm" onClick={handleActivate}>
                Activate Consequence
              </Button>
            )}
            {canComplete && (
              <Button size="sm" variant="secondary" onClick={handleComplete}>
                Mark Complete
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Compliance Block Banner */}
        {isComplianceHold && (
          <ComplianceBlockBanner checklist={compliance} student={student} />
        )}

        {/* MDR Required Warning - show when approved but compliance not fully cleared */}
        {mdrBlocked && incident.status === 'approved' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">MDR Required Before DAEP Enrollment</p>
              <p className="text-sm text-amber-700 mt-1">
                This student is identified as {student?.is_sped ? 'SPED' : '504'}. A Manifestation Determination Review (MDR) must be completed
                before this student can be enrolled in DAEP. Complete the SPED compliance checklist below.
              </p>
            </div>
          </div>
        )}

        {/* Policy Mismatch Warning */}
        <PolicyMismatchBanner incident={incident} />

        {/* Status Banner */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Status:</span>
          <Badge
            color={INCIDENT_STATUS_COLORS[incident.status] || 'gray'}
            size="lg"
            dot
          >
            {INCIDENT_STATUS_LABELS[incident.status]}
          </Badge>
          {incident.sped_compliance_required && (
            <Badge color={incident.compliance_cleared ? 'green' : 'red'} size="lg">
              {incident.compliance_cleared ? 'Compliance Cleared' : 'SPED Compliance Required'}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details */}
            <Card>
              <CardTitle>Incident Details</CardTitle>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailRow label="Incident Date" value={formatDate(incident.incident_date)} />
                <DetailRow label="Incident Time" value={incident.incident_time || '—'} />
                <DetailRow label="Location" value={incident.location || '—'} />
                <DetailRow label="Reported By" value={incident.reporter?.full_name || '—'} />
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Description</dt>
                  <dd className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{incident.description}</dd>
                </div>
                {incident.notes && (
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Notes</dt>
                    <dd className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{incident.notes}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Offense Details */}
            <Card>
              <CardTitle>Offense</CardTitle>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium text-gray-900">{offense?.title}</span>
                  <Badge color={SEVERITY_COLORS[offense?.severity]} size="sm">
                    {SEVERITY_LABELS[offense?.severity]}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Code: {offense?.code}</p>
                  <p>Category: {OFFENSE_CATEGORY_LABELS[offense?.category] || offense?.category}</p>
                  {offense?.tec_reference && <p>TEC Reference: {offense.tec_reference}</p>}
                  {offense?.description && <p>{offense.description}</p>}
                </div>
              </div>
            </Card>

            {/* Consequence */}
            <Card>
              <CardTitle>Consequence</CardTitle>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <DetailRow
                  label="Type"
                  value={CONSEQUENCE_TYPE_LABELS[incident.consequence_type] || incident.consequence_type}
                />
                <DetailRow
                  label="Duration"
                  value={incident.consequence_days ? `${incident.consequence_days} days` : '—'}
                />
                <DetailRow label="Start Date" value={formatDate(incident.consequence_start)} />
                <DetailRow label="End Date" value={formatDate(incident.consequence_end)} />
                {incident.consequence_days && ['active', 'approved'].includes(incident.status) && (
                  (() => {
                    const remaining = Math.max(0, incident.consequence_days - daysServed)
                    return (
                      <DetailRow
                        label="Days Remaining"
                        value={remaining === 0 ? 'Completed' : `${remaining} days (${daysServed}/${incident.consequence_days} served)`}
                      />
                    )
                  })()
                )}
              </dl>
            </Card>

            {/* Compliance Checklist (if required) */}
            {incident.sped_compliance_required && compliance && (
              <ComplianceChecklist
                checklist={compliance}
                onUpdate={refetch}
              />
            )}

            {/* Separation Orders (staff only, FERPA-guarded) */}
            {profile?.role !== 'parent' && profile?.role !== 'student' && (
              <SeparationOrdersSection
                incidentId={incident.id}
                districtId={districtId}
              />
            )}
          </div>

          {/* Sidebar - Right 1/3 */}
          <div className="space-y-6">
            {/* DAEP Approval Chain */}
            {hasDaepChain && (
              <ApprovalChainTracker incidentId={incident.id} onUpdate={refetch} />
            )}

            {/* Referral Documents */}
            {incident.attachments?.length > 0 && (
              <ReferralDocuments attachments={incident.attachments} />
            )}

            {/* Placement Scheduling */}
            {incident.status === 'approved' && isDaep && (
              <PlacementScheduler incidentId={incident.id} incident={incident} student={student} />
            )}

            {/* Student Card */}
            <Card>
              <CardTitle>Student</CardTitle>
              <div className="mt-4 space-y-3">
                <Link
                  to={`/students/${student?.id}`}
                  className="text-base font-medium text-orange-600 hover:text-orange-700 hover:underline"
                >
                  {formatStudentName(student)}
                </Link>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>ID: {student?.student_id_number}</p>
                  <p>Grade: {formatGradeLevel(student?.grade_level)}</p>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-1">Special Populations:</p>
                  <StudentFlags student={student} />
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <CardTitle>Timeline</CardTitle>
              <div className="mt-4 space-y-0">
                <TimelineItem
                  label="Created"
                  value={formatDateTime(incident.created_at)}
                  active
                />
                {incident.status !== 'draft' && (
                  <TimelineItem
                    label="Submitted"
                    value={formatDateTime(incident.created_at)}
                    active
                  />
                )}
                {isComplianceHold && (
                  <TimelineItem
                    label="Compliance Hold"
                    value="Awaiting SPED compliance"
                    active
                    variant="warning"
                  />
                )}
                {incident.status === 'pending_approval' && (
                  <TimelineItem
                    label="Pending Approval"
                    value="DAEP approval chain in progress"
                    active
                    variant="warning"
                  />
                )}
                {incident.status === 'denied' && (
                  <TimelineItem
                    label="Denied"
                    value="DAEP placement denied"
                    active
                    variant="danger"
                  />
                )}
                {incident.status === 'returned' && (
                  <TimelineItem
                    label="Returned"
                    value="Returned for revision"
                    active
                    variant="warning"
                  />
                )}
                {incident.reviewed_at && (
                  <TimelineItem
                    label="Reviewed"
                    value={`${formatDateTime(incident.reviewed_at)} by ${incident.reviewer?.full_name || 'Unknown'}`}
                    active
                  />
                )}
                {incident.status === 'active' && (
                  <TimelineItem
                    label="Active"
                    value={`Consequence in effect`}
                    active
                    variant="info"
                  />
                )}
                {incident.status === 'completed' && (
                  <TimelineItem
                    label="Completed"
                    value="Consequence served"
                    active
                    variant="success"
                  />
                )}
              </div>
            </Card>

            {/* PEIMS Info */}
            <Card>
              <CardTitle>PEIMS</CardTitle>
              <dl className="mt-4 space-y-2">
                <DetailRow label="Action Code" value={incident.peims_action_code || '—'} />
                <DetailRow
                  label="Reported"
                  value={
                    incident.peims_reported ? (
                      <Badge color="green" size="sm">Yes</Badge>
                    ) : (
                      <Badge color="gray" size="sm">No</Badge>
                    )
                  }
                />
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// =================== SEPARATION ORDERS ===================

function SeparationOrdersSection({ incidentId, districtId }) {
  const { separations, loading, addSeparation, removeSeparation } = useSeparations(incidentId)
  const [modalOpen, setModalOpen] = useState(false)
  const [removing, setRemoving] = useState(null)

  const handleRemove = async (id) => {
    setRemoving(id)
    const { error } = await removeSeparation(id)
    if (error) toast.error('Failed to remove separation order')
    setRemoving(null)
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <CardTitle>Separation Orders</CardTitle>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
          Add Separation Order
        </Button>
      </div>

      <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
        <svg className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-orange-700">
          <span className="font-semibold">FERPA:</span> This information is visible to district staff only and is never shared with parents or students.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
      ) : separations.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No separation orders on file.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {separations.map(sep => {
            const s = Array.isArray(sep.other_student) ? sep.other_student[0] : sep.other_student
            const campus = Array.isArray(s?.campus) ? s.campus[0] : s?.campus
            return (
              <div key={sep.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {s ? `${s.last_name}, ${s.first_name}` : '—'}
                    {s?.student_id_number && (
                      <span className="ml-2 text-xs text-gray-500">#{s.student_id_number}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Grade {s?.grade_level ?? '—'} — {campus?.name || '—'}
                  </p>
                  {sep.notes && (
                    <p className="text-xs text-gray-600 mt-1 italic">{sep.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(sep.id)}
                  disabled={removing === sep.id}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {removing === sep.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <SeparationSearchModal
          districtId={districtId}
          onClose={() => setModalOpen(false)}
          onSave={async (studentId, notes) => {
            const { error } = await addSeparation(studentId, notes)
            if (error) {
              toast.error('Failed to add separation order')
            } else {
              toast.success('Separation order added')
              setModalOpen(false)
            }
          }}
        />
      )}
    </Card>
  )
}

function SeparationSearchModal({ districtId, onClose, onSave }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { results, loading: searching } = useStudentSearch(query, districtId)

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    await onSave(selected.id, notes)
    setSaving(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Separation Order"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selected}
            loading={saving}
          >
            Save Separation Order
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Student by Name or ID
          </label>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            placeholder="e.g. Smith or 10234..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {query.length >= 2 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {searching && (
              <p className="text-sm text-gray-400 text-center py-3">Searching...</p>
            )}
            {!searching && results.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No students found.</p>
            )}
            {!searching && results.map(s => {
              const campus = Array.isArray(s.campus) ? s.campus[0] : s.campus
              const isSelected = selected?.id === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                    isSelected ? 'bg-orange-50 text-orange-900' : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <span className="font-medium">{s.last_name}, {s.first_name}</span>
                  <span className="text-gray-500 ml-2 text-xs">
                    #{s.student_id_number} — Gr {s.grade_level ?? '—'} — {campus?.name || '—'}
                  </span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-orange-500 inline ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {selected && (
          <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
            Selected: <span className="font-medium">{selected.last_name}, {selected.first_name}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Do not allow contact in hallways or common areas."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <p className="text-xs text-gray-400">
          FERPA Notice: Separation orders are visible to district staff only and will never be shared with parents or students.
        </p>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">{typeof value === 'string' ? value || '—' : value}</dd>
    </div>
  )
}

function TimelineItem({ label, value, active, variant = 'default' }) {
  const dotColors = {
    default: 'bg-orange-500',
    warning: 'bg-yellow-500',
    info: 'bg-orange-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
  }

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${active ? dotColors[variant] : 'bg-gray-300'}`} />
        <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
      </div>
      <div className="pb-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{value}</p>
      </div>
    </div>
  )
}

function ReferralDocuments({ attachments }) {
  const handleView = async (storagePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('daep-documents')
        .createSignedUrl(storagePath, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error creating signed URL:', err)
    }
  }

  return (
    <Card>
      <CardTitle>Referral Documents</CardTitle>
      <div className="mt-3 space-y-2">
        {attachments.map((doc, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div>
                <p className="text-sm text-gray-900">{DAEP_DOCUMENT_LABELS[doc.type] || doc.type}</p>
                <p className="text-xs text-gray-500">{doc.filename}</p>
              </div>
            </div>
            <button
              onClick={() => handleView(doc.storage_path)}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}
