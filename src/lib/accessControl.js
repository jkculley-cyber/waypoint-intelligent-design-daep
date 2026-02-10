import { ROLES, CAMPUS_TYPES } from './constants'

/**
 * Determine the access scope for a user based on their role and campus assignments.
 *
 * District-wide access: Admin, Principal, or anyone assigned to a DAEP campus.
 * Campus-only access: AP, Counselor, SPED Coordinator, Teacher — see only their assigned campus data.
 *
 * @param {object} profile - User profile with `role` field
 * @param {string[]} campusIds - IDs of campuses assigned to the user
 * @param {object[]} campuses - All campuses (with `id` and `campus_type`)
 * @returns {{ isDistrictWide: boolean, scopedCampusIds: string[] | null }}
 */
export function getUserAccessScope(profile, campusIds, campuses) {
  if (!profile) return { isDistrictWide: false, scopedCampusIds: [] }

  // Admin and Principal always get district-wide access
  if (profile.role === ROLES.ADMIN || profile.role === ROLES.PRINCIPAL) {
    return { isDistrictWide: true, scopedCampusIds: null }
  }

  // Anyone assigned to a DAEP campus gets district-wide access
  if (campusIds?.length && campuses?.length) {
    const assignedCampuses = campuses.filter(c => campusIds.includes(c.id))
    const hasDaepCampus = assignedCampuses.some(c => c.campus_type === CAMPUS_TYPES.DAEP)
    if (hasDaepCampus) {
      return { isDistrictWide: true, scopedCampusIds: null }
    }
  }

  // Campus-scoped: AP, Counselor, SPED Coordinator, Teacher
  return {
    isDistrictWide: false,
    scopedCampusIds: campusIds || [],
  }
}

/**
 * Apply campus scoping to a Supabase query when the user is campus-scoped.
 *
 * @param {object} query - Supabase query builder
 * @param {{ isDistrictWide: boolean, scopedCampusIds: string[] | null }} scope
 * @returns {object} The (possibly filtered) query
 */
export function applyCampusScope(query, scope) {
  if (scope.isDistrictWide || !scope.scopedCampusIds) return query
  return query.in('campus_id', scope.scopedCampusIds)
}
