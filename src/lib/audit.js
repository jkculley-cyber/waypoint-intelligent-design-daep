import { supabase } from './supabase'

/**
 * Write an audit log entry.
 * Silently ignores errors to avoid blocking the primary action.
 *
 * @param {object} params
 * @param {string} params.action       - e.g. 'incident_approved', 'profile_role_changed'
 * @param {string} params.entityType   - e.g. 'incident', 'student', 'profile'
 * @param {string} params.entityId     - UUID of the affected record
 * @param {string} params.districtId   - District UUID
 * @param {string} params.actorRole    - Role of the actor (from profile.role)
 * @param {object} [params.oldValues]  - Previous values (optional)
 * @param {object} [params.newValues]  - New values (optional)
 */
export async function audit({
  action,
  entityType,
  entityId,
  districtId,
  actorRole,
  oldValues = null,
  newValues = null,
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_log').insert({
      district_id: districtId || null,
      actor_id: user.id,
      actor_role: actorRole || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      old_values: oldValues,
      new_values: newValues,
    })
  } catch {
    // Audit failures must never block the user's primary action
  }
}
