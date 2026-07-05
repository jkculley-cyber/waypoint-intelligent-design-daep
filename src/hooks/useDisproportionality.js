import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Waypoint-side disproportionality monitoring (T1-7, ports
 * useDisproportionalityByRace from useNavigator.js).
 *
 * CC22 R1 finding F8 — Reyes ELEVATED (Title VI exposure unmonitored) +
 * Patricia (no in-app OCR risk index for Waypoint-only districts). Navigator
 * has it; Waypoint did not — so a Waypoint-only district can run discipline
 * for a year without seeing that its DAEP roster is 70% Black males in a
 * 28% Black district until OCR shows up.
 *
 * Data model adaptation (Waypoint vs. Navigator):
 *   - Navigator's "referrals" maps to Waypoint's all `incidents` in window
 *   - Navigator's "OSS placements" maps to Waypoint's `incidents` where
 *     consequence_type IN ('oss','daep') — long-term removals that drive the
 *     OCR disproportionality concern
 *   - Same OCR risk-index math: (cohort's share of removals) /
 *     (cohort's share of enrollment). 1.0 = proportional; 1.2+ = elevated;
 *     1.5+ = high; 2.0+ = severe.
 *   - Small-cell suppression at n<10 (OCR guidance + FERPA aggregate rule)
 *   - Longitudinal trend: current 90 days vs. prior 90 days (days 91-180)
 *     with current enrollment used as proxy denominator (we don't snapshot
 *     historical enrollment).
 */

const SMALL_CELL_THRESHOLD = 10

const RACE_LABELS = {
  asian: 'Asian',
  black: 'Black or African American',
  hispanic: 'Hispanic or Latino',
  american_indian: 'American Indian or Alaska Native',
  pacific_islander: 'Native Hawaiian or Pacific Islander',
  white: 'White',
  two_or_more: 'Two or More Races',
  not_specified: 'Not Specified',
}
export { RACE_LABELS, SMALL_CELL_THRESHOLD }

const REMOVAL_CONSEQUENCES = ['oss', 'daep']

export function useWaypointDisproportionality(campusFilterId = null) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [byRace, setByRace] = useState([])
  const [bySpedStatus, setBySpedStatus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true); setError(null)
    try {
      const d90  = new Date(Date.now() -  90 * 86400000).toISOString().split('T')[0]
      const d180 = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0]

      // Current 90-day window — all incidents (referral equivalent)
      let curIncQ = supabase
        .from('incidents')
        .select('id, student_id, campus_id, consequence_type, status, students(id, race_ethnicity, is_sped, is_504)')
        .eq('district_id', districtId)
        .gte('incident_date', d90)
        .in('status', ['approved','active','completed'])

      // Prior 90-day window for trend (days 91-180 ago)
      let priorIncQ = supabase
        .from('incidents')
        .select('id, student_id, campus_id, consequence_type, status, students(id, race_ethnicity, is_sped, is_504)')
        .eq('district_id', districtId)
        .gte('incident_date', d180)
        .lt('incident_date', d90)
        .in('status', ['approved','active','completed'])

      // Enrollment denominator (current state — no historical snapshot)
      let studQ = supabase
        .from('students')
        .select('id, campus_id, race_ethnicity, is_sped, is_504')
        .eq('district_id', districtId)
        .eq('is_active', true)

      // P2: campus filter. Two layers:
      //   - non-admin users are always scoped to their assigned campusIds (RLS-aligned)
      //   - admin users may opt to drill into a single campus via campusFilterId
      // Title VI complaints come campus-by-campus. District-aggregate hides
      // exactly the disparity OCR investigates first.
      if (!isAdmin() && campusIds?.length) {
        curIncQ = curIncQ.in('campus_id', campusIds)
        priorIncQ = priorIncQ.in('campus_id', campusIds)
        studQ = studQ.in('campus_id', campusIds)
      }
      if (campusFilterId) {
        curIncQ = curIncQ.eq('campus_id', campusFilterId)
        priorIncQ = priorIncQ.eq('campus_id', campusFilterId)
        studQ = studQ.eq('campus_id', campusFilterId)
      }

      const [curRes, priorRes, studRes] = await Promise.all([curIncQ, priorIncQ, studQ])
      if (curRes.error) throw curRes.error
      if (priorRes.error) throw priorRes.error
      if (studRes.error) throw studRes.error

      const curIncidents = curRes.data || []
      const priorIncidents = priorRes.data || []
      const enrollment = studRes.data || []

      // ─── Aggregate by race ───
      const raceEnroll = {}
      enrollment.forEach(s => {
        const r = s.race_ethnicity || 'not_specified'
        raceEnroll[r] = (raceEnroll[r] || 0) + 1
      })

      const raceRefs = {}      // all incidents = referral equivalent
      const raceISS = {}
      const raceRemovals = {}  // oss + daep = removal equivalent
      curIncidents.forEach(inc => {
        const race = inc.students?.race_ethnicity || 'not_specified'
        raceRefs[race] = (raceRefs[race] || 0) + 1
        if (inc.consequence_type === 'iss') raceISS[race] = (raceISS[race] || 0) + 1
        if (REMOVAL_CONSEQUENCES.includes(inc.consequence_type)) {
          raceRemovals[race] = (raceRemovals[race] || 0) + 1
        }
      })

      const totalEnroll = enrollment.length
      const totalRefs = curIncidents.length
      const totalRemovals = curIncidents.filter(i => REMOVAL_CONSEQUENCES.includes(i.consequence_type)).length

      // Prior-window removals by race
      const priorRaceRemovals = {}
      priorIncidents.forEach(inc => {
        if (!REMOVAL_CONSEQUENCES.includes(inc.consequence_type)) return
        const race = inc.students?.race_ethnicity || 'not_specified'
        priorRaceRemovals[race] = (priorRaceRemovals[race] || 0) + 1
      })
      const totalPriorRemovals = priorIncidents.filter(i => REMOVAL_CONSEQUENCES.includes(i.consequence_type)).length

      const raceBuckets = Object.keys({ ...raceEnroll, ...raceRefs }).map(race => {
        const enroll = raceEnroll[race] || 0
        const refs = raceRefs[race] || 0
        const iss = raceISS[race] || 0
        const removals = raceRemovals[race] || 0
        const suppressed = enroll < SMALL_CELL_THRESHOLD

        // OCR risk index: (race's share of removals) / (race's share of enrollment)
        const enrollShare = totalEnroll > 0 ? enroll / totalEnroll : 0
        const refShare = totalRefs > 0 ? refs / totalRefs : 0
        const removalShare = totalRemovals > 0 ? removals / totalRemovals : 0
        const refIndex = enrollShare > 0 ? refShare / enrollShare : null
        const removalIndex = enrollShare > 0 ? removalShare / enrollShare : null

        const priorRemovals = priorRaceRemovals[race] || 0
        const priorRemovalShare = totalPriorRemovals > 0 ? priorRemovals / totalPriorRemovals : 0
        const priorRemovalIndex = enrollShare > 0 ? priorRemovalShare / enrollShare : null

        let trend = null, trendDelta = null
        if (!suppressed && removalIndex != null && priorRemovalIndex != null && (removals >= 5 || priorRemovals >= 5)) {
          trendDelta = +(removalIndex - priorRemovalIndex).toFixed(2)
          if (Math.abs(trendDelta) < 0.15) trend = 'flat'
          else if (trendDelta > 0) trend = 'up'
          else trend = 'down'
        }

        return {
          race,
          label: RACE_LABELS[race] || race,
          enrollment: enroll,
          enrollment_share: +(enrollShare * 100).toFixed(1),
          referrals: refs,
          referral_share: +(refShare * 100).toFixed(1),
          referral_rate: enroll > 0 ? +(refs / enroll * 100).toFixed(1) : null,
          referral_risk_index: refIndex != null ? +refIndex.toFixed(2) : null,
          iss,
          removals,
          removal_share: +(removalShare * 100).toFixed(1),
          removal_rate: enroll > 0 ? +(removals / enroll * 100).toFixed(1) : null,
          // Field name kept as oss_risk_index for shared UI components from
          // the Navigator port; semantically this is OSS+DAEP combined.
          oss_risk_index: removalIndex != null ? +removalIndex.toFixed(2) : null,
          prior_removals: priorRemovals,
          prior_oss_risk_index: priorRemovalIndex != null ? +priorRemovalIndex.toFixed(2) : null,
          trend,
          trend_delta: trendDelta,
          suppressed,
          severity: suppressed ? null
            : removalIndex == null ? null
            : removalIndex >= 2.0 ? 'severe'
            : removalIndex >= 1.5 ? 'high'
            : removalIndex >= 1.2 ? 'elevated'
            : 'within_range',
        }
      }).sort((a, b) => (b.oss_risk_index || 0) - (a.oss_risk_index || 0))

      setByRace(raceBuckets)

      // ─── Aggregate by SPED + 504 ───
      const spedEnroll = enrollment.filter(s => s.is_sped).length
      const spedRefs = curIncidents.filter(i => i.students?.is_sped).length
      const spedRemovals = curIncidents.filter(i => REMOVAL_CONSEQUENCES.includes(i.consequence_type) && i.students?.is_sped).length
      const fivePctEnroll = enrollment.filter(s => s.is_504).length
      const fivePctRefs = curIncidents.filter(i => i.students?.is_504).length
      const fivePctRemovals = curIncidents.filter(i => REMOVAL_CONSEQUENCES.includes(i.consequence_type) && i.students?.is_504).length
      const priorSpedRemovals = priorIncidents.filter(i => REMOVAL_CONSEQUENCES.includes(i.consequence_type) && i.students?.is_sped).length
      const priorFivePctRemovals = priorIncidents.filter(i => REMOVAL_CONSEQUENCES.includes(i.consequence_type) && i.students?.is_504).length

      const trendOf = (curIndex, priorIndex, curN, priorN) => {
        if (curIndex == null || priorIndex == null) return { trend: null, delta: null }
        if (curN < 5 && priorN < 5) return { trend: null, delta: null }
        const delta = +(curIndex - priorIndex).toFixed(2)
        const t = Math.abs(delta) < 0.15 ? 'flat' : delta > 0 ? 'up' : 'down'
        return { trend: t, delta }
      }

      const spedRows = []
      const buildRow = (group, label, enroll, refs, removals, priorRemovals) => {
        const suppressed = enroll < SMALL_CELL_THRESHOLD && enroll > 0
        if (suppressed) return { group, label, suppressed: true, enrollment: enroll }
        const enrollShare = totalEnroll > 0 ? enroll / totalEnroll : 0
        const removalShare = totalRemovals > 0 ? removals / totalRemovals : 0
        const priorRemovalShare = totalPriorRemovals > 0 ? priorRemovals / totalPriorRemovals : 0
        const removalIndex = enrollShare > 0 ? +(removalShare / enrollShare).toFixed(2) : null
        const priorRemovalIndex = enrollShare > 0 ? +(priorRemovalShare / enrollShare).toFixed(2) : null
        const { trend, delta } = trendOf(removalIndex, priorRemovalIndex, removals, priorRemovals)
        return {
          group, label,
          enrollment: enroll,
          enrollment_share: +(enrollShare * 100).toFixed(1),
          referrals: refs,
          removals,
          removal_share: +(removalShare * 100).toFixed(1),
          oss_risk_index: removalIndex,
          prior_removals: priorRemovals,
          prior_oss_risk_index: priorRemovalIndex,
          trend, trend_delta: delta,
          suppressed: false,
        }
      }
      spedRows.push(buildRow('sped', 'SPED (IDEA)', spedEnroll, spedRefs, spedRemovals, priorSpedRemovals))
      spedRows.push(buildRow('504', 'Section 504', fivePctEnroll, fivePctRefs, fivePctRemovals, priorFivePctRemovals))
      setBySpedStatus(spedRows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds, campusFilterId])

  useEffect(() => { fetch() }, [fetch])

  return {
    byRace,
    bySpedStatus,
    loading,
    error,
    refetch: fetch,
    smallCellThreshold: SMALL_CELL_THRESHOLD,
  }
}
