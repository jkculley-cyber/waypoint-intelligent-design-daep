import { ROLES, CAMPUS_TYPES } from './constants'

/**
 * Determine the access scope for a user based on their role and campus assignments.
 *
 * District-wide access: Admin only, or anyone assigned to a DAEP campus.
 * Campus-only access: Principal, AP, Counselor, Teacher — see only their assigned campus data.
 * SPED-only access: SPED Coordinator — see only SPED/504 students at their campus.
 *
 * @param {object} profile - User profile with `role` field
 * @param {string[]} campusIds - IDs of campuses assigned to the user
 * @param {object[]} campuses - All campuses (with `id` and `campus_type`)
 * @returns {{ isDistrictWide: boolean, scopedCampusIds: string[] | null, spedOnly: boolean }}
 */
export function getUserAccessScope(profile, campusIds, campuses) {
  if (!profile) return { isDistrictWide: false, scopedCampusIds: [], spedOnly: false }

  // Only Admin gets automatic district-wide access
  if (profile.role === ROLES.ADMIN) {
    return { isDistrictWide: true, scopedCampusIds: null, spedOnly: false }
  }

  // Anyone assigned to a DAEP campus gets district-wide access (they serve all campuses)
  if (campusIds?.length && campuses?.length) {
    const assignedCampuses = campuses.filter(c => campusIds.includes(c.id))
    const hasDaepCampus = assignedCampuses.some(c => c.campus_type === CAMPUS_TYPES.DAEP)
    if (hasDaepCampus) {
      return { isDistrictWide: true, scopedCampusIds: null, spedOnly: false }
    }
  }

  // SPED Coordinator: campus-scoped AND limited to SPED/504 students only
  const spedOnly = profile.role === ROLES.SPED_COORDINATOR

  // Campus-scoped: Principal, AP, Counselor, SPED Coordinator, Teacher, CBC, SSS, 504 — see only their campus
  return {
    isDistrictWide: false,
    scopedCampusIds: campusIds || [],
    spedOnly,
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
