/**
 * Recidivism Risk Scoring Engine
 *
 * Pure deterministic algorithm — no AI/API calls.
 * Analyzes offense history and intervention effectiveness
 * to produce a 0-100 risk score with contributing factors.
 */

const SEVERITY_WEIGHT = { minor: 1, moderate: 2, serious: 3, severe: 4 }

/**
 * Map offense categories to intervention categories that address them
 */
const OFFENSE_TO_INTERVENTION_CATEGORY = {
  fighting: ['behavioral', 'social_emotional', 'restorative'],
  drugs_alcohol: ['behavioral', 'social_emotional', 'mentoring'],
  weapons: ['behavioral', 'social_emotional'],
  harassment_bullying: ['social_emotional', 'restorative', 'mentoring'],
  truancy: ['academic', 'mentoring'],
  defiance: ['behavioral', 'restorative', 'mentoring'],
  theft: ['restorative', 'behavioral'],
  vandalism: ['restorative', 'behavioral'],
  sexual_offense: ['behavioral', 'social_emotional'],
  gang_related: ['mentoring', 'social_emotional', 'behavioral'],
  other: ['behavioral', 'mentoring'],
}

/**
 * Calculate recidivism risk score for a student.
 *
 * @param {Object} params
 * @param {Array} params.incidents - Student incidents with offense data (offense.severity, consequence_type)
 * @param {Array} params.studentInterventions - Student interventions with effectiveness ratings
 * @param {Date}  [params.schoolYearStart] - Start of current school year (defaults to Aug 1 of current academic year)
 * @returns {{ score: number, riskLevel: string, factors: Array<{ label: string, points: number, maxPoints: number, description: string }> }}
 */
export function calculateRecidivismRisk({ incidents = [], studentInterventions = [], schoolYearStart }) {
  const now = new Date()
  if (!schoolYearStart) {
    const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    schoolYearStart = new Date(year, 7, 1) // August 1
  }

  const factors = []

  // --- Factor 1: Prior DAEP placements (max 30) ---
  const daepCount = incidents.filter(i => i.consequence_type === 'daep').length
  let daepPoints = 0
  if (daepCount >= 2) daepPoints = 30
  else if (daepCount === 1) daepPoints = 15
  factors.push({
    label: 'Prior DAEP Placements',
    points: daepPoints,
    maxPoints: 30,
    description: daepCount === 0
      ? 'No prior DAEP placements'
      : `${daepCount} DAEP placement${daepCount > 1 ? 's' : ''} on record`,
  })

  // --- Factor 2: Offense severity escalation (max 20) ---
  const dated = incidents
    .filter(i => i.incident_date && i.offense?.severity)
    .sort((a, b) => new Date(a.incident_date) - new Date(b.incident_date))

  let escalationPoints = 0
  if (dated.length >= 2) {
    const mid = Math.floor(dated.length / 2)
    const olderAvg = dated.slice(0, mid).reduce((s, i) => s + (SEVERITY_WEIGHT[i.offense.severity] || 0), 0) / mid
    const recentAvg = dated.slice(mid).reduce((s, i) => s + (SEVERITY_WEIGHT[i.offense.severity] || 0), 0) / (dated.length - mid)

    if (recentAvg > olderAvg + 0.25) {
      escalationPoints = 20
    } else if (recentAvg >= olderAvg - 0.25) {
      escalationPoints = 8
    }
    // de-escalating = 0
  }
  const escalationDesc = escalationPoints === 20
    ? 'Offense severity is escalating over time'
    : escalationPoints === 8
      ? 'Offense severity is stable'
      : dated.length < 2
        ? 'Not enough incidents to assess trend'
        : 'Offense severity is de-escalating'
  factors.push({
    label: 'Offense Severity Trend',
    points: escalationPoints,
    maxPoints: 20,
    description: escalationDesc,
  })

  // --- Factor 3: Recent incident frequency (max 20) ---
  const daysAgo = (d) => (now - new Date(d)) / 86400000
  const in30 = incidents.filter(i => i.incident_date && daysAgo(i.incident_date) <= 30).length
  const in60 = incidents.filter(i => i.incident_date && daysAgo(i.incident_date) <= 60).length
  const in90 = incidents.filter(i => i.incident_date && daysAgo(i.incident_date) <= 90).length

  let freqPoints = 0
  let freqDesc = 'No recent incidents'
  if (in30 >= 3) { freqPoints = 20; freqDesc = `${in30} incidents in the last 30 days` }
  else if (in30 >= 2) { freqPoints = 15; freqDesc = `${in30} incidents in the last 30 days` }
  else if (in60 >= 3) { freqPoints = 12; freqDesc = `${in60} incidents in the last 60 days` }
  else if (in90 >= 1) { freqPoints = 5; freqDesc = `${in90} incident${in90 > 1 ? 's' : ''} in the last 90 days` }
  factors.push({
    label: 'Recent Incident Frequency',
    points: freqPoints,
    maxPoints: 20,
    description: freqDesc,
  })

  // --- Factor 4: Total incidents this school year (max 10) ---
  const syIncidents = incidents.filter(i => i.incident_date && new Date(i.incident_date) >= schoolYearStart)
  const syCount = syIncidents.length
  let syPoints = 0
  if (syCount >= 6) syPoints = 10
  else if (syCount >= 4) syPoints = 6
  else if (syCount >= 2) syPoints = 3
  factors.push({
    label: 'School Year Incidents',
    points: syPoints,
    maxPoints: 10,
    description: `${syCount} incident${syCount !== 1 ? 's' : ''} this school year`,
  })

  // --- Factor 5: Intervention ineffectiveness (max 15) ---
  const rated = studentInterventions.filter(si => si.effectiveness && si.effectiveness !== 'not_rated')
  let intPoints = 0
  let intDesc = ''
  if (rated.length === 0) {
    intPoints = studentInterventions.length === 0 ? 12 : 3
    intDesc = studentInterventions.length === 0
      ? 'No interventions have been tried'
      : 'Interventions assigned but not yet rated'
  } else {
    const ineffective = rated.filter(si => si.effectiveness === 'ineffective').length
    const pct = ineffective / rated.length
    if (pct >= 0.5) { intPoints = 15; intDesc = `${Math.round(pct * 100)}% of rated interventions were ineffective` }
    else if (pct >= 0.25) { intPoints = 10; intDesc = `${Math.round(pct * 100)}% of rated interventions were ineffective` }
    else { intPoints = 3; intDesc = 'Most interventions have been effective' }
  }
  factors.push({
    label: 'Intervention Effectiveness',
    points: intPoints,
    maxPoints: 15,
    description: intDesc,
  })

  // --- Factor 6: No intervention coverage for high-severity offenses (max 5) ---
  const highSevIncidents = incidents.filter(i =>
    i.offense?.severity === 'serious' || i.offense?.severity === 'severe'
  )
  const coveredIncidentIds = new Set(studentInterventions.map(si => si.incident_id).filter(Boolean))
  const uncovered = highSevIncidents.filter(i => !coveredIncidentIds.has(i.id))
  const coveragePoints = uncovered.length > 0 ? 5 : 0
  factors.push({
    label: 'Intervention Coverage Gaps',
    points: coveragePoints,
    maxPoints: 5,
    description: uncovered.length > 0
      ? `${uncovered.length} high-severity offense${uncovered.length > 1 ? 's' : ''} with no intervention assigned`
      : 'All high-severity offenses have intervention coverage',
  })

  // --- Compute total ---
  const score = factors.reduce((sum, f) => sum + f.points, 0)
  const riskLevel = score <= 33 ? 'Low' : score <= 66 ? 'Medium' : 'High'

  return { score, riskLevel, factors }
}

