import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import { ROLES, ROLE_LABELS, STAFF_ROLES } from '../lib/constants'

export default function UserManagementPage() {
  const { districtId, district } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingRole, setEditingRole] = useState(null) // profileId

  const fetchProfiles = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('district_id', districtId)
      .order('full_name')
    if (error) {
      toast.error('Failed to load users')
    } else {
      setProfiles(data || [])
    }
    setLoading(false)
  }, [districtId])

  useEffect(() => {
    fetchProfiles()
    if (districtId) {
      supabase.from('campuses').select('id, name').eq('district_id', districtId).then(({ data }) => setCampuses(data || []))
    }
  }, [districtId, fetchProfiles])

  const handleRoleChange = async (profileId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
      .eq('district_id', districtId)
    if (error) {
      toast.error('Failed to update role')
    } else {
      toast.success('Role updated')
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p))
      setEditingRole(null)
    }
  }

  const handleDeactivate = async (profileId, currentStatus) => {
    const newStatus = !currentStatus
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', profileId)
      .eq('district_id', districtId)
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(newStatus ? 'User activated' : 'User deactivated')
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, is_active: newStatus } : p))
    }
  }

  const activeCount = profiles.filter(p => p.is_active !== false).length

  return (
    <div>
      <Topbar
        title="User Management"
        subtitle={`${activeCount} active user${activeCount !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/settings" className="text-sm text-gray-500 hover:text-gray-700">← Settings</Link>
            <Button size="sm" variant="secondary" onClick={() => setShowBulkImport(true)}>
              Import Staff
            </Button>
            <Button size="sm" onClick={() => setShowInvite(true)}>
              + Invite User
            </Button>
          </div>
        }
      />
      <div className="p-3 md:p-6">
        {districtId && (
          <ParentRegistrationLinkCard districtId={districtId} />
        )}

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <Card padding={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map(profile => (
                  <tr key={profile.id} className={`hover:bg-gray-50 ${profile.is_active === false ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{profile.full_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{profile.email}</td>
                    <td className="px-4 py-3">
                      {editingRole === profile.id ? (
                        <select
                          defaultValue={profile.role}
                          onChange={e => handleRoleChange(profile.id, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                          autoFocus
                        >
                          {[...STAFF_ROLES, ROLES.PARENT].map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingRole(profile.id)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-orange-50 rounded border border-transparent hover:border-orange-200 transition-colors"
                          title="Click to change role"
                        >
                          {ROLE_LABELS[profile.role] || profile.role}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={profile.is_active === false ? 'gray' : 'green'} size="sm" dot>
                        {profile.is_active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeactivate(profile.id, profile.is_active !== false)}
                        className={`text-xs font-medium transition-colors ${
                          profile.is_active === false
                            ? 'text-green-600 hover:text-green-800'
                            : 'text-red-500 hover:text-red-700'
                        }`}
                      >
                        {profile.is_active === false ? 'Activate' : 'Deactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">No users found.</div>
            )}
          </Card>
        )}
      </div>

      {showInvite && (
        <InviteUserModal
          districtId={districtId}
          campuses={campuses}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchProfiles() }}
        />
      )}

      {showBulkImport && (
        <BulkStaffImportModal
          districtId={districtId}
          campuses={campuses}
          existingEmails={profiles.map(p => p.email?.toLowerCase())}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => { setShowBulkImport(false); fetchProfiles() }}
        />
      )}
    </div>
  )
}

/* ── Bulk Staff Import Modal ── */
function BulkStaffImportModal({ districtId, campuses, existingEmails, onClose, onSuccess }) {
  const [csv, setCsv] = useState('')
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  function splitCSVLine(line) {
    const result = []
    let cur = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim()); cur = ''
      } else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    const hdrs = splitCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''))
    const dataRows = lines.slice(1).map(line => {
      const vals = splitCSVLine(line)
      const row = {}
      hdrs.forEach((h, i) => { row[h] = vals[i] || '' })
      return row
    }).filter(r => r.full_name || r.name || r.email)
    return { headers: hdrs, rows: dataRows }
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setCsv(text)
      const parsed = parseCSV(text)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setError('')
    }
    reader.readAsText(file)
  }

  const campusMap = Object.fromEntries(campuses.map(c => [c.name.toLowerCase(), c.id]))
  const validRoles = STAFF_ROLES.map(r => r.toLowerCase())
  const existingSet = new Set((existingEmails || []).map(e => (e || '').toLowerCase()))

  const validated = rows.map(r => {
    const name = r.full_name || r.name || ''
    const email = (r.email || '').toLowerCase()
    const role = (r.role || '').toLowerCase()
    const campusName = (r.campus || r.campus_name || '').toLowerCase()
    const campusId = campusMap[campusName] || null
    const errors = []
    if (!name.trim()) errors.push('Missing name')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email')
    if (!validRoles.includes(role)) errors.push(`Invalid role "${r.role}"`)
    if (!campusId && campusName) errors.push(`Campus "${r.campus || r.campus_name}" not found`)
    if (existingSet.has(email)) errors.push('Email already exists')
    return { name, email, role, campusName: r.campus || r.campus_name || '', campusId, errors, valid: errors.length === 0 }
  })

  const validCount = validated.filter(r => r.valid).length

  async function handleImport() {
    setImporting(true)
    setError('')
    let success = 0, skipped = 0, failures = []

    for (const row of validated) {
      if (!row.valid) { skipped++; continue }
      try {
        const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
          body: {
            email: row.email,
            fullName: row.name,
            role: row.role,
            districtId,
            campusIds: row.campusId ? [row.campusId] : [],
          },
        })
        if (fnError) throw new Error(fnError.message || 'User invite requires server setup. Contact your administrator.')
        if (data?.error) throw new Error(data.error)
        success++
      } catch (err) {
        failures.push(`${row.name}: ${err.message}`)
      }
    }
    setImporting(false)
    setResult({ success, skipped, failures })
  }

  if (result) {
    return (
      <Modal onClose={onSuccess} title="Import Complete">
        <div className="space-y-3">
          <p className="text-green-600 font-semibold">{result.success} staff member{result.success !== 1 ? 's' : ''} imported successfully.</p>
          {result.skipped > 0 && <p className="text-amber-600 text-sm">{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped (validation errors).</p>}
          {result.failures.length > 0 && (
            <div className="text-red-600 text-sm space-y-1">
              {result.failures.map((f, i) => <p key={i}>{f}</p>)}
            </div>
          )}
          <Button onClick={onSuccess}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title="Import Staff from CSV" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Upload a CSV with columns: <strong>full_name, email, role, campus</strong>. Role must match a valid staff role. Campus must match an existing campus name.</p>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>Choose CSV File</Button>

        {rows.length > 0 && (
          <>
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Campus</th><th className="p-2 text-left">Status</th></tr></thead>
                <tbody>
                  {validated.slice(0, 20).map((r, i) => (
                    <tr key={i} className={`border-b ${r.valid ? '' : 'bg-red-50'}`}>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2">{ROLE_LABELS[r.role] || r.role}</td>
                      <td className="p-2">{r.campusName}</td>
                      <td className="p-2">{r.valid ? <span className="text-green-600 text-xs font-medium">Ready</span> : <span className="text-red-600 text-xs">{r.errors.join(', ')}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validated.length > 20 && <p className="p-2 text-xs text-gray-500">...and {validated.length - 20} more</p>}
            </div>
            <p className="text-sm text-gray-600">{validCount} of {validated.length} rows ready to import. {validated.length - validCount} will be skipped.</p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleImport} loading={importing} disabled={validCount === 0}>Import {validCount} Staff Member{validCount !== 1 ? 's' : ''}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function InviteUserModal({ districtId, campuses, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('teacher')
  const [campusId, setCampusId] = useState(campuses[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      setError('Please fill all required fields.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: email.trim(),
          fullName: fullName.trim(),
          role,
          districtId,
          campusIds: campusId ? [campusId] : [],
        },
      })
      if (fnError) throw new Error('User invite requires server setup. Contact your administrator.')
      if (data?.error) throw new Error(data.error)

      toast.success(`${fullName} invited successfully`)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold text-gray-900">Invite User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                {[...STAFF_ROLES, ROLES.PARENT].map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Campus</label>
              <select value={campusId} onChange={e => setCampusId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">No campus</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Invite User</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ParentRegistrationLinkCard({ districtId }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/parent-register?d=${districtId}`

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-orange-900">Parent Registration Link</p>
          <p className="text-xs text-orange-700 mt-0.5">Share this link with parents so they can self-register and access their child's records.</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-xs bg-white border border-orange-200 rounded px-2 py-1.5 text-gray-700 truncate">{link}</code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-300 rounded hover:bg-orange-50"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
