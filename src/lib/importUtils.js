import * as XLSX from 'xlsx'
import { supabase } from './supabase'

/**
 * Column alias mappings for auto-detecting SIS export formats.
 *
 * Covers the most common Texas district SIS platforms:
 *   - Skyward (SMS 2.0 / Qmlativ) — widely used in Texas
 *   - PowerSchool — common nationally
 *   - Frontline / PEIMS / TSDS — Texas state reporting names
 *   - Infinite Campus — growing Texas presence
 *   - eSchoolPlus / Aeries — used in some TX districts
 *   - Generic / legacy formats
 *
 * All alias values are lower-cased; matching is case-insensitive.
 */
const COLUMN_ALIASES = {
  // ── Student ID ──────────────────────────────────────────────────
  student_id_number: [
    // Generic
    'student id', 'student_id', 'studentid', 'student number', 'student_number',
    'studentnumber', 'student-id', 'id number', 'local id', 'local_id', 'stu id',
    // Skyward
    'student id number', 'student_id_number', 'name id', 'stud id',
    // PowerSchool
    'student_number', 'dcid', 'local student number',
    // Frontline / PEIMS / TSDS
    'student-id-local', 'stu-id', 'student local id',
    // Infinite Campus
    'studentnumber', 'state id',
    // eSchoolPlus / Aeries
    'perm id', 'permid', 'sis id',
  ],

  // ── First Name ──────────────────────────────────────────────────
  first_name: [
    'first name', 'first_name', 'firstname', 'first-nm', 'fname', 'given name',
    // Skyward
    'name first', 'name_first', 'legal first', 'preferred first',
    // PowerSchool
    'first_name', 'preferred_name',
    // PEIMS
    'student first name', 'first-name',
    // Infinite Campus
    'firstname', 'legal first name',
  ],

  // ── Last Name ───────────────────────────────────────────────────
  last_name: [
    'last name', 'last_name', 'lastname', 'last-nm', 'lname', 'surname', 'family name',
    // Skyward
    'name last', 'name_last', 'legal last',
    // PowerSchool
    'last_name',
    // PEIMS
    'student last name', 'last-name',
    // Infinite Campus
    'lastname', 'legal last name',
  ],

  // ── Date of Birth ───────────────────────────────────────────────
  date_of_birth: [
    'date of birth', 'date_of_birth', 'dob', 'birthdate', 'birth_date', 'birthday', 'birth date',
    // Skyward
    'birth date',
    // PowerSchool
    'dob', 'dateofbirth',
    // PEIMS
    'birth-date', 'date of birth',
    // Infinite Campus
    'birthdate',
  ],

  // ── Grade Level ─────────────────────────────────────────────────
  grade_level: [
    'grade level', 'grade_level', 'gradelevel', 'grade', 'grd', 'grd-lvl',
    // Skyward
    'student grade', 'grade level', 'enrolled grade',
    // PowerSchool
    'grade_level', 'enroll_grade',
    // PEIMS
    'grade-level-indicator', 'grd-lvl-ind',
    // Infinite Campus
    'grade', 'gradename',
    // eSchoolPlus
    'current grade', 'currentgrade',
  ],

  // ── Campus / School ─────────────────────────────────────────────
  campus_name: [
    'campus name', 'campus_name', 'school', 'school name', 'campus', 'building', 'school_name',
    // Skyward
    'school name', 'building name', 'enrolled school',
    // PowerSchool
    'school_name', 'schoolname',
    // PEIMS
    'campus-id-of-enrollment', 'campus name',
    // Infinite Campus
    'school', 'calendarname',
    // eSchoolPlus
    'school building', 'building',
  ],

  // ── Gender ──────────────────────────────────────────────────────
  gender: [
    'gender', 'sex', 'gndr',
    // Skyward
    'gender', 'sex',
    // PowerSchool
    'gender',
    // PEIMS
    'sex-code',
    // Infinite Campus
    'gender',
  ],

  // ── Race / Ethnicity ────────────────────────────────────────────
  race: [
    'race', 'race_ethnicity', 'race/ethnicity', 'ethnicity',
    // Skyward
    'race/ethnicity', 'ethnic group', 'ethnicgroup',
    // PowerSchool
    'ethnicity', 'fedethnicity',
    // PEIMS
    'hispanic-indicator', 'race-indicator',
    // Infinite Campus
    'race', 'raceethnicitycd',
  ],

  // ── SPED ────────────────────────────────────────────────────────
  is_sped: [
    'is sped', 'is_sped', 'sped', 'special ed', 'special_ed', 'special education',
    // Skyward
    'special ed', 'special education', 'sped indicator',
    // PowerSchool
    'specialed', 'sped', 'specialedflag',
    // PEIMS
    'special-education-indicator',
    // Infinite Campus
    'sped', 'specialeducation',
  ],

  // ── SPED Eligibility Code ───────────────────────────────────────
  sped_eligibility: [
    'sped eligibility', 'sped_eligibility', 'eligibility', 'disability', 'sped code', 'sped_code',
    // Skyward
    'primary exceptionality', 'eligibility code', 'primary disability',
    // PowerSchool
    'specialedcode', 'primary_disability',
    // PEIMS
    'primary-disability-code', 'disability code',
    // Infinite Campus
    'primary exceptionality', 'primaryexceptionality',
  ],

  // ── Section 504 ─────────────────────────────────────────────────
  is_504: [
    'is 504', 'is_504', '504', 'section 504', 'section_504',
    // Skyward
    '504 plan', '504plan', '504 indicator',
    // PowerSchool
    '504', 'section504',
    // PEIMS
    '504-indicator',
    // Infinite Campus
    'section504', '504',
  ],

  // ── ELL ─────────────────────────────────────────────────────────
  is_ell: [
    'is ell', 'is_ell', 'ell', 'lep', 'english learner', 'el',
    // Skyward
    'ell', 'esl', 'bilingual', 'lep indicator',
    // PowerSchool
    'lep', 'el',
    // PEIMS
    'lep-indicator', 'bilingual-esl-indicator',
    // Infinite Campus
    'ell', 'esl',
  ],

  // ── Homeless ────────────────────────────────────────────────────
  is_homeless: [
    'is homeless', 'is_homeless', 'homeless', 'mckinney-vento',
    // Skyward / PowerSchool / Infinite Campus
    'homeless indicator', 'homeless', 'homelessindicator', 'mckinney vento',
  ],

  // ── Foster ──────────────────────────────────────────────────────
  is_foster: [
    'is foster', 'is_foster', 'foster', 'foster care',
    // Common variants
    'foster care indicator', 'foster care', 'fostercare',
  ],

  // ── Migrant ─────────────────────────────────────────────────────
  is_migrant: [
    'is migrant', 'is_migrant', 'migrant',
    // Skyward / PEIMS
    'migrant indicator', 'migrant', 'migrantindicator',
  ],

  // ── Campus Name (for campuses import) ──────────────────────────
  name: [
    'name', 'campus name', 'campus_name', 'school name', 'school_name', 'building name',
  ],

  // ── TEA Campus ID ───────────────────────────────────────────────
  tea_campus_id: [
    'tea campus id', 'tea_campus_id', 'campus id', 'campus_id', 'tea id', 'tea_id', 'cdc',
    // PEIMS / TSDS
    'county-district-campus', 'campus number', 'cdc number', 'tea number',
    'campus-id', 'teacampusid',
  ],

  // ── Campus Type ─────────────────────────────────────────────────
  campus_type: [
    'campus type', 'campus_type', 'type', 'school type', 'school_type', 'level',
    'school level', 'grade span',
  ],

  // ── Address ─────────────────────────────────────────────────────
  address: [
    'address', 'street address', 'street_address', 'addr', 'mailing address',
    'physical address',
  ],

  // ── Phone ───────────────────────────────────────────────────────
  phone: [
    'phone', 'phone number', 'phone_number', 'tel', 'telephone',
    'main phone', 'office phone',
  ],

  // ── Staff Email ─────────────────────────────────────────────────
  email: [
    'email', 'email address', 'email_address', 'e-mail', 'mail',
    // Skyward
    'staff email', 'district email',
    // PowerSchool
    'email_addr', 'teacheremail',
    // Infinite Campus
    'email', 'emailaddress',
  ],

  // ── Staff Full Name ─────────────────────────────────────────────
  full_name: [
    'full name', 'full_name', 'fullname', 'name', 'staff name', 'employee name',
    // Skyward
    'employee name', 'name display',
    // PowerSchool
    'teachername', 'staff name',
    // Infinite Campus
    'staffname', 'employeename',
  ],

  // ── Staff Role ──────────────────────────────────────────────────
  role: [
    'role', 'position', 'title', 'job title', 'job_title',
    // Common
    'staff role', 'employee type', 'job code',
  ],

  // ── Staff Campus Assignments ────────────────────────────────────
  campus_names: [
    'campus names', 'campus_names', 'campuses', 'campus assignments', 'schools', 'campus',
    'assigned schools', 'school assignments',
  ],

  // ── Incident Date ───────────────────────────────────────────────
  incident_date: [
    'incident date', 'incident_date', 'date', 'event date', 'event_date', 'occurrence date',
    // Frontline / PEIMS
    'date of incident', 'infraction date', 'action date',
    // Generic
    'discipline date', 'incident-date',
  ],

  // ── Offense Code ────────────────────────────────────────────────
  offense_code: [
    'offense code', 'offense_code', 'code', 'violation code', 'violation_code', 'offense',
    // Frontline / PEIMS
    'infraction code', 'behavior code', 'conduct code', 'tec code',
    // Skyward
    'offense/violation', 'behavior type code',
  ],

  // ── Incident Description ────────────────────────────────────────
  description: [
    'description', 'desc', 'details', 'narrative', 'comments', 'notes', 'incident description',
    // Frontline / Skyward
    'incident narrative', 'behavior description', 'incident details',
  ],

  // ── Consequence Type ────────────────────────────────────────────
  consequence_type: [
    'consequence type', 'consequence_type', 'consequence', 'action', 'discipline action', 'action taken',
    // Frontline / PEIMS
    'disciplinary action', 'action code', 'response', 'sanction',
    // Skyward
    'action/consequence', 'disciplinary consequence',
  ],

  // ── Consequence Days ────────────────────────────────────────────
  consequence_days: [
    'consequence days', 'consequence_days', 'days', 'duration', 'number of days', 'num days',
    // Frontline / PEIMS
    'days assigned', 'days removed', 'length of action', 'days of action',
    // Skyward
    'action days', 'removal days',
  ],

  // ── Incident Location ───────────────────────────────────────────
  location: [
    'location', 'loc', 'place', 'incident location', 'where',
    // Frontline / Skyward
    'location of incident', 'incident site', 'area', 'campus area',
  ],

  // ── Reported By ─────────────────────────────────────────────────
  reported_by_email: [
    'reported by email', 'reported_by_email', 'reported by', 'reporter', 'referring staff', 'staff email',
    // Frontline / Skyward
    'reporting staff email', 'entered by email', 'staff reporter email', 'referral staff email',
  ],
}

