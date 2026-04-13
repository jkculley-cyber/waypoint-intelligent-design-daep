import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { opsSupabase } from '../lib/opsSupabase'
import { useAuth } from '../contexts/AuthContext'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { SCENARIOS as ORIGINS_SCENARIOS } from '../lib/originsScenarios'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const APP_BASE = 'https://waypoint.clearpathedgroup.com'

const TIERS = ['essential', 'professional', 'enterprise']
const CAMPUS_TYPES = ['elementary', 'middle', 'high', 'daep', 'jjaep', 'other']
const ALL_PRODUCTS = ['waypoint', 'navigator', 'meridian', 'origins']
const PRODUCT_LABELS = { waypoint: 'Waypoint', navigator: 'Navigator', meridian: 'Meridian', origins: 'Origins' }
const PRODUCT_COLORS = { waypoint: '#f97316', navigator: '#3b82f6', meridian: '#a855f7', origins: '#0d9488' }

const TIER_COLORS = {
  essential:    'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-purple-100 text-purple-700',
}

const STATUS_COLORS = {
  prospect: { bg: 'bg-gray-700', text: 'text-gray-200' },
  demo:     { bg: 'bg-blue-900', text: 'text-blue-200' },
  pilot:    { bg: 'bg-orange-900', text: 'text-orange-200' },
  active:   { bg: 'bg-green-900', text: 'text-green-200' },
  churned:  { bg: 'bg-red-900', text: 'text-red-200' },
}

const STATUS_CHART_COLORS = {
  prospect: '#6b7280',
  demo:     '#3b82f6',
  pilot:    '#f97316',
  active:   '#22c55e',
  churned:  '#ef4444',
}

// ─── Top-level page ───────────────────────────────────────────────────────────

const COMMAND_CENTER_URL = 'https://waypoint.clearpathedgroup.com/waypoint-admin'

