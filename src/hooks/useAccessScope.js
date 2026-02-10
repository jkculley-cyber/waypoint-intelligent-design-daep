import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCampuses } from './useCampuses'
import { getUserAccessScope } from '../lib/accessControl'

/**
 * React hook that resolves the current user's access scope.
 * Returns { scope, loading } where scope has { isDistrictWide, scopedCampusIds }.
 */
export function useAccessScope() {
  const { profile, campusIds, loading: authLoading } = useAuth()
  const { campuses, loading: campusesLoading } = useCampuses()

  const loading = authLoading || campusesLoading

  const scope = useMemo(() => {
    if (loading || !profile) return { isDistrictWide: false, scopedCampusIds: [] }
    return getUserAccessScope(profile, campusIds, campuses)
  }, [loading, profile, campusIds, campuses])

  return { scope, loading }
}
