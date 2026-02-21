import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card from '../components/ui/Card'

const SETTINGS_SECTIONS = [
  {
    title: 'Offense Codes',
    description: 'Manage Texas Education Code offense codes and add district-specific custom codes.',
    href: '/settings/offense-codes',
    icon: OffenseIcon,
    ready: true,
  },
  {
    title: 'Discipline Matrix',
    description: 'Configure offense-to-consequence rules and required supports for each occurrence.',
    href: '/matrix/editor',
    icon: MatrixIcon,
    ready: true,
  },
  {
    title: 'District Configuration',
    description: 'Manage district info, campuses, school year settings, and PEIMS configuration.',
    href: '/settings/district',
    icon: DistrictIcon,
    ready: false,
  },
  {
    title: 'User Management',
    description: 'Manage staff accounts, role assignments, and campus assignments.',
    href: '/settings/users',
    icon: UsersIcon,
    ready: true,
  },
  {
    title: 'Notifications',
    description: 'Configure email notification rules, alert thresholds, and delivery preferences.',
    href: '/settings/notifications',
    icon: NotificationIcon,
    ready: true,
  },
  {
    title: 'Interventions Catalog',
    description: 'Manage the catalog of behavioral and academic interventions available for plans.',
    href: '/settings/interventions',
    icon: InterventionIcon,
    ready: false,
  },
  {
    title: 'Orientation Schedule',
    description: 'Configure available days, times, and capacity for DAEP orientation sessions.',
    href: '/settings/orientation',
    icon: CalendarIcon,
    ready: true,
  },
  {
    title: 'Data Import',
    description: 'Bulk upload campuses, students, staff, and incidents via CSV or Excel files.',
    href: '/settings/import-data',
    icon: ImportIcon,
    ready: true,
  },
]

export default function SettingsPage() {
  return (
    <div>
      <Topbar
        title="Settings"
        subtitle="District & system configuration"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SETTINGS_SECTIONS.map((section) => (
            <SettingsCard key={section.title} {...section} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Notification Preferences Page (used at /settings/notifications) ──────────

export function NotificationPreferencesPage() {
  const { user, districtId } = useAuth()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPrefs(data || {
          incident_submitted: true,
          incident_approved: true,
          incident_denied: true,
          placement_reminders: true,
          review_due_alerts: true,
        })
        setLoading(false)
      })
  }, [user?.id])

  const handleToggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        profile_id: user.id,
        district_id: districtId,
        ...prefs,
        updated_at: new Date().toISOString(),
      })
    setSaving(false)
    if (error) {
      toast.error('Failed to save preferences')
    } else {
      toast.success('Notification preferences saved')
    }
  }

  const PREF_LABELS = [
    { key: 'incident_submitted', label: 'New incident submitted', desc: 'When a new discipline incident is submitted in your district' },
    { key: 'incident_approved', label: 'Incident approved', desc: 'When an incident you submitted is approved' },
    { key: 'incident_denied', label: 'Incident denied', desc: 'When an incident you submitted is denied' },
    { key: 'placement_reminders', label: 'Placement reminders', desc: 'When a DAEP placement is starting or ending soon' },
    { key: 'review_due_alerts', label: 'Review due alerts', desc: 'When a 30/60/90-day review is coming due' },
  ]

  return (
    <div>
      <Topbar
        title="Notification Preferences"
        subtitle="Control which emails you receive from Waypoint"
        actions={<Link to="/settings" className="text-sm text-gray-500 hover:text-gray-700">← Settings</Link>}
      />
      <div className="p-6 max-w-lg">
        {loading ? (
          <p className="text-sm text-gray-400">Loading preferences...</p>
        ) : (
          <Card>
            <div className="space-y-4">
              {PREF_LABELS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      prefs?.[key] ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                      prefs?.[key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function SettingsCard({ title, description, href, icon: Icon, ready }) {
  const Content = (
    <Card className={`h-full transition-all ${ready ? 'hover:border-orange-300 hover:shadow-md cursor-pointer' : 'opacity-60'}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${ready ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {!ready && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Coming Soon</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        {ready && (
          <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </Card>
  )

  if (!ready) return Content

  return (
    <Link to={href} className="block">
      {Content}
    </Link>
  )
}

// Icons
function OffenseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zM12 15.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function MatrixIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-4.5m4.5 0c.621 0 1.125.504 1.125 1.125M12 10.875c0-.621.504-1.125 1.125-1.125m0 0c.621 0 1.125.504 1.125 1.125" />
    </svg>
  )
}

function DistrictIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )
}

function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function NotificationIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function InterventionIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function ImportIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}
