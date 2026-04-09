import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Returns true if the current user should see DAEP-program-only UI
 * (DAEP Dashboard, Phone Return, etc).
 *
 * Rules:
 *   - waypoint_admin, district admin, director_student_affairs → always true
 *   - otherwise: user must have at least one campus assignment to a
 *     campus with campus_type = 'daep'
 */
export function useIsDaepStaff() {
  const { profile, districtId } = useAuth()
  const [isDaepStaff, setIsDaepStaff] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) { setLoading(false); return }

    const alwaysTrueRoles = ['waypoint_admin', 'admin', 'director_student_affairs']
    if (alwaysTrueRoles.includes(profile.role)) {
      setIsDaepStaff(true)
      setLoading(false)
      return
    }

    let cancelled = false
    const check = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profile_campus_assignments')
          .select('campus:campuses!inner(id, campus_type)')
          .eq('profile_id', profile.id)
        if (error) throw error
        const hasDaepCampus = (data || []).some(r => {
          const c = Array.isArray(r.campus) ? r.campus[0] : r.campus
          return c?.campus_type === 'daep'
        })
        if (!cancelled) setIsDaepStaff(hasDaepCampus)
      } catch (err) {
        console.error('useIsDaepStaff error:', err)
        if (!cancelled) setIsDaepStaff(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [profile, districtId])

  return { isDaepStaff, loading }
}
