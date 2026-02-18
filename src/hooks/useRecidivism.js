import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { calculateRecidivismRisk, suggestInterventions } from '../lib/recidivismEngine'

/**
 * Fetch recidivism risk assessment for a single student (StudentDetailPage).
 * Loads incidents with offense details, student interventions, and intervention catalog.
 */
export function useRecidivism(studentId) {
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const [incidentsRes, siRes, catalogRes] = await Promise.all([
          supabase
            .from('incidents')
            .select('id, incident_date, consequence_type, status, offense:offense_codes(id, code, title, category, severity)')
            .eq('student_id', studentId),
          supabase
            .from('student_interventions')
            .select('id, intervention_id, incident_id, status, effectiveness, intervention:interventions(id, name, category, tier, target_population, evidence_level, description)')
            .eq('student_id', studentId),
          supabase
            .from('interventions')
            .select('id, name, category, tier, target_population, evidence_level, description')
            .eq('is_active', true),
        ])

        if (cancelled) return

        const incidents = incidentsRes.data || []
        const studentInterventions = siRes.data || []
        const interventionsCatalog = catalogRes.data || []

        // Get student record for SPED check
        const { data: student } = await supabase
          .from('students')
          .select('id, is_sped')
          .eq('id', studentId)
          .single()

        if (cancelled) return

        const risk = calculateRecidivismRisk({ incidents, studentInterventions })
        const suggestions = suggestInterventions({
          riskLevel: risk.riskLevel,
          incidents,
          studentInterventions,
          interventionsCatalog,
          student,
        })

        setAssessment({ ...risk, suggestions })
      } catch (err) {
        console.error('Error computing recidivism risk:', err)
        setAssessment(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [studentId])

  return { assessment, loading }
}

/**
 * Batch-compute recidivism risk levels for a list of students (StudentsPage).
 * Uses batch queries to avoid N+1.
 */
export function useStudentsRecidivismBatch(students) {
  const [assessments, setAssessments] = useState(new Map())
  const [loading, setLoading] = useState(true)

  const studentIds = useMemo(
    () => (students || []).map(s => s.id).filter(Boolean),
    [students]
  )

  useEffect(() => {
    if (!studentIds.length) {
      setAssessments(new Map())
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchBatch = async () => {
      setLoading(true)
      try {
        const [incidentsRes, siRes] = await Promise.all([
          supabase
            .from('incidents')
            .select('id, student_id, incident_date, consequence_type, status, offense:offense_codes(id, severity, category)')
            .in('student_id', studentIds),
          supabase
            .from('student_interventions')
            .select('id, student_id, intervention_id, incident_id, status, effectiveness')
            .in('student_id', studentIds),
        ])

        if (cancelled) return

        const allIncidents = incidentsRes.data || []
        const allSI = siRes.data || []

        // Group by student
        const incidentsByStudent = new Map()
        const siByStudent = new Map()

        for (const inc of allIncidents) {
          if (!incidentsByStudent.has(inc.student_id)) incidentsByStudent.set(inc.student_id, [])
          incidentsByStudent.get(inc.student_id).push(inc)
        }
        for (const si of allSI) {
          if (!siByStudent.has(si.student_id)) siByStudent.set(si.student_id, [])
          siByStudent.get(si.student_id).push(si)
        }

        // Compute per student
        const results = new Map()
        for (const sid of studentIds) {
          const incidents = incidentsByStudent.get(sid) || []
          const studentInterventions = siByStudent.get(sid) || []
          results.set(sid, calculateRecidivismRisk({ incidents, studentInterventions }))
        }

        if (!cancelled) setAssessments(results)
      } catch (err) {
        console.error('Error batch-computing recidivism risk:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBatch()
    return () => { cancelled = true }
  }, [studentIds])

  return { assessments, loading }
}
