import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Card, { CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useParentEditHistory } from '../../hooks/useParentEditHistory'
import { formatDateTime } from '../../lib/utils'

/**
 * T2-2 — Parent-facing edit history (CC22 R2 finding F-R2-1).
 *
 * Renders the audit_log timeline for an incident's entity graph: the incident
 * itself, its SPED/504 compliance checklist, its transition plan, and any
 * compliance override requests. Migration 079 RLS policy
 * `parent_read_own_children` scopes the query to records the parent owns
 * via student_guardians.portal_user_id.
 *
 * Patricia's R2 verdict requires this surface to promote Waypoint from
 * MIXED-defensible to TRULY PROTECTIVE: "I want to watch a non-technical
 * user click and see the edit history."
 *
 * Collapsed by default — expanded view shows oldest → newest events grouped
 * by entity, with field-level diffs for the fields parents care about.
 */

// PDF cell helper — strips Unicode chars jsPDF's WinAnsi encoding chokes on,
// matches the pattern from CC16 Hearing Packet PDF Unicode fix.
function safePdfString(v) {
  const s = valueToText(v)
  if (typeof s !== 'string') return ''
  return s
    .replace(/[≤≥]/g, '<=')
    .replace(/[→]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[…]/g, '...')
    .replace(/[—–]/g, '-')
    .slice(0, 200)
}

// P4: human-readable rendering for non-technical parents.
// Booleans → Yes/No. ISO dates → friendly date-times. Arrays of strings →
// comma-separated bullets. Arrays of objects (rare for watched fields) →
// summary count. Other objects → "(complex value — see staff)" so the parent
// isn't shown raw {"key":"value"} JSON dumps.
function valueToText(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      try { return formatDateTime(v) } catch { return v }
    }
    return v
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return '(none)'
    if (v.every(item => typeof item === 'string' || typeof item === 'number')) {
      return v.join(', ')
    }
    return `${v.length} item${v.length === 1 ? '' : 's'}`
  }
  if (typeof v === 'object') return '(detailed record — ask staff to print)'
  return String(v)
}

const ENTITY_COLOR = {
  incidents: 'gray',
  compliance_checklists: 'purple',
  transition_plans: 'blue',
  compliance_override_requests: 'yellow',
}

export default function ParentEditHistorySection({ incident }) {
  const [expanded, setExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { events, loading } = useParentEditHistory(incident)

  if (!incident?.id) return null

  const eventCount = events.length
  const lastEvent = events.length ? events[events.length - 1] : null

  // P5: hearing-exhibit PDF export. FERPA-watermarked. Patricia called this
  // out — parents need a printable timeline they can hand to a hearing officer.
  const handleExportPdf = () => {
    if (!events.length) return
    setExporting(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait' })
      const studentName = incident?.student
        ? `${incident.student.first_name || ''} ${incident.student.last_name || ''}`.trim()
        : 'Student'
      const today = new Date().toLocaleDateString('en-US', { dateStyle: 'long' })

      doc.setFontSize(14)
      doc.text('Edit History — Discipline Record', 14, 18)
      doc.setFontSize(11)
      doc.text(`Student: ${studentName || '(name not on record)'}`, 14, 26)
      doc.text(`Incident date: ${incident.incident_date || '—'}`, 14, 32)
      doc.text(`Generated: ${today}`, 14, 38)

      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(
        'CONFIDENTIAL — FERPA §99.10 inspection right. This timeline is generated from the audit log',
        14, 46,
      )
      doc.text(
        'and reflects edits captured automatically by the system. Tampering is detectable through periodic audit.',
        14, 50,
      )
      doc.setTextColor(0)

      const rows = events.map((ev) => [
        ev.timestamp ? formatDateTime(ev.timestamp) : '',
        ev.entity_label,
        ev.event_type === 'updated' ? (ev.field_label || '') : ev.event_type.toUpperCase(),
        ev.event_type === 'updated' ? safePdfString(ev.old_value) : '',
        ev.event_type === 'updated' ? safePdfString(ev.new_value) : '',
        ev.actor?.full_name || (ev.actor_id ? '(staff)' : '(system)'),
      ])

      autoTable(doc, {
        startY: 56,
        head: [['When', 'Section', 'Field / Action', 'From', 'To', 'Who']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [44, 62, 80], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 28 },
          2: { cellWidth: 32 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 22 },
        },
        didDrawPage: (data) => {
          doc.setFontSize(7)
          doc.setTextColor(150)
          doc.text(
            `FERPA-protected — page ${data.pageNumber}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' },
          )
          doc.setTextColor(0)
        },
      })

      const safeName = (studentName || 'Student').replace(/[^A-Za-z0-9_-]/g, '_')
      const dateStamp = new Date().toISOString().split('T')[0]
      doc.save(`Edit_History_${safeName}_${dateStamp}.pdf`)
    } catch (err) {
      console.error('Edit history PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <CardTitle>Edit History</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            {loading
              ? 'Loading…'
              : eventCount === 0
                ? 'No edits recorded.'
                : (
                  <>
                    {eventCount} event{eventCount === 1 ? '' : 's'} recorded.
                    {lastEvent && (
                      <> Last edit by <strong>{lastEvent.actor?.full_name || 'Staff'}</strong>{' '}
                        on {formatDateTime(lastEvent.timestamp)}.</>
                    )}
                  </>
                )}
          </p>
        </div>
        <span className="text-sm text-orange-600 font-medium">
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {!loading && eventCount > 0 && (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={handleExportPdf} loading={exporting}>
                Download as PDF
              </Button>
            </div>
          )}
          {!loading && eventCount === 0 && (
            <p className="text-sm text-gray-500 italic">
              No edits to this record. Anything an administrator changes will appear here.
            </p>
          )}
          {events.map((ev) => (
            <div key={ev.id} className="border-l-2 border-gray-200 pl-3 py-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={ENTITY_COLOR[ev.entity_type] || 'gray'} size="sm">
                  {ev.entity_label}
                </Badge>
                {ev.event_type === 'created' && (
                  <span className="text-xs text-green-700 font-medium">created</span>
                )}
                {ev.event_type === 'deleted' && (
                  <span className="text-xs text-red-700 font-medium">deleted</span>
                )}
                {ev.event_type === 'updated' && ev.field_label && (
                  <span className="text-xs text-gray-700">
                    <strong>{ev.field_label}</strong> changed
                  </span>
                )}
              </div>
              {ev.event_type === 'updated' && (
                <div className="mt-1 text-xs grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <div className="bg-red-50 rounded px-2 py-1">
                    <span className="text-red-700 font-medium">From:</span>{' '}
                    <span className="text-gray-800 whitespace-pre-wrap">{valueToText(ev.old_value)}</span>
                  </div>
                  <div className="bg-green-50 rounded px-2 py-1">
                    <span className="text-green-700 font-medium">To:</span>{' '}
                    <span className="text-gray-800 whitespace-pre-wrap">{valueToText(ev.new_value)}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatDateTime(ev.timestamp)}
                {ev.actor?.full_name && ` · ${ev.actor.full_name}`}
                {ev.actor?.role && ` (${ev.actor.role})`}
              </p>
            </div>
          ))}
          <p className="text-xs text-gray-500 italic mt-3 pt-3 border-t">
            FERPA §99.10 inspection right. Edits are recorded automatically by the system
            with timestamp, actor, and field-level diffs. Tampering is detectable through
            periodic audit.
          </p>
        </div>
      )}
    </Card>
  )
}
