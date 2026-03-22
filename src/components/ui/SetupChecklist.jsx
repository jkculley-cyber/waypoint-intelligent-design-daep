import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const STEPS = [
  {
    key: 'campuses',
    label: 'Add your campuses',
    detail: 'Add at least 2 campuses so staff and students can be assigned.',
    href: '/settings',
    threshold: 2,
  },
  {
    key: 'students',
    label: 'Import your students',
    detail: 'Import your student roster (10+ students) to begin logging incidents.',
    href: '/import',
    threshold: 11,
  },
  {
    key: 'offenseCodes',
    label: 'Configure your discipline matrix',
    detail: 'Set up the offense codes and consequences used in your district.',
    href: '/matrix',
    threshold: 1,
  },
  {
    key: 'staff',
    label: 'Invite your staff',
    detail: 'Add staff accounts so your team can access the platform.',
    href: '/settings',
    threshold: 3,
  },
  {
    key: 'sisType',
    label: 'Select your SIS',
    detail: 'Choose your Student Information System for data integration.',
    href: '/settings',
  },
]

export default function SetupChecklist({ onDismiss }) {
  const { districtId, district } = useAuth()
  const [checks, setChecks] = useState({})
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(`setup_dismissed_${districtId}`) === '1'
  )
  // Only show for new districts (fewer than 2 campuses OR fewer than 5 students)
  const [isNewDistrict, setIsNewDistrict] = useState(false)

  useEffect(() => {
    if (!districtId) return
    async function run() {
      setLoading(true)
      const [campusRes, offenseRes, profileRes, studentRes] = await Promise.all([
        supabase.from('campuses').select('id', { count: 'exact', head: true }).eq('district_id', districtId),
        supabase.from('offense_codes').select('id', { count: 'exact', head: true }).eq('district_id', districtId),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('district_id', districtId).neq('role', 'student').neq('role', 'parent'),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('district_id', districtId),
      ])
      const campusCount = campusRes.count || 0
      const studentCount = studentRes.count || 0
      const staffCount = profileRes.count || 0
      const offenseCount = offenseRes.count || 0
      const hasSis = !!district?.settings?.sis_type

      setIsNewDistrict(campusCount < 2 || studentCount < 5)
      setChecks({
        campuses:     campusCount >= 2,
        students:     studentCount > 10,
        offenseCodes: offenseCount > 0,
        staff:        staffCount > 2,
        sisType:      hasSis,
      })
      setLoading(false)
    }
    run()
  }, [districtId, district])

  const completedCount = Object.values(checks).filter(Boolean).length
  const totalCount = STEPS.length
  const allDone = completedCount === totalCount

  const handleDismiss = () => {
    localStorage.setItem(`setup_dismissed_${districtId}`, '1')
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed || (allDone && completedCount > 0)) return null
  if (loading) return null // don't flash loading state
  if (!isNewDistrict && !allDone) return null // only show for new districts

  return (
    <div className="mb-6 bg-gray-900 border border-orange-700/40 rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            District Setup Checklist
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 ml-6">
            Complete these steps to get your district ready for use.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-xs text-gray-400">
            <span className="text-orange-400 font-semibold">{completedCount}</span>/{totalCount} complete
          </span>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            title="Dismiss checklist"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ml-6 mt-3 mb-4">
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      <div className="ml-6 space-y-2">
        {STEPS.map(step => {
          const done = checks[step.key]
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border ${
                done
                  ? 'bg-green-500/20 border-green-500/50'
                  : 'bg-gray-800 border-gray-700'
              }`}>
                {done && (
                  <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                    {step.label}
                  </span>
                  {!done && step.manual && (
                    <button
                      onClick={() => {
                        localStorage.setItem(`notifications_confirmed_${districtId}`, '1')
                        setChecks(c => ({ ...c, notifications: true }))
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Mark done →
                    </button>
                  )}
                  {!done && !step.manual && step.href && (
                    <Link
                      to={step.href}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Set up →
                    </Link>
                  )}
                </div>
                {!done && (
                  <p className="text-xs text-gray-600 mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
