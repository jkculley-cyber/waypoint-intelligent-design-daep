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
    if (!user) {
      console.warn('[audit] skipped: no auth user', { action, entityType, entityId })
      return
    }

    // Production audit_log shape: { district_id, user_id (NOT NULL), action,
    // entity_type, entity_id, changes (JSONB combining old + new + actor_role) }
    const changes = {}
    if (oldValues) changes.old = oldValues
    if (newValues) changes.new = newValues
    if (actorRole) changes.actor_role = actorRole

    const { error } = await supabase.from('audit_log').insert({
      district_id: districtId || null,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      changes: Object.keys(changes).length ? changes : null,
    })
    if (error) {
      console.error('[audit] insert failed — primary action proceeded but audit log is incomplete', {
        action, entityType, entityId, error: error.message,
      })
    }
  } catch (err) {
    console.error('[audit] unexpected exception — primary action proceeded but audit log is incomplete', {
      action, entityType, entityId, error: err?.message,
    })
  }
}
