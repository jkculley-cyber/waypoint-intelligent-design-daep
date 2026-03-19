import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'

export default function CapacitySettingsModal({ open, onClose, districtId, daepCampuses = [] }) {
  const [seats, setSeats] = useState(() => {
    const map = {}
    daepCampuses.forEach(c => { map[c.id] = c.settings?.daep_seats ?? '' })
    return map
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update each DAEP campus's settings.daep_seats
      for (const campus of daepCampuses) {
        const val = parseInt(seats[campus.id]) || 0
        const updatedSettings = { ...(campus.settings || {}), daep_seats: val }
        const { error } = await supabase
          .from('campuses')
          .update({ settings: updatedSettings })
          .eq('id', campus.id)
        if (error) throw error
      }
      toast.success('Capacity settings saved — reload to see updated numbers')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to save capacity settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Configure DAEP Seat Capacity"
      description="Set the number of available seats for each DAEP campus."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {daepCampuses.length === 0 ? (
          <p className="text-sm text-gray-500">No DAEP campuses found. Add a campus with type "DAEP" in Settings first.</p>
        ) : (
          daepCampuses.map(campus => (
            <div key={campus.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {campus.name}
              </label>
              <input
                type="number"
                min={0}
                value={seats[campus.id] ?? ''}
                onChange={e => setSeats(s => ({ ...s, [campus.id]: e.target.value }))}
                placeholder="Total seats"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          ))
        )}
        <p className="text-xs text-gray-500">
          Active = students currently in DAEP (status = active).
          Approved = placement approved, not yet started (status = approved).
        </p>
      </div>
    </Modal>
  )
}
