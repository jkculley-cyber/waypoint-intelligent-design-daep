import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * T3 — Staff-facing edit history (CC22 R3 backlog: Patricia's hearing-exhibit ask).
 *
 * Parallel to useParentEditHistory but scoped through staff RLS (district-wide
 * audit_log SELECT via `district_isolation_audit_log` from migration 035) and
 * shows a richer field set than parents see. Powers the staff EditHistorySection
 * card on IncidentDetailPage so an AP / principal / counselor can pull the
 * same chain-of-custody timeline an attorney would pull post-hoc.
 *
 * Staff fields go beyond the parent set:
 *   - incidents: + offense_code_id, severity, campus_id, location, witnesses
 *   - compliance_checklists: + lock/override fields (placement_blocked,
 *     block_overridden, override_request_id, completed_at, completed_by)
 *   - compliance_override_requests: + supporting_document_url + attestation
 *     fields (document_sha256, document_size_bytes, document_mime,
 *     document_verified_at) — staff conducting an audit sees the SHA-256 that
 *     was captured at approval time (migration 080 TOCTOU close)
 */

const WATCHED_INCIDENT_FIELDS = [
  'description', 'consequence_type', 'consequence_days',
  'consequence_start', 'consequence_end', 'status',
  'reviewed_by', 'reviewed_at', 'compliance_cleared',
  'offense_code_id', 'severity', 'campus_id', 'location',
  'witnesses_present', 'restorative_action',
]
const WATCHED_CHECKLIST_FIELDS = [
  'manifestation_determination', 'manifestation_result',
  'ard_committee_notified', 'ard_committee_met',
  'bip_reviewed', 'bip_updated', 'fba_conducted',
  'parent_notified', 'parent_notification_method',
  'fape_plan_documented', 'placement_justification', 'status',
  'placement_blocked', 'block_overridden', 'override_request_id',
  'completed_at', 'completed_by',
]
const WATCHED_TRANSITION_FIELDS = [
  'plan_type', 'start_date', 'end_date', 'status',
  'review_30_date', 'review_60_date', 'review_90_date',
  'behavioral_supports', 'academic_supports', 'parent_engagement',
]
const WATCHED_OVERRIDE_FIELDS = [
  'reason_category', 'reason_detail', 'supporting_document_url',
  'approval_status', 'approved_by', 'approved_at', 'approval_notes',
  'requested_by', 'requested_at',
  'document_sha256', 'document_size_bytes', 'document_mime', 'document_verified_at',
]

export const ENTITY_LABELS = {
  incidents: 'Incident',
  compliance_checklists: 'Compliance checklist',
  transition_plans: 'Transition plan',
  compliance_override_requests: 'Override request',
}

export const FIELD_LABELS = {
  description: 'Description',
  consequence_type: 'Consequence type',
  consequence_days: 'Days assigned',
  consequence_start: 'Start date',
  consequence_end: 'End date',
  status: 'Status',
  reviewed_by: 'Reviewer',
  reviewed_at: 'Review timestamp',
  compliance_cleared: 'Compliance cleared',
  offense_code_id: 'Offense code',
  severity: 'Severity',
  campus_id: 'Campus',
  location: 'Location',
  witnesses_present: 'Witnesses present',
  restorative_action: 'Restorative action',
  manifestation_determination: 'Manifestation determination',
  manifestation_result: 'Manifestation result',
  ard_committee_notified: 'ARD committee notified',
  ard_committee_met: 'ARD committee met',
  bip_reviewed: 'BIP reviewed',
  bip_updated: 'BIP updated',
  fba_conducted: 'FBA conducted',
  parent_notified: 'Parent notified',
  parent_notification_method: 'Notification method',
  fape_plan_documented: 'FAPE plan',
  placement_justification: 'Placement justification',
  placement_blocked: 'Placement blocked',
  block_overridden: 'Block overridden',
  override_request_id: 'Linked override request',
  completed_at: 'Completed at',
  completed_by: 'Completed by',
  plan_type: 'Plan type',
  start_date: 'Plan start',
  end_date: 'Plan end',
  review_30_date: '30-day review',
  review_60_date: '60-day review',
  review_90_date: '90-day review',
  behavioral_supports: 'Behavioral supports',
  academic_supports: 'Academic supports',
  parent_engagement: 'Parent engagement',
  reason_category: 'Override reason category',
  reason_detail: 'Override reason detail',
  supporting_document_url: 'Supporting document URL',
  approval_status: 'Override status',
  approved_by: 'Approved by',
  approved_at: 'Approval timestamp',
  approval_notes: 'Approval notes',
  requested_by: 'Requested by',
  requested_at: 'Request timestamp',
  document_sha256: 'Document SHA-256',
  document_size_bytes: 'Document size (bytes)',
  document_mime: 'Document MIME',
  document_verified_at: 'Verified at',
}

const WATCHED_BY_TYPE = {
  incidents: WATCHED_INCIDENT_FIELDS,
  compliance_checklists: WATCHED_CHECKLIST_FIELDS,
  transition_plans: WATCHED_TRANSITION_FIELDS,
  compliance_override_requests: WATCHED_OVERRIDE_FIELDS,
}

/**
 * Returns a chronological list of edits (oldest → newest) for the given
 * incident's entity graph, scoped through staff (district-wide) RLS.
 */
export function useStaffEditHistory(incident) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    if (!incident?.id) { setLoading(false); return }
    setLoading(true); setError(null)

    try {
      const incidentId = incident.id
      const checklistId = incident.compliance_checklist_id
      const transitionId = incident.transition_plan_id

      let overrideIds = []
      if (checklistId) {
        const { data: ovs } = await supabase
          .from('compliance_override_requests')
          .select('id')
          .eq('compliance_checklist_id', checklistId)
        overrideIds = (ovs || []).map(r => r.id)
      }

      const clauses = [`and(entity_type.eq.incidents,entity_id.eq.${incidentId})`]
      if (checklistId)  clauses.push(`and(entity_type.eq.compliance_checklists,entity_id.eq.${checklistId})`)
      if (transitionId) clauses.push(`and(entity_type.eq.transition_plans,entity_id.eq.${transitionId})`)
      if (overrideIds.length) {
        clauses.push(`and(entity_type.eq.compliance_override_requests,entity_id.in.(${overrideIds.join(',')}))`)
      }

      const { data: rows, error: fetchErr } = await supabase
        .from('audit_log')
        .select('id, action, entity_type, entity_id, changes, user_id, created_at')
        .or(clauses.join(','))
        .order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr

      const actorIds = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))]
      let actors = {}
      if (actorIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', actorIds)
        actors = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }

      const projected = []
      for (const row of (rows || [])) {
        const watched = WATCHED_BY_TYPE[row.entity_type] || []
        const oldVals = row.changes?.old || {}
        const newVals = row.changes?.new || {}

        if (row.action.endsWith('_created')) {
          projected.push({
            id: row.id,
            timestamp: row.created_at,
            actor: actors[row.user_id] || null,
            actor_id: row.user_id,
            entity_type: row.entity_type,
            entity_label: ENTITY_LABELS[row.entity_type] || row.entity_type,
            event_type: 'created',
            field_label: null,
            old_value: null,
            new_value: null,
          })
          continue
        }
        if (row.action.endsWith('_deleted')) {
          projected.push({
            id: row.id,
            timestamp: row.created_at,
            actor: actors[row.user_id] || null,
            actor_id: row.user_id,
            entity_type: row.entity_type,
            entity_label: ENTITY_LABELS[row.entity_type] || row.entity_type,
            event_type: 'deleted',
            field_label: null,
            old_value: null,
            new_value: null,
          })
          continue
        }
        for (const field of watched) {
          if (oldVals[field] === newVals[field]) continue
          if (oldVals[field] === undefined && newVals[field] === undefined) continue
          projected.push({
            id: `${row.id}-${field}`,
            timestamp: row.created_at,
            actor: actors[row.user_id] || null,
            actor_id: row.user_id,
            entity_type: row.entity_type,
            entity_label: ENTITY_LABELS[row.entity_type] || row.entity_type,
            event_type: 'updated',
            field_label: FIELD_LABELS[field] || field,
            field_name: field,
            old_value: oldVals[field],
            new_value: newVals[field],
          })
        }
      }

      setEvents(projected)
    } catch (err) {
      console.error('staff edit history fetch failed:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [incident?.id, incident?.compliance_checklist_id, incident?.transition_plan_id])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  return { events, loading, error, refetch: fetchHistory }
}
