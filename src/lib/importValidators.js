import { CAMPUS_TYPES, CONSEQUENCE_TYPES, ROLES, SPED_ELIGIBILITY_CODES } from './constants'

const VALID_CAMPUS_TYPES = Object.values(CAMPUS_TYPES)
const VALID_CONSEQUENCE_TYPES = Object.values(CONSEQUENCE_TYPES)
const VALID_ROLES = [ROLES.ADMIN, ROLES.PRINCIPAL, ROLES.AP, ROLES.COUNSELOR, ROLES.SPED_COORDINATOR, ROLES.TEACHER]
const VALID_SPED_CODES = Object.keys(SPED_ELIGIBILITY_CODES)
const VALID_GENDERS = ['M', 'F', 'X']
const VALID_REFERRAL_STATUSES = ['pending', 'reviewed', 'closed', 'escalated_to_daep']
const VALID_PLACEMENT_TYPES   = ['iss', 'oss']
const VALID_SUPPORT_TYPES     = ['cico', 'behavior_contract', 'counseling_referral', 'parent_contact', 'mentoring', 'other']
const VALID_SUPPORT_STATUSES  = ['active', 'completed', 'discontinued']

function isValidDate(str) {
  if (!str) return false
  const d = new Date(str)
  return !isNaN(d.getTime())
}

function isFutureDate(str) {
  return new Date(str) > new Date()
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}

function parseBool(val) {
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim()
    return lower === 'true' || lower === 'yes' || lower === '1'
  }
  return false
}

/**
 * Validate a single row of data for a given import type
 * @returns {{ valid: boolean, errors: string[], warnings: string[], parsed: object }}
 */
export function validateRow(importType, row, context = {}) {
  const validators = {
    campuses: validateCampusRow,
    students: validateStudentRow,
    profiles: validateProfileRow,
    incidents: validateIncidentRow,
    navigator_referrals:  validateNavigatorReferralRow,
    navigator_placements: validateNavigatorPlacementRow,
    navigator_supports:   validateNavigatorSupportRow,
  }

  const validator = validators[importType]
  if (!validator) {
    return { valid: false, errors: ['Unknown import type'], warnings: [], parsed: null }
  }

  return validator(row, context)
}