/**
 * Detect the match confidence for each mapped field.
 * Returns 'exact' | 'alias' | 'none' for each target field.
 */
export function detectMappingConfidence(fileHeaders, targetFields, mapping) {
  const confidence = {}
  for (const field of targetFields) {
    const source = mapping[field]
    if (!source) {
      confidence[field] = 'none'
      continue
    }
    // Check exact match
    if (fileHeaders.some(h => h.toLowerCase().trim() === field.toLowerCase())) {
      confidence[field] = 'exact'
    } else {
      confidence[field] = 'alias'
    }
  }
  return confidence
}

/**
 * Parse a file (CSV or Excel) and return rows as array of objects
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(new Error('Failed to parse file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Auto-detect column mapping from file headers to target fields
 * @param {string[]} fileHeaders - Column headers from the uploaded file
 * @param {string[]} targetFields - Expected field names for the import type
 * @returns {Object} mapping of targetField -> fileHeader
 */
export function autoDetectMapping(fileHeaders, targetFields) {
  const mapping = {}
  const usedHeaders = new Set()

  for (const field of targetFields) {
    // Exact match first
    const exactMatch = fileHeaders.find(
      h => h.toLowerCase().trim() === field.toLowerCase() && !usedHeaders.has(h)
    )
    if (exactMatch) {
      mapping[field] = exactMatch
      usedHeaders.add(exactMatch)
      continue
    }

    // Alias match
    const aliases = COLUMN_ALIASES[field] || []
    const aliasMatch = fileHeaders.find(h => {
      const lower = h.toLowerCase().trim()
      return aliases.includes(lower) && !usedHeaders.has(h)
    })
    if (aliasMatch) {
      mapping[field] = aliasMatch
      usedHeaders.add(aliasMatch)
    }
  }

  return mapping
}

