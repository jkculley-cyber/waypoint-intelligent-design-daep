import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch import history for the current district
 */
export function useImportHistory() {
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchHistory = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('import_history')
        .select(`
          *,
          imported_by_profile:profiles!imported_by(full_name, email)
        `)
        .eq('district_id', districtId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setImports(data || [])
    } catch (err) {
      console.error('Error fetching import history:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return { imports, loading, error, refetch: fetchHistory }
}

/**
 * Fetch import detail with errors
 */
export function useImportDetail(importId) {
  const [importRecord, setImportRecord] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!importId) {
      setLoading(false)
      return
    }

    const fetchDetail = async () => {
      setLoading(true)
      try {
        const [historyResult, errorsResult] = await Promise.all([
          supabase
            .from('import_history')
            .select(`
              *,
              imported_by_profile:profiles!imported_by(full_name, email)
            `)
            .eq('id', importId)
            .single(),
          supabase
            .from('import_errors')
            .select('*')
            .eq('import_history_id', importId)
            .order('row_number', { ascending: true }),
        ])

        if (historyResult.error) throw historyResult.error
        setImportRecord(historyResult.data)
        setImportErrors(errorsResult.data || [])
      } catch (err) {
        console.error('Error fetching import detail:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [importId])

  return { importRecord, importErrors, loading, error }
}
