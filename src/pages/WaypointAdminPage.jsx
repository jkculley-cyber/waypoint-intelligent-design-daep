import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const TIERS = ['essential', 'professional', 'enterprise']
const CAMPUS_TYPES = ['elementary', 'middle', 'high', 'daep', 'jjaep', 'other']
const ALL_PRODUCTS = ['waypoint', 'navigator', 'meridian']
const PRODUCT_LABELS = { waypoint: 'Waypoint', navigator: 'Navigator', meridian: 'Meridian' }
const PRODUCT_COLORS = { waypoint: '#f97316', navigator: '#3b82f6', meridian: '#a855f7' }

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

export default function WaypointAdminPage() {
  const { user, signOut } = useAuth()
  const [districts, setDistricts] = useState([])
  const [loadingDistricts, setLoadingDistricts] = useState(true)
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [managingDistrict, setManagingDistrict] = useState(null)
  const [activeTab, setActiveTab] = useState('districts')
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
    if (err) { setError(err.message) } else { onSuccess() }
  }

  return (
    <ModalShell onClose={onClose} title={contract ? 'Edit Contract' : 'Add Contract'}>
      <form onSubmit={handleSave} className="space-y-4">
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

        {error && (
          <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

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

function ManageDistrictDrawer({ district, onClose, onRefresh }) {
  const [campuses, setCampuses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddCampus, setShowAddCampus] = useState(false)
  const [tier, setTier] = useState(district.tier)
  const [savingTier, setSavingTier] = useState(false)
  const [products, setProducts] = useState(district.settings?.products || ['waypoint'])
  const [savingProducts, setSavingProducts] = useState(false)

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