/**
 * Suggest targeted interventions based on risk profile.
 *
 * @param {Object} params
 * @param {string} params.riskLevel - 'Low' | 'Medium' | 'High'
 * @param {Array} params.incidents - Student incidents with offense category
 * @param {Array} params.studentInterventions - Current/past student interventions
 * @param {Array} params.interventionsCatalog - All active interventions
 * @param {Object} params.student - Student record (for SPED check)
 * @returns {Array<{ id: string, name: string, tier: number, category: string, reason: string }>}
 */
export function suggestInterventions({ riskLevel, incidents = [], studentInterventions = [], interventionsCatalog = [], student }) {
  // Determine preferred tier based on risk
  const preferredTier = riskLevel === 'High' ? 3 : riskLevel === 'Medium' ? 2 : 1

  // Build sets of interventions to exclude
  const ineffectiveIds = new Set(
    studentInterventions
      .filter(si => si.effectiveness === 'ineffective')
      .map(si => si.intervention_id)
  )
  const activeIds = new Set(
    studentInterventions
      .filter(si => si.status === 'assigned' || si.status === 'active')
      .map(si => si.intervention_id)
  )

  // Identify relevant intervention categories from offense history
  const offenseCategories = [...new Set(incidents.map(i => i.offense?.category).filter(Boolean))]
  const relevantInterventionCats = new Set(
    offenseCategories.flatMap(oc => OFFENSE_TO_INTERVENTION_CATEGORY[oc] || ['behavioral'])
  )

  // Filter catalog
  let candidates = interventionsCatalog.filter(iv => {
    if (ineffectiveIds.has(iv.id)) return false
    if (activeIds.has(iv.id)) return false
    return true
  })

  // Score each candidate
  const scored = candidates.map(iv => {
    let priority = 0
    const reasons = []

    // Tier match
    if (iv.tier === preferredTier) {
      priority += 10
      reasons.push(`Tier ${iv.tier} matches ${riskLevel.toLowerCase()} risk level`)
    } else if (Math.abs(iv.tier - preferredTier) === 1) {
      priority += 5
    }

    // Category match
    if (relevantInterventionCats.has(iv.category)) {
      priority += 8
      const matchingOffenses = offenseCategories.filter(oc =>
        (OFFENSE_TO_INTERVENTION_CATEGORY[oc] || []).includes(iv.category)
      )
      if (matchingOffenses.length > 0) {
        reasons.push(`Addresses ${matchingOffenses.join(', ').replace(/_/g, ' ')} offenses`)
      }
    }

    // Evidence level
    if (iv.evidence_level === 'evidence_based') {
      priority += 4
      reasons.push('Evidence-based intervention')
    } else if (iv.evidence_level === 'promising') {
      priority += 2
    }

    // SPED match
    if (student?.is_sped && iv.target_population?.includes('sped')) {
      priority += 3
      reasons.push('Designed for SPED students')
    }

    const reason = reasons.length > 0 ? reasons.join('. ') : `Tier ${iv.tier} intervention`

    return { ...iv, priority, reason }
  })

  // Sort by priority descending, return top 5
  scored.sort((a, b) => b.priority - a.priority)

  return scored.slice(0, 5).map(({ id, name, tier, category, reason, description }) => ({
    id,
    name,
    tier,
    category,
    reason,
    description,
  }))
}
