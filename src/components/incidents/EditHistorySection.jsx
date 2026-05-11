import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Card, { CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useStaffEditHistory } from '../../hooks/useStaffEditHistory'
import { formatDateTime } from '../../lib/utils'

/**
 * T3 staff-side Edit History — Patricia's hearing-exhibit ask from CC22.
 *
 * Mirrors the parent surface but with staff RLS scope + richer watched fields.
 * Generates a stamped PDF exhibit suitable for a hearing officer ("Cheryl walks
 * into the hearing with a stamped exhibit" — except now staff can too).
 *
 * Same SHA-256 attestation lines that ship on override-approval rows surface
 * here as edit-history rows once approval flips approval_status to 'approved'.
 */

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
    return `${v.length} items`
  }
  if (typeof v === 'object') return '(JSON record)'
  return String(v)
}

const ENTITY_COLOR = {
  incidents: 'gray',
  compliance_checklists: 'purple',
  transition_plans: 'blue',
  compliance_override_requests: 'yellow',
}

export default function EditHistorySection({ incident }) {
  const [expanded, setExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { events, loading } = useStaffEditHistory(incident)

  if (!incident?.id) return null

  const eventCount = events.length
  const lastEvent = events.length ? events[events.length - 1] : null

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
      doc.text(`Incident ID: ${incident.id}`, 14, 38)
      doc.text(`Generated: ${today}`, 14, 44)

      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(
        'Append-only audit record generated from audit_log. Field-level diffs captured automatically by DB triggers',
        14, 52,
      )
      doc.text(
        'on every INSERT / UPDATE / DELETE. Override approvals carry SHA-256 attestations of the supporting document',
        14, 56,
      )
      doc.text(
        'computed at verification time. Tampering is detectable through periodic audit.',
        14, 60,
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
        startY: 66,
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
            `Confidential — staff-issued hearing exhibit · page ${data.pageNumber}`,
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
              No edits to this record. Field-level changes from any source appear here once recorded.
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
                    <span className="text-gray-800 whitespace-pre-wrap font-mono break-all">
                      {valueToText(ev.old_value)}
                    </span>
                  </div>
                  <div className="bg-green-50 rounded px-2 py-1">
                    <span className="text-green-700 font-medium">To:</span>{' '}
                    <span className="text-gray-800 whitespace-pre-wrap font-mono break-all">
                      {valueToText(ev.new_value)}
                    </span>
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
            Append-only audit record. Override approvals include SHA-256 attestation of the supporting
            document at verification time (migration 080). Tampering is detectable through periodic audit.
          </p>
        </div>
      )}
    </Card>
  )
}
