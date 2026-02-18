import { DAYS_OF_WEEK_SHORT } from './constants'

/**
 * Format a 24h time string (e.g. "09:00") to 12h format (e.g. "9:00 AM").
 */
export function formatTime12h(time24) {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Generate available orientation slots based on config and existing bookings.
 *
 * @param {Object} config - { available_days: number[], time_slots: string[], max_per_slot: number }
 * @param {Array} existingBookings - Array of { orientation_scheduled_date, orientation_scheduled_time }
 * @param {number} count - Number of slots to return (default 10)
 * @returns {Array} Array of { date, time, label, spotsLeft }
 */
export function generateAvailableSlots(config, existingBookings = [], count = 10) {
  if (!config?.available_days?.length || !config?.time_slots?.length) {
    return []
  }

  const maxPerSlot = config.max_per_slot || 5

  // Count existing bookings per date+time
  const bookingCounts = {}
  existingBookings.forEach(b => {
    if (b.orientation_scheduled_date && b.orientation_scheduled_time) {
      const key = `${b.orientation_scheduled_date}|${b.orientation_scheduled_time}`
      bookingCounts[key] = (bookingCounts[key] || 0) + 1
    }
  })

  const slots = []
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const maxDaysToSearch = 90
  const current = new Date(tomorrow)

  for (let d = 0; d < maxDaysToSearch && slots.length < count; d++) {
    const dayOfWeek = current.getDay()

    if (config.available_days.includes(dayOfWeek)) {
      const dateStr = current.toISOString().split('T')[0]
      const dayLabel = DAYS_OF_WEEK_SHORT[dayOfWeek]
      const monthDay = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      for (const time of config.time_slots) {
        if (slots.length >= count) break

        const key = `${dateStr}|${time}`
        const booked = bookingCounts[key] || 0
        const spotsLeft = maxPerSlot - booked

        if (spotsLeft > 0) {
          slots.push({
            date: dateStr,
            time,
            label: `${dayLabel}, ${monthDay} at ${formatTime12h(time)} (${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left)`,
            spotsLeft,
          })
        }
      }
    }

    current.setDate(current.getDate() + 1)
  }

  return slots
}
