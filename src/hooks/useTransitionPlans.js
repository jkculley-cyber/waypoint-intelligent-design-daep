import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch transition plans with optional filters
 */
export function useTransitionPlans(filters = {}) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchPlans = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    try {
      let query = supabase
        .from('transition_plans')
        .select(`
          *,
          students (id, first_name, last_name, student_id_number, grade_level, is_sped, is_504, campus_id),
          incidents!transition_plans_incident_id_fkey (id, offense_code_id, consequence_type, consequence_days),
          profiles!transition_plans_created_by_fkey (id, full_name)
        `)
        .eq('district_id', districtId)
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.plan_type) query = query.eq('plan_type', filters.plan_type)
      if (filters.student_id) query = query.eq('student_id', filters.student_id)
      if (filters.campus_id) query = query.eq('students.campus_id', filters.campus_id)

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setPlans(data || [])
    } catch (err) {
      console.error('Error fetching transition plans:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters.status, filters.plan_type, filters.student_id, filters.campus_id])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  return { plans, loading, error, refetch: fetchPlans }
}

/**
 * Fetch a single transition plan with reviews and interventions
 */
export function useTransitionPlan(id) {
  const [plan, setPlan] = useState(null)
  const [reviews, setReviews] = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPlan = useCallback(async () => {
    if (!id) {
      setPlan(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fetch plan
      const { data: planData, error: planError } = await supabase
        .from('transition_plans')
        .select(`
          *,
          students (id, first_name, last_name, student_id_number, grade_level, is_sped, is_504, is_ell, is_homeless, is_foster_care, campus_id),
          incidents!transition_plans_incident_id_fkey (id, offense_code_id, consequence_type, consequence_days, incident_date,
            offense_codes (id, name, code, category, severity)
          ),
          profiles!transition_plans_created_by_fkey (id, full_name)
        `)
        .eq('id', id)
        .single()

      if (planError) throw planError
      setPlan(planData)

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('transition_plan_reviews')
        .select(`
          *,
          profiles!fk_tpr_reviewer (id, full_name)
        `)
        .eq('plan_id', id)
        .order('review_date', { ascending: true })

      setReviews(reviewData || [])

      // Fetch student interventions linked to this plan
      const { data: intData } = await supabase
        .from('student_interventions')
        .select(`
          *,
          interventions (id, name, category, tier, description)
        `)
        .eq('plan_id', id)
        .order('created_at')

      setInterventions(intData || [])
    } catch (err) {
      console.error('Error fetching transition plan:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  return { plan, reviews, interventions, loading, error, refetch: fetchPlan }
}

/**
 * Transition plan CRUD actions
 */
export function useTransitionPlanActions() {
  const { districtId, user } = useAuth()

  const createPlan = async (data) => {
    const { data: result, error } = await supabase
      .from('transition_plans')
      .insert({
        ...data,
        district_id: districtId,
        created_by: user.id,
      })
      .select()
      .single()
    return { data: result, error }
  }

  const updatePlan = async (id, data) => {
    const { data: result, error } = await supabase
      .from('transition_plans')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    return { data: result, error }
  }

  const activatePlan = async (id) => {
    return updatePlan(id, { status: 'active', activated_at: new Date().toISOString() })
  }

  const completePlan = async (id) => {
    return updatePlan(id, { status: 'completed', completed_at: new Date().toISOString() })
  }

  const extendPlan = async (id, newEndDate) => {
    return updatePlan(id, { status: 'extended', end_date: newEndDate })
  }

  return { createPlan, updatePlan, activatePlan, completePlan, extendPlan }
}

/**
 * Review CRUD actions
 */
export function useReviewActions() {
  const { user } = useAuth()

  const createReview = async (data) => {
    const { data: result, error } = await supabase
      .from('transition_plan_reviews')
      .insert({
        ...data,
        reviewer_id: user.id,
        review_date: new Date().toISOString(),
      })
      .select()
      .single()
    return { data: result, error }
  }

  const updateReview = async (id, data) => {
    const { data: result, error } = await supabase
      .from('transition_plan_reviews')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    return { data: result, error }
  }

  return { createReview, updateReview }
}

/**
 * Fetch available interventions catalog
 */
export function useInterventions(filters = {}) {
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInterventions = async () => {
      setLoading(true)
      let query = supabase
        .from('interventions')
        .select('*')
        .eq('is_active', true)
        .order('tier')
        .order('category')
        .order('name')

      if (filters.tier) query = query.eq('tier', filters.tier)
      if (filters.category) query = query.eq('category', filters.category)

      const { data } = await query
      setInterventions(data || [])
      setLoading(false)
    }

    fetchInterventions()
  }, [filters.tier, filters.category])

  return { interventions, loading }
}

/**
 * Student intervention actions
 */
export function useStudentInterventionActions() {
  const { user, districtId } = useAuth()

  const assignIntervention = async (data) => {
    const { data: result, error } = await supabase
      .from('student_interventions')
      .insert({
        ...data,
        district_id: districtId,
        assigned_by: user.id,
        status: 'active',
      })
      .select()
      .single()
    return { data: result, error }
  }

  const updateStudentIntervention = async (id, data) => {
    const { data: result, error } = await supabase
      .from('student_interventions')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    return { data: result, error }
  }

  return { assignIntervention, updateStudentIntervention }
}
