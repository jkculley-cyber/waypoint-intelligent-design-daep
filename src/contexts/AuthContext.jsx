import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { hasFeatureAccess } from '../lib/tierConfig'

const AuthContext = createContext(null)

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000 // Show warning 5 minutes before logout

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [district, setDistrict] = useState(null)
  const [campusIds, setCampusIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionWarning, setSessionWarning] = useState(false)

  const timeoutRef = useRef(null)
  const warningRef = useRef(null)

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
        setDistrict(null)
        setCampusIds([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Inactivity timeout - FERPA compliance
  const resetInactivityTimer = useCallback(() => {
    if (!session) return

    setSessionWarning(false)

    if (warningRef.current) clearTimeout(warningRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Show warning before timeout
    warningRef.current = setTimeout(() => {
      setSessionWarning(true)
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)

    // Auto-logout on full timeout
    timeoutRef.current = setTimeout(() => {
      signOut()
      setSessionWarning(false)
    }, INACTIVITY_TIMEOUT_MS)
  }, [session])

  useEffect(() => {
    if (!session) {
      if (warningRef.current) clearTimeout(warningRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handler = () => resetInactivityTimer()

    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetInactivityTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      if (warningRef.current) clearTimeout(warningRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [session, resetInactivityTimer])

  async function fetchProfile(userId) {
    setLoading(true)
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch district record for tier gating
      if (profileData.district_id) {
        const { data: districtData } = await supabase
          .from('districts')
          .select('*')
          .eq('id', profileData.district_id)
          .single()
        setDistrict(districtData)
      }

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
      setDistrict(null)
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

  async function refreshDistrict() {
    if (!profile?.district_id) return
    const { data } = await supabase
      .from('districts')
      .select('*')
      .eq('id', profile.district_id)
      .single()
    if (data) setDistrict(data)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setSession(null)
      setProfile(null)
      setDistrict(null)
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
    const staffRoles = ['admin', 'principal', 'ap', 'counselor', 'sped_coordinator', 'teacher', 'cbc', 'sss', 'section_504_coordinator', 'director_student_affairs']
    return staffRoles.includes(profile?.role)
  }

  const tier = district?.settings?.subscription_tier || 'enterprise'

  function hasFeature(featureName) {
    return hasFeatureAccess(tier, featureName)
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    district,
    tier,
    campusIds,
    loading,
    signIn,
    signOut,
    hasRole,
    hasFeature,
    isAdmin,
    isStaff,
    districtId: profile?.district_id || null,
    sessionWarning,
    extendSession: resetInactivityTimer,
    refreshDistrict,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sessionWarning && (
        <SessionWarningModal
          onExtend={resetInactivityTimer}
          onLogout={signOut}
        />
      )}
    </AuthContext.Provider>
  )
}

function SessionWarningModal({ onExtend, onLogout }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Session Expiring</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Your session will expire in 5 minutes due to inactivity. To protect student data privacy (FERPA), you will be logged out automatically.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Log Out Now
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