/**
 * Apply column mapping to raw rows
 */
export function applyMapping(rows, mapping) {
  return rows.map(row => {
    const mapped = {}
    for (const [targetField, sourceHeader] of Object.entries(mapping)) {
      if (sourceHeader && row[sourceHeader] !== undefined) {
        let value = row[sourceHeader]
        // Handle Date objects from Excel
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0]
        }
        mapped[targetField] = value
      } else {
        mapped[targetField] = ''
      }
    }
    return mapped
  })
}

/**
 * Fetch context data needed for validation (campuses, existing records, etc.)
 */
export async function fetchValidationContext(importType, districtId) {
  const context = {}

  // Always fetch campuses (needed for students, incidents, profiles)
  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name, tea_campus_id')
    .eq('district_id', districtId)

  context.campusMap = {}
  context.existingTeaIds = new Set()
  if (campuses) {
    for (const c of campuses) {
      context.campusMap[c.name.toLowerCase()] = c.id
      context.existingTeaIds.add(c.tea_campus_id)
    }
  }

  if (importType === 'students') {
    const { data: students } = await supabase
      .from('students')
      .select('student_id_number')
      .eq('district_id', districtId)
    context.existingStudentIds = new Set(students?.map(s => s.student_id_number) || [])
  }

  if (importType === 'profiles') {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email')
      .eq('district_id', districtId)
    context.existingEmails = new Set(profiles?.map(p => p.email) || [])
  }

  if (importType === 'incidents') {
    // Fetch students for ID lookup
    const { data: students } = await supabase
      .from('students')
      .select('id, student_id_number')
      .eq('district_id', districtId)
    context.studentIdMap = {}
    if (students) {
      for (const s of students) {
        context.studentIdMap[s.student_id_number] = s.id
      }
    }

    // Fetch offense codes
    const { data: codes } = await supabase
      .from('offense_codes')
      .select('id, code')
      .eq('district_id', districtId)
    context.offenseCodeMap = {}
    if (codes) {
      for (const c of codes) {
        context.offenseCodeMap[c.code.toUpperCase()] = c.id
      }
    }

    // Fetch staff emails
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('district_id', districtId)
    context.staffEmailMap = {}
    if (staff) {
      for (const s of staff) {
        context.staffEmailMap[s.email.toLowerCase()] = s.id
      }
    }
  }

  return context
}

