import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { opsSupabase } from '../lib/opsSupabase'
import Button from '../components/ui/Button'
import FormField from '../components/ui/FormField'

const ROLES = [
  { value: '', label: 'Select your role (optional)' },
  { value: 'principal', label: 'Principal' },
  { value: 'ap', label: 'Assistant Principal' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'sped_coordinator', label: 'SPED Coordinator' },
  { value: 'director', label: 'Director of Student Affairs' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'other', label: 'Other' },
]

export default function DemoGatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [districtName, setDistrictName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  // Repeat visitors skip the form
  useEffect(() => {
    if (localStorage.getItem('waypoint_demo_submitted')) {
      navigate('/login?demo=1', { replace: true })
    }
  }, [navigate])

  // Capture UTM params and referrer on mount
  const [utm] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      referrer: document.referrer || null,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Save lead + notify Kim — don't block the demo if either fails
    try {
      await Promise.all([
        opsSupabase.from('demo_leads').insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          district_name: districtName.trim(),
          role: role || null,
          referrer: utm.referrer,
          utm_source: utm.utm_source || 'waypoint',
          utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign,
        }),
        fetch('https://formspree.io/f/xpqjngpp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'waypoint_demo_gate',
            name: name.trim(),
            email: email.trim().toLowerCase(),
            district: districtName.trim(),
            role: role || 'Not specified',
            _subject: `Demo Request: ${name.trim()} — ${districtName.trim()}`,
          }),
        }),
      ])
    } catch (err) {
      console.error('Failed to save demo lead:', err)
    }

    localStorage.setItem('waypoint_demo_submitted', email.trim().toLowerCase())
    navigate('/login?demo=1', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Waypoint" className="h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold mb-1">
            <span className="text-orange-600">Way</span><span className="text-purple-600">point</span>
          </h1>
          <p className="text-gray-500">DAEP & Discipline Management</p>
        </div>

        {/* Demo Gate Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Explore the Demo</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your info below and we'll take you straight into Waypoint with sample data from Lone Star ISD.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Your name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              autoComplete="name"
            />

            <FormField
              label="Work email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@district.edu"
              required
              autoComplete="email"
            />

            <FormField
              label="District name"
              name="district"
              type="text"
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder="Lone Star ISD"
              required
            />

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              Start Demo
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          No account needed. Demo uses sample data only.
        </p>
        <p className="text-center text-xs text-gray-400 mt-4">
          &copy; {new Date().getFullYear()} Clear Path Education Group, LLC. All rights reserved.
        </p>
      </div>
    </div>
  )
}
