import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch campuses in the user's district
 */
export function useCampuses() {
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchCampuses = async () => {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .eq('district_id', districtId)
        .order('name')

      if (!error) setCampuses(data || [])
      setLoading(false)
    }

    fetchCampuses()
  }, [districtId])

  return { campuses, loading }
}