/**
 * Process import in batches
 * @param {object} params
 * @param {string} params.importType
 * @param {object[]} params.validRows - Validated and parsed rows
 * @param {string} params.districtId
 * @param {string} params.duplicateStrategy - 'skip' | 'upsert'
 * @param {function} params.onProgress - (processed, total) => void
 * @returns {{ successCount: number, errorCount: number, skippedCount: number, errors: object[] }}
 */
export async function processImport({ importType, validRows, districtId, duplicateStrategy, onProgress }) {
  const BATCH_SIZE = 500
  let successCount = 0
  let errorCount = 0
  let skippedCount = 0
  const errors = []

  const batches = []
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    batches.push(validRows.slice(i, i + BATCH_SIZE))
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    try {
      const result = await insertBatch(importType, batch, districtId, duplicateStrategy)
      successCount += result.successCount
      skippedCount += result.skippedCount
      errors.push(...result.errors)
      errorCount += result.errors.length
    } catch (err) {
      // Entire batch failed - log errors for each row
      for (const row of batch) {
        errors.push({
          rowNumber: row.rowNumber,
          error_type: 'insert_error',
          error_message: err.message,
          row_data: row.data || {},
        })
        errorCount++
      }
    }

    onProgress?.(Math.min((batchIndex + 1) * BATCH_SIZE, validRows.length), validRows.length)
  }

  return { successCount, errorCount, skippedCount, errors }
}

async function insertBatch(importType, rows, districtId, duplicateStrategy) {
  const inserters = {
    campuses: insertCampusesBatch,
    students: insertStudentsBatch,
    profiles: insertProfilesBatch,
    incidents: insertIncidentsBatch,
  }

  const inserter = inserters[importType]
  if (!inserter) throw new Error('Unknown import type')
  return inserter(rows, districtId, duplicateStrategy)
}

