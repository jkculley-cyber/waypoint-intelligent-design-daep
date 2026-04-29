import { supabase } from './supabase'

/**
 * Write an audit log entry.
 *
 * Production audit_log shape (verified 2026-04-29 against
 * project kvxecksvkimcgwhxxyhw): { district_id, user_id (NOT NULL FK→auth.users),
 * action, entity_type, entity_id (NOT NULL), changes (JSONB), ip_address,
 * user_agent, created_at }. The migration source files diverge from this; trust
 * the production schema. See DECISIONS.md 2026-04-28.
 *
 * Failures log to console.error rather than throwing so the primary action is
 * not blocked, but the divergence will surface in browser logs and is visible
 * to monitoring rather than silently swallowed.
 *
 * @param {object} params
 * @param {string} params.action       - e.g. 'incident_approved', 'profile_role_changed'
 * @param {string} params.entityType   - e.g. 'incident', 'student', 'profile'
 * @param {string} params.entityId     - UUID of the affected record (REQUIRED — NOT NULL in production)
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
    if (!entityId) {
      console.error('[audit] skipped: entityId is required (audit_log.entity_id is NOT NULL in production)', {
        action, entityType,
      })
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('[audit] skipped: no auth user', { action, entityType, entityId })
      return
    }

    const changes = {}
    if (oldValues) changes.old = oldValues
    if (newValues) changes.new = newValues
    if (actorRole) changes.actor_role = actorRole

    const { error } = await supabase.from('audit_log').insert({
      district_id: districtId || null,
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
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
