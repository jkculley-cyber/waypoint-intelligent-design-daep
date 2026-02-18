import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Topbar from '../components/layout/Topbar'
import Card, { CardTitle } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { DAYS_OF_WEEK, DAYS_OF_WEEK_SHORT } from '../lib/constants'
import { formatTime12h } from '../lib/orientationUtils'

const DEFAULT_CONFIG = {
  available_days: [1, 2, 3, 4, 5],
  time_slots: ['09:00'],
  max_per_slot: 5,
}

export default function OrientationSettingsPage() {
  const { district, refreshDistrict } = useAuth()
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [newTime, setNewTime] = useState('')
  const [showTimeInput, setShowTimeInput] = useState(false)

  useEffect(() => {
    if (district?.settings?.orientation_config) {
      setConfig(district.settings.orientation_config)
    }
  }, [district])

  const toggleDay = (dayNum) => {
    setConfig(prev => {
      const days = prev.available_days.includes(dayNum)
        ? prev.available_days.filter(d => d !== dayNum)
        : [...prev.available_days, dayNum].sort((a, b) => a - b)
      return { ...prev, available_days: days }
    })
  }

  const addTimeSlot = () => {
    if (!newTime) return
    if (config.time_slots.includes(newTime)) {
      toast.error('That time slot already exists')
      return
    }
    setConfig(prev => ({
      ...prev,
      time_slots: [...prev.time_slots, newTime].sort(),
    }))
    setNewTime('')
    setShowTimeInput(false)
  }

  const removeTimeSlot = (time) => {
    setConfig(prev => ({
      ...prev,
      time_slots: prev.time_slots.filter(t => t !== time),
    }))
  }

  const handleSave = async () => {
    if (!district?.id) {
      toast.error('District not loaded — please refresh the page')
      return
    }
    setSaving(true)
    try {
      const updatedSettings = {
        ...(district.settings || {}),
        orientation_config: config,
      }
      const { data: rows, error } = await supabase
        .from('districts')
        .update({ settings: updatedSettings })
        .eq('id', district.id)
        .select('id')

      if (error) throw error
      if (!rows || rows.length === 0) {
        throw new Error(`RLS blocked the update (0 rows). District ID: ${district.id}`)
      }
      await refreshDistrict()
      toast.success('Orientation settings saved')
    } catch (err) {
      console.error('Error saving orientation config:', err)
      toast.error(err.message || 'Failed to save orientation settings', { duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Topbar
        title="Orientation Schedule"
        subtitle="Configure available days, times, and capacity for DAEP orientation sessions"
        backHref="/settings"
        backLabel="Settings"
      />

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Section A — Available Days */}
        <Card>
          <CardTitle>Available Days</CardTitle>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Select which days of the week orientations are available.
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((dayName, i) => {
              const active = config.available_days.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-orange-100 text-orange-700 border-2 border-orange-400'
                      : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:border-gray-300'
                  }`}
                >
                  {DAYS_OF_WEEK_SHORT[i]}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Section B — Time Slots */}
        <Card>
          <CardTitle>Time Slots</CardTitle>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Configure available time slots for each orientation day.
          </p>

          {config.time_slots.length === 0 ? (
            <p className="text-sm text-gray-400 mb-3">No time slots configured.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {config.time_slots.map(time => (
                <div
                  key={time}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {formatTime12h(time)}
                  </span>
                  <button
                    onClick={() => removeTimeSlot(time)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove time slot"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {showTimeInput ? (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <Button variant="primary" size="sm" onClick={addTimeSlot} disabled={!newTime}>
                Add
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowTimeInput(false); setNewTime('') }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowTimeInput(true)}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              + Add Time Slot
            </button>
          )}
        </Card>

        {/* Section C — Capacity */}
        <Card>
          <CardTitle>Capacity per Slot</CardTitle>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Maximum number of students that can be booked into a single orientation slot.
          </p>
          <input
            type="number"
            min={1}
            max={50}
            value={config.max_per_slot}
            onChange={(e) => setConfig(prev => ({ ...prev, max_per_slot: Number(e.target.value) || 5 }))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
