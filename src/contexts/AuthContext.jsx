import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [campusIds, setCampusIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setCampusIds([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch campus assignments
      const { data: assignments, error: assignError } = await supabase
        .from('profile_campus_assignments')
        .select('campus_id')
        .eq('profile_id', userId)

      if (assignError) throw assignError
      setCampusIds(assignments?.map(a => a.campus_id) || [])
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
      setCampusIds([])
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setSession(null)
      setProfile(null)
      setCampusIds([])
    }
    return { error }
  }

  function hasRole(allowedRoles) {
    if (!profile) return false
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(profile.role)
    }
    return profile.role === allowedRoles
  }

  function isAdmin() {
    return profile?.role === 'admin'
  }

  function isStaff() {
    const staffRoles = ['admin', 'principal', 'ap', 'counselor', 'sped_coordinator', 'teacher']
    return staffRoles.includes(profile?.role)
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    campusIds,
    loading,
    signIn,
    signOut,
    hasRole,
    isAdmin,
    isStaff,
    districtId: profile?.district_id || null,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
