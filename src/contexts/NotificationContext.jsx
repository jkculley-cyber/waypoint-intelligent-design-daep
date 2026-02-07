import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { districtId, profile } = useAuth()
  const [alertCount, setAlertCount] = useState(0)
  const [redCount, setRedCount] = useState(0)
  const [yellowCount, setYellowCount] = useState(0)
  const [recentAlerts, setRecentAlerts] = useState([])

  const fetchAlertCounts = useCallback(async () => {
    if (!districtId) return

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, alert_level')
        .eq('district_id', districtId)
        .in('status', ['active', 'acknowledged', 'in_progress'])

      if (error) throw error

      const alerts = data || []
      const red = alerts.filter(a => a.alert_level === 'red').length
      const yellow = alerts.filter(a => a.alert_level === 'yellow').length
      setRedCount(red)
      setYellowCount(yellow)
      setAlertCount(red + yellow)
    } catch (err) {
      console.error('Error fetching alert counts:', err)
    }
  }, [districtId])

  // Initial fetch
  useEffect(() => {
    fetchAlertCounts()
  }, [fetchAlertCounts])

  // Subscribe to real-time alerts
  useEffect(() => {
    if (!districtId) return

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `district_id=eq.${districtId}`,
        },
        (payload) => {
          const newAlert = payload.new
          // Refresh counts
          fetchAlertCounts()

          // Show toast notification
          const level = newAlert.alert_level === 'red' ? 'Red Flag' : 'Yellow Flag'
          toast(
            `${level}: ${newAlert.trigger_description}`,
            {
              icon: newAlert.alert_level === 'red' ? '🔴' : '🟡',
              duration: 6000,
              style: {
                borderLeft: `4px solid ${newAlert.alert_level === 'red' ? '#ef4444' : '#eab308'}`,
              },
            }
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `district_id=eq.${districtId}`,
        },
        () => {
          // Refresh counts when an alert is updated (resolved, dismissed, etc.)
          fetchAlertCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [districtId, fetchAlertCounts])

  const value = {
    alertCount,
    redCount,
    yellowCount,
    recentAlerts,
    refreshCounts: fetchAlertCounts,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
