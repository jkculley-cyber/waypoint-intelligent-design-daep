/**
 * Instructional Calendar Module
 *
 * Defines non-instructional dates per district/school-year so that
 * "days remaining" calculations use instructional days only
 * (weekdays minus holidays, breaks, staff-dev days, etc.).
 *
 * To add a new district or school year, add an entry to CALENDARS below.
 */

// Key format: `${districtId}:${schoolYear}`  e.g. "spring_isd:2025-2026"
// Values: arrays of non-instructional date strings (YYYY-MM-DD).
// Weekends are excluded automatically — only list weekday closures.

const CALENDARS = {
  // ---- Spring ISD 2025-2026 ----
  'spring_isd:2025-2026': {
    label: 'Spring ISD 2025-2026',
    lastDay: '2026-05-22',
    nonInstructionalDates: [
      // Labor Day
      '2025-09-01',
      // Staff Development
      '2025-10-13',
      // Thanksgiving Break (Mon-Fri)
      '2025-11-24', '2025-11-25', '2025-11-26', '2025-11-27', '2025-11-28',
      // Winter Break (Dec 22 – Jan 2, weekdays only)
      '2025-12-22', '2025-12-23', '2025-12-24', '2025-12-25', '2025-12-26',
      '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02',
      // MLK Day
      '2026-01-19',
      // Staff Development
      '2026-02-16',
      // Spring Break (Mon-Fri)
      '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13',
      // Good Friday / Easter
      '2026-04-03',
    ],
  },
}

// Default district used when no district_id is provided
const DEFAULT_DISTRICT = 'spring_isd'
const DEFAULT_YEAR = '2025-2026'

/**
 * Resolve the calendar key for a given district.
 * For now we only have one year; in the future this could inspect the
 * current date to pick the right school-year automatically.
 *
 * Lookup order:
 *   1. districtId (UUID or slug) + current school year
 *   2. Default calendar (DEFAULT_DISTRICT + DEFAULT_YEAR)
 */
function getCalendarKey(districtId) {
  if (districtId) {
    const key = `${districtId}:${DEFAULT_YEAR}`
    if (CALENDARS[key]) return key
  }
  // Fallback to default calendar
  const defaultKey = `${DEFAULT_DISTRICT}:${DEFAULT_YEAR}`
  if (CALENDARS[defaultKey]) return defaultKey
  return null
}

function toDateString(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isWeekday(date) {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/**
 * Count instructional days between two dates (exclusive of start, inclusive logic below).
 * We count weekdays from the day AFTER `fromDate` through `toDate` (inclusive),
 * excluding any non-instructional dates from the district calendar.
 */
function countInstructionalDays(fromDate, toDate, nonInstructionalSet) {
  const start = new Date(fromDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(toDate)
  end.setHours(0, 0, 0, 0)

  if (end <= start) return 0

  let count = 0
  const cursor = new Date(start)
  cursor.setDate(cursor.getDate() + 1) // start counting from the next day

  while (cursor <= end) {
    if (isWeekday(cursor) && !nonInstructionalSet.has(toDateString(cursor))) {
      count++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

/**
 * Get the number of instructional days remaining from today until endDate.
 *
 * @param {string} endDate - placement end date (YYYY-MM-DD)
 * @param {string} [districtId] - district identifier
 * @returns {number|null} instructional days remaining, or null if no calendar
 */
export function getInstructionalDaysRemaining(endDate, districtId) {
  if (!endDate) return null

  const calKey = getCalendarKey(districtId)
  if (!calKey) return null

  const calendar = CALENDARS[calKey]
  const nonInstructionalSet = new Set(calendar.nonInstructionalDates)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  if (end <= today) return 0

  // Count from today through endDate (inclusive of today as a potential instructional day)
  let count = 0
  const cursor = new Date(today)

  while (cursor <= end) {
    if (isWeekday(cursor) && !nonInstructionalSet.has(toDateString(cursor))) {
      count++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

/**
 * Get the number of instructional days elapsed since startDate.
 *
 * @param {string} startDate - placement start date (YYYY-MM-DD)
 * @param {string} [districtId] - district identifier
 * @returns {number|null} instructional days elapsed, or null if no calendar
 */
export function getInstructionalDaysElapsed(startDate, districtId) {
  if (!startDate) return null

  const calKey = getCalendarKey(districtId)
  if (!calKey) return null

  const calendar = CALENDARS[calKey]
  const nonInstructionalSet = new Set(calendar.nonInstructionalDates)

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (today < start) return 0

  // Count instructional days from startDate through yesterday
  let count = 0
  const cursor = new Date(start)

  while (cursor < today) {
    if (isWeekday(cursor) && !nonInstructionalSet.has(toDateString(cursor))) {
      count++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

/**
 * Get total instructional days for a placement (start through end).
 *
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} [districtId]
 * @returns {number|null}
 */
export function getInstructionalDaysTotal(startDate, endDate, districtId) {
  if (!startDate || !endDate) return null

  const calKey = getCalendarKey(districtId)
  if (!calKey) return null

  const calendar = CALENDARS[calKey]
  const nonInstructionalSet = new Set(calendar.nonInstructionalDates)

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  let count = 0
  const cursor = new Date(start)

  while (cursor <= end) {
    if (isWeekday(cursor) && !nonInstructionalSet.has(toDateString(cursor))) {
      count++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}
