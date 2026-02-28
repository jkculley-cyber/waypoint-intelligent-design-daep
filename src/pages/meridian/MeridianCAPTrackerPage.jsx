import { useState } from 'react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import toast from 'react-hot-toast'
import { useCAPs, toggleCAPTask, createCAPFinding } from '../../hooks/useMeridian'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Skeleton, StatusBadge, Card } from './MeridianUI'

export default function MeridianCAPTrackerPage() {
  const { districtId } = useAuth()
  const { data: caps, loading, refetch } = useCAPs()
  const [savingTask, setSavingTask] = useState({})
  const [logOpen, setLogOpen] = useState(false)

  const urgentCount     = caps?.filter(c => {
    const due = c.systemic_correction_due || c.child_correction_due
    if (!due) return false
    return Math.round((new Date(due) - new Date()) / 86400000) < 14
  }).length ?? 0

  const pendingTeaCount = caps?.filter(c => c.status === 'submitted').length ?? 0

  const handleToggleTask = async (taskId, currentStatus) => {
    setSavingTask(s => ({ ...s, [taskId]: true }))
    const { error } = await toggleCAPTask({ taskId, currentStatus })
    setSavingTask(s => ({ ...s, [taskId]: false }))
    if (error) return toast.error(error.message)
    refetch()
  }

  const generateCAPPdf = (cap) => {
    const tasks = cap.meridian_cap_tasks ?? []
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.setTextColor(88, 28, 135)
    doc.text('Corrective Action Plan — TEA Report', 14, 20)

    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Generated ${format(new Date(), 'MMMM d, yyyy')}`, 14, 27)

    doc.setFontSize(12)
    doc.setTextColor(30)
    doc.text(`${cap.finding_number} — ${cap.description?.substring(0, 60) ?? ''}`, 14, 37)

    doc.setFontSize(9)
    doc.setTextColor(80)
    if (cap.legal_citation) doc.text(`Citation: ${cap.legal_citation}`, 14, 44)
    if (cap.issued_date) doc.text(`Issued: ${format(new Date(cap.issued_date), 'MMM d, yyyy')}`, 14, 50)
    const dueDate = cap.systemic_correction_due || cap.child_correction_due
    if (dueDate) doc.text(`Due: ${format(new Date(dueDate), 'MMM d, yyyy')}`, 14, 56)

    if (tasks.length > 0) {
      doc.autoTable({
        startY: 64,
        head: [['Remediation Task', 'Status', 'Completed']],
        body: tasks.map(t => [
          t.task_label,
          t.status === 'complete' ? '✓ Complete' : '◦ Pending',
          t.completed_date ? format(new Date(t.completed_date), 'MMM d, yyyy') : '—',
        ]),
        headStyles: { fillColor: [88, 28, 135] },
        styles: { fontSize: 9 },
      })
    }

    doc.save(`CAP-${cap.finding_number?.replace(/\s+/g, '-')}.pdf`)
    toast.success('CAP document downloaded')
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Corrective Action Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track TEA findings and remediation progress</p>
        </div>
        <button
          onClick={() => setLogOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Log New Finding
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active CAPs',          value: caps?.length ?? 0, color: 'text-blue-600   border-t-blue-500'   },
          { label: 'Urgent (< 14 days)',   value: urgentCount,       color: 'text-red-600    border-t-red-500'    },
          { label: 'Awaiting TEA Closure', value: pendingTeaCount,   color: 'text-amber-600  border-t-amber-500'  },
        ].map(s => {
          const [textColor, borderColor] = s.color.split('  ')
          return (
            <div key={s.label} className={`bg-white border border-t-2 ${borderColor} border-gray-200 rounded-xl px-5 py-4`}>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-2">{s.label}</p>
              {loading ? <Skeleton className="h-8 w-16" /> : <p className={`font-mono text-3xl font-medium leading-none ${textColor}`}>{s.value}</p>}
            </div>
          )
        })}
      </div>

      {/* CAP cards */}
      {loading
        ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
        : (caps ?? []).length === 0
          ? (
              <Card className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400">No active corrective action plans.</p>
                <button onClick={() => setLogOpen(true)} className="mt-3 text-sm text-purple-600 hover:underline">
                  Log your first TEA finding →
                </button>
              </Card>
            )
          : (caps ?? []).map(cap => {
              const tasks     = cap.meridian_cap_tasks ?? []
              const doneTasks = tasks.filter(t => t.status === 'complete').length
              const pct       = tasks.length > 0 ? Math.round(doneTasks / tasks.length * 100) : 0
              const dueDate   = cap.systemic_correction_due || cap.child_correction_due
              const daysLeft  = dueDate ? Math.round((new Date(dueDate) - new Date()) / 86400000) : null
              const isUrgent  = daysLeft !== null && daysLeft < 14

              return (
                <Card key={cap.id} className="px-6 py-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">
                        {cap.finding_number} — {cap.description?.substring(0, 70)}{cap.description?.length > 70 ? '…' : ''}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {cap.legal_citation}
                        {cap.issued_date && ` • Issued ${format(new Date(cap.issued_date), 'MMM d, yyyy')}`}
                        {dueDate && ` • Due ${format(new Date(dueDate), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {daysLeft !== null && (
                        <span className={`text-xs font-mono px-2.5 py-1 rounded border ${isUrgent ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {daysLeft > 0 ? `${daysLeft}d remaining` : `${Math.abs(daysLeft)}d overdue`}
                        </span>
                      )}
                      <StatusBadge status={cap.status} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isUrgent ? 'bg-red-500' : cap.status === 'submitted' ? 'bg-blue-500' : 'bg-amber-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap font-mono">{pct}% ({doneTasks}/{tasks.length} tasks)</span>
                  </div>

                  {/* Clickable task tags */}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleToggleTask(t.id, t.status)}
                          disabled={savingTask[t.id]}
                          title={t.status === 'complete' ? 'Click to mark pending' : 'Click to mark complete'}
                          className={`text-xs px-2.5 py-1 rounded font-mono border transition-all cursor-pointer hover:opacity-80 ${
                            savingTask[t.id] ? 'opacity-40' :
                            t.status === 'complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.status === 'complete' ? '✓ ' : '◦ '}{t.task_label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => generateCAPPdf(cap)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Generate TEA Docs
                    </button>
                  </div>
                </Card>
              )
            })
      }

      {/* Log New Finding Modal */}
      <LogFindingModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        districtId={districtId}
        onSaved={() => { refetch(); setLogOpen(false) }}
      />
    </div>
  )
}

// ── Log New Finding Modal ─────────────────────────────────────────────────────

function LogFindingModal({ open, onClose, districtId, onSaved }) {
  const [findingNumber, setFindingNumber] = useState('')
  const [description, setDescription] = useState('')
  const [legalCitation, setLegalCitation] = useState('')
  const [systemicDue, setSystemicDue] = useState('')
  const [childDue, setChildDue] = useState('')
  const [tasks, setTasks] = useState([''])
  const [saving, setSaving] = useState(false)

  const addTask = () => setTasks(t => [...t, ''])
  const updateTask = (i, val) => setTasks(t => t.map((x, idx) => idx === i ? val : x))
  const removeTask = (i) => setTasks(t => t.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!findingNumber.trim()) return toast.error('Finding number is required')
    if (!description.trim()) return toast.error('Description is required')
    setSaving(true)
    const { error } = await createCAPFinding({
      districtId,
      campusId: null,
      findingNumber: findingNumber.trim(),
      description: description.trim(),
      legalCitation: legalCitation.trim() || null,
      systemicDue: systemicDue || null,
      childDue: childDue || null,
      tasks: tasks.filter(t => t.trim()),
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('CAP finding logged')
    setFindingNumber(''); setDescription(''); setLegalCitation('')
    setSystemicDue(''); setChildDue(''); setTasks([''])
    onSaved()
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Log New TEA Finding"
      description="Record a corrective action plan finding from a TEA monitoring visit."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Log Finding</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Finding Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={findingNumber}
              onChange={e => setFindingNumber(e.target.value)}
              placeholder="e.g. FF-2024-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Citation</label>
            <input
              type="text"
              value={legalCitation}
              onChange={e => setLegalCitation(e.target.value)}
              placeholder="e.g. IDEA § 300.324"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe the finding and required corrective action..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Systemic Correction Due</label>
            <input
              type="date"
              value={systemicDue}
              onChange={e => setSystemicDue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child-Specific Correction Due</label>
            <input
              type="date"
              value={childDue}
              onChange={e => setChildDue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Remediation Tasks</label>
            <button
              type="button"
              onClick={addTask}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              + Add Task
            </button>
          </div>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={task}
                  onChange={e => updateTask(i, e.target.value)}
                  placeholder={`Task ${i + 1}...`}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {tasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTask(i)}
                    className="text-gray-400 hover:text-red-500 px-2 text-sm transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
