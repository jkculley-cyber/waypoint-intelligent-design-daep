import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function CapacitySettingsModal({ open, onClose, districtId, currentCapacity }) {
  const { refreshDistrict } = useAuth()
  const [mode, setMode] = useState(currentCapacity?.mode || 'total')
  const [total, setTotal] = useState(currentCapacity?.total ?? 30)
  const [middle, setMiddle] = useState(currentCapacity?.by_level?.middle ?? 15)
  const [high, setHigh] = useState(currentCapacity?.by_level?.high ?? 15)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const capacity = mode === 'total'
        ? { mode: 'total', total: parseInt(total) || 0 }
        : { mode: 'by_level', by_level: { middle: parseInt(middle) || 0, high: parseInt(high) || 0 } }

      const { error } = await supabase.rpc('set_daep_capacity', {
        p_district_id: districtId,
        p_capacity: capacity,
      })
      if (error) throw error

      await refreshDistrict()
      toast.success('Capacity settings saved')
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
      description="Set the number of available DAEP placement seats for capacity tracking."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Capacity Mode</label>
          <div className="flex gap-3">
            {[
              { value: 'total', label: 'Total Capacity' },
              { value: 'by_level', label: 'By School Level' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  mode === opt.value
                    ? 'bg-orange-50 border-orange-400 text-orange-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'total' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total DAEP Seats
            </label>
            <input
              type="number"
              min={1}
              value={total}
              onChange={e => setTotal(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Middle School (6–8) Seats
              </label>
              <input
                type="number"
                min={0}
                value={middle}
                onChange={e => setMiddle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                High School (9–12) Seats
              </label>
              <input
                type="number"
                min={0}
                value={high}
                onChange={e => setHigh(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Occupied = currently active placements (status = active).
          Reserved = approved but not yet started (status = approved).
        </p>
      </div>
    </Modal>
  )
}