function validateCampusRow(row, context) {
  const errors = []
  const warnings = []

  const name = (row.name || '').trim()
  const teaCampusId = (row.tea_campus_id || '').toString().trim()
  const campusType = (row.campus_type || '').toLowerCase().trim()

  if (!name || name.length < 2 || name.length > 100) {
    errors.push('Name is required (2-100 characters)')
  }

  if (!teaCampusId) {
    errors.push('TEA campus ID is required')
  } else if (context.existingTeaIds?.has(teaCampusId)) {
    errors.push(`TEA campus ID "${teaCampusId}" already exists`)
  }

  if (!campusType || !VALID_CAMPUS_TYPES.includes(campusType)) {
    errors.push(`Campus type must be one of: ${VALID_CAMPUS_TYPES.join(', ')}`)
  }

  const parsed = {
    name,
    tea_campus_id: teaCampusId,
    campus_type: campusType,
    address: (row.address || '').trim() || null,
    phone: (row.phone || '').trim() || null,
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

function validateStudentRow(row, context) {
  const errors = []
  const warnings = []

  const studentId = (row.student_id_number || '').toString().trim()
  const firstName = (row.first_name || '').trim()
  const lastName = (row.last_name || '').trim()
  const dob = (row.date_of_birth || '').trim()
  const gradeStr = (row.grade_level ?? '').toString().trim()
  const campusName = (row.campus_name || '').trim()
  const gender = (row.gender || '').toUpperCase().trim()
  const isSped = parseBool(row.is_sped)
  const spedElig = (row.sped_eligibility || '').toUpperCase().trim()

  if (!studentId) errors.push('Student ID is required')
  else if (context.existingStudentIds?.has(studentId)) {
    // This is handled by duplicate strategy, just flag it
    warnings.push(`Student ID "${studentId}" already exists`)
  }

  if (!firstName) errors.push('First name is required')
  if (!lastName) errors.push('Last name is required')

  if (!dob) {
    errors.push('Date of birth is required')
  } else if (!isValidDate(dob)) {
    errors.push('Date of birth is not a valid date (use YYYY-MM-DD)')
  } else if (isFutureDate(dob)) {
    errors.push('Date of birth cannot be a future date')
  }

  const grade = gradeStr === '' ? null : parseInt(gradeStr, 10)
  if (gradeStr !== '' && (isNaN(grade) || grade < -1 || grade > 12)) {
    errors.push('Grade level must be between -1 (Pre-K) and 12')
  }

  let campusId = null
  if (campusName) {
    campusId = context.campusMap?.[campusName.toLowerCase()]
    if (!campusId) {
      errors.push(`Campus "${campusName}" not found`)
    }
  }

  if (gender && !VALID_GENDERS.includes(gender)) {
    warnings.push(`Gender "${gender}" is not standard (M/F/X)`)
  }

  if (isSped && !spedElig) {
    errors.push('SPED eligibility code is required when is_sped is TRUE')
  }
  if (spedElig && !VALID_SPED_CODES.includes(spedElig)) {
    errors.push(`Invalid SPED eligibility code. Valid: ${VALID_SPED_CODES.join(', ')}`)
  }

  const parsed = {
    student_id_number: studentId,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: dob,
    grade_level: grade,
    campus_id: campusId,
    gender: gender || null,
    race: (row.race || '').trim() || null,
    is_sped: isSped,
    sped_eligibility: isSped ? spedElig : null,
    is_504: parseBool(row.is_504),
    is_ell: parseBool(row.is_ell),
    is_homeless: parseBool(row.is_homeless),
    is_foster: parseBool(row.is_foster),
    is_migrant: parseBool(row.is_migrant),
    is_active: true,
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

function validateProfileRow(row, context) {
  const errors = []
  const warnings = []

  const email = (row.email || '').trim().toLowerCase()
  const fullName = (row.full_name || '').trim()
  const role = (row.role || '').toLowerCase().trim()
  const campusNames = (row.campus_names || '').trim()

  if (!email) {
    errors.push('Email is required')
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format')
  } else if (context.existingEmails?.has(email)) {
    warnings.push(`Email "${email}" already exists`)
  }

  if (!fullName) errors.push('Full name is required')

  if (!role || !VALID_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`)
  }

  // Parse campus assignments
  const campusIds = []
  if (campusNames) {
    const names = campusNames.split(';').map(n => n.trim()).filter(Boolean)
    for (const name of names) {
      const id = context.campusMap?.[name.toLowerCase()]
      if (!id) {
        errors.push(`Campus "${name}" not found`)
      } else {
        campusIds.push(id)
      }
    }
  }

  const parsed = {
    email,
    full_name: fullName,
    role,
    campus_ids: campusIds,
    phone: (row.phone || '').trim() || null,
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

function validateIncidentRow(row, context) {
  const errors = []
  const warnings = []

  const studentIdNum = (row.student_id_number || '').toString().trim()
  const incidentDate = (row.incident_date || '').trim()
  const offenseCode = (row.offense_code || '').trim()
  const description = (row.description || '').trim()
  const consequenceType = (row.consequence_type || '').toLowerCase().trim()
  const consequenceDays = (row.consequence_days || '').toString().trim()
  const reportedByEmail = (row.reported_by_email || '').trim().toLowerCase()

  if (!studentIdNum) {
    errors.push('Student ID is required')
  } else {
    const studentId = context.studentIdMap?.[studentIdNum]
    if (!studentId) {
      errors.push(`Student "${studentIdNum}" not found`)
    }
  }

  if (!incidentDate) {
    errors.push('Incident date is required')
  } else if (!isValidDate(incidentDate)) {
    errors.push('Invalid date format (use YYYY-MM-DD)')
  } else if (isFutureDate(incidentDate)) {
    errors.push('Incident date cannot be in the future')
  }

  if (!offenseCode) {
    errors.push('Offense code is required')
  } else if (context.offenseCodeMap && !context.offenseCodeMap[offenseCode.toUpperCase()]) {
    errors.push(`Offense code "${offenseCode}" not found`)
  }

  if (!description) errors.push('Description is required')

  if (!consequenceType || !VALID_CONSEQUENCE_TYPES.includes(consequenceType)) {
    errors.push(`Consequence type must be one of: ${VALID_CONSEQUENCE_TYPES.join(', ')}`)
  }

  const daysRequired = ['iss', 'oss', 'daep'].includes(consequenceType)
  const days = consequenceDays ? parseInt(consequenceDays, 10) : null
  if (daysRequired && (!days || days < 1)) {
    errors.push('Consequence days required for ISS, OSS, and DAEP')
  }

  if (!reportedByEmail) {
    errors.push('Reported by email is required')
  } else if (context.staffEmailMap && !context.staffEmailMap[reportedByEmail]) {
    errors.push(`Staff member "${reportedByEmail}" not found`)
  }

  const parsed = {
    student_id: context.studentIdMap?.[studentIdNum] || null,
    incident_date: incidentDate,
    offense_code_id: context.offenseCodeMap?.[offenseCode.toUpperCase()] || null,
    description,
    consequence_type: consequenceType,
    consequence_days: days,
    location: (row.location || '').trim() || null,
    reported_by: context.staffEmailMap?.[reportedByEmail] || null,
    status: 'submitted',
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

function validateNavigatorReferralRow(row, context) {
  const errors = []
  const warnings = []

  const studentIdNum = (row.student_id_number || '').toString().trim()
  const referralDate = (row.referral_date || '').trim()
  const description = (row.description || '').trim()
  const reportedByEmail = (row.reported_by_email || '').trim().toLowerCase()
  const campusName = (row.campus_name || '').trim()
  const status = (row.status || 'pending').toLowerCase().trim()
  const offenseCode = (row.offense_code || '').trim()
  const location = (row.location || '').trim()

  let studentId = null
  if (!studentIdNum) {
    errors.push('Student ID is required')
  } else {
    studentId = context.studentIdMap?.[studentIdNum]
    if (!studentId) errors.push(`Student "${studentIdNum}" not found`)
  }

  if (!referralDate) {
    errors.push('Referral date is required')
  } else if (!isValidDate(referralDate)) {
    errors.push('Invalid referral date (use YYYY-MM-DD)')
  } else if (isFutureDate(referralDate)) {
    errors.push('Referral date cannot be in the future')
  }

  if (!description) errors.push('Description is required')

  let reportedBy = null
  if (!reportedByEmail) {
    errors.push('Reported by email is required')
  } else {
    reportedBy = context.staffEmailMap?.[reportedByEmail]
    if (!reportedBy) errors.push(`Staff member "${reportedByEmail}" not found`)
  }

  let campusId = null
  if (!campusName) {
    errors.push('Campus name is required')
  } else {
    campusId = context.campusMap?.[campusName.toLowerCase()]
    if (!campusId) errors.push(`Campus "${campusName}" not found`)
  }

  if (status && !VALID_REFERRAL_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${VALID_REFERRAL_STATUSES.join(', ')}`)
  }

  let offenseCodeId = null
  if (offenseCode) {
    offenseCodeId = context.offenseCodeMap?.[offenseCode.toUpperCase()]
    if (!offenseCodeId) warnings.push(`Offense code "${offenseCode}" not found — field will be left blank`)
  }

  const parsed = {
    student_id: studentId,
    campus_id: campusId,
    reported_by: reportedBy,
    referral_date: referralDate,
    description,
    status: VALID_REFERRAL_STATUSES.includes(status) ? status : 'pending',
    offense_code_id: offenseCodeId,
    location: location || null,
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

function validateNavigatorPlacementRow(row, context) {
  const errors = []
  const warnings = []

  const studentIdNum = (row.student_id_number || '').toString().trim()
  const placementType = (row.placement_type || '').toLowerCase().trim()
  const startDate = (row.start_date || '').trim()
  const endDate = (row.end_date || '').trim()
  const assignedByEmail = (row.assigned_by_email || '').trim().toLowerCase()
  const campusName = (row.campus_name || '').trim()
  const daysStr = (row.days || '').toString().trim()
  const location = (row.location || '').trim()
  const reason = (row.reason || '').trim()

  let studentId = null
  if (!studentIdNum) {
    errors.push('Student ID is required')
  } else {
    studentId = context.studentIdMap?.[studentIdNum]
    if (!studentId) errors.push(`Student "${studentIdNum}" not found`)
  }

  if (!placementType || !VALID_PLACEMENT_TYPES.includes(placementType)) {
    errors.push(`Placement type must be one of: ${VALID_PLACEMENT_TYPES.join(', ')}`)
  }

  if (!startDate) {
    errors.push('Start date is required')
  } else if (!isValidDate(startDate)) {
    errors.push('Invalid start date (use YYYY-MM-DD)')
  }

  if (endDate) {
    if (!isValidDate(endDate)) {
      errors.push('Invalid end date (use YYYY-MM-DD)')
    } else if (startDate && isValidDate(startDate) && new Date(endDate) < new Date(startDate)) {
      errors.push('End date cannot be before start date')
    }
  }

  let assignedBy = null
  if (!assignedByEmail) {
    errors.push('Assigned by email is required')
  } else {
    assignedBy = context.staffEmailMap?.[assignedByEmail]
    if (!assignedBy) errors.push(`Staff member "${assignedByEmail}" not found`)
  }

  let campusId = null
  if (!campusName) {
    errors.push('Campus name is required')
  } else {
    campusId = context.campusMap?.[campusName.toLowerCase()]
    if (!campusId) errors.push(`Campus "${campusName}" not found`)
  }

  let days = null
  if (daysStr) {
    days = parseInt(daysStr, 10)
    if (isNaN(days) || days < 1) {
      errors.push('Days must be a positive integer')
      days = null
    }
  }

  const parsed = {
    student_id: studentId,
    campus_id: campusId,
    placement_type: VALID_PLACEMENT_TYPES.includes(placementType) ? placementType : null,
    start_date: startDate || null,
    end_date: endDate || null,
    assigned_by: assignedBy,
    days,
    location: location || null,
    reason: reason || null,
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

function validateNavigatorSupportRow(row, context) {
  const errors = []
  const warnings = []

  const studentIdNum = (row.student_id_number || '').toString().trim()
  const supportType = (row.support_type || '').toLowerCase().trim()
  const startDate = (row.start_date || '').trim()
  const endDate = (row.end_date || '').trim()
  const assignedByEmail = (row.assigned_by_email || '').trim().toLowerCase()
  const campusName = (row.campus_name || '').trim()
  const status = (row.status || 'active').toLowerCase().trim()
  const assignedToEmail = (row.assigned_to_email || '').trim().toLowerCase()
  const notes = (row.notes || '').trim()

  let studentId = null
  if (!studentIdNum) {
    errors.push('Student ID is required')
  } else {
    studentId = context.studentIdMap?.[studentIdNum]
    if (!studentId) errors.push(`Student "${studentIdNum}" not found`)
  }

  if (!supportType || !VALID_SUPPORT_TYPES.includes(supportType)) {
    errors.push(`Support type must be one of: ${VALID_SUPPORT_TYPES.join(', ')}`)
  }

  if (!startDate) {
    errors.push('Start date is required')
  } else if (!isValidDate(startDate)) {
    errors.push('Invalid start date (use YYYY-MM-DD)')
  }

  let assignedBy = null
  if (!assignedByEmail) {
    errors.push('Assigned by email is required')
  } else {
    assignedBy = context.staffEmailMap?.[assignedByEmail]
    if (!assignedBy) errors.push(`Staff member "${assignedByEmail}" not found`)
  }

  let campusId = null
  if (!campusName) {
    errors.push('Campus name is required')
  } else {
    campusId = context.campusMap?.[campusName.toLowerCase()]
    if (!campusId) errors.push(`Campus "${campusName}" not found`)
  }

  if (status && !VALID_SUPPORT_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${VALID_SUPPORT_STATUSES.join(', ')}`)
  }

  let assignedTo = null
  if (assignedToEmail) {
    assignedTo = context.staffEmailMap?.[assignedToEmail]
    if (!assignedTo) warnings.push(`Staff member "${assignedToEmail}" not found — assigned_to will be left blank`)
  }

  const parsed = {
    student_id: studentId,
    campus_id: campusId,
    support_type: VALID_SUPPORT_TYPES.includes(supportType) ? supportType : null,
    start_date: startDate || null,
    end_date: endDate || null,
    assigned_by: assignedBy,
    assigned_to: assignedTo,
    status: VALID_SUPPORT_STATUSES.includes(status) ? status : 'active',
    notes: notes || null,
  }

  return { valid: errors.length === 0, errors, warnings, parsed }
}

/**
 * Validate all rows and return summary
 */
export function validateAllRows(importType, rows, context) {
  const results = {
    valid: [],
    errors: [],
    warnings: [],
    duplicates: [],
    totalRows: rows.length,
  }

  rows.forEach((row, index) => {
    const result = validateRow(importType, row, context)
    const rowNum = index + 2 // +2 for 1-indexed + header row

    if (result.valid) {
      if (result.warnings.length > 0) {
        results.warnings.push({ rowNumber: rowNum, warnings: result.warnings, data: row, parsed: result.parsed })
      }
      results.valid.push({ rowNumber: rowNum, parsed: result.parsed, data: row })
    } else {
      results.errors.push({ rowNumber: rowNum, errors: result.errors, data: row })
    }
  })

  return results
}
