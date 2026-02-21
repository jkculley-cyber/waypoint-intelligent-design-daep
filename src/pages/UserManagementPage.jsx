import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { ROLES, ROLE_LABELS, STAFF_ROLES } from '../lib/constants'

export default function UserManagementPage() {
  const { districtId, district } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editingRole, setEditingRole] = useState(null) // profileId
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

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
            <Button size="sm" onClick={() => setShowInvite(true)} disabled={!serviceRoleKey}>
              + Invite User
            </Button>
          </div>
        }
      />
      <div className="p-6">
        {!serviceRoleKey && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Note:</strong> VITE_SUPABASE_SERVICE_ROLE_KEY is not set — user invitations are disabled. Add it to .env.local to enable.
          </div>
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
          serviceRoleKey={serviceRoleKey}
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchProfiles() }}
        />
      )}
    </div>
  )
}

function InviteUserModal({ districtId, campuses, serviceRoleKey, supabaseUrl, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('teacher')
  const [campusId, setCampusId] = useState(campuses[0]?.id || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError('Please fill all fields. Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Create auth user via Admin API
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password, email_confirm: true }),
      })
      const userData = await res.json()
      if (!res.ok) throw new Error(userData.message || userData.error || 'Auth creation failed')

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userData.id,
        district_id: districtId,
        full_name: fullName.trim(),
        email: email.trim(),
        role,
        is_active: true,
      })
      if (profileError) throw new Error(profileError.message)

      // Campus assignment
      if (campusId) {
        await supabase.from('profile_campus_assignments').insert({
          profile_id: userData.id,
          campus_id: campusId,
          district_id: districtId,
        })
      }

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
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password * (min 8 chars)</label>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" required />
            <p className="text-xs text-gray-400 mt-1">User should change their password after first login.</p>
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
