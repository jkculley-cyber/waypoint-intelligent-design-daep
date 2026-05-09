import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * T2-2 — Parent edit-history (CC22 R2 finding F-R2-1, Patricia's path to
 * TRULY PROTECTIVE).
 *
 * Queries audit_log for entries the parent is permitted to read via the
 * migration 079 RLS policy `parent_read_own_children`. Covers four entity
 * types tied to the incident:
 *   - incidents (the incident row itself)
 *   - compliance_checklists (linked via incident.compliance_checklist_id)
 *   - transition_plans (linked via incident.transition_plan_id)
 *   - compliance_override_requests (joined to compliance_checklists in RLS)
 *
 * Actor names join through `profiles` in a separate read because audit_log.user_id
 * FKs to auth.users (no direct PostgREST embed). This is acceptable: typical
 * parent will see ≤30 audit rows per incident, ≤5 unique actors.
 */

const WATCHED_INCIDENT_FIELDS = [
  'description', 'consequence_type', 'consequence_days',
  'consequence_start', 'consequence_end', 'status',
  'reviewed_by', 'reviewed_at', 'compliance_cleared',
]
const WATCHED_CHECKLIST_FIELDS = [
  'manifestation_determination', 'manifestation_result',
  'ard_committee_notified', 'ard_committee_met',
  'bip_reviewed', 'bip_updated', 'fba_conducted',
  'parent_notified', 'parent_notification_method',
  'fape_plan_documented', 'placement_justification', 'status',
]
const WATCHED_TRANSITION_FIELDS = [
  'plan_type', 'start_date', 'end_date', 'status',
  'review_30_date', 'review_60_date', 'review_90_date',
  'behavioral_supports', 'academic_supports', 'parent_engagement',
]
const WATCHED_OVERRIDE_FIELDS = [
  'reason_category', 'reason_detail', 'approval_status',
  'approved_by', 'approved_at', 'approval_notes',
]

const ENTITY_LABELS = {
  incidents: 'Incident details',
  compliance_checklists: 'SPED / 504 compliance',
  transition_plans: 'Transition plan',
  compliance_override_requests: 'Override request',
}

const FIELD_LABELS = {
  description: 'Description',
  consequence_type: 'Consequence type',
  consequence_days: 'Days assigned',
  consequence_start: 'Start date',
  consequence_end: 'End date',
  status: 'Status',
  reviewed_by: 'Reviewer',
  reviewed_at: 'Review timestamp',
  compliance_cleared: 'Compliance cleared',
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
  plan_type: 'Plan type',
  review_30_date: '30-day review',
  review_60_date: '60-day review',
  review_90_date: '90-day review',
  behavioral_supports: 'Behavioral supports',
  academic_supports: 'Academic supports',
  parent_engagement: 'Parent engagement',
  reason_category: 'Override reason category',
  reason_detail: 'Override reason detail',
  approval_status: 'Override status',
  approved_by: 'Approved by',
  approved_at: 'Approval timestamp',
  approval_notes: 'Approval notes',
}

const WATCHED_BY_TYPE = {
  incidents: WATCHED_INCIDENT_FIELDS,
  compliance_checklists: WATCHED_CHECKLIST_FIELDS,
  transition_plans: WATCHED_TRANSITION_FIELDS,
  compliance_override_requests: WATCHED_OVERRIDE_FIELDS,
}

export { ENTITY_LABELS, FIELD_LABELS }

/**
 * Returns a chronological list of edits (oldest → newest) the parent is
 * permitted to see for the given incident's entity graph.
 *
 * @param {object} incident with optional id, compliance_checklist_id, transition_plan_id
 */
export function useParentEditHistory(incident) {
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

      // Fetch the override-request IDs first (needed for entity_id IN clause)
      let overrideIds = []
      if (checklistId) {
        const { data: ovs } = await supabase
          .from('compliance_override_requests')
          .select('id')
          .eq('compliance_checklist_id', checklistId)
        overrideIds = (ovs || []).map(r => r.id)
      }

      // Build .or() clause covering each entity-type filter
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

      // Resolve actor names in one batch
      const actorIds = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))]
      let actors = {}
      if (actorIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', actorIds)
        actors = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }

      // Project audit rows into parent-facing edit events
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
        // updated — surface every watched field that changed
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
            old_value: oldVals[field],
            new_value: newVals[field],
          })
        }
      }

      setEvents(projected)
    } catch (err) {
      console.error('parent edit history fetch failed:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [incident?.id, incident?.compliance_checklist_id, incident?.transition_plan_id])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  return { events, loading, error, refetch: fetchHistory }
}