async function insertCampusesBatch(rows, districtId, duplicateStrategy) {
  const records = rows.map(r => ({ ...r.parsed, district_id: districtId }))

  if (duplicateStrategy === 'upsert') {
    const { data, error } = await supabase
      .from('campuses')
      .upsert(records, { onConflict: 'district_id,tea_campus_id' })
      .select('id')
    if (error) throw error
    return { successCount: data?.length || records.length, skippedCount: 0, errors: [] }
  }

  // Default: skip duplicates
  const { data, error } = await supabase
    .from('campuses')
    .insert(records)
    .select('id')

  if (error) {
    // If unique violation, try one by one
    if (error.code === '23505') {
      return insertOneByOne('campuses', rows, districtId)
    }
    throw error
  }

  return { successCount: data?.length || records.length, skippedCount: 0, errors: [] }
}

async function insertStudentsBatch(rows, districtId, duplicateStrategy) {
  const records = rows.map(r => ({ ...r.parsed, district_id: districtId }))

  if (duplicateStrategy === 'upsert') {
    const { data, error } = await supabase
      .from('students')
      .upsert(records, { onConflict: 'district_id,student_id_number' })
      .select('id')
    if (error) throw error
    return { successCount: data?.length || records.length, skippedCount: 0, errors: [] }
  }

  const { data, error } = await supabase
    .from('students')
    .insert(records)
    .select('id')

  if (error) {
    if (error.code === '23505') {
      return insertOneByOne('students', rows, districtId)
    }
    throw error
  }

  return { successCount: data?.length || records.length, skippedCount: 0, errors: [] }
}

async function insertProfilesBatch(rows, districtId) {
  // Profiles need special handling - can't bulk insert auth users
  // We insert profile records only (they'd need to set up auth separately)
  let successCount = 0
  let skippedCount = 0
  const errors = []

  for (const row of rows) {
    try {
      const { campus_ids, ...profileData } = row.parsed
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ ...profileData, district_id: districtId }, { onConflict: 'email' })
        .select('id')
        .single()

      if (error) throw error

      // Update campus assignments if provided
      if (campus_ids?.length > 0 && data?.id) {
        // Delete existing assignments first
        await supabase
          .from('campus_assignments')
          .delete()
          .eq('profile_id', data.id)

        const assignments = campus_ids.map(campusId => ({
          profile_id: data.id,
          campus_id: campusId,
        }))
        await supabase.from('campus_assignments').insert(assignments)
      }

      successCount++
    } catch (err) {
      errors.push({
        rowNumber: row.rowNumber,
        error_type: 'insert_error',
        error_message: err.message,
        row_data: row.data || {},
      })
    }
  }

  return { successCount, skippedCount, errors }
}

async function insertIncidentsBatch(rows, districtId, duplicateStrategy) {
  const records = rows.map(r => ({ ...r.parsed, district_id: districtId }))

  const { data, error } = await supabase
    .from('incidents')
    .insert(records)
    .select('id')

  if (error) throw error

  return { successCount: data?.length || records.length, skippedCount: 0, errors: [] }
}

async function insertOneByOne(table, rows, districtId) {
  let successCount = 0
  let skippedCount = 0
  const errors = []

  for (const row of rows) {
    try {
      const { error } = await supabase
        .from(table)
        .insert({ ...row.parsed, district_id: districtId })
      if (error) {
        if (error.code === '23505') {
          skippedCount++
        } else {
          throw error
        }
      } else {
        successCount++
      }
    } catch (err) {
      errors.push({
        rowNumber: row.rowNumber,
        error_type: 'insert_error',
        error_message: err.message,
        row_data: row.data || {},
      })
    }
  }

  return { successCount, skippedCount, errors }
}

/**
 * Export validation errors as CSV for download
 */
export function downloadErrorsCsv(errorRows, importType) {
  const headers = ['Row Number', 'Errors', 'Raw Data']
  const csvRows = [headers.join(',')]

  for (const row of errorRows) {
    const rowNum = row.rowNumber
    const errs = (row.errors || []).join('; ')
    const rawData = JSON.stringify(row.data || {})
    csvRows.push(`${rowNum},"${errs.replace(/"/g, '""')}","${rawData.replace(/"/g, '""')}"`)
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${importType}_import_errors.csv`
  a.click()
  URL.revokeObjectURL(url)
}
