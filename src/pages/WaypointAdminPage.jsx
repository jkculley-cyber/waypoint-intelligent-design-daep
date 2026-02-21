import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'

const TIERS = ['essential', 'professional', 'enterprise']
const CAMPUS_TYPES = ['elementary', 'middle', 'high', 'daep', 'jjaep', 'other']

const TIER_COLORS = {
  essential:    'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise:   'bg-purple-100 text-purple-700',
}

// ─── Top-level page ───────────────────────────────────────────────────────────

export default function WaypointAdminPage() {
  const { user, signOut } = useAuth()
  const [districts, setDistricts] = useState([])
  const [loadingDistricts, setLoadingDistricts] = useState(true)
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [managingDistrict, setManagingDistrict] = useState(null)
  const serviceRoleKeyMissing = !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

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

        {/* Districts section */}
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
    </div>
  )
}

// ─── Manage district drawer ───────────────────────────────────────────────────

function ManageDistrictDrawer({ district, onClose, onRefresh }) {
  const [campuses, setCampuses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddCampus, setShowAddCampus] = useState(false)
  const [tier, setTier] = useState(district.tier)
  const [savingTier, setSavingTier] = useState(false)

  // New campus form
  const [newCampusName, setNewCampusName] = useState('')
  const [newCampusTea, setNewCampusTea] = useState('')
  const [newCampusType, setNewCampusType] = useState('daep')
  const [addingCampus, setAddingCampus] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [campusRes, userRes] = await Promise.all([
        supabase.from('campuses').select('id, name, campus_type, tea_campus_id').eq('district_id', district.id).order('name'),
        supabase.from('profiles').select('id, full_name, email, role, is_active').eq('district_id', district.id).order('full_name'),
      ])
      setCampuses(campusRes.data || [])
      setUsers(userRes.data || [])
      setLoading(false)
    }
    load()
  }, [district.id])

  const handleSaveTier = async () => {
    setSavingTier(true)
    const { error } = await supabase
      .from('districts')
      .update({ settings: { ...district.settings, subscription_tier: tier } })
      .eq('id', district.id)
    setSavingTier(false)
    if (error) {
      alert('Failed to save tier: ' + error.message)
    } else {
      onRefresh()
    }
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
      const { data } = await supabase.from('campuses').select('id, name, campus_type, tea_campus_id').eq('district_id', district.id).order('name')
      setCampuses(data || [])
      onRefresh()
    }
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
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/60 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.campus_type?.toUpperCase()} · {c.tea_campus_id}</p>
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
