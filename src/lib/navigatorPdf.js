import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { supabase } from './supabase'

const FERPA_NOTICE = 'CONFIDENTIAL — FERPA Protected Student Records — Authorized Personnel Only — Do Not Distribute'

// jsPDF's default Helvetica uses WinAnsi/CP1252 — em-dash, middle dot, ×, §, ⚠
// are all in range, but ≤ ≥ → ← arrows are not and render as gibberish that
// also corrupts surrounding glyph spacing. Sanitize free-text + computed labels
// at render time so the UI keeps the nicer characters.
const pdfSafe = (s) => s == null ? '' : String(s)
  .replace(/≤/g, '<=')
  .replace(/≥/g, '>=')
  .replace(/[→]/g, '->')
  .replace(/[←]/g, '<-')

const SUPPORT_LABELS = {
  cico: 'CICO',
  behavior_contract: 'Behavior Contract',
  counseling_referral: 'Counseling Referral',
  parent_contact: 'Parent Contact',
  mentoring: 'Mentoring',
  other: 'Other',
}

const NOTIFY_METHOD_LABELS = {
  phone_call: 'Phone call (parent answered)',
  voicemail: 'Voicemail left',
  email: 'Email sent',
  certified_letter: 'Certified letter',
  in_person: 'In person',
  text_message: 'Text message',
  other: 'Other',
}

function drawHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.width
  doc.setFillColor(220, 38, 38)
  doc.rect(0, 0, pageWidth, 8, 'F')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  doc.text(FERPA_NOTICE, pageWidth / 2, 5.5, { align: 'center' })
  doc.setTextColor(0)
}

