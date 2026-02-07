import { format, formatDistanceToNow, differenceInDays, addDays, isAfter, isBefore, startOfDay } from 'date-fns'
import { clsx } from 'clsx'

// ---- Class Name Utility ----
export function cn(...inputs) {
  return clsx(inputs)
}

// ---- Date Utilities ----

export function formatDate(date) {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date) {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatDateShort(date) {
  if (!date) return ''
  return format(new Date(date), 'M/d/yy')
}

export function formatTimeAgo(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function daysRemaining(endDate) {
  if (!endDate) return null
  const days = differenceInDays(new Date(endDate), startOfDay(new Date()))
  return Math.max(0, days)
}

export function daysElapsed(startDate) {
  if (!startDate) return 0
  return differenceInDays(startOfDay(new Date()), new Date(startDate))
}

export function addBusinessDays(date, days) {
  // Simple version: just adds calendar days
  // Could be enhanced to skip weekends/holidays
  return addDays(new Date(date), days)
}

export function isOverdue(date) {
  if (!date) return false
  return isAfter(startOfDay(new Date()), new Date(date))
}

export function isUpcoming(date, withinDays = 7) {
  if (!date) return false
  const target = new Date(date)
  const now = startOfDay(new Date())
  return isAfter(target, now) && isBefore(target, addDays(now, withinDays))
}

/**
 * Get the current Texas school year start date (August 1)
 */
export function getSchoolYearStart() {
  const now = new Date()
  const month = now.getMonth() // 0-indexed (0 = January)
  const year = month >= 7 ? now.getFullYear() : now.getFullYear() - 1 // August = month 7
  return new Date(year, 7, 1) // August 1
}

/**
 * Get a school year label like "2024-2025"
 */
export function getSchoolYearLabel(date = new Date()) {
  const month = date.getMonth()
  const year = month >= 7 ? date.getFullYear() : date.getFullYear() - 1
  return `${year}-${year + 1}`
}

// ---- Student Name Utilities ----

export function formatStudentName(student) {
  if (!student) return ''
  const { first_name, last_name, middle_name } = student
  if (middle_name) {
    return `${last_name}, ${first_name} ${middle_name.charAt(0)}.`
  }
  return `${last_name}, ${first_name}`
}

export function formatStudentNameShort(student) {
  if (!student) return ''
  return `${student.first_name} ${student.last_name}`
}

// ---- Grade Level Utility ----

export function formatGradeLevel(grade) {
  if (grade === -1) return 'Pre-K'
  if (grade === 0) return 'K'
  return `${grade}`
}

// ---- Special Population Flags ----

export function getStudentFlags(student) {
  if (!student) return []
  const flags = []
  if (student.is_sped) flags.push({ key: 'sped', label: 'SPED', color: 'purple', detail: student.sped_eligibility })
  if (student.is_504) flags.push({ key: '504', label: '504', color: 'blue' })
  if (student.is_ell) flags.push({ key: 'ell', label: 'ELL', color: 'orange' })
  if (student.is_homeless) flags.push({ key: 'homeless', label: 'Homeless', color: 'red' })
  if (student.is_foster_care) flags.push({ key: 'foster', label: 'Foster Care', color: 'red' })
  if (student.is_military_connected) flags.push({ key: 'military', label: 'Military', color: 'green' })
  return flags
}

/**
 * Check if a student requires SPED compliance for DAEP/expulsion
 */
export function requiresSpedCompliance(student) {
  return student?.is_sped || student?.is_504
}

// ---- Status Color Mapping ----

const COLOR_MAP = {
  gray: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-400',
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-400',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-400',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-400',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-400',
  },
}

export function getColorClasses(color) {
  return COLOR_MAP[color] || COLOR_MAP.gray
}

// ---- Percentage / Stats ----

export function calcPercentage(value, total) {
  if (!total || total === 0) return 0
  return Math.round((value / total) * 100)
}

export function formatPercentage(value) {
  return `${Math.round(value)}%`
}

// ---- Initials ----

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// ---- Pluralize ----

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || `${singular}s`)
}
