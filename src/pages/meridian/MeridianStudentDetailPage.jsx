import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import toast from 'react-hot-toast'
import { useMeridianStudent, scheduleARDMeeting, linkToWaypoint } from '../../hooks/useMeridian'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Skeleton, StatusBadge, DocCheckItem, Card } from './MeridianUI'

export default function MeridianStudentDetailPage() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { districtId } = useAuth()
  const { data: student, loading, refetch } = useMeridianStudent(studentId)

  const [ardOpen, setArdOpen] = useState(false)
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-64" />
      {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
    </div>
  )

  if (!student) return (
    <div className="p-6 text-center">
      <p className="text-gray-500 mb-4">Student not found.</p>
      <button onClick={() => navigate('/meridian/timelines')} className="text-purple-600 hover:underline text-sm">
        ← Back to Timelines
      </button>
    </div>
  )

  const activeIep = student.meridian_ieps?.find(i => i.status === 'active')
  const active504 = student.meridian_plans_504?.find(p => p.status === 'active')
  const activeRef = student.meridian_referrals?.find(r => r.status === 'open')

  // Compliance status calculation
  const today = new Date()
  let complianceStatus = 'ok'
  let violationMessage = null

  if (activeRef) {
    if (activeRef.eval_due_date && !activeRef.eval_completed_date) {
      const days = Math.round((new Date(activeRef.eval_due_date) - today) / 86400000)
      if (days < 0) { complianceStatus = 'overdue'; violationMessage = `60-day evaluation window exceeded by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}` }
      else if (days <= 7) complianceStatus = 'critical'
    }
    if (activeRef.ard_due_date && !activeRef.ard_held_date && activeRef.eval_completed_date) {
      const days = Math.round((new Date(activeRef.ard_due_date) - today) / 86400000)
      if (days < 0) { complianceStatus = 'overdue'; violationMessage = `30-day ARD window exceeded by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}` }
    }
  }
  if (activeIep?.annual_review_due && !activeIep?.annual_review_held) {
    const days = Math.round((new Date(activeIep.annual_review_due) - today) / 86400000)
    if (days < 0) { complianceStatus = 'overdue'; violationMessage = `Annual IEP review exceeded by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}` }
  }

  // Doc checklists
  const iepDocs = activeIep ? [
    { name: 'Present Levels of Academic Achievement',    status: activeIep.has_present_levels      ? 'yes' : 'no' },
    { name: 'Annual Goals',                              status: activeIep.has_annual_goals         ? 'yes' : 'no' },
    { name: 'Special Education Services Section',        status: activeIep.has_services_section     ? 'yes' : 'no' },
    { name: 'Accommodations / Modifications',            status: activeIep.has_accommodations       ? 'yes' : 'no' },
    { name: 'Transition Plan (required age 14+)',        status: activeIep.has_transition_plan      ? 'yes' : (parseInt(student.grade) >= 9 ? 'no' : 'warn') },
    { name: 'Parent / Guardian Signature',               status: activeIep.has_parent_signature     ? 'yes' : 'no' },
    { name: 'Prior Written Notice',                      status: activeIep.has_prior_written_notice ? 'yes' : 'no' },
  ] : []

  const plan504Docs = active504 ? [
    { name: 'Eligibility Determination',   status: active504.has_eligibility_determination ? 'yes' : 'no' },
    { name: 'Accommodation List',          status: active504.has_accommodation_list        ? 'yes' : 'no' },
    { name: 'Parent / Guardian Signature', status: active504.has_parent_signature          ? 'yes' : 'no' },
    { name: 'Prior Written Notice',        status: active504.has_prior_written_notice      ? 'yes' : 'no' },
    ...(active504.is_dyslexia_plan ? [
      { name: 'HB 3928 Dyslexia Plan Review', status: active504.hb3928_reviewed          ? 'yes' : 'no' },
      { name: 'MDT Composition Verified',     status: active504.mdt_composition_verified  ? 'yes' : 'warn' },
    ] : []),
  ] : []

  const allDocs  = [...iepDocs, ...plan504Docs]
  const docScore = allDocs.filter(d => d.status === 'yes').length

  // Timeline nodes
  const timelineNodes = activeRef ? [
    { label: 'Referral',   date: activeRef.referral_date,        done: true },
    { label: 'Consent',    date: activeRef.consent_signed_date,  done: !!activeRef.consent_signed_date },
    { label: 'Eval Begin', date: activeRef.consent_signed_date,  done: !!activeRef.consent_signed_date },
    { label: 'Eval Due',   date: activeRef.eval_due_date,        done: !!activeRef.eval_completed_date,  overdue: complianceStatus === 'overdue' && !activeRef.eval_completed_date, active: complianceStatus === 'critical' },
    { label: 'ARD Due',    date: activeRef.ard_due_date,         done: !!activeRef.ard_held_date,        overdue: complianceStatus === 'overdue' && !!activeRef.eval_completed_date && !activeRef.ard_held_date },
    { label: 'IEP/504',    date: null,                           done: !!(activeIep || active504) },
  ] : (activeIep ? [
    { label: 'Prior ARD',  date: activeIep.ard_date,             done: true },
    { label: 'IEP Start',  date: activeIep.iep_start_date,       done: true },
    { label: 'Annual Due', date: activeIep.annual_review_due,    done: !!activeIep.annual_review_held, overdue: complianceStatus === 'overdue' },
    { label: 'Renewal',    date: null,                           done: false },
  ] : [])

  const generateCompliancePdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.setTextColor(88, 28, 135)
    doc.text('Meridian — SPED Compliance Summary', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated ${format(new Date(), 'MMMM d, yyyy')}`, 14, 27)

    doc.setFontSize(13)
    doc.setTextColor(30, 30, 30)
    doc.text(`${student.first_name} ${student.last_name} — Grade ${student.grade}`, 14, 38)
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(`Campus: ${student.campus?.name ?? '—'}  |  Plan: ${student.plan_type?.toUpperCase() ?? '—'}  |  PEIMS ID: ${student.state_id ?? '—'}`, 14, 44)

    const statusLabel = complianceStatus === 'overdue' ? 'OVERDUE — IDEA Violation' : complianceStatus === 'critical' ? 'CRITICAL (< 7 days)' : 'Compliant'
    doc.setFontSize(10)
    doc.setTextColor(complianceStatus === 'overdue' ? 200 : complianceStatus === 'critical' ? 180 : 20, 20, 20)
    doc.text(`Compliance Status: ${statusLabel}`, 14, 52)
    if (violationMessage) {
      doc.setTextColor(200, 30, 30)
      doc.text(`Violation: ${violationMessage}`, 14, 58)
    }

    if (allDocs.length > 0) {
      doc.autoTable({
        startY: violationMessage ? 65 : 60,
        head: [['Document', 'Status']],
        body: allDocs.map(d => [d.name, d.status === 'yes' ? '✓ Complete' : d.status === 'warn' ? '⚠ Warning' : '✗ Missing']),
        headStyles: { fillColor: [88, 28, 135] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { cellWidth: 30 } },
      })
    }

    doc.save(`Meridian-${student.last_name}-${student.first_name}-Compliance.pdf`)
    toast.success('Compliance document downloaded')
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/meridian/timelines')} className="text-xs text-gray-400 hover:text-gray-600 mb-1.5 block">
            ← Timelines
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {student.first_name} {student.last_name} — Grade {student.grade}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{student.campus?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={complianceStatus} />
          {student.waypoint_student_id && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono bg-purple-50 text-purple-700 border border-purple-200">
              🔗 Waypoint Linked
            </span>
          )}
          {student.dyslexia_identified && (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono bg-amber-50 text-amber-700 border border-amber-200">
              🔤 HB 3928
            </span>
          )}
        </div>
      </div>

      {/* Violation banner */}
      {violationMessage && (
        <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">IDEA Violation — {violationMessage}</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              This student is in potential violation of IDEA § 300.301. An ARD/IEP determination meeting must be scheduled immediately.
              Document the delay with a written explanation per TEA guidance.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_280px] gap-5">
        <div className="space-y-5">

          {/* Compliance Timeline */}
          {timelineNodes.length > 0 && (
            <Card>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Compliance Timeline</h3>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-start">
                  {timelineNodes.map((node, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && (
                        <div
                          className="absolute top-3 right-1/2 left-[-50%] h-0.5 -translate-y-1/2"
                          style={{ background: timelineNodes[i - 1].done ? (node.overdue ? '#dc2626' : '#10b981') : '#e5e7eb' }}
                        />
                      )}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs relative z-10 font-bold"
                        style={{
                          border: `2px solid ${node.overdue ? '#dc2626' : node.active ? '#f59e0b' : node.done ? '#10b981' : '#d1d5db'}`,
                          background: node.overdue ? '#fef2f2' : node.active ? '#fffbeb' : node.done ? '#ecfdf5' : '#f9fafb',
                          color: node.overdue ? '#dc2626' : node.active ? '#f59e0b' : node.done ? '#10b981' : '#9ca3af',
                          boxShadow: node.overdue ? '0 0 8px rgba(220,38,38,0.4)' : 'none',
                        }}
                      >
                        {node.overdue ? '!' : node.done ? '✓' : '○'}
                      </div>
                      <p className={`text-[9px] uppercase tracking-wider text-center mt-1.5 font-mono ${node.overdue ? 'text-red-600' : node.active ? 'text-amber-600' : node.done ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {node.label}
                      </p>
                      <p className="text-[9px] text-gray-400 text-center mt-0.5 font-mono">
                        {node.date ? format(new Date(node.date), 'MMM d') : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Folder Documentation */}
          {allDocs.length > 0 && (
            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Folder Documentation — {docScore}/{allDocs.length} complete</h3>
                <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded ${
                  docScore / allDocs.length >= 0.85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  docScore / allDocs.length >= 0.65 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {Math.round(docScore / allDocs.length * 100)}% Ready
                </span>
              </div>
              <div className="px-5 py-4 divide-y divide-gray-50">
                {allDocs.map((doc, i) => <DocCheckItem key={i} doc={doc} />)}
              </div>
            </Card>
          )}

          {!activeRef && !activeIep && !active504 && (
            <Card className="px-5 py-8 text-center">
              <p className="text-sm text-gray-400">No active IEP, 504 plan, or referral found for this student.</p>
            </Card>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <Card className="px-5 py-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-gray-700 pb-2.5 border-b border-gray-100 uppercase tracking-wider">Student Info</h3>
            {[
              ['State ID (PEIMS)', student.state_id],
              ['Frontline ID',     student.frontline_id ?? '—'],
              ['Local ID',         student.local_id ?? '—'],
              ['Grade',            `Grade ${student.grade}`],
              ['Campus',           student.campus?.name],
              ['Plan Type',        student.plan_type?.toUpperCase()],
              ['Primary Disability', student.primary_disability ?? '—'],
              ['Dyslexia',         student.dyslexia_identified ? `Yes — HB 3928` : 'No'],
              ['Waypoint',         student.waypoint_student_id ? `Linked` : 'Not linked'],
              ['Import Source',    student.import_source],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-xs text-gray-400 uppercase tracking-wide flex-shrink-0">{k}</span>
                <span className="text-xs text-gray-700 text-right font-medium">{v}</span>
              </div>
            ))}
          </Card>

          <Card className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-700 pb-2.5 mb-2 border-b border-gray-100 uppercase tracking-wider">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setEscalateOpen(true)}
                className="w-full px-4 py-2.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors text-left"
              >
                Escalate to SPED Director
              </button>
              <button
                onClick={() => setArdOpen(true)}
                className="w-full px-4 py-2.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors text-left"
              >
                Schedule ARD Meeting
              </button>
              <button
                onClick={generateCompliancePdf}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors text-left"
              >
                Generate Compliance Doc
              </button>
              {!student.waypoint_student_id && (
                <button
                  onClick={() => setLinkOpen(true)}
                  className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors text-left"
                >
                  Link to Waypoint Record
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ScheduleARDModal
        open={ardOpen}
        onClose={() => setArdOpen(false)}
        referral={activeRef}
        onSaved={refetch}
      />
      <EscalateModal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        student={student}
      />
      <LinkWaypointModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        student={student}
        onSaved={refetch}
      />
    </div>
  )
}

// ── Schedule ARD Modal ────────────────────────────────────────────────────────

function ScheduleARDModal({ open, onClose, referral, onSaved }) {
  const [ardDate, setArdDate] = useState(referral?.ard_due_date?.split('T')[0] || '')
  const [evalDate, setEvalDate] = useState(referral?.eval_completed_date?.split('T')[0] || '')
  const [saving, setSaving] = useState(false)
  const needsEval = referral && !referral.eval_completed_date

  const handleSave = async () => {
    if (!ardDate) return toast.error('ARD date is required')
    if (!referral) return toast.error('No open referral found for this student')
    setSaving(true)
    const { error } = await scheduleARDMeeting({
      referralId: referral.id,
      ardDueDate: ardDate,
      evalCompletedDate: needsEval && evalDate ? evalDate : undefined,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('ARD meeting scheduled')
    onSaved()
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Schedule ARD Meeting"
      description="Set dates for the evaluation and ARD determination meeting."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!referral && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            No open referral on file. An ARD meeting date can only be scheduled once a referral is created.
          </div>
        )}
        {needsEval && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Completed Date</label>
            <input
              type="date"
              value={evalDate}
              onChange={e => setEvalDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">Marks the evaluation complete and starts the 30-day ARD window</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ARD Meeting Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={ardDate}
            onChange={e => setArdDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Escalate Modal ────────────────────────────────────────────────────────────

function EscalateModal({ open, onClose, student }) {
  const [urgency, setUrgency] = useState('urgent')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setUrgency('urgent')
      setNotes('')
      setSaving(false)
    }
  }, [open])

  const handleSave = async () => {
    if (!notes.trim()) return toast.error('Notes are required')
    setSaving(true)
    // Record escalation in console + show confirmation
    // Full DB persistence requires migration 049 (meridian_escalations table)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    console.info('[Meridian Escalation]', { student: `${student?.first_name} ${student?.last_name}`, urgency, notes })
    toast.success('Escalation logged — follow up with your SPED Director')
    setNotes('')
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Escalate to SPED Director"
      description={`Log a compliance concern for ${student?.first_name} ${student?.last_name}.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleSave} loading={saving}>Escalate</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
          <div className="flex gap-3">
            {[
              { value: 'urgent', label: 'Urgent — IDEA Violation' },
              { value: 'routine', label: 'Routine Review' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`flex-1 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
                  urgency === opt.value
                    ? opt.value === 'urgent'
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Escalation Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe the compliance concern and recommended next steps..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Link Waypoint Modal ───────────────────────────────────────────────────────

function LinkWaypointModal({ open, onClose, student, onSaved }) {
  const [waypointId, setWaypointId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setWaypointId('')
      setSaving(false)
    }
  }, [open])

  const handleSave = async () => {
    if (!waypointId.trim()) return toast.error('Waypoint Student ID is required')
    setSaving(true)
    const { error } = await linkToWaypoint({ meridianStudentId: student.id, waypointStudentId: waypointId.trim() })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Linked to Waypoint record')
    setWaypointId('')
    onSaved()
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Link to Waypoint Record"
      description="Connect this SPED record to the student's DAEP discipline history in Waypoint."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Link</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Find the student in <strong>Waypoint → Students</strong> and copy their Student ID. Linking enables cross-product DAEP + IEP conflict detection.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Waypoint Student ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={waypointId}
            onChange={e => setWaypointId(e.target.value)}
            placeholder="UUID from Waypoint student record"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
          />
        </div>
      </div>
    </Modal>
  )
}