function drawFooter(doc, totalPages) {
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(220, 38, 38)
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(
      `${FERPA_NOTICE}  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 4.5,
      { align: 'center' }
    )
    doc.setTextColor(0)
  }
}

function sectionHeading(doc, text, y) {
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y - 4, doc.internal.pageSize.width - 20, 6, 'F')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.setFont(undefined, 'bold')
  doc.text(text, 12, y)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0)
  return y + 8
}

function ensureSpace(doc, y, neededLines = 6) {
  const pageHeight = doc.internal.pageSize.height
  if (y + neededLines * 4 > pageHeight - 14) {
    doc.addPage()
    drawHeader(doc, '')
    return 18
  }
  return y
}

/**
 * Build a Hearing Packet PDF for a single Navigator student.
 * Bundles every record needed to defend a board hearing or due-process complaint:
 *   - Student demographic + IEP/504/MTSS header
 *   - Risk score + triggers
 *   - SPED cumulative days (school year)
 *   - Manifestation Determination Reviews
 *   - Chronological behavior timeline (referrals + placements + supports)
 *   - Parent-notice records (method, server timestamp, notes)
 *   - Edit-history (reason changes, post-incident)
 *
 * Generated client-side; no student data leaves the browser.
 */
export async function generateHearingPacket({ student, referrals, placements, supports, mdrs, cumDays, riskScore, riskTriggers, generatedBy }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.width
  drawHeader(doc, '')

  let y = 14

  // ─── Title ───
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text('Behavior Records — Hearing Packet', 12, y)
  doc.setFont(undefined, 'normal')
  y += 6
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generated ${format(new Date(), 'MMMM d, yyyy h:mm a')}${generatedBy ? ` by ${generatedBy}` : ''}`, 12, y)
  doc.setTextColor(0)
  y += 8

  // ─── Record integrity / authentication (FRE 803(6) trustworthiness foundation) ───
  // Cross-checks each placement/referral's live free-text + edit-history JSONB
  // against the most-recent snapshot in Navigator's tamper-evident audit chain
  // (migration 081 hash chain; verification surface migration 085). Renders an
  // honest, checkable statement — verifiable count, no-anchor count, and a loud
  // flag if any record diverges from the chain. Degrades silently (renders
  // nothing) if the 085 RPCs aren't deployed yet, so we never assert a check we
  // cannot cash.
  let integrity = null
  try {
    const [{ data: vh, error: vhErr }, { data: vc, error: vcErr }] = await Promise.all([
      supabase.rpc('fn_navigator_verify_student_history', { p_student_id: student.id }),
      supabase.rpc('fn_navigator_verify_chain'),
    ])
    if (!vhErr && !vcErr && Array.isArray(vh) && Array.isArray(vc) && vc.length) {
      const head = vc[0]
      const ok = (r) => r.audited && r.history_matches_chain && r.live_value_matches
      integrity = {
        total: vh.length,
        verifiable: vh.filter(ok).length,
        noAnchor: vh.filter((r) => !r.audited).length,
        tampered: vh.filter((r) => r.audited && (!r.history_matches_chain || !r.live_value_matches)).length,
        chainIntact: Number(head.broken_count) === 0,
        headHash: head.head_hash || '',
      }
    }
  } catch {
    integrity = null // verification unavailable — say nothing rather than overclaim
  }

  if (integrity && integrity.total > 0) {
    const v = integrity
    const hash12 = v.headHash ? v.headHash.slice(0, 12) : '—'
    const lines = []
    lines.push(
      `${v.verifiable} of ${v.total} placement/referral free-text record(s) in this packet are independently `
      + `verifiable against Navigator's tamper-evident audit log.`
    )
    if (v.noAnchor > 0) {
      lines.push(
        `${v.noAnchor} record(s) predate the audit log and carry no verification anchor.`
      )
    }
    if (v.tampered > 0) {
      lines.push(
        `WARNING: ${v.tampered} record(s) contain free-text edits that do NOT match the audit log and may have `
        + `been altered outside the system. Have an administrator investigate before relying on this packet.`
      )
    }
    lines.push(
      `Audit-chain integrity: ${v.chainIntact ? 'verified intact' : 'BROKEN — contact administrator'} `
      + `(chain head ${hash12}…).`
    )
    y = sectionHeading(doc, 'Record Integrity', y)
    doc.setFontSize(8)
    doc.setTextColor(v.tampered > 0 || !v.chainIntact ? 180 : 70, v.tampered > 0 ? 0 : 70, v.tampered > 0 ? 0 : 70)
    lines.forEach((ln) => {
      const wrapped = doc.splitTextToSize(ln, pageWidth - 24)
      doc.text(wrapped, 12, y)
      y += wrapped.length * 3.8 + 1
    })
    doc.setTextColor(0)
    y += 4
  }

  // ─── Student header block ───
  y = sectionHeading(doc, 'Student', y)
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text(`${student.first_name || ''} ${student.last_name || ''}`, 12, y)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(9)
  y += 5
  const headerLines = [
    `Grade: ${student.grade_level ?? '—'}`,
    `Campus: ${student.campuses?.name || '—'}`,
    `Student ID: ${student.student_id_number || student.student_id || '—'}`,
    student.date_of_birth ? `DOB: ${format(parseISO(student.date_of_birth), 'MMM d, yyyy')}` : null,
  ].filter(Boolean)
  headerLines.forEach(line => { doc.text(line, 12, y); y += 4.5 })
  // Status badges as text
  const statuses = []
  if (student.is_sped) statuses.push('SPED (IDEA)')
  if (student.is_504) statuses.push('Section 504')
  if (student.mtss_tier) statuses.push(`MTSS Tier ${student.mtss_tier}`)
  if (statuses.length > 0) {
    doc.setFont(undefined, 'bold')
    doc.text(`Eligibility / Status: ${statuses.join(' · ')}`, 12, y)
    doc.setFont(undefined, 'normal')
    y += 5
  }
  if (student.race_ethnicity) {
    doc.text(`Race/Ethnicity: ${student.race_ethnicity}`, 12, y)
    y += 4.5
  }
  y += 3

  // ─── Risk summary ───
  y = ensureSpace(doc, y, 8)
  y = sectionHeading(doc, 'Current Risk Profile', y)
  doc.setFontSize(9)
  doc.text(`Composite risk score: ${riskScore ?? '—'} / 100`, 12, y); y += 4.5
  if (riskTriggers && riskTriggers.length > 0) {
    doc.text(pdfSafe(`Triggers: ${riskTriggers.join(' · ')}`), 12, y); y += 4.5
  }
  doc.text(`Total referrals on file: ${referrals.length}`, 12, y); y += 4.5
  doc.text(`Total ISS/OSS placements on file: ${placements.length}`, 12, y); y += 4.5
  doc.text(`Active supports: ${supports.filter(s => s.status === 'active').length}`, 12, y); y += 7

  // ─── SPED cumulative days ───
  if (student.is_sped && cumDays) {
    y = ensureSpace(doc, y, 8)
    y = sectionHeading(doc, 'IDEA 34 CFR §300.530 — Cumulative Removal Days (Current School Year)', y)
    doc.setFontSize(9)
    doc.text(`School year began: ${cumDays.school_year_start || '—'}`, 12, y); y += 4.5
    doc.text(`Cumulative ISS+OSS days: ${cumDays.cumulative_days ?? 0}`, 12, y); y += 4.5
    doc.text(`Placements this year: ${cumDays.placement_count ?? 0}`, 12, y); y += 4.5
    if ((cumDays.cumulative_days ?? 0) >= 10) {
      doc.setFont(undefined, 'bold')
      doc.setTextColor(180, 30, 30)
      doc.text('⚠ 10-day federal threshold reached — MDR required for any further removal.', 12, y)
      doc.setTextColor(0)
      doc.setFont(undefined, 'normal')
      y += 4.5
    }
    y += 3
  }

  // ─── Manifestation Determinations ───
  if (mdrs && mdrs.length > 0) {
    y = ensureSpace(doc, y, 10)
    y = sectionHeading(doc, 'Manifestation Determination Reviews', y)
    autoTable(doc, {
      startY: y,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [126, 34, 206], textColor: 255, fontStyle: 'bold' },
      head: [['Date', 'Determination', 'Behavior', 'Rationale', 'FBA/BIP/IEP']],
      body: mdrs.map(m => [
        m.meeting_date ? format(parseISO(m.meeting_date), 'MMM d, yyyy') : '—',
        m.is_manifestation ? 'IS manifestation' : 'NOT a manifestation',
        m.behavior_description || '',
        m.decision_rationale || '',
        [m.fba_required && 'FBA', m.bip_required && 'BIP', m.iep_modified && 'IEP modified'].filter(Boolean).join(' · ') || '—',
      ]),
      margin: { top: 14, bottom: 14, left: 10, right: 10 },
      didDrawPage: () => drawHeader(doc, ''),
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Parent-Notice Records (placements only) ───
  const notifiedPlacements = placements.filter(p => p.parent_notified)
  if (notifiedPlacements.length > 0) {
    y = ensureSpace(doc, y, 10)
    y = sectionHeading(doc, 'Parent-Notice Records — TEC §37.009', y)
    autoTable(doc, {
      startY: y,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      head: [['Placement Date', 'Type', 'Server Timestamp', 'Method', 'Notes']],
      body: notifiedPlacements.map(p => [
        p.start_date ? format(parseISO(p.start_date), 'MMM d, yyyy') : '—',
        (p.placement_type || '').toUpperCase(),
        p.parent_notified_at ? format(parseISO(p.parent_notified_at), 'MMM d, yyyy h:mm a') : '—',
        NOTIFY_METHOD_LABELS[p.parent_notified_method] || p.parent_notified_method || '—',
        p.parent_contact_notes || '',
      ]),
      margin: { top: 14, bottom: 14, left: 10, right: 10 },
      didDrawPage: () => drawHeader(doc, ''),
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Chronological timeline ───
  // Each row reflects the AS-OF-PLACEMENT-DATE value of the free-text field, not
  // the current (possibly edited) value. The trigger in migration 066 / 068
  // appends the OLD value to *_history when the field changes, so history[0] is
  // the original entry. If history is empty, the current value is original.
  const placementOriginalReason = (p) => {
    const h = Array.isArray(p.reason_history) ? p.reason_history : []
    return h.length > 0 ? (h[0].reason ?? '') : (p.reason ?? '')
  }
  const referralOriginalDescription = (r) => {
    const h = Array.isArray(r.description_history) ? r.description_history : []
    return h.length > 0 ? (h[0].description ?? '') : (r.description ?? '')
  }
  const editedTag = (n) => n > 0 ? ` (edited ${n}× — see history)` : ''

  const timeline = [
    ...referrals.map(r => {
      const editN = Array.isArray(r.description_history) ? r.description_history.length : 0
      const original = referralOriginalDescription(r)
      const summary = r.offense_codes?.code
        ? `${r.offense_codes.code} — ${original}${editedTag(editN)}`
        : `${original || '—'}${editedTag(editN)}`
      return { kind: 'Referral', date: r.referral_date, summary, actor: r.reporter?.full_name || '—' }
    }),
    ...placements.map(p => {
      const editN = Array.isArray(p.reason_history) ? p.reason_history.length : 0
      const original = placementOriginalReason(p)
      const dur = `${p.days || '?'} day${(p.days || 0) === 1 ? '' : 's'}${p.end_date ? ` · ended ${format(parseISO(p.end_date), 'MMM d')}` : ' · active'}`
      return {
        kind: `${(p.placement_type || '').toUpperCase()} Placement`,
        date: p.start_date,
        summary: `${dur} — ${original}${editedTag(editN)}`,
        actor: p.assigner?.full_name || '—',
      }
    }),
    ...supports.map(s => ({ kind: `Support — ${SUPPORT_LABELS[s.support_type] || s.support_type}`, date: s.start_date, summary: `${s.status}${s.notes ? ' — ' + s.notes : ''}`, actor: s.assigner?.full_name || '—' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  if (timeline.length > 0) {
    y = ensureSpace(doc, y, 10)
    y = sectionHeading(doc, 'Chronological Behavior Timeline (free-text fields shown as recorded at placement; later edits captured in the next section)', y)
    autoTable(doc, {
      startY: y,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
      head: [['Date', 'Type', 'Detail (as recorded)', 'By']],
      body: timeline.map(t => [
        t.date ? format(parseISO(t.date), 'MMM d, yyyy') : '—',
        t.kind,
        t.summary,
        t.actor,
      ]),
      margin: { top: 14, bottom: 14, left: 10, right: 10 },
      didDrawPage: () => drawHeader(doc, ''),
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Edit-history disclosure (placed immediately after timeline so a hearing
  //     officer reading the as-recorded reasons sees the full edit chain in
  //     context, not buried as the last section before the footer) ───
  const placementEdits = placements.filter(p => Array.isArray(p.reason_history) && p.reason_history.length > 0)
  const referralEdits = referrals.filter(r => Array.isArray(r.description_history) && r.description_history.length > 0)
  if (placementEdits.length > 0 || referralEdits.length > 0) {
    y = ensureSpace(doc, y, 10)
    y = sectionHeading(doc, 'Post-Hoc Edits to Free-Text Fields', y)
    doc.setFontSize(8)
    doc.setTextColor(80)
    doc.text('The timeline above shows each free-text field as it was recorded on the placement / referral date.', 12, y)
    y += 4
    doc.text('Every subsequent edit was captured by Navigator’s audit log when it was made. For records covered by the', 12, y)
    y += 4
    doc.text('audit log (see Record Integrity, above), this edit history is independently verifiable against a tamper-evident hash chain.', 12, y)
    doc.setTextColor(0)
    y += 5

    // Resolve actor IDs to names in one batch
    const actorIds = [
      ...placementEdits.flatMap(p => p.reason_history.map(h => h.changed_by)),
      ...referralEdits.flatMap(r => r.description_history.map(h => h.changed_by)),
    ].filter(Boolean)
    const uniqueActorIds = [...new Set(actorIds)]
    const actorMap = {}
    if (uniqueActorIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', uniqueActorIds)
      ;(profs || []).forEach(p => { actorMap[p.id] = p.full_name })
    }

    const rows = []
    placementEdits.forEach(p => {
      const label = `${p.start_date ? format(parseISO(p.start_date), 'MMM d, yyyy') : '—'} ${(p.placement_type || '').toUpperCase()} placement`
      p.reason_history.forEach((h, idx) => {
        rows.push([
          label,
          idx === 0 ? 'original' : `edit ${idx}`,
          h.changed_at ? format(new Date(h.changed_at), 'MMM d, yyyy h:mm a') : '—',
          actorMap[h.changed_by] || (h.changed_by ? h.changed_by.slice(0, 8) : '—'),
          h.reason || '(empty)',
        ])
      })
      rows.push([label, 'current', '— now —', '', p.reason || '(empty)'])
    })
    referralEdits.forEach(r => {
      const label = `${r.referral_date ? format(parseISO(r.referral_date), 'MMM d, yyyy') : '—'} referral${r.offense_codes?.code ? ` (${r.offense_codes.code})` : ''}`
      r.description_history.forEach((h, idx) => {
        rows.push([
          label,
          idx === 0 ? 'original' : `edit ${idx}`,
          h.changed_at ? format(new Date(h.changed_at), 'MMM d, yyyy h:mm a') : '—',
          actorMap[h.changed_by] || (h.changed_by ? h.changed_by.slice(0, 8) : '—'),
          h.description || '(empty)',
        ])
      })
      rows.push([label, 'current', '— now —', '', r.description || '(empty)'])
    })

    autoTable(doc, {
      startY: y,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [234, 179, 8], textColor: 255, fontStyle: 'bold' },
      head: [['Record', 'Version', 'Recorded', 'Edited By', 'Field value at that time']],
      body: rows,
      margin: { top: 14, bottom: 14, left: 10, right: 10 },
      didDrawPage: () => drawHeader(doc, ''),
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ─── Active Supports detail ───
  const active = supports.filter(s => s.status === 'active')
  if (active.length > 0) {
    y = ensureSpace(doc, y, 10)
    y = sectionHeading(doc, 'Currently Active Supports', y)
    autoTable(doc, {
      startY: y,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      head: [['Type', 'Started', 'Assigned To', 'Notes']],
      body: active.map(s => [
        SUPPORT_LABELS[s.support_type] || s.support_type,
        s.start_date ? format(parseISO(s.start_date), 'MMM d, yyyy') : '—',
        s.assignee?.full_name || s.assigned_to || '—',
        s.notes || '',
      ]),
      margin: { top: 14, bottom: 14, left: 10, right: 10 },
      didDrawPage: () => drawHeader(doc, ''),
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // Footer on every page
  drawFooter(doc, doc.getNumberOfPages())

  const studentSlug = `${student.last_name || 'student'}_${student.first_name || ''}`.replace(/[^a-zA-Z0-9]/g, '_')
  const fname = `Hearing_Packet_${studentSlug}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fname)
  return fname
}
