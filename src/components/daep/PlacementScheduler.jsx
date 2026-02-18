import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Card, { CardTitle } from '../ui/Card'
import Badge from '../ui/Badge'
import LoadingSpinner from '../ui/LoadingSpinner'
import OrientationStudentForm from './OrientationStudentForm'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SCHEDULING_STATUS_LABELS, SCHEDULING_STATUS_COLORS, DAYS_OF_WEEK } from '../../lib/constants'
import { generateAvailableSlots, formatTime12h } from '../../lib/orientationUtils'

const EDIT_ROLES = ['admin', 'principal', 'ap', 'counselor', 'sped_coordinator', 'director_student_affairs']

function formatAllowedSchedule(config) {
  if (!config?.available_days?.length || !config?.time_slots?.length) return null
  const days = config.available_days.map(d => DAYS_OF_WEEK[d]).join(', ')
  const times = config.time_slots.map(t => formatTime12h(t)).join(', ')
  return { days, times, maxPerSlot: config.max_per_slot || 5 }
}

export default function PlacementScheduler({ incidentId, incident, student }) {
  const { hasRole, district, districtId } = useAuth()
  const [scheduling, setScheduling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [fallbackDate, setFallbackDate] = useState('')
  const [fallbackTime, setFallbackTime] = useState('')
  const [showOrientationForm, setShowOrientationForm] = useState(false)
  const canEdit = hasRole(EDIT_ROLES)

  const orientationConfig = district?.settings?.orientation_config || null

  const fetchScheduling = useCallback(async () => {
    if (!incidentId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('daep_placement_scheduling')
        .select('*, orientation_form_data')
        .eq('incident_id', incidentId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setScheduling(data)
    } catch (err) {
      console.error('Error fetching scheduling:', err)
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    fetchScheduling()
  }, [fetchScheduling])

  // Fetch available slots when orientation config exists and status is pending or rescheduling
  const fetchSlots = useCallback(async () => {
    if (!orientationConfig || !districtId) return
    setSlotsLoading(true)
    try {
      const { data: bookings, error } = await supabase
        .from('daep_placement_scheduling')
        .select('orientation_scheduled_date')
        .eq('district_id', districtId)
        .in('orientation_status', ['scheduled'])

      if (error) throw error
      const available = generateAvailableSlots(orientationConfig, bookings || [], 10)
      setSlots(available)
    } catch (err) {
      console.error('Error fetching orientation slots:', err)
    } finally {
      setSlotsLoading(false)
    }
  }, [orientationConfig, districtId])

  useEffect(() => {
    if (scheduling && (scheduling.orientation_status === 'pending' || rescheduling)) {
      fetchSlots()
    }
  }, [scheduling, rescheduling, fetchSlots])

  const updateField = async (field, value) => {
    if (!scheduling?.id) return
    setSaving(true)
    try {
      const updates = { [field]: value, updated_at: new Date().toISOString() }

      // Auto-update status based on date fields
      if (field === 'ard_scheduled_date' && value) {
        updates.ard_status = 'scheduled'
      }
      if (field === 'ard_completed_date' && value) {
        updates.ard_status = 'completed'
      }
      if (field === 'orientation_scheduled_date' && value) {
        updates.orientation_status = 'scheduled'
      }
      if (field === 'orientation_completed_date' && value) {
        updates.orientation_status = 'completed'
      }

      const { error } = await supabase
        .from('daep_placement_scheduling')
        .update(updates)
        .eq('id', scheduling.id)

      if (error) throw error
      toast.success('Scheduling updated')
      if (rescheduling && (field === 'orientation_scheduled_date' || field === 'orientation_scheduled_time')) {
        setRescheduling(false)
      }
      fetchScheduling()
    } catch (err) {
      console.error('Error updating scheduling:', err)
      const schedule = formatAllowedSchedule(orientationConfig)
      if (schedule) {
        toast.error(`Scheduling failed. Allowed days: ${schedule.days}. Times: ${schedule.times}. Max ${schedule.maxPerSlot}/slot.`, { duration: 6000 })
      } else {
        toast.error('Failed to update scheduling')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFallbackSave = async () => {
    if (!scheduling?.id || !fallbackDate) return
    setSaving(true)
    try {
      const updates = {
        orientation_scheduled_date: fallbackDate,
        orientation_status: 'scheduled',
        updated_at: new Date().toISOString(),
      }
      // Only include time if column exists (migration 017) and a time was entered
      if (fallbackTime) {
        updates.orientation_scheduled_time = fallbackTime
      }
      const { error } = await supabase
        .from('daep_placement_scheduling')
        .update(updates)
        .eq('id', scheduling.id)

      if (error) throw error
      toast.success('Orientation rescheduled')
      setRescheduling(false)
      setFallbackDate('')
      setFallbackTime('')
      fetchScheduling()
    } catch (err) {
      console.error('Error rescheduling orientation:', err)
      toast.error(err.message || 'Failed to reschedule orientation', { duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  const handleSlotSelect = async (slotValue) => {
    if (!scheduling?.id || !slotValue) return
    const [date, time] = slotValue.split('|')
    setSaving(true)
    try {
      const slotUpdates = {
        orientation_scheduled_date: date,
        orientation_status: 'scheduled',
        updated_at: new Date().toISOString(),
      }
      // Only include time if column exists (migration 017)
      if (time) {
        slotUpdates.orientation_scheduled_time = time
      }
      const { error } = await supabase
        .from('daep_placement_scheduling')
        .update(slotUpdates)
        .eq('id', scheduling.id)

      if (error) throw error
      toast.success('Orientation slot booked')
      setRescheduling(false)
      setSelectedSlot('')
      fetchScheduling()
    } catch (err) {
      console.error('Error booking orientation slot:', err)
      const schedule = formatAllowedSchedule(orientationConfig)
      if (schedule) {
        toast.error(`Booking failed. Allowed days: ${schedule.days}. Times: ${schedule.times}. Max ${schedule.maxPerSlot}/slot.`, { duration: 6000 })
      } else {
        toast.error('Failed to book orientation slot')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-6"><LoadingSpinner /></div>
      </Card>
    )
  }

  if (!scheduling) return null

  const showSlotPicker = orientationConfig &&
    (scheduling.orientation_status === 'pending' || rescheduling)

  const showFallbackDatePicker = !orientationConfig &&
    (scheduling.orientation_status === 'pending' || rescheduling)

  return (
    <Card>
      <CardTitle>Placement Scheduling</CardTitle>
      <div className="mt-4 space-y-4">
        {/* ARD Section (SPED only) */}
        {scheduling.ard_required && (
          <div className="border-l-4 border-purple-400 pl-4 py-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Change of Placement ARD</h4>
              <Badge
                color={SCHEDULING_STATUS_COLORS[scheduling.ard_status] || 'gray'}
                size="sm"
              >
                {SCHEDULING_STATUS_LABELS[scheduling.ard_status] || scheduling.ard_status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">Required for SPED students before DAEP enrollment.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduling.ard_scheduled_date || ''}
                  onChange={(e) => updateField('ard_scheduled_date', e.target.value || null)}
                  disabled={!canEdit || saving}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Completed Date</label>
                <input
                  type="date"
                  value={scheduling.ard_completed_date || ''}
                  onChange={(e) => updateField('ard_completed_date', e.target.value || null)}
                  disabled={!canEdit || saving}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {canEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={scheduling.ard_notes || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (scheduling.ard_notes || '')) {
                      updateField('ard_notes', e.target.value || null)
                    }
                  }}
                  onChange={(e) => setScheduling(prev => ({ ...prev, ard_notes: e.target.value }))}
                  disabled={saving}
                  placeholder="ARD notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50"
                />
              </div>
            )}
          </div>
        )}

        {/* Orientation Section (always shown) */}
        <div className="border-l-4 border-orange-400 pl-4 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Orientation</h4>
            <Badge
              color={SCHEDULING_STATUS_COLORS[scheduling.orientation_status] || 'gray'}
              size="sm"
            >
              {SCHEDULING_STATUS_LABELS[scheduling.orientation_status] || scheduling.orientation_status}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">Required for all students before DAEP enrollment.</p>
          {(() => {
            const schedule = formatAllowedSchedule(orientationConfig)
            return schedule ? (
              <p className="text-xs text-gray-400">
                Available: <span className="font-medium text-gray-500">{schedule.days}</span> at <span className="font-medium text-gray-500">{schedule.times}</span>
              </p>
            ) : null
          })()}

          {/* Slot picker (when config exists and status is pending or rescheduling) */}
          {showSlotPicker && canEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Select an Orientation Slot
              </label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-gray-500">Loading available slots...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="py-2 space-y-1">
                  <p className="text-xs text-gray-400">No available slots in the next 90 days.</p>
                  {(() => {
                    const schedule = formatAllowedSchedule(orientationConfig)
                    return schedule ? (
                      <p className="text-xs text-orange-600">
                        Orientations available on <span className="font-medium">{schedule.days}</span> at <span className="font-medium">{schedule.times}</span> (max {schedule.maxPerSlot}/slot).
                      </p>
                    ) : null
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                  >
                    <option value="">Choose a slot...</option>
                    {slots.map(slot => (
                      <option key={`${slot.date}|${slot.time}`} value={`${slot.date}|${slot.time}`}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSlotSelect(selectedSlot)}
                      disabled={!selectedSlot || saving}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Booking...' : 'Book Slot'}
                    </button>
                    {rescheduling && (
                      <button
                        onClick={() => setRescheduling(false)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback free date picker (no orientation config) */}
          {showFallbackDatePicker && canEdit && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
                  {rescheduling ? (
                    <input
                      type="date"
                      value={fallbackDate}
                      onChange={(e) => setFallbackDate(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  ) : (
                    <input
                      type="date"
                      value={scheduling.orientation_scheduled_date || ''}
                      onChange={(e) => updateField('orientation_scheduled_date', e.target.value || null)}
                      disabled={saving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Time</label>
                  {rescheduling ? (
                    <input
                      type="time"
                      value={fallbackTime}
                      onChange={(e) => setFallbackTime(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  ) : (
                    <input
                      type="time"
                      value={scheduling.orientation_scheduled_time || ''}
                      onChange={(e) => updateField('orientation_scheduled_time', e.target.value || null)}
                      disabled={saving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  )}
                </div>
              </div>
              {rescheduling && (
                <div className="flex gap-2">
                  <button
                    onClick={handleFallbackSave}
                    disabled={!fallbackDate || saving}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setRescheduling(false); setFallbackDate(''); setFallbackTime('') }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scheduled state — show booked slot + reschedule + completion date */}
          {scheduling.orientation_status === 'scheduled' && !rescheduling && (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-orange-800">
                  {scheduling.orientation_scheduled_date && (
                    <>
                      {new Date(scheduling.orientation_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {scheduling.orientation_scheduled_time && (
                        <> at {formatTime12h(scheduling.orientation_scheduled_time)}</>
                      )}
                    </>
                  )}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setFallbackDate(scheduling.orientation_scheduled_date || '')
                      setFallbackTime(scheduling.orientation_scheduled_time || '')
                      setRescheduling(true)
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setShowOrientationForm(true)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    View / Fill Form
                  </button>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Completed Date</label>
                    <input
                      type="date"
                      value={scheduling.orientation_completed_date || ''}
                      onChange={(e) => updateField('orientation_completed_date', e.target.value || null)}
                      disabled={saving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed state */}
          {scheduling.orientation_status === 'completed' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
                  <p className="text-sm text-gray-700">
                    {scheduling.orientation_scheduled_date
                      ? new Date(scheduling.orientation_scheduled_date + 'T00:00:00').toLocaleDateString()
                      : '—'}
                    {scheduling.orientation_scheduled_time && (
                      <span className="text-gray-500"> at {formatTime12h(scheduling.orientation_scheduled_time)}</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Completed Date</label>
                  <p className="text-sm text-gray-700">
                    {scheduling.orientation_completed_date
                      ? new Date(scheduling.orientation_completed_date + 'T00:00:00').toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOrientationForm(true)}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                View Reflection &amp; Behavior Plan
              </button>
            </div>
          )}

          {canEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                rows={2}
                value={scheduling.orientation_notes || ''}
                onBlur={(e) => {
                  if (e.target.value !== (scheduling.orientation_notes || '')) {
                    updateField('orientation_notes', e.target.value || null)
                  }
                }}
                onChange={(e) => setScheduling(prev => ({ ...prev, orientation_notes: e.target.value }))}
                disabled={saving}
                placeholder="Orientation notes..."
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
              />
            </div>
          )}
        </div>
      </div>

      {showOrientationForm && scheduling && (
        <OrientationStudentForm
          scheduling={scheduling}
          student={student}
          incident={incident}
          onClose={() => setShowOrientationForm(false)}
          onSaved={() => {
            fetchScheduling()
            setShowOrientationForm(false)
          }}
        />
      )}
    </Card>
  )
}
