import { ROLES } from './constants'

/**
 * Import permission tiers:
 * Tier 1 (Admin Only) - Only admin can import anything
 * Tier 2 (Admin + Principal) - Principals can import students/incidents for their campuses
 * Tier 3 (Extended) - All staff can import students/incidents for their campuses
 */

const TIER_RULES = {
  1: {
    campuses: [ROLES.ADMIN],
    students: [ROLES.ADMIN],
    profiles: [ROLES.ADMIN],
    incidents: [ROLES.ADMIN],
  },
  2: {
    campuses: [ROLES.ADMIN],
    students: [ROLES.ADMIN, ROLES.PRINCIPAL],
    profiles: [ROLES.ADMIN],
    incidents: [ROLES.ADMIN, ROLES.PRINCIPAL],
  },
  3: {
    campuses: [ROLES.ADMIN],
    students: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.AP, ROLES.COUNSELOR, ROLES.SPED_COORDINATOR, ROLES.TEACHER],
    profiles: [ROLES.ADMIN],
    incidents: [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.AP, ROLES.COUNSELOR, ROLES.SPED_COORDINATOR, ROLES.TEACHER],
  },
}

/**
 * Check if a user can import a specific data type
 * @param {object} params
 * @param {string} params.role - User's role
 * @param {string} params.importType - 'campuses' | 'students' | 'profiles' | 'incidents'
 * @param {number} params.tier - District's import tier (1-3), defaults to 1
 * @returns {{ allowed: boolean, campusScoped: boolean }}
 */
export function canImport({ role, importType, tier = 1 }) {
  const rules = TIER_RULES[tier] || TIER_RULES[1]
  const allowedRoles = rules[importType]

  if (!allowedRoles) {
    return { allowed: false, campusScoped: false }
  }

  const allowed = allowedRoles.includes(role)
  // Non-admin users are campus-scoped
  const campusScoped = allowed && role !== ROLES.ADMIN

  return { allowed, campusScoped }
}

/**
 * Get all importable types for a given role and tier
 */
export function getImportableTypes({ role, tier = 1 }) {
  const rules = TIER_RULES[tier] || TIER_RULES[1]
  const types = []

  for (const [importType, allowedRoles] of Object.entries(rules)) {
    if (allowedRoles.includes(role)) {
      types.push(importType)
    }
  }

  return types
}

/**
 * Get the district's import tier from settings
 */
export function getImportTier(districtSettings) {
  const tier = districtSettings?.import_tier
  if (tier && [1, 2, 3].includes(tier)) return tier
  return 1 // default to most restrictive
}