export default function WaypointAdminPage() {
  const { user, signOut } = useAuth()
  const [districts, setDistricts] = useState([])
  const [loadingDistricts, setLoadingDistricts] = useState(true)
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [managingDistrict, setManagingDistrict] = useState(null)
  const [activeTab, setActiveTab] = useState('districts')
  const [urlCopied, setUrlCopied] = useState(false)
  const serviceRoleKeyMissing = !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  function copyCommandCenterUrl() {
    navigator.clipboard.writeText(COMMAND_CENTER_URL).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 1600)
    })
  }

  const fetchDistricts = useCallback(async () => {
    setLoadingDistricts(true)
    const { data, error } = await supabase.rpc('list_districts_for_admin')
    if (!error) setDistricts(data || [])
    setLoadingDistricts(false)
  }, [])

  useEffect(() => { fetchDistricts() }, [fetchDistricts])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-none">Waypoint</h1>
            <p className="text-xs text-gray-400 mt-0.5">Internal Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Command Center URL pill */}
          <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 font-mono select-all">{COMMAND_CENTER_URL}</span>
            <button
              onClick={copyCommandCenterUrl}
              title="Copy URL"
              className="shrink-0 text-gray-600 hover:text-orange-400 transition-colors ml-1"
            >
              {urlCopied
                ? <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
              }
            </button>
            <a
              href={COMMAND_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="shrink-0 text-gray-600 hover:text-orange-400 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Warning if service role key is missing */}
        {serviceRoleKeyMissing && (
          <div className="mb-6 p-4 bg-yellow-900/40 border border-yellow-700 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-300">VITE_SUPABASE_SERVICE_ROLE_KEY is not set</p>
              <p className="text-xs text-yellow-400 mt-1">Auth user creation will fail. Add the key to your .env.local file and restart the dev server.</p>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('districts')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'districts'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Districts
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Business Dashboard
          </button>
          <button
            onClick={() => setActiveTab('hub')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'hub'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Product Hub
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'leads'
                ? 'bg-orange-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Leads
          </button>
          <button
            onClick={() => setActiveTab('apex')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'apex'
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Apex
          </button>
        </div>

        {/* Districts tab */}
        {activeTab === 'districts' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Districts</h2>
                <p className="text-sm text-gray-400">{districts.length} district{districts.length !== 1 ? 's' : ''} provisioned</p>
              </div>
              <button
                onClick={() => setShowProvisionModal(true)}
                disabled={serviceRoleKeyMissing}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                + Provision New District
              </button>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              {loadingDistricts ? (
                <div className="p-12 text-center text-gray-500 text-sm">Loading districts...</div>
              ) : districts.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">No districts yet. Provision your first district to get started.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">District Name</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">TEA ID</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tier</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Products</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campuses</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Users</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Provisioned</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {districts.map(d => (
                      <tr key={d.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{d.tea_district_id}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${TIER_COLORS[d.tier] || TIER_COLORS.essential}`}>
                            {d.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {(d.settings?.products || ['waypoint']).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{d.campus_count}</td>
                        <td className="px-4 py-3 text-gray-300">{d.user_count}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setManagingDistrict(d)}
                            className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Business Dashboard tab */}
        {activeTab === 'dashboard' && <OwnerDashboard />}

        {/* Product Hub tab */}
        {activeTab === 'hub' && <ProductHub districts={districts} loadingDistricts={loadingDistricts} />}

        {/* Leads tab */}
        {activeTab === 'leads' && <LeadsPanel />}

        {/* Apex tab */}
        {activeTab === 'apex' && <ApexPanel />}
      </main>

      {showProvisionModal && (
        <ProvisionModal
          onClose={() => setShowProvisionModal(false)}
          onSuccess={() => { setShowProvisionModal(false); fetchDistricts() }}
        />
      )}

      {managingDistrict && (
        <ManageDistrictDrawer
          district={managingDistrict}
          onClose={() => setManagingDistrict(null)}
          onRefresh={fetchDistricts}
        />
      )}

      <PartnerChat />
    </div>
  )
}

// ─── Leads Panel ──────────────────────────────────────────────────────────────

const LEAD_SOURCE_LABELS = {
  sandbox_explore:   'Sandbox Explore',
  demo_request:      'Demo Request',
  pilot_application: 'Pilot Application',
  chat_widget:       'Chat Widget',
}

const LEAD_STATUS_STYLES = {
  new:              'bg-orange-900 text-orange-200',
  contacted:        'bg-blue-900 text-blue-200',
  demo_scheduled:   'bg-purple-900 text-purple-200',
  closed:           'bg-green-900 text-green-200',
  not_interested:   'bg-gray-700 text-gray-400',
}

// ─── Apex Panel ───────────────────────────────────────────────────────────────

const APEX_URL = 'https://jvjsotlyvrzhsbgcsdfw.supabase.co'
const APEX_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2anNvdGx5dnJ6aHNiZ2NzZGZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU3NjgwOSwiZXhwIjoyMDg4MTUyODA5fQ._3kv_O4D45-L2DNEfXXna6uIDVHq1jsZnZH6cSrsbgY'
const APEX_HEADERS = { apikey: APEX_KEY, Authorization: `Bearer ${APEX_KEY}`, 'Content-Type': 'application/json' }

async function apexFetch(path) {
  const r = await fetch(`${APEX_URL}/rest/v1/${path}`, { headers: APEX_HEADERS })
  return r.ok ? r.json() : []
}

function ApexPanel() {
  const [principals, setPrincipals] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null) // { msg, type: 'success'|'error' }
  const [activatingId, setActivatingId] = useState(null)
  const [editModal, setEditModal] = useState(null) // principal object being edited
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(p) {
    setEditForm({
      name: p.name || '',
      email: p.email || '',
      school_name: p.school_name || '',
      district_name: p.district_name || '',
      subscription_status: p.subscription_status || 'trial',
      paid_through: p.paid_through || '',
    })
    setEditModal(p)
  }

  async function saveEdit() {
    if (!editModal) return
    setEditSaving(true)
    await fetch(`${APEX_URL}/rest/v1/principals?id=eq.${editModal.id}`, {
      method: 'PATCH',
      headers: APEX_HEADERS,
      body: JSON.stringify({
        name: editForm.name,
        school_name: editForm.school_name,
        district_name: editForm.district_name,
        subscription_status: editForm.subscription_status,
        paid_through: editForm.paid_through || null,
      }),
    })
    setEditSaving(false)
    setEditModal(null)
    showToast('Principal updated')
    load()
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function load() {
    setLoading(true)
    const [p, r] = await Promise.all([
      apexFetch('principals?select=id,name,email,school_name,district_name,created_at,onboarding_complete,subscription_status,paid_through,trial_started_at&order=created_at.desc&limit=50'),
      apexFetch('access_requests?select=id,name,email,school_name,district,title,status,created_at&order=created_at.desc'),
    ])
    setPrincipals(p || [])
    setRequests(r || [])
    setLoading(false)
  }

  function getSubStatus(p) {
    if (p.subscription_status === 'active' && p.paid_through) {
      const paidThrough = new Date(p.paid_through)
      if (paidThrough > new Date()) return 'active'
      return 'expired'
    }
    if (p.subscription_status === 'extended') return 'extended'
    if (p.trial_started_at) {
      const trialEnd = new Date(new Date(p.trial_started_at).getTime() + 14 * 86400000)
      if (trialEnd > new Date()) return 'trial'
      return 'gated'
    }
    return 'trial'
  }

  const SUB_BADGE = {
    active: 'bg-green-900/40 text-green-400',
    trial: 'bg-blue-900/40 text-blue-400',
    gated: 'bg-red-900/40 text-red-400',
    expired: 'bg-red-900/40 text-red-400',
    extended: 'bg-yellow-900/30 text-yellow-500',
  }

  async function activateMonthly(principalId) {
    setActivatingId(principalId)
    const paidThrough = new Date()
    paidThrough.setMonth(paidThrough.getMonth() + 1)
    await fetch(`${APEX_URL}/rest/v1/principals?id=eq.${principalId}`, {
      method: 'PATCH',
      headers: APEX_HEADERS,
      body: JSON.stringify({ subscription_status: 'active', paid_through: paidThrough.toISOString().slice(0, 10) }),
    })
    showToast('Activated — 1 month')
    setActivatingId(null)
    load()
  }

  async function activateAnnual(principalId) {
    setActivatingId(principalId)
    // School year: paid through June 30 of current or next year
    const now = new Date()
    const june30 = new Date(now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear(), 5, 30)
    await fetch(`${APEX_URL}/rest/v1/principals?id=eq.${principalId}`, {
      method: 'PATCH',
      headers: APEX_HEADERS,
      body: JSON.stringify({ subscription_status: 'active', paid_through: june30.toISOString().slice(0, 10) }),
    })
    showToast('Activated — through ' + june30.toLocaleDateString())
    setActivatingId(null)
    load()
  }

  async function deactivate(principalId) {
    setActivatingId(principalId)
    await fetch(`${APEX_URL}/rest/v1/principals?id=eq.${principalId}`, {
      method: 'PATCH',
      headers: APEX_HEADERS,
      body: JSON.stringify({ subscription_status: 'trial', paid_through: null }),
    })
    showToast('Deactivated — reverted to trial')
    setActivatingId(null)
    load()
  }

  useEffect(() => { load() }, [])

  async function updateRequest(id, status, req) {
    await fetch(`${APEX_URL}/rest/v1/access_requests?id=eq.${id}`, {
      method: 'PATCH',
      headers: APEX_HEADERS,
      body: JSON.stringify({ status }),
    })

    if (status === 'approved' && req?.email) {
      // Send welcome guide email
      const welcomeRes = await fetch(`${APEX_URL}/functions/v1/send-welcome-email`, {
        method: 'POST',
        headers: { ...APEX_HEADERS, Authorization: `Bearer ${APEX_KEY}` },
        body: JSON.stringify({
          email: req.email,
          name: req.name || '',
          school_name: req.school_name || '',
        }),
      })
      const welcomeData = await welcomeRes.json()
      if (welcomeData.ok) {
        showToast(`Approved! Welcome guide sent to ${req.email}.`, 'success')
      } else {
        showToast(`Approved, but welcome email failed: ${welcomeData.error || 'unknown error'}`, 'error')
      }
    } else {
      showToast('Request rejected.', 'success')
    }

    load()
  }

  const pending = requests.filter(r => r.status === 'pending')
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const newThisWeek = principals.filter(p => new Date(p.created_at) > weekAgo).length

  if (loading) return <div className="p-12 text-center text-gray-500 text-sm">Loading Apex data…</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block"></span>
            Apex — Principal Management
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">clearpath-apex.pages.dev</p>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-900/60 border border-green-700 text-green-300' : 'bg-red-900/60 border border-red-700 text-red-300'
            }`}>
              {toast.msg}
            </div>
          )}
          <a
            href="https://clearpath-apex.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-violet-500 transition-colors"
          >
            Open Apex ↗
          </a>
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs font-medium bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-6 gap-4">
        {(() => {
          const paid = principals.filter(p => getSubStatus(p) === 'active').length
          const trial = principals.filter(p => getSubStatus(p) === 'trial').length
          const gated = principals.filter(p => ['gated', 'expired'].includes(getSubStatus(p))).length
          return [
            { label: 'Total Principals', value: principals.length, color: 'text-violet-400' },
            { label: 'Paid / Active', value: paid, color: 'text-green-400' },
            { label: 'Trial', value: trial, color: 'text-blue-400' },
            { label: 'Gated / Expired', value: gated, color: gated > 0 ? 'text-red-400' : 'text-gray-400' },
            { label: 'New This Week', value: newThisWeek, color: 'text-blue-400' },
            { label: 'Pending Approval', value: pending.length, color: pending.length > 0 ? 'text-orange-400' : 'text-gray-400' },
          ]
        })().map(m => (
          <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Pending access requests */}
      {pending.length > 0 && (
        <div className="bg-gray-900 border border-orange-800/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
            <h3 className="text-sm font-semibold text-white">Pending Access Requests ({pending.length})</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {pending.map(req => (
              <div key={req.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{req.name}</p>
                  <p className="text-xs text-gray-400 truncate">{req.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{[req.title, req.school_name, req.district].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => updateRequest(req.id, 'approved', req)}
                    className="px-3 py-1 text-xs font-semibold bg-green-900/50 border border-green-700 text-green-300 rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateRequest(req.id, 'rejected', req)}
                    className="px-3 py-1 text-xs font-semibold bg-red-900/30 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All requests (collapsed view) */}
      {requests.filter(r => r.status !== 'pending').length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">All Requests</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {requests.filter(r => r.status !== 'pending').map(req => (
              <div key={req.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{req.name} <span className="text-gray-500">·</span> <span className="text-xs text-gray-400">{req.email}</span></p>
                  <p className="text-xs text-gray-500 truncate">{[req.school_name, req.district].filter(Boolean).join(', ')}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${req.status === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Principals table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Active Principals ({principals.length})</h3>
        </div>
        {principals.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No principals yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">District</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid Through</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {principals.map(p => {
                  const status = getSubStatus(p)
                  const isActing = activatingId === p.id
                  return (
                    <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-300">{p.school_name || '—'}</td>
                      <td className="px-5 py-3 text-gray-300">{p.district_name || '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SUB_BADGE[status] || 'bg-gray-800 text-gray-400'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {p.paid_through ? new Date(p.paid_through).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(p)}
                            className="px-2 py-1 text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300 rounded hover:text-white hover:border-violet-500 transition-colors"
                          >
                            Edit
                          </button>
                          {status !== 'active' ? (
                            <>
                              <button
                                onClick={() => activateMonthly(p.id)}
                                disabled={isActing}
                                className="px-2 py-1 text-xs font-medium bg-green-900/40 border border-green-700 text-green-300 rounded hover:bg-green-800 transition-colors disabled:opacity-50"
                              >
                                {isActing ? '…' : '$10/mo'}
                              </button>
                              <button
                                onClick={() => activateAnnual(p.id)}
                                disabled={isActing}
                                className="px-2 py-1 text-xs font-medium bg-green-900/40 border border-green-700 text-green-300 rounded hover:bg-green-800 transition-colors disabled:opacity-50"
                              >
                                {isActing ? '…' : '$100/yr'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => deactivate(p.id)}
                              disabled={isActing}
                              className="px-2 py-1 text-xs font-medium bg-red-900/30 border border-red-800 text-red-400 rounded hover:bg-red-900/50 transition-colors disabled:opacity-50"
                            >
                              {isActing ? '…' : 'Deactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Principal Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-4">Edit Principal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                  value={editForm.email}
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">School</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                    value={editForm.school_name}
                    onChange={e => setEditForm({ ...editForm, school_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">District</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                    value={editForm.district_name}
                    onChange={e => setEditForm({ ...editForm, district_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Subscription Status</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                    value={editForm.subscription_status}
                    onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })}
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active (Paid)</option>
                    <option value="extended">Extended</option>
                    <option value="expired">Expired</option>
                    <option value="gated">Gated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Paid Through</label>
                  <input
                    type="date"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                    value={editForm.paid_through}
                    onChange={e => setEditForm({ ...editForm, paid_through: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Leads Panel ──────────────────────────────────────────────────────────────

function LeadsPanel() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [showHidden, setShowHidden] = useState(false)
  const [niModal, setNiModal] = useState(null) // { id, currentReason }
  const [niReason, setNiReason] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    // Fetch from main leads table
    const { data: mainLeads } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    // Also fetch from ops Supabase demo_leads (Navigator pilot form, demo gate)
    let opsLeads = []
    try {
      const { data: opsData } = await opsSupabase
        .from('demo_leads')
        .select('*')
        .order('created_at', { ascending: false })
      // Normalize ops leads to match main leads shape
      opsLeads = (opsData || []).map(d => ({
        id: 'ops-' + d.id,
        name: d.name,
        email: d.email,
        source: d.referrer?.startsWith('navigator_') ? 'navigator_campus_pilot' : (d.utm_source || 'demo_gate'),
        district: d.district_name,
        concern: d.referrer ? d.referrer.replace('navigator_campus_pilot|', 'Campus size: ') + (d.phone ? '. Phone: ' + d.phone : '') : (d.phone ? 'Phone: ' + d.phone : ''),
        notes: null,
        status: d.status || 'new',
        created_at: d.created_at,
        updated_at: d.created_at,
        _ops: true, // flag to prevent edits (different DB)
      }))
    } catch (e) { /* ops Supabase unreachable — show main leads only */ }

    // Merge and deduplicate by email
    const seen = new Set()
    const merged = []
    for (const l of [...(mainLeads || []), ...opsLeads]) {
      if (seen.has(l.email)) continue
      seen.add(l.email)
      merged.push(l)
    }
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setLeads(merged)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function updateStatus(id, status) {
    if (status === 'not_interested') {
      const lead = leads.find(l => l.id === id)
      setNiReason(lead?.notes || '')
      setNiModal({ id, currentReason: lead?.notes || '' })
      return
    }
    setUpdatingId(id)
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    setUpdatingId(null)
  }

  async function confirmNotInterested() {
    setUpdatingId(niModal.id)
    await supabase.from('leads').update({ status: 'not_interested', notes: niReason }).eq('id', niModal.id)
    setLeads(prev => prev.map(l => l.id === niModal.id ? { ...l, status: 'not_interested', notes: niReason } : l))
    setUpdatingId(null)
    setNiModal(null)
    setNiReason('')
  }

  async function deleteLead(id) {
    if (!window.confirm('Delete this lead permanently?')) return
    setDeletingId(id)
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setDeletingId(null)
  }

  const bySource = leads.reduce((acc, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {})

  const visibleLeads = showHidden ? leads : leads.filter(l => l.status !== 'not_interested')
  const hiddenCount = leads.filter(l => l.status === 'not_interested').length

  return (
    <div>
      {/* Not Interested reason modal */}
      {niModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-white font-semibold mb-1">Mark as Not Interested</h3>
            <p className="text-gray-400 text-sm mb-4">Optionally capture why this lead isn't moving forward. This will hide them from the default view.</p>
            <textarea
              value={niReason}
              onChange={e => setNiReason(e.target.value)}
              placeholder="e.g. Already using another solution, budget constraints, wrong timing…"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 px-3 py-2 resize-none focus:outline-none focus:border-gray-500"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNiModal(null)} className="flex-1 px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={confirmNotInterested} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-500">
                Mark Not Interested
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Leads</h2>
          <p className="text-sm text-gray-400">{leads.length} total · {leads.filter(l => l.status === 'new').length} new</p>
        </div>
        <div className="flex items-center gap-3">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHidden(v => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showHidden ? `Hide not interested (${hiddenCount})` : `Show not interested (${hiddenCount})`}
            </button>
          )}
          <button onClick={fetchLeads} className="text-sm text-gray-400 hover:text-white transition-colors">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Source breakdown */}
      {leads.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(LEAD_SOURCE_LABELS).map(([src, label]) => (
            <div key={src} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{bySource[src] || 0}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-500 py-12 text-sm">Loading leads…</p>
        ) : visibleLeads.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">
            {leads.length === 0 ? 'No leads yet. Leads appear here when someone submits a form on clearpathedgroup.com.' : 'No active leads.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Name / Email</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Source</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">District</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Date</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map(lead => (
                <tr key={lead.id} className={`border-b border-gray-800 hover:bg-gray-800/40 transition-colors ${lead.status === 'not_interested' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{lead.name || '—'}</p>
                    <p className="text-gray-400 text-xs">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                      {LEAD_SOURCE_LABELS[lead.source] || lead.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px]">
                    {lead.district || '—'}
                    {lead.concern && <span className="block text-gray-600 truncate">{lead.concern}</span>}
                    {lead.status === 'not_interested' && lead.notes && (
                      <span className="block text-gray-600 italic truncate" title={lead.notes}>"{lead.notes}"</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {format(parseISO(lead.created_at), 'MMM d, yyyy')}
                    <span className="block text-gray-600">{format(parseISO(lead.created_at), 'h:mm a')}</span>
                    {lead.status === 'new' && (() => {
                      const stage = lead.nurture_stage || 0
                      const daysSince = Math.floor((Date.now() - new Date(lead.created_at)) / 86400000)
                      if (stage === 0 && daysSince >= 3) return <span className="block text-yellow-500 font-medium mt-0.5">Day 3 nurture pending</span>
                      if (stage === 1 && daysSince >= 7) return <span className="block text-yellow-500 font-medium mt-0.5">Day 7 nurture pending</span>
                      if (stage === 1) return <span className="block text-blue-400 mt-0.5">Day 3 sent</span>
                      if (stage >= 2) return <span className="block text-gray-500 mt-0.5">Sequence complete</span>
                      return null
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      disabled={updatingId === lead.id}
                      onChange={e => updateStatus(lead.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${LEAD_STATUS_STYLES[lead.status] || 'bg-gray-700 text-gray-200'}`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="demo_scheduled">Demo Scheduled</option>
                      <option value="closed">Closed</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteLead(lead.id)}
                      disabled={deletingId === lead.id}
                      title="Delete lead"
                      className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Demo Leads from Waypoint explore */}
      <DemoLeadsSection />
    </div>
  )
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New', bg: 'bg-blue-900/60', text: 'text-blue-300' },
  { value: 'contacted', label: 'Contacted', bg: 'bg-yellow-900/60', text: 'text-yellow-300' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', bg: 'bg-purple-900/60', text: 'text-purple-300' },
  { value: 'demo_completed', label: 'Demo Completed', bg: 'bg-indigo-900/60', text: 'text-indigo-300' },
  { value: 'proposal_sent', label: 'Proposal Sent', bg: 'bg-orange-900/60', text: 'text-orange-300' },
  { value: 'closed_won', label: 'Closed Won', bg: 'bg-green-900/60', text: 'text-green-300' },
  { value: 'closed_lost', label: 'Closed Lost', bg: 'bg-red-900/60', text: 'text-red-300' },
  { value: 'not_qualified', label: 'Not Qualified', bg: 'bg-gray-700', text: 'text-gray-400' },
]

function DemoLeadsSection() {
  const [demoLeads, setDemoLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDemoLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await opsSupabase
      .from('demo_leads')
      .select('*')
      .order('created_at', { ascending: false })
    setDemoLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDemoLeads() }, [fetchDemoLeads])

  const updateStatus = async (leadId, newStatus) => {
    setDemoLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    await opsSupabase.from('demo_leads').update({ status: newStatus }).eq('id', leadId)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Demo Leads</h2>
          <p className="text-sm text-gray-400">{demoLeads.length} people explored the Waypoint demo</p>
        </div>
        <button onClick={fetchDemoLeads} className="text-sm text-gray-400 hover:text-white transition-colors">
          ↻ Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-500 py-12 text-sm">Loading demo leads…</p>
        ) : demoLeads.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">No demo leads yet. They appear when someone fills out the Explore Demo form.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Name / Email</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Phone</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">District</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Role</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Product</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {demoLeads.map(lead => {
                const status = LEAD_STATUSES.find(s => s.value === (lead.status || 'new')) || LEAD_STATUSES[0]
                return (
                  <tr key={lead.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{lead.name}</p>
                      <p className="text-gray-400 text-xs">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-orange-400 hover:text-orange-300">{lead.phone}</a>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{lead.district_name}</td>
                    <td className="px-4 py-3">
                      {lead.role ? (
                        <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded">{lead.role}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {(() => {
                        const src = (lead.utm_source || '').toLowerCase()
                        if (src === 'beacon') return <span className="bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded font-medium">Beacon</span>
                        if (src === 'waypoint') return <span className="bg-orange-900/60 text-orange-300 px-2 py-0.5 rounded font-medium">Waypoint</span>
                        if (src === 'toolkit') return <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-medium">Toolkit</span>
                        return <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{src || 'Unknown'}</span>
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer outline-none ${status.bg} ${status.text}`}
                      >
                        {LEAD_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {format(parseISO(lead.created_at), 'MMM d, yyyy')}
                      <span className="block text-gray-600">{format(parseISO(lead.created_at), 'h:mm a')}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Owner Business Dashboard ─────────────────────────────────────────────────

function OwnerDashboard() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [editingContract, setEditingContract] = useState(null)

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setFetchError(error.message)
    } else {
      setContracts(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContracts() }, [fetchContracts])

  const metrics = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active')
    const pipeline = contracts.filter(c => c.status === 'demo' || c.status === 'pilot')
    const arr = active.reduce((sum, c) => sum + Number(c.annual_value || 0), 0)
    const pipelineValue = pipeline.reduce((sum, c) => sum + Number(c.annual_value || 0), 0)
    const today = new Date()
    const in90 = addDays(today, 90)
    const renewalsIn90 = active.filter(c => {
      if (!c.end_date) return false
      const d = parseISO(c.end_date)
      return d >= today && d <= in90
    }).sort((a, b) => parseISO(a.end_date) - parseISO(b.end_date))
    return { arr, mrr: arr / 12, pipelineValue, activeCount: active.length, renewalsIn90 }
  }, [contracts])

  const funnelData = useMemo(() => {
    const statuses = ['prospect', 'demo', 'pilot', 'active', 'churned']
    return statuses.map(status => ({
      status,
      count: contracts.filter(c => c.status === status).length,
      fill: STATUS_CHART_COLORS[status],
    }))
  }, [contracts])

  const productMixData = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active')
    const counts = {}
    active.forEach(c => {
      (c.products || []).forEach(p => { counts[p] = (counts[p] || 0) + 1 })
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: PRODUCT_LABELS[name] || name,
      value,
      fill: PRODUCT_COLORS[name] || '#6b7280',
    }))
  }, [contracts])

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contract? This cannot be undone.')) return
    await supabase.from('contracts').delete().eq('id', id)
    fetchContracts()
  }

  if (loading) return <div className="p-12 text-center text-gray-500 text-sm">Loading business data...</div>

  if (fetchError) return (
    <div className="p-6 bg-red-900/40 border border-red-700 rounded-xl text-sm text-red-300">
      <p className="font-semibold mb-1">Failed to load contracts</p>
      <p className="font-mono text-xs">{fetchError}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Section 1 — Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Annual Recurring Revenue" value={fmt(metrics.arr)} accent="text-green-400" />
        <MetricCard label="Monthly Recurring Revenue" value={fmt(metrics.mrr)} accent="text-blue-400" />
        <MetricCard label="Pipeline Value" value={fmt(metrics.pipelineValue)} accent="text-orange-400" />
        <MetricCard label="Active Districts" value={String(metrics.activeCount)} accent="text-purple-400" />
      </div>

      {/* Section 2 — Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Pipeline Funnel</h3>
          {funnelData.every(d => d.count === 0) ? (
            <p className="text-sm text-gray-500 text-center py-8">No contracts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fill: '#9ca3af', fontSize: 12 }} width={65} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                  itemStyle={{ color: '#d1d5db' }}
                  formatter={(v) => [v, 'Districts']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Product Mix */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Product Mix (Active)</h3>
          {productMixData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No active contracts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={productMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  nameKey="name"
                >
                  {productMixData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                  itemStyle={{ color: '#d1d5db' }}
                  formatter={(v, name) => [v + ' districts', name]}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Section 3 — Renewals in 90 Days */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Renewals in 90 Days</h3>
        {metrics.renewalsIn90.length === 0 ? (
          <p className="text-sm text-gray-500">No renewals in the next 90 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">District</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Products</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Annual Value</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">End Date</th>
                <th className="pb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Days Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {metrics.renewalsIn90.map(c => {
                const days = differenceInDays(parseISO(c.end_date), new Date())
                const urgency = days < 30
                  ? 'bg-red-900/60 text-red-300'
                  : days < 60
                  ? 'bg-yellow-900/60 text-yellow-300'
                  : 'bg-green-900/60 text-green-300'
                return (
                  <tr key={c.id} className="hover:bg-gray-800/40">
                    <td className="py-2.5 pr-4 font-medium text-white">{c.district_name}</td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{(c.products || []).map(p => PRODUCT_LABELS[p] || p).join(', ') || '—'}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{fmt(c.annual_value)}</td>
                    <td className="py-2.5 pr-4 text-gray-400">{format(parseISO(c.end_date), 'MMM d, yyyy')}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${urgency}`}>
                        {days}d
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 4 — All Contracts */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">Contracts ({contracts.length})</h3>
          <button
            onClick={() => { setEditingContract(null); setShowContractModal(true) }}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            + Add Contract
          </button>
        </div>
        {contracts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No contracts yet. Add your first contract to start tracking pipeline and revenue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">District</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tier</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Products</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Annual Value</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Band</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">End</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {contracts.map(c => {
                  const sc = STATUS_COLORS[c.status] || STATUS_COLORS.prospect
                  return (
                    <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{c.district_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${sc.bg} ${sc.text}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 capitalize text-xs">{c.tier}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {(c.products || []).map(p => PRODUCT_LABELS[p] || p).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{fmt(c.annual_value)}</td>
                      <td className="px-4 py-3 text-gray-400 capitalize text-xs">{c.enrollment_band || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.start_date ? format(parseISO(c.start_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.end_date ? format(parseISO(c.end_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setEditingContract(c); setShowContractModal(true) }}
                            className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showContractModal && (
        <ContractModal
          contract={editingContract}
          onClose={() => { setShowContractModal(false); setEditingContract(null) }}
          onSuccess={() => { setShowContractModal(false); setEditingContract(null); fetchContracts() }}
        />
      )}
    </div>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

// ─── Contract Modal ───────────────────────────────────────────────────────────

function ContractModal({ contract, onClose, onSuccess }) {
  const [districts, setDistricts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [districtName, setDistrictName] = useState(contract?.district_name || '')
  const [linkedDistrictId, setLinkedDistrictId] = useState(contract?.district_id || '')
  const [status, setStatus] = useState(contract?.status || 'prospect')
  const [selectedProducts, setSelectedProducts] = useState(contract?.products || [])
  const [tier, setTier] = useState(contract?.tier || 'professional')
  const [annualValue, setAnnualValue] = useState(contract?.annual_value ?? '')
  const [enrollmentBand, setEnrollmentBand] = useState(contract?.enrollment_band || '')
  const [startDate, setStartDate] = useState(contract?.start_date || '')
  const [endDate, setEndDate] = useState(contract?.end_date || '')
  const [notes, setNotes] = useState(contract?.notes || '')

  useEffect(() => {
    supabase.rpc('list_districts_for_admin').then(({ data }) => setDistricts(data || []))
  }, [])

  const toggleProduct = (p) => {
    setSelectedProducts(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleLinkedDistrictChange = (e) => {
    const id = e.target.value
    setLinkedDistrictId(id)
    if (id) {
      const d = districts.find(d => d.id === id)
      if (d) setDistrictName(d.name)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!districtName.trim()) { setError('District name is required.'); return }
    setSaving(true)
    setError(null)
    const payload = {
      district_name: districtName.trim(),
      district_id: linkedDistrictId || null,
      status,
      products: selectedProducts,
      tier,
      annual_value: Number(annualValue) || 0,
      enrollment_band: enrollmentBand || null,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }
    let err
    if (contract?.id) {
      ({ error: err } = await supabase.from('contracts').update(payload).eq('id', contract.id))
    } else {
      ({ error: err } = await supabase.from('contracts').insert(payload))
    }
    setSaving(false)
    if (err) {
      console.error('Contract save error:', err)
      setError(err.message)
    } else {
      onSuccess()
    }
  }

  return (
    <ModalShell onClose={onClose} title={contract ? 'Edit Contract' : 'Add Contract'}>
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">
            <span className="font-medium">Error: </span>{error}
          </div>
        )}
        <Field label="Link to Provisioned District (optional)">
          <Select value={linkedDistrictId} onChange={handleLinkedDistrictChange}>
            <option value="">— Not yet provisioned —</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>

        <Field label="District Name *">
          <Input
            value={districtName}
            onChange={e => setDistrictName(e.target.value)}
            placeholder="e.g. Lonestar ISD"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              {['prospect', 'demo', 'pilot', 'active', 'churned'].map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tier">
            <Select value={tier} onChange={e => setTier(e.target.value)}>
              {TIERS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Products">
          <div className="flex gap-4 mt-1">
            {ALL_PRODUCTS.map(p => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p)}
                  onChange={() => toggleProduct(p)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-200">{PRODUCT_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Annual Value ($)">
            <Input
              type="number"
              min="0"
              step="100"
              value={annualValue}
              onChange={e => setAnnualValue(e.target.value)}
              placeholder="e.g. 4500"
            />
          </Field>
          <Field label="Enrollment Band">
            <Select value={enrollmentBand} onChange={e => setEnrollmentBand(e.target.value)}>
              <option value="">— Select —</option>
              {['micro', 'small', 'medium', 'large', 'enterprise'].map(b => (
                <option key={b} value={b} className="capitalize">{b.charAt(0).toUpperCase() + b.slice(1)}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Field>
          <Field label="End Date">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about this contract or district..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : contract ? 'Save Changes' : 'Add Contract'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ─── Manage district drawer ───────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

const SANDBOX_URL   = 'https://waypoint.clearpathedgroup.com'
const SANDBOX_EMAIL = 'explore@clearpathedgroup.com'
const SANDBOX_PASS  = 'Explore2026!'

function ManageDistrictDrawer({ district, onClose, onRefresh }) {
  const [campuses, setCampuses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddCampus, setShowAddCampus] = useState(false)
  const [tier, setTier] = useState(district.tier)
  const [savingTier, setSavingTier] = useState(false)
  const [products, setProducts] = useState(district.settings?.products || ['waypoint'])
  const [savingProducts, setSavingProducts] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  // New campus form
  const [newCampusName, setNewCampusName] = useState('')
  const [newCampusTea, setNewCampusTea] = useState('')
  const [newCampusType, setNewCampusType] = useState('daep')
  const [addingCampus, setAddingCampus] = useState(false)

  const [setupHealth, setSetupHealth] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [campusRes, userRes, offenseRes, studentRes] = await Promise.all([
        supabase.from('campuses').select('id, name, campus_type, tea_campus_id, daep_seat_allocation').eq('district_id', district.id).order('name'),
        supabase.from('profiles').select('id, full_name, email, role, is_active').eq('district_id', district.id).order('full_name'),
        supabase.from('offense_codes').select('id', { count: 'exact', head: true }).eq('district_id', district.id),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('district_id', district.id),
      ])
      const campusData = campusRes.data || []
      const userData = userRes.data || []
      setCampuses(campusData)
      setUsers(userData)
      const staffCount = userData.filter(u => u.role !== 'parent' && u.role !== 'student').length
      setSetupHealth({
        campuses:     campusData.length > 0,
        offenseCodes: (offenseRes.count || 0) > 0,
        staff:        staffCount > 1,
        students:     (studentRes.count || 0) > 0,
        capacity:     !!(district.settings?.daep_capacity || district.settings?.capacity),
      })
      setLoading(false)
    }
    load()
  }, [district.id])

  const handleSaveTier = async () => {
    setSavingTier(true)
    const { error } = await supabase.rpc('set_district_tier', {
      p_district_id: district.id,
      p_tier: tier,
    })
    setSavingTier(false)
    if (error) {
      alert('Failed to save tier: ' + error.message)
    } else {
      onRefresh()
    }
  }

  const handleSaveProducts = async () => {
    if (products.length === 0) {
      alert('At least one product must be selected.')
      return
    }
    setSavingProducts(true)
    const { error } = await supabase.rpc('set_district_products', {
      p_district_id: district.id,
      p_products: products,
    })
    setSavingProducts(false)
    if (error) {
      alert('Failed to save products: ' + error.message)
    } else {
      onRefresh()
    }
  }

  const toggleProduct = (p) => {
    setProducts(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleAddCampus = async (e) => {
    e.preventDefault()
    if (!newCampusName.trim() || !newCampusTea.trim()) return
    setAddingCampus(true)
    const { error } = await supabase.rpc('provision_campus', {
      p_district_id: district.id,
      p_name: newCampusName.trim(),
      p_tea_id: newCampusTea.trim(),
      p_type: newCampusType,
    })
    setAddingCampus(false)
    if (error) {
      alert('Failed to add campus: ' + error.message)
    } else {
      setNewCampusName('')
      setNewCampusTea('')
      setShowAddCampus(false)
      const { data } = await supabase.from('campuses').select('id, name, campus_type, tea_campus_id, daep_seat_allocation').eq('district_id', district.id).order('name')
      setCampuses(data || [])
      onRefresh()
    }
  }

  const handleResetSandbox = async () => {
    if (!window.confirm('Reset all transactional data for Explorer ISD? This takes ~15 seconds and cannot be undone.')) return
    setResetting(true)
    setResetResult(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResetResult({ ok: true, ts: data.seeded_at })
      } else {
        setResetResult({ ok: false, msg: data.error || 'Unknown error' })
      }
    } catch (err) {
      setResetResult({ ok: false, msg: err.message })
    }
    setResetting(false)
  }

  const handleDeactivateUser = async (userId, currentStatus) => {
    await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-lg bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">{district.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">TEA: {district.tea_district_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Onboarding Health */}
            {setupHealth && (() => {
              const steps = [
                { key: 'campuses',     label: 'Campuses' },
                { key: 'offenseCodes', label: 'Offense codes' },
                { key: 'staff',        label: 'Staff' },
                { key: 'students',     label: 'Students' },
                { key: 'capacity',     label: 'DAEP capacity' },
              ]
              const done = steps.filter(s => setupHealth[s.key]).length
              const color = done === steps.length ? 'green' : done >= 3 ? 'yellow' : 'red'
              const dotClass = color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
              const textClass = color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
              return (
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Onboarding</p>
                    <span className={`text-xs font-bold ${textClass}`}>{done}/{steps.length} complete</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {steps.map(s => (
                      <div key={s.key} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${setupHealth[s.key] ? 'bg-green-500' : dotClass === 'bg-green-500' ? 'bg-gray-700' : dotClass}`} />
                        <span className={`text-xs ${setupHealth[s.key] ? 'text-gray-500' : 'text-gray-300'}`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Sandbox Credentials (only for sandbox districts) */}
            {district.settings?.is_sandbox && (
              <>
                <div className="rounded-lg border border-amber-500/40 bg-amber-900/20 p-4">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Sandbox Credentials</p>
                  {[
                    { label: 'URL',      value: SANDBOX_URL },
                    { label: 'Email',    value: SANDBOX_EMAIL },
                    { label: 'Password', value: SANDBOX_PASS },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 gap-3">
                      <span className="text-xs text-amber-300/70 w-16 shrink-0">{label}</span>
                      <span className="text-xs text-amber-100 font-mono flex-1 truncate">{value}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(value)}
                        className="text-amber-400 hover:text-amber-200 transition-colors shrink-0"
                        title="Copy"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-amber-400/60 mt-2">Copy into welcome email before sending</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">Wipes all transactional data and reseeds. ~15 seconds. District/campuses/admin unaffected.</p>
                  <button
                    onClick={handleResetSandbox}
                    disabled={resetting}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {resetting ? 'Resetting…' : 'Reset Sandbox Data'}
                  </button>
                  {resetResult && (
                    <p className={`text-xs mt-2 ${resetResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {resetResult.ok
                        ? `✓ Reseeded at ${new Date(resetResult.ts).toLocaleTimeString()}`
                        : `✗ ${resetResult.msg}`}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Tier */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Subscription Tier</h3>
              <div className="flex items-center gap-3">
                <Select value={tier} onChange={e => setTier(e.target.value)}>
                  {TIERS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </Select>
                <button
                  onClick={handleSaveTier}
                  disabled={savingTier || tier === district.tier}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {savingTier ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Products */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Licensed Products</h3>
              <div className="space-y-2 mb-3">
                {ALL_PRODUCTS.map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={products.includes(p)}
                      onChange={() => toggleProduct(p)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-200 capitalize">{PRODUCT_LABELS[p]}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleSaveProducts}
                disabled={savingProducts}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {savingProducts ? 'Saving…' : 'Save Products'}
              </button>
            </div>

            {/* Campuses */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300">Campuses ({campuses.length})</h3>
                <button onClick={() => setShowAddCampus(!showAddCampus)} className="text-xs text-orange-400 hover:text-orange-300">+ Add Campus</button>
              </div>

              {showAddCampus && (
                <form onSubmit={handleAddCampus} className="mb-3 p-3 bg-gray-800 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Campus Name *"><Input value={newCampusName} onChange={e => setNewCampusName(e.target.value)} placeholder="e.g. Lonestar DAEP" /></Field>
                    <Field label="TEA Campus ID *"><Input value={newCampusTea} onChange={e => setNewCampusTea(e.target.value)} placeholder="9-digit code" /></Field>
                  </div>
                  <Field label="Type">
                    <Select value={newCampusType} onChange={e => setNewCampusType(e.target.value)}>
                      {CAMPUS_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </Select>
                  </Field>
                  <div className="flex gap-2">
                    <button type="submit" disabled={addingCampus} className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors">
                      {addingCampus ? 'Adding…' : 'Add Campus'}
                    </button>
                    <button type="button" onClick={() => setShowAddCampus(false)} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">Cancel</button>
                  </div>
                </form>
              )}

              <div className="space-y-1">
                {campuses.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/60 rounded-lg gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.campus_type?.toUpperCase()} · {c.tea_campus_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-gray-400 uppercase">DAEP Seats</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={c.daep_seat_allocation || 0}
                        onBlur={async (e) => {
                          const val = parseInt(e.target.value, 10) || 0
                          if (val === (c.daep_seat_allocation || 0)) return
                          const { error } = await supabase
                            .from('campuses')
                            .update({ daep_seat_allocation: val })
                            .eq('id', c.id)
                          if (error) alert('Failed to update allocation: ' + error.message)
                          else {
                            const { data } = await supabase.from('campuses').select('id, name, campus_type, tea_campus_id, daep_seat_allocation').eq('district_id', district.id).order('name')
                            setCampuses(data || [])
                          }
                        }}
                        className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-white text-center focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Users */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Users ({users.length})</h3>
              <div className="space-y-1">
                {users.map(u => (
                  <div key={u.id} className={`flex items-center justify-between px-3 py-2 bg-gray-800/60 rounded-lg ${u.is_active === false ? 'opacity-50' : ''}`}>
                    <div>
                      <p className="text-sm text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                    </div>
                    <button
                      onClick={() => handleDeactivateUser(u.id, u.is_active !== false)}
                      className={`text-xs font-medium transition-colors ${u.is_active === false ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                    >
                      {u.is_active === false ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Provision modal (4-step wizard) ─────────────────────────────────────────

const STEPS = ['District', 'Campus', 'Admin Account', 'Review']

function ProvisionModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(0)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState(null)
  const [provisionResult, setProvisionResult] = useState(null)

  // Step 1 — District
  const [districtName, setDistrictName] = useState('')
  const [teaDistrictId, setTeaDistrictId] = useState('')
  const [state, setState] = useState('TX')
  const [tier, setTier] = useState('professional')
  const [selectedProducts, setSelectedProducts] = useState(['waypoint'])

  // Step 2 — Campus
  const [campusName, setCampusName] = useState('')
  const [teaCampusId, setTeaCampusId] = useState('')
  const [campusType, setCampusType] = useState('daep')

  // Step 3 — Admin
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function canProceed() {
    if (step === 0) return districtName.trim() && teaDistrictId.trim() && state.trim()
    if (step === 1) return campusName.trim() && teaCampusId.trim() && campusType
    if (step === 2) return fullName.trim() && email.trim() && password.length >= 8
    return true
  }

  async function handleProvision() {
    setProvisioning(true)
    setProvisionError(null)
    try {
      // 1. Create district
      const { data: districtId, error: de } = await supabase.rpc('provision_new_district', {
        p_name: districtName.trim(),
        p_tea_id: teaDistrictId.trim(),
        p_state: state.trim(),
        p_tier: tier,
        p_products: selectedProducts,
      })
      if (de) throw new Error(`District: ${de.message}`)

      // 2. Create campus
      const { data: campusId, error: ce } = await supabase.rpc('provision_campus', {
        p_district_id: districtId,
        p_name: campusName.trim(),
        p_tea_id: teaCampusId.trim(),
        p_type: campusType,
      })
      if (ce) throw new Error(`Campus: ${ce.message}`)

      // 3. Create auth user via Supabase Admin API
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password, email_confirm: true }),
      })
      const userData = await res.json()
      if (!res.ok) throw new Error(`Auth user: ${userData.message || userData.error || 'Unknown error'}`)
      const userId = userData.id

      // 4. Create profile + campus assignment
      const { error: pe } = await supabase.rpc('provision_admin_profile', {
        p_user_id: userId,
        p_district_id: districtId,
        p_email: email.trim(),
        p_full_name: fullName.trim(),
        p_campus_id: campusId,
      })
      if (pe) throw new Error(`Profile: ${pe.message}`)

      setProvisionResult({ districtName: districtName.trim(), email: email.trim(), password })
    } catch (err) {
      setProvisionError(err.message)
    } finally {
      setProvisioning(false)
    }
  }

  // Success state
  if (provisionResult) {
    return (
      <ModalShell onClose={onSuccess} title="District Provisioned!">
        <div className="space-y-4">
          <div className="p-4 bg-green-900/40 border border-green-700 rounded-lg">
            <p className="text-sm font-medium text-green-300 mb-3">"{provisionResult.districtName}" is ready.</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p><span className="text-gray-400">Login URL:</span> {window.location.origin}/login</p>
              <p><span className="text-gray-400">Email:</span> {provisionResult.email}</p>
              <p><span className="text-gray-400">Temp Password:</span> <span className="font-mono bg-gray-800 px-1 rounded">{provisionResult.password}</span></p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Share these credentials securely. The district admin should change their password after first login.</p>
          <button
            onClick={onSuccess}
            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose} title="Provision New District">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < step ? 'bg-green-600 text-white' : i === step ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-white' : 'text-gray-500'} hidden sm:inline`}>{label}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="space-y-4 min-h-48">
        {step === 0 && (
          <>
            <h3 className="text-sm font-semibold text-white">Step 1 — District Information</h3>
            <Field label="District Name *">
              <Input value={districtName} onChange={e => setDistrictName(e.target.value)} placeholder="e.g. Lonestar ISD" />
            </Field>
            <Field label="TEA District ID *">
              <Input value={teaDistrictId} onChange={e => setTeaDistrictId(e.target.value)} placeholder="6-digit code" maxLength={10} />
            </Field>
            <Field label="State *">
              <Input value={state} onChange={e => setState(e.target.value)} placeholder="TX" maxLength={2} />
            </Field>
            <Field label="Subscription Tier *">
              <Select value={tier} onChange={e => setTier(e.target.value)}>
                {TIERS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </Select>
            </Field>
            <Field label="Licensed Products *">
              <div className="space-y-1.5 mt-1">
                {ALL_PRODUCTS.map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p)}
                      onChange={() => setSelectedProducts(prev =>
                        prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                      )}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-200">{PRODUCT_LABELS[p]}</span>
                  </label>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <h3 className="text-sm font-semibold text-white">Step 2 — Primary Campus</h3>
            <Field label="Campus Name *">
              <Input value={campusName} onChange={e => setCampusName(e.target.value)} placeholder="e.g. Lonestar DAEP" />
            </Field>
            <Field label="TEA Campus ID *">
              <Input value={teaCampusId} onChange={e => setTeaCampusId(e.target.value)} placeholder="9-digit code" maxLength={12} />
            </Field>
            <Field label="Campus Type *">
              <Select value={campusType} onChange={e => setCampusType(e.target.value)}>
                {CAMPUS_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.toUpperCase()}</option>)}
              </Select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-sm font-semibold text-white">Step 3 — District Admin Account</h3>
            <Field label="Full Name *">
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" />
            </Field>
            <Field label="Email Address *">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@district.org" />
            </Field>
            <Field label="Temporary Password * (min 8 chars)">
              <Input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Temp password" />
            </Field>
            <p className="text-xs text-gray-500">Admin can change their password after first login.</p>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold text-white mb-3">Step 4 — Review & Provision</h3>
            <div className="space-y-3 text-sm">
              <ReviewSection title="District">
                <ReviewRow label="Name" value={districtName} />
                <ReviewRow label="TEA ID" value={teaDistrictId} />
                <ReviewRow label="State" value={state} />
                <ReviewRow label="Tier" value={<span className="capitalize">{tier}</span>} />
                <ReviewRow label="Products" value={selectedProducts.map(p => PRODUCT_LABELS[p]).join(', ')} />
              </ReviewSection>
              <ReviewSection title="Campus">
                <ReviewRow label="Name" value={campusName} />
                <ReviewRow label="TEA ID" value={teaCampusId} />
                <ReviewRow label="Type" value={campusType.toUpperCase()} />
              </ReviewSection>
              <ReviewSection title="Admin Account">
                <ReviewRow label="Name" value={fullName} />
                <ReviewRow label="Email" value={email} />
                <ReviewRow label="Password" value={<span className="font-mono">{password}</span>} />
              </ReviewSection>
            </div>
            {provisionError && (
              <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">
                <span className="font-medium">Error: </span>{provisionError}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          disabled={provisioning}
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleProvision}
            disabled={provisioning}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {provisioning ? 'Provisioning…' : 'Provision District'}
          </button>
        )}
      </div>
    </ModalShell>
  )
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Product Hub ──────────────────────────────────────────────────────────────

const HUB_PRODUCTS = [
  {
    name: 'Waypoint', tagline: 'DAEP Management', color: '#f97316',
    status: 'Live',
    description: 'Full DAEP lifecycle — incident creation, approval chain, SPED compliance blocking, transition plans, orientation kiosk, parent portal.',
    links: [
      { label: 'Dashboard',       href: `${APP_BASE}/dashboard` },
      { label: 'Incidents',       href: `${APP_BASE}/incidents` },
      { label: 'DAEP Dashboard',  href: `${APP_BASE}/daep` },
      { label: 'Compliance',      href: `${APP_BASE}/compliance` },
      { label: 'Transition Plans',href: `${APP_BASE}/plans` },
      { label: 'Reports',         href: `${APP_BASE}/reports` },
      { label: 'Calendar',        href: `${APP_BASE}/calendar` },
    ],
  },
  {
    name: 'Navigator', tagline: 'ISS / OSS + Behavior Intelligence', color: '#3b82f6',
    status: 'Live',
    description: 'Referrals, ISS/OSS placements, proactive supports, escalation risk scoring, skill gap mapping, effectiveness tracking, disproportionality radar.',
    links: [
      { label: 'Nav Dashboard',      href: `${APP_BASE}/navigator` },
      { label: 'Escalation Engine',  href: `${APP_BASE}/navigator/escalation` },
      { label: 'Skill Gap Map',      href: `${APP_BASE}/navigator/skill-map` },
      { label: 'Effectiveness',      href: `${APP_BASE}/navigator/effectiveness` },
      { label: 'Disproportionality', href: `${APP_BASE}/navigator/disproportionality` },
      { label: 'Pilot Summary',      href: `${APP_BASE}/navigator/pilot` },
    ],
  },
  {
    name: 'Meridian', tagline: 'SPED Compliance', color: '#a855f7',
    status: 'Live',
    description: 'ARD timelines, dyslexia/HB 3928, folder readiness, CAP tracker, SPPI-13 secondary transition, RDA indicators dashboard.',
    links: [
      { label: 'SPED Overview',       href: `${APP_BASE}/meridian` },
      { label: 'ARD Timelines',       href: `${APP_BASE}/meridian/timelines` },
      { label: 'Dyslexia / HB 3928',  href: `${APP_BASE}/meridian/dyslexia` },
      { label: 'Folder Readiness',    href: `${APP_BASE}/meridian/folders` },
      { label: 'CAP Tracker',         href: `${APP_BASE}/meridian/cap` },
      { label: 'Transition SPPI-13',  href: `${APP_BASE}/meridian/transition` },
      { label: 'RDA Dashboard',       href: `${APP_BASE}/meridian/rda` },
    ],
  },
  {
    name: 'Origins', tagline: 'Family Portal', color: '#0d9488',
    status: 'Live',
    description: 'Restorative family engagement — student scenario player (7-step), parent conversation starters, 18 TEC-aligned scenarios, skill pathways.',
    links: [
      { label: 'Origins Dashboard',  href: `${APP_BASE}/origins` },
      { label: 'Response Moments',   href: `${APP_BASE}/origins/response-moments` },
      { label: 'Family Workspace',   href: `${APP_BASE}/origins/family-workspace` },
      { label: 'Skill Pathways',     href: `${APP_BASE}/origins/pathways` },
      { label: 'Student Portal',     href: `${APP_BASE}/family/student` },
      { label: 'Parent Portal',      href: `${APP_BASE}/family/parent` },
    ],
  },
]

const DEMO_SITES = [
  { label: 'App — Staff Login',   url: APP_BASE },
  { label: 'App — Parent Portal', url: `${APP_BASE}/parent` },
  { label: 'Navigator',           url: `${APP_BASE}/navigator` },
  { label: 'Meridian (SPED)',     url: `${APP_BASE}/meridian` },
  { label: 'Origins (Family)',    url: `${APP_BASE}/family` },
  { label: 'DAEP Kiosk',          url: `${APP_BASE}/kiosk` },
  { label: 'Orientation Kiosk',   url: `${APP_BASE}/orientation` },
  { label: 'Marketing Site',      url: 'https://clearpathedgroup.com' },
  { label: 'Whitepaper',          url: 'https://clearpathedgroup.com/whitepaper.html' },
  { label: 'Waypoint Admin',      url: `${APP_BASE}/waypoint-admin` },
]

const DEMO_ACCOUNTS_HUB = [
  {
    group: 'Lone Star ISD — Staff (Password: Password123!)',
    accounts: [
      { role: 'District Admin',      email: 'admin@lonestar-isd.org',        pw: 'Password123!', note: 'Full access, all campuses' },
      { role: 'DAEP Staff (AP)',      email: 'daep-staff@lonestar-isd.org',   pw: 'Password123!', note: 'All campuses' },
      { role: 'Principal',           email: 'hs-principal@lonestar-isd.org',  pw: 'Password123!', note: 'High School only' },
      { role: 'Asst. Principal',     email: 'hs-ap@lonestar-isd.org',         pw: 'Password123!', note: 'High School only' },
      { role: 'Counselor',           email: 'ms-counselor@lonestar-isd.org',  pw: 'Password123!', note: 'Middle School only' },
      { role: 'Teacher',             email: 'el-teacher@lonestar-isd.org',    pw: 'Password123!', note: 'Elementary only' },
      { role: 'SPED Coordinator',    email: 'sped-coord@lonestar-isd.org',    pw: 'Password123!', note: 'Middle School only' },
    ],
  },
  {
    group: 'Parent Portal',
    accounts: [
      { role: 'Parent (demo)',       email: 'parent@lonestar-isd.org',        pw: 'Password123!', note: 'Marcus & Sofia Johnson' },
      { role: 'Parent (B-roll)',     email: 'parent.marcus@gmail.com',         pw: 'Password123!', note: 'Sandra Johnson (guardian of Marcus)' },
    ],
  },
  {
    group: 'Internal',
    accounts: [
      { role: 'Waypoint Admin',      email: 'admin@waypoint.internal',         pw: 'Waypoint2025!', note: '/waypoint-admin' },
    ],
  },
]

function ProductHub({ districts = [], loadingDistricts = false }) {
  const [showPasswords, setShowPasswords] = useState(false)
  const [copied, setCopied] = useState(null)
  const [scenarioCount, setScenarioCount] = useState(null)  // null = loading, number = count
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState(null)

  useEffect(() => {
    supabase
      .from('origins_scenarios')
      .select('*', { count: 'exact', head: true })
      .is('district_id', null)
      .then(({ count }) => setScenarioCount(count ?? 0))
  }, [])

  async function seedOrigins() {
    setSeeding(true)
    setSeedMsg(null)
    const rows = ORIGINS_SCENARIOS.map(s => ({
      district_id:   null,
      title:         s.title,
      description:   s.description,
      skill_pathway: s.skill_pathway,
      grade_band:    s.grade_band,
      content:       { ...s.content, tec_offense: s.tec_offense },
      is_active:     s.is_active ?? true,
    }))
    const { error } = await supabase.from('origins_scenarios').insert(rows)
    if (error) {
      setSeedMsg({ ok: false, text: error.message })
    } else {
      setScenarioCount(rows.length)
      setSeedMsg({ ok: true, text: `${rows.length} scenarios seeded successfully.` })
    }
    setSeeding(false)
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1400)
    })
  }

  return (
    <div className="space-y-8">

      {/* Live District Roster */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Live District Roster</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loadingDistricts ? (
            <p className="text-sm text-gray-500 p-5">Loading…</p>
          ) : districts.length === 0 ? (
            <p className="text-sm text-gray-500 p-5">No districts provisioned yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">District</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tier</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Active Products</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {districts.map(d => {
                  const prods = d.settings?.products || ['waypoint']
                  return (
                    <tr key={d.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${TIER_COLORS[d.tier] || TIER_COLORS.essential}`}>
                          {d.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {prods.map(p => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: (PRODUCT_COLORS[p] || '#6b7280') + '33', border: `1px solid ${PRODUCT_COLORS[p] || '#6b7280'}66` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[p] || '#6b7280' }} />
                              {PRODUCT_LABELS[p] || p}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Product Cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Waypoint — All Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {HUB_PRODUCTS.map(p => (
            <div key={p.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
              {/* Color band */}
              <div className="h-1.5 w-full" style={{ backgroundColor: p.color }} />
              <div className="px-4 pt-4 pb-3 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-white font-bold text-base">{p.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: p.color }}>{p.tagline}</p>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0 mt-0.5">{p.status}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
              </div>
              <div className="px-4 pb-4">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Quick Links</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {p.links.map(l => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium transition-colors hover:underline"
                      style={{ color: p.color }}
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Sites */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Demo Sites</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DEMO_SITES.map(s => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between hover:border-gray-600 transition-colors group"
            >
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{s.label}</span>
              <svg className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-300 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          ))}
        </div>
      </section>

      {/* Admin Actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Admin Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Origins — Seed Global Scenarios */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white">Origins — Global Scenarios</h3>
              {scenarioCount === null ? (
                <span className="text-xs text-gray-500">Checking…</span>
              ) : scenarioCount > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 font-medium">{scenarioCount} seeded</span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 font-medium">Not seeded</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">Insert the 18 TEC-aligned global scenarios into <code className="text-gray-400">origins_scenarios</code>. Safe to run once — check count before clicking.</p>
            {seedMsg && (
              <p className={`text-xs mb-3 font-medium ${seedMsg.ok ? 'text-teal-400' : 'text-red-400'}`}>{seedMsg.text}</p>
            )}
            <button
              onClick={seedOrigins}
              disabled={seeding || scenarioCount > 0}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
            >
              {seeding ? 'Seeding…' : scenarioCount > 0 ? `Already Seeded (${scenarioCount})` : 'Seed 18 Global Scenarios'}
            </button>
          </div>
        </div>
      </section>

      {/* Demo Credentials */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Demo Credentials</h2>
          <button
            onClick={() => setShowPasswords(v => !v)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              showPasswords ? 'bg-amber-900/60 text-amber-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
          {DEMO_ACCOUNTS_HUB.map(group => (
            <div key={group.group} className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.group}</p>
              <div className="space-y-2">
                {group.accounts.map(acc => (
                  <div key={acc.email} className="grid grid-cols-12 gap-2 items-center bg-gray-800/50 rounded-lg px-3 py-2">
                    {/* Role */}
                    <span className="col-span-3 text-xs font-medium text-gray-300 truncate">{acc.role}</span>

                    {/* Email */}
                    <div className="col-span-4 flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 font-mono truncate">{acc.email}</span>
                      <button
                        onClick={() => copy(acc.email, `e-${acc.email}`)}
                        className="shrink-0 text-gray-600 hover:text-orange-400 transition-colors"
                        title="Copy email"
                      >
                        {copied === `e-${acc.email}`
                          ? <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                        }
                      </button>
                    </div>

                    {/* Password */}
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 font-mono">
                        {showPasswords ? acc.pw : '••••••••••'}
                      </span>
                      {showPasswords && (
                        <button
                          onClick={() => copy(acc.pw, `p-${acc.email}`)}
                          className="shrink-0 text-gray-600 hover:text-orange-400 transition-colors"
                          title="Copy password"
                        >
                          {copied === `p-${acc.email}`
                            ? <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
                          }
                        </button>
                      )}
                    </div>

                    {/* Note */}
                    <span className="col-span-2 text-xs text-gray-600 truncate hidden lg:block">{acc.note}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
    >
      {children}
    </select>
  )
}

function ReviewSection({ title, children }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  )
}

// ─── Partner Chat (connects to ops Supabase) ───────────────────────────────────

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const CHAT_SENDER = 'Kim'

async function opsGetMessages() {
  const r = await fetch(`${OPS_URL}/rest/v1/messages?order=created_at.asc&limit=100`, {
    headers: { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}` },
  })
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

async function opsSendMessage(message) {
  const r = await fetch(`${OPS_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: {
      apikey: OPS_KEY,
      Authorization: `Bearer ${OPS_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ sender: CHAT_SENDER, message }),
  })
  if (!r.ok) throw new Error(r.status)
}

function PartnerChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState(null)
  const lastIdRef = useRef(0)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const msgs = await opsGetMessages()
      setError(null)
      const newFromOther = msgs.filter(m => m.id > lastIdRef.current && m.sender !== CHAT_SENDER)
      if (newFromOther.length && !open) setUnread(u => u + newFromOther.length)
      if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id
      setMessages(msgs)
    } catch {
      setError('Chat unavailable — run the messages table SQL first')
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      load()
      pollRef.current = setInterval(load, 5000)
    } else {
      clearInterval(pollRef.current)
    }
    return () => clearInterval(pollRef.current)
  }, [open, load])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const msg = input.trim()
    if (!msg || sending) return
    setSending(true)
    setInput('')
    try {
      await opsSendMessage(msg)
      await load()
    } catch {
      setError('Failed to send')
    }
    setSending(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 420 }}>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
            <div>
              <p className="text-sm font-semibold text-white">Partner Chat</p>
              <p className="text-xs text-gray-400">Kim &amp; Melissa</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {error && <p className="text-center text-red-400 text-xs mt-4 px-3">{error}</p>}
            {!error && messages.length === 0 && (
              <p className="text-center text-gray-500 text-xs mt-8">No messages yet. Say hello! 👋</p>
            )}
            {messages.map(m => {
              const isMe = m.sender === CHAT_SENDER
              return (
                <div key={m.id} className={`flex flex-col gap-0.5 max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words ${isMe ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-gray-700 text-gray-100 rounded-bl-sm'}`}>
                    {m.message}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {isMe ? '' : `${m.sender} · `}{new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 p-3 border-t border-gray-700 flex-shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Message Melissa…"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg transition-all flex items-center justify-center text-xl"
        title="Partner Chat"
      >
        💬
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}
