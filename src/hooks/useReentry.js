import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch + upsert the Return Ready checklist for a transition plan.
 */
export function useReentryChecklist(planId) {
  const { districtId } = useAuth()
  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    if (!planId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('reentry_checklists')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle()
    setChecklist(data)
    setLoading(false)
  }, [planId])

  useEffect(() => { fetch() }, [fetch])

  const updateField = useCallback(async (field, value) => {
    if (!planId || !districtId) return
    setSaving(true)

    // Auto-set completed_at timestamps by party when all their items are checked
    const updates = { [field]: value, updated_at: new Date().toISOString() }

    const current = { ...checklist, [field]: value }

    if (field.startsWith('student_') && current.student_goals_met && current.student_commitment_signed) {
      updates.student_completed_at = current.student_completed_at || new Date().toISOString()
    }
    if (field.startsWith('parent_') && current.parent_plan_acknowledged && current.parent_contact_confirmed) {
      updates.parent_completed_at = current.parent_completed_at || new Date().toISOString()
    }
    if (field.startsWith('counselor_') && current.counselor_schedule_set && current.counselor_teachers_briefed) {
      updates.counselor_completed_at = current.counselor_completed_at || new Date().toISOString()
    }
    if (field === 'admin_schedule_confirmed' && value) {
      updates.admin_completed_at = current.admin_completed_at || new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('reentry_checklists')
      .upsert({ plan_id: planId, district_id: districtId, ...updates }, { onConflict: 'plan_id' })
      .select()
      .single()

    if (!error) setChecklist(data)
    setSaving(false)
    return { error }
  }, [planId, districtId, checklist])

  const markBriefSent = useCallback(async (sentById) => {
    const { data, error } = await supabase
      .from('reentry_checklists')
      .upsert({
        plan_id: planId,
        district_id: districtId,
        brief_sent_at: new Date().toISOString(),
        brief_sent_by: sentById,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plan_id' })
      .select()
      .single()
    if (!error) setChecklist(data)
    return { error }
  }, [planId, districtId])

  const setReturnDate = useCallback(async (date) => {
    const { data, error } = await supabase
      .from('reentry_checklists')
      .upsert({
        plan_id: planId,
        district_id: districtId,
        return_date: date,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'plan_id' })
      .select()
      .single()
    if (!error) setChecklist(data)
    return { error }
  }, [planId, districtId])

  const isReady = checklist
    ? checklist.student_goals_met &&
      checklist.student_commitment_signed &&
      checklist.parent_plan_acknowledged &&
      checklist.parent_contact_confirmed &&
      checklist.counselor_schedule_set &&
      checklist.counselor_teachers_briefed &&
      checklist.admin_schedule_confirmed
    : false

  const readyCount = checklist ? [
    checklist.student_goals_met,
    checklist.student_commitment_signed,
    checklist.parent_plan_acknowledged,
    checklist.parent_contact_confirmed,
    checklist.counselor_schedule_set,
    checklist.counselor_teachers_briefed,
    checklist.admin_schedule_confirmed,
  ].filter(Boolean).length : 0

  return { checklist, loading, saving, updateField, markBriefSent, setReturnDate, isReady, readyCount, refetch: fetch }
}

/**
 * Post-return counselor check-ins for a plan.
 */
export function useReentryCheckins(planId) {
  const { districtId, user } = useAuth()
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const fetch = useCallback(async () => {
    if (!planId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('reentry_checkins')
      .select('*, counselor:profiles!reentry_checkins_counselor_id_fkey(full_name)')
      .eq('plan_id', planId)
      .order('checkin_date', { ascending: false })
    setCheckins(data || [])
    setLoading(false)
  }, [planId])

  useEffect(() => { fetch() }, [fetch])

  const addCheckin = useCallback(async ({ status, notes, studentId }) => {
    if (!planId || !districtId || !user?.id) return
    setAdding(true)
    const { data, error } = await supabase
      .from('reentry_checkins')
      .insert({
        plan_id: planId,
        student_id: studentId,
        district_id: districtId,
        counselor_id: user.id,
        checkin_date: new Date().toISOString().split('T')[0],
        status,
        notes: notes || null,
      })
      .select('*, counselor:profiles!reentry_checkins_counselor_id_fkey(full_name)')
      .single()
    if (!error) setCheckins(prev => [data, ...prev])
    setAdding(false)
    return { error }
  }, [planId, districtId, user])

  // Days since last check-in
  const daysSinceLastCheckin = checkins.length > 0
    ? Math.floor((Date.now() - new Date(checkins[0].checkin_date)) / 86400000)
    : null

  return { checkins, loading, adding, addCheckin, daysSinceLastCheckin, refetch: fetch }
}

/**
 * Analyze behavior trajectory for adaptive timeline recommendations.
 * Returns a recommendation based on last 7 days of kiosk data.
 */
export function useReentryAdvisory(studentId) {
  const [advisory, setAdvisory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) { setLoading(false); return }

    async function analyze() {
      setLoading(true)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const { data } = await supabase
        .from('daily_behavior_tracking')
        .select('tracking_date, goal_met, daily_total, daily_goal')
        .eq('student_id', studentId)
        .gte('tracking_date', sevenDaysAgo)
        .order('tracking_date', { ascending: false })

      if (!data || data.length < 3) {
        setAdvisory({ type: 'insufficient', message: 'Not enough kiosk data for trajectory analysis.' })
        setLoading(false)
        return
      }

      const goalMetRate = data.filter(d => d.goal_met).length / data.length
      const recentThree = data.slice(0, 3)
      const recentConcerning = recentThree.filter(d => !d.goal_met).length

      if (goalMetRate >= 0.8 && recentConcerning === 0) {
        setAdvisory({
          type: 'positive',
          color: 'green',
          label: 'Positive Trajectory',
          message: `Goal met ${Math.round(goalMetRate * 100)}% of the last ${data.length} days. Consider scheduling an early review.`,
        })
      } else if (recentConcerning >= 2) {
        setAdvisory({
          type: 'concerning',
          color: 'red',
          label: 'Concerning Trend',
          message: `Goal missed ${recentConcerning} of the last 3 days. Recommend a check-in before the next scheduled review.`,
        })
      } else if (goalMetRate >= 0.5) {
        setAdvisory({
          type: 'neutral',
          color: 'yellow',
          label: 'Mixed Progress',
          message: `Goal met ${Math.round(goalMetRate * 100)}% of days. Continue monitoring — on pace for scheduled review.`,
        })
      } else {
        setAdvisory({
          type: 'concerning',
          color: 'red',
          label: 'At Risk',
          message: `Goal met only ${Math.round(goalMetRate * 100)}% of days. Review current supports and consider plan modification.`,
        })
      }
      setLoading(false)
    }

    analyze()
  }, [studentId])

  return { advisory, loading }
}

/**
 * Plans with return dates this week — for the dashboard widget.
 */
export function useReturningThisWeek() {
  const { districtId } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!districtId) return
    async function fetch() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      // Plans ending this week (DAEP exit / reentry types, active status)
      const { data: planData } = await supabase
        .from('transition_plans')
        .select(`
          id, plan_type, end_date,
          student:students(id, first_name, last_name, grade_level),
          reentry_checklist:reentry_checklists(is_ready, brief_sent_at, return_date)
        `)
        .eq('district_id', districtId)
        .eq('status', 'active')
        .in('plan_type', ['daep_exit', 'iss_reentry'])
        .gte('end_date', today)
        .lte('end_date', nextWeek)
        .order('end_date', { ascending: true })

      // Active plans past end_date with no completion — returned students needing check-ins
      const { data: returnedData } = await supabase
        .from('transition_plans')
        .select(`
          id, plan_type, end_date,
          student:students(id, first_name, last_name),
          reentry_checkins(id, checkin_date, status)
        `)
        .eq('district_id', districtId)
        .eq('status', 'active')
        .in('plan_type', ['daep_exit', 'iss_reentry'])
        .lt('end_date', today)

      setPlans({
        returning: planData || [],
        returned: (returnedData || []).map(p => {
          const latest = p.reentry_checkins?.[0]
          const daysSince = latest
            ? Math.floor((Date.now() - new Date(latest.checkin_date)) / 86400000)
            : null
          return { ...p, daysSinceCheckin: daysSince }
        }).filter(p => p.daysSinceCheckin === null || p.daysSinceCheckin >= 5),
      })
      setLoading(false)
    }
    fetch()
  }, [districtId])

  return { plans, loading }
}
