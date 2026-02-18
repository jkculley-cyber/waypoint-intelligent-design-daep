import { TIER_LEVELS } from './constants'

// Maps each feature to the minimum tier required
export const FEATURE_TIER = {
  // Essential (all tiers)
  dashboard: 'essential',
  students: 'essential',
  incidents: 'essential',
  matrix_view: 'essential',

  // Professional
  transition_plans: 'professional',
  compliance: 'professional',
  alerts: 'professional',
  approval_chain: 'professional',
  daep_dashboard: 'professional',
  phone_return: 'professional',
  reports: 'professional',
  parent_portal: 'professional',
  kiosk: 'professional',
  orientation_kiosk: 'professional',

  // Enterprise
  matrix_editor: 'enterprise',
  data_import: 'enterprise',
  ai_chat: 'enterprise',
  recidivism: 'enterprise',
  interventions: 'enterprise',
}

export const FEATURE_LABELS = {
  dashboard: 'Dashboard',
  students: 'Students',
  incidents: 'Incidents',
  matrix_view: 'Discipline Matrix',
  transition_plans: 'Transition Plans',
  compliance: 'Compliance Checklists',
  alerts: 'Alerts',
  approval_chain: 'Approval Chain',
  daep_dashboard: 'DAEP Dashboard',
  phone_return: 'Phone Return',
  reports: 'Reports',
  parent_portal: 'Parent Portal',
  kiosk: 'Student Kiosk',
  orientation_kiosk: 'Orientation Kiosk',
  matrix_editor: 'Matrix Editor',
  data_import: 'Data Import',
  ai_chat: 'AI Chat Support',
  recidivism: 'Recidivism Analytics',
  interventions: 'Student Interventions',
}

/**
 * Checks whether a district's tier grants access to a feature.
 * Returns true if the district tier level >= the feature's required tier level.
 */
export function hasFeatureAccess(districtTier, feature) {
  const requiredTier = FEATURE_TIER[feature]
  if (!requiredTier) return true // unknown features default to accessible
  const districtLevel = TIER_LEVELS[districtTier] || TIER_LEVELS.enterprise
  const requiredLevel = TIER_LEVELS[requiredTier] || 1
  return districtLevel >= requiredLevel
}
