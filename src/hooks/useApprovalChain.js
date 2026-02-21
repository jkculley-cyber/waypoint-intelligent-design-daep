import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { sendNotification } from '../lib/notifications'

/**
 * Fetch the DAEP approval chain and steps for an incident
 */
export function useApprovalChain(incidentId) {
  const [chain, setChain] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchChain = useCallback(async () => {
    if (!incidentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch chain
      const { data: chainData, error: chainError } = await supabase
        .from('daep_approval_chains')
        .select(`
          *,
          submitter:profiles!daep_approval_chains_submitted_by_fkey(id, full_name, role),
          denier:profiles!daep_approval_chains_denied_by_fkey(id, full_name, role),
          returner:profiles!daep_approval_chains_returned_by_fkey(id, full_name, role)
        `)
        .eq('incident_id', incidentId)
        .maybeSingle()

      if (chainError) throw chainError
      setChain(chainData)

      if (chainData) {
        // Fetch steps with actor profiles
        const { data: stepsData, error: stepsError } = await supabase
          .from('daep_approval_steps')
          .select(`
            *,
            actor:profiles!daep_approval_steps_acted_by_fkey(id, full_name, role)
          `)
          .eq('chain_id', chainData.id)
          .order('step_order', { ascending: true })

        if (stepsError) throw stepsError
        setSteps(stepsData || [])
      } else {
        setSteps([])
      }
    } catch (err) {
      console.error('Error fetching approval chain:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    fetchChain()
  }, [fetchChain])

  return { chain, steps, loading, error, refetch: fetchChain }
}

/**
 * Actions for DAEP approval chain steps
 */
export function useApprovalChainActions() {
  const [loading, setLoading] = useState(false)

  const approveStep = async (stepId, comments = null, notifyData = null) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('process_approval_step', {
        p_step_id: stepId,
        p_action: 'approve',
        p_comments: comments,
      })
      if (error) throw error

      // Fire-and-forget notification to incident reporter
      if (notifyData?.reporterEmail) {
        sendNotification({
          to: notifyData.reporterEmail,
          subject: `Incident Approved — ${notifyData.studentName || 'Student'}`,
          template: 'incident_approved',
          data: {
            studentName: notifyData.studentName,
            approvedBy: notifyData.approvedBy,
            incidentUrl: notifyData.incidentUrl,
            recipientProfileId: notifyData.reporterProfileId,
          },
        })
      }

      return { data, error: null }
    } catch (err) {
      console.error('Error approving step:', err)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const denyStep = async (stepId, reason, notifyData = null) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('process_approval_step', {
        p_step_id: stepId,
        p_action: 'deny',
        p_comments: reason,
      })
      if (error) throw error

      // Fire-and-forget notification to incident reporter
      if (notifyData?.reporterEmail) {
        sendNotification({
          to: notifyData.reporterEmail,
          subject: `Incident Denied — ${notifyData.studentName || 'Student'}`,
          template: 'incident_denied',
          data: {
            studentName: notifyData.studentName,
            deniedBy: notifyData.deniedBy,
            reason,
            incidentUrl: notifyData.incidentUrl,
            recipientProfileId: notifyData.reporterProfileId,
          },
        })
      }

      return { data, error: null }
    } catch (err) {
      console.error('Error denying step:', err)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const returnStep = async (stepId, reason) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('process_approval_step', {
        p_step_id: stepId,
        p_action: 'return',
        p_comments: reason,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      console.error('Error returning step:', err)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const resubmitChain = async (chainId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('resubmit_approval_chain', {
        p_chain_id: chainId,
      })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      console.error('Error resubmitting chain:', err)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  return { approveStep, denyStep, returnStep, resubmitChain, loading }
}
