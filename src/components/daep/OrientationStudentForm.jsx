import { useState } from 'react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { formatStudentName, formatGradeLevel } from '../../lib/utils'

const EMPTY_GOAL = { behavior: '', supports: '', interventions: '' }

function buildEmptyForm() {
  return {
    reflection: '',
    behavior_plan: [{ ...EMPTY_GOAL }, { ...EMPTY_GOAL }, { ...EMPTY_GOAL }],
    completed_at: '',
  }
}

function formFromData(data) {
  if (!data) return buildEmptyForm()
  return {
    reflection: data.reflection || '',
    behavior_plan: Array.isArray(data.behavior_plan) && data.behavior_plan.length === 3
      ? data.behavior_plan
      : [{ ...EMPTY_GOAL }, { ...EMPTY_GOAL }, { ...EMPTY_GOAL }],
    completed_at: data.completed_at || '',
  }
}

/**
 * OrientationStudentForm modal.
 *
 * Props:
 *   scheduling  — daep_placement_scheduling row (must include orientation_form_data, orientation_status)
 *   student     — students row
 *   incident    — incidents row (for campus info)
 *   onClose     — called when modal dismissed
 *   onSaved     — called after a successful save (so parent can refetch)
 */
export default function OrientationStudentForm({ scheduling, student, incident, onClose, onSaved }) {
  const isReadOnly = scheduling?.orientation_status === 'completed'
  const [formData, setFormData] = useState(() => formFromData(scheduling?.orientation_form_data))
  const [saving, setSaving] = useState(false)

  const studentName = student ? formatStudentName(student) : '—'
  const grade = student ? formatGradeLevel(student.grade_level) : '—'
  const campusName = incident?.campus?.name || '—'
  const studentId = student?.student_id_number || '—'

  const setReflection = (val) => setFormData(prev => ({ ...prev, reflection: val }))

  const setGoal = (idx, field, val) => {
    setFormData(prev => {
      const plan = [...prev.behavior_plan]
      plan[idx] = { ...plan[idx], [field]: val }
      return { ...prev, behavior_plan: plan }
    })
  }

  const handleSave = async (completeOrientation = false) => {
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const payload = {
        orientation_form_data: {
          ...formData,
          completed_at: completeOrientation ? today : (formData.completed_at || today),
        },
      }

      if (completeOrientation) {
        payload.orientation_status = 'completed'
        payload.orientation_completed_date = today
      }

      const { error } = await supabase
        .from('daep_placement_scheduling')
        .update(payload)
        .eq('id', scheduling.id)

      if (error) throw error

      toast.success(completeOrientation ? 'Orientation completed and form saved' : 'Form saved')
      onSaved?.()
      if (completeOrientation) onClose()
    } catch (err) {
      console.error('Error saving orientation form:', err)
      toast.error('Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    const today = new Date().toISOString().split('T')[0]
    exportOrientationFormPdf({
      studentName,
      studentId,
      grade,
      campusName,
      date: today,
      reflection: formData.reflection,
      behaviorPlan: formData.behavior_plan,
    })
  }

  const footerContent = isReadOnly ? (
    <>
      <Button variant="secondary" onClick={handlePrint}>Print / Export PDF</Button>
      <Button variant="secondary" onClick={onClose}>Close</Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={handlePrint}>Print / Export PDF</Button>
      <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button variant="secondary" onClick={() => handleSave(false)} loading={saving}>Save</Button>
      <Button variant="primary" onClick={() => handleSave(true)} loading={saving}>
        Save &amp; Complete Orientation
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Student Reflection &amp; Behavior Plan"
      description={`${studentName} — ${campusName}`}
      size="xl"
      footer={footerContent}
    >
      <div className="space-y-6">
        {isReadOnly && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
            Orientation completed — form is read-only.
          </div>
        )}

        {/* Section 1: Student Reflection */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Reflect on Your Incident</h3>
          <p className="text-xs text-gray-500 mb-2">
            In your own words, describe what happened and what you could have done differently.
          </p>
          <textarea
            rows={6}
            value={formData.reflection}
            onChange={(e) => setReflection(e.target.value)}
            disabled={isReadOnly}
            placeholder="Write your reflection here..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600 resize-none"
          />
        </div>

        {/* Section 2: Behavior Plan */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">My Behavior Plan</h3>
          <p className="text-xs text-gray-500 mb-4">
            List 3 behaviors you will work on while at DAEP, and the supports and interventions you need.
          </p>
          <div className="space-y-4">
            {formData.behavior_plan.map((goal, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-orange-700">Goal {idx + 1}</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Behavior to Improve
                  </label>
                  <input
                    type="text"
                    value={goal.behavior}
                    onChange={(e) => setGoal(idx, 'behavior', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="e.g. Following classroom instructions"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Supports Needed
                  </label>
                  <input
                    type="text"
                    value={goal.supports}
                    onChange={(e) => setGoal(idx, 'supports', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="e.g. Check-ins with counselor"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Interventions Needed
                  </label>
                  <input
                    type="text"
                    value={goal.interventions}
                    onChange={(e) => setGoal(idx, 'interventions', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="e.g. Social-emotional learning group"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Generate and download the orientation form as a custom jsPDF document.
 */
function exportOrientationFormPdf({ studentName, studentId, grade, campusName, date, reflection, behaviorPlan }) {
  const doc = new jsPDF({ orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 14

  // ---- Header ----
  doc.setFillColor(249, 115, 22) // orange-500
  doc.rect(0, 0, pageWidth, 18, 'F')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.setFont(undefined, 'bold')
  doc.text('DAEP Orientation — Student Reflection & Behavior Plan', pageWidth / 2, 11, { align: 'center' })
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0)

  // ---- Student Info Row ----
  let y = 26
  doc.setFontSize(9)
  doc.setTextColor(80)
  const infoFields = [
    { label: 'Name', value: studentName },
    { label: 'ID', value: studentId },
    { label: 'Grade', value: grade },
    { label: 'Campus', value: campusName },
    { label: 'Date', value: date },
  ]
  const colW = (pageWidth - margin * 2) / infoFields.length
  infoFields.forEach((f, i) => {
    const x = margin + i * colW
    doc.setFont(undefined, 'bold')
    doc.text(f.label, x, y)
    doc.setFont(undefined, 'normal')
    doc.text(f.value, x, y + 5)
  })
  doc.setTextColor(0)

  y += 14

  // ---- Divider ----
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // ---- Incident Reflection ----
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Incident Reflection', margin, y)
  doc.setFont(undefined, 'normal')
  y += 6

  doc.setFontSize(9)
  doc.setTextColor(60)
  const reflectionText = reflection || '(No reflection provided)'
  const splitReflection = doc.splitTextToSize(reflectionText, pageWidth - margin * 2)
  doc.text(splitReflection, margin, y)
  y += splitReflection.length * 5 + 6
  doc.setTextColor(0)

  // ---- Divider ----
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // ---- Behavior Plan Table ----
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('My Behavior Plan', margin, y)
  doc.setFont(undefined, 'normal')
  y += 4

  const planRows = (behaviorPlan || []).map((g, i) => [
    `Goal ${i + 1}`,
    g.behavior || '',
    g.supports || '',
    g.interventions || '',
  ])

  autoTable(doc, {
    head: [['Goal', 'Behavior to Improve', 'Supports Needed', 'Interventions Needed']],
    body: planRows,
    startY: y,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 55 },
      3: { cellWidth: 55 },
    },
    margin: { left: margin, right: margin },
  })

  y = doc.lastAutoTable.finalY + 14

  // ---- Signature Lines ----
  const sigFields = ['Student', 'Parent / Guardian', 'Staff', 'Date']
  const sigW = (pageWidth - margin * 2) / sigFields.length
  doc.setFontSize(9)
  sigFields.forEach((label, i) => {
    const x = margin + i * sigW
    doc.setDrawColor(100)
    doc.line(x, y + 10, x + sigW - 6, y + 10)
    doc.setTextColor(100)
    doc.text(label, x, y + 15)
    doc.setTextColor(0)
  })

  // ---- FERPA Footer ----
  doc.setFillColor(220, 38, 38)
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  doc.text('Confidential — FERPA Protected Student Record — Authorized Personnel Only', pageWidth / 2, pageHeight - 4, { align: 'center' })

  const filename = `Orientation_Form_${studentName.replace(/\s+/g, '_')}_${date}.pdf`
  doc.save(filename)
}
