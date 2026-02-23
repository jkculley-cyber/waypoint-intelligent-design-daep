import * as XLSX from 'xlsx'

/**
 * Template definitions for each import type
 */
export const IMPORT_TEMPLATES = {
  campuses: {
    label: 'Campuses',
    headers: ['name', 'tea_campus_id', 'campus_type', 'address', 'phone'],
    requiredFields: ['name', 'tea_campus_id', 'campus_type'],
    sampleRows: [
      ['Lincoln Elementary', '101901001', 'elementary', '100 Main St, Austin TX 78701', '512-555-0100'],
      ['Washington Middle School', '101901002', 'middle', '200 Oak Ave, Austin TX 78702', '512-555-0200'],
    ],
    instructions: [
      { field: 'name', description: 'Campus name (required, 2-100 characters)', example: 'Lincoln Elementary' },
      { field: 'tea_campus_id', description: 'TEA campus ID number (required, must be unique)', example: '101901001' },
      { field: 'campus_type', description: 'Campus type (required). Valid values: elementary, middle, high, daep, jjaep, other', example: 'elementary' },
      { field: 'address', description: 'Street address (optional)', example: '100 Main St, Austin TX 78701' },
      { field: 'phone', description: 'Phone number (optional)', example: '512-555-0100' },
    ],
  },
  students: {
    label: 'Students',
    headers: [
      'student_id_number', 'first_name', 'last_name', 'date_of_birth', 'grade_level',
      'campus_name', 'gender', 'race', 'is_sped', 'sped_eligibility',
      'is_504', 'is_ell', 'is_homeless', 'is_foster', 'is_migrant',
    ],
    requiredFields: ['student_id_number', 'first_name', 'last_name', 'date_of_birth', 'grade_level'],
    sampleRows: [
      ['STU001', 'Maria', 'Garcia', '2010-03-15', '8', 'Lincoln Middle School', 'F', 'Hispanic/Latino', 'FALSE', '', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE'],
      ['STU002', 'James', 'Johnson', '2012-09-22', '5', 'Washington Elementary', 'M', 'Black', 'TRUE', 'LD', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE'],
    ],
    instructions: [
      { field: 'student_id_number', description: 'District student ID (required, must be unique within district)', example: 'STU001' },
      { field: 'first_name', description: 'Student first name (required)', example: 'Maria' },
      { field: 'last_name', description: 'Student last name (required)', example: 'Garcia' },
      { field: 'date_of_birth', description: 'Date of birth in YYYY-MM-DD format (required, cannot be future date)', example: '2010-03-15' },
      { field: 'grade_level', description: 'Grade level -1 (Pre-K) through 12 (required)', example: '8' },
      { field: 'campus_name', description: 'Name of campus (must match an existing campus)', example: 'Lincoln Middle School' },
      { field: 'gender', description: 'M, F, or X (optional)', example: 'F' },
      { field: 'race', description: 'Race/ethnicity (optional)', example: 'Hispanic/Latino' },
      { field: 'is_sped', description: 'TRUE or FALSE (optional, default FALSE)', example: 'FALSE' },
      { field: 'sped_eligibility', description: 'SPED eligibility code. Required if is_sped is TRUE. Codes: AU, DB, ED, HI, ID, LD, MD, NCI, OHI, OI, SI, TBI, VI', example: 'LD' },
      { field: 'is_504', description: 'TRUE or FALSE (optional, default FALSE)', example: 'FALSE' },
      { field: 'is_ell', description: 'English Language Learner - TRUE or FALSE (optional, default FALSE)', example: 'TRUE' },
      { field: 'is_homeless', description: 'TRUE or FALSE (optional, default FALSE)', example: 'FALSE' },
      { field: 'is_foster', description: 'TRUE or FALSE (optional, default FALSE)', example: 'FALSE' },
      { field: 'is_migrant', description: 'TRUE or FALSE (optional, default FALSE)', example: 'FALSE' },
    ],
  },
  profiles: {
    label: 'Staff',
    headers: ['email', 'full_name', 'role', 'campus_names', 'phone'],
    requiredFields: ['email', 'full_name', 'role'],
    sampleRows: [
      ['jane.smith@district.edu', 'Jane Smith', 'teacher', 'Lincoln Elementary; Washington Middle', '512-555-0300'],
      ['bob.jones@district.edu', 'Bob Jones', 'principal', 'Lincoln Elementary', '512-555-0400'],
    ],
    instructions: [
      { field: 'email', description: 'Email address (required, must be unique)', example: 'jane.smith@district.edu' },
      { field: 'full_name', description: 'Full name (required)', example: 'Jane Smith' },
      { field: 'role', description: 'Role (required). Valid values: admin, principal, ap, counselor, sped_coordinator, teacher', example: 'teacher' },
      { field: 'campus_names', description: 'Campus assignments separated by semicolons. Each campus must exist.', example: 'Lincoln Elementary; Washington Middle' },
      { field: 'phone', description: 'Phone number (optional)', example: '512-555-0300' },
    ],
  },
  incidents: {
    label: 'Incidents',
    headers: [
      'student_id_number', 'incident_date', 'offense_code', 'description',
      'consequence_type', 'consequence_days', 'location', 'reported_by_email',
    ],
    requiredFields: ['student_id_number', 'incident_date', 'offense_code', 'description', 'consequence_type', 'reported_by_email'],
    sampleRows: [
      ['STU001', '2025-01-15', 'FIG01', 'Physical altercation in hallway', 'iss', '3', 'Hallway', 'jane.smith@district.edu'],
      ['STU002', '2025-01-20', 'TRU01', 'Unexcused absence from class', 'detention', '1', 'Classroom', 'bob.jones@district.edu'],
    ],
    instructions: [
      { field: 'student_id_number', description: 'District student ID (required, must match existing student)', example: 'STU001' },
      { field: 'incident_date', description: 'Date of incident in YYYY-MM-DD format (required, cannot be future)', example: '2025-01-15' },
      { field: 'offense_code', description: 'Offense code (required, must match existing offense code)', example: 'FIG01' },
      { field: 'description', description: 'Description of the incident (required)', example: 'Physical altercation in hallway' },
      { field: 'consequence_type', description: 'Consequence type (required). Valid values: warning, detention, iss, oss, daep, expulsion', example: 'iss' },
      { field: 'consequence_days', description: 'Number of days for consequence. Required for iss, oss, daep.', example: '3' },
      { field: 'location', description: 'Location of incident (optional)', example: 'Hallway' },
      { field: 'reported_by_email', description: 'Email of reporting staff member (required, must match existing staff)', example: 'jane.smith@district.edu' },
    ],
  },
  navigator_referrals: {
    label: 'Referrals',
    headers: [
      'student_id_number', 'referral_date', 'description', 'reported_by_email',
      'campus_name', 'status', 'offense_code', 'location',
    ],
    requiredFields: ['student_id_number', 'referral_date', 'description', 'reported_by_email', 'campus_name'],
    sampleRows: [
      ['STU001', '2025-09-15', 'Student disrupted class repeatedly', 'jane.smith@district.edu', 'Lincoln Middle School', 'pending', 'DIS01', 'Classroom'],
      ['STU002', '2025-10-03', 'Verbal altercation with another student', 'bob.jones@district.edu', 'Washington High School', 'reviewed', 'FIG01', 'Hallway'],
    ],
    instructions: [
      { field: 'student_id_number', description: 'District student ID (required, must match existing student)', example: 'STU001' },
      { field: 'referral_date', description: 'Date of referral in YYYY-MM-DD format (required, cannot be future)', example: '2025-09-15' },
      { field: 'description', description: 'Description of the behavior (required)', example: 'Student disrupted class repeatedly' },
      { field: 'reported_by_email', description: 'Email of reporting staff member (required, must match existing staff)', example: 'jane.smith@district.edu' },
      { field: 'campus_name', description: 'Campus name (required, must match existing campus)', example: 'Lincoln Middle School' },
      { field: 'status', description: 'Referral status (optional, default: pending). Valid: pending, reviewed, closed, escalated_to_daep', example: 'pending' },
      { field: 'offense_code', description: 'Offense code (optional, must match existing code if provided)', example: 'DIS01' },
      { field: 'location', description: 'Location where behavior occurred (optional)', example: 'Classroom' },
    ],
  },
  navigator_placements: {
    label: 'Placements (ISS/OSS)',
    headers: [
      'student_id_number', 'placement_type', 'start_date', 'assigned_by_email',
      'campus_name', 'end_date', 'days', 'location', 'reason',
    ],
    requiredFields: ['student_id_number', 'placement_type', 'start_date', 'assigned_by_email', 'campus_name'],
    sampleRows: [
      ['STU001', 'iss', '2025-09-16', 'bob.jones@district.edu', 'Lincoln Middle School', '2025-09-18', '3', 'Room 101', 'Disruptive behavior'],
      ['STU002', 'oss', '2025-10-04', 'bob.jones@district.edu', 'Washington High School', '2025-10-06', '3', '', 'Fighting'],
    ],
    instructions: [
      { field: 'student_id_number', description: 'District student ID (required, must match existing student)', example: 'STU001' },
      { field: 'placement_type', description: 'Placement type (required). Valid values: iss, oss', example: 'iss' },
      { field: 'start_date', description: 'Start date in YYYY-MM-DD format (required)', example: '2025-09-16' },
      { field: 'assigned_by_email', description: 'Email of assigning staff member (required, must match existing staff)', example: 'bob.jones@district.edu' },
      { field: 'campus_name', description: 'Campus name (required, must match existing campus)', example: 'Lincoln Middle School' },
      { field: 'end_date', description: 'End date in YYYY-MM-DD format (optional, must be >= start_date)', example: '2025-09-18' },
      { field: 'days', description: 'Number of placement days (optional, positive integer)', example: '3' },
      { field: 'location', description: 'Room or location for ISS (optional)', example: 'Room 101' },
      { field: 'reason', description: 'Reason for placement (optional)', example: 'Disruptive behavior' },
    ],
  },
  navigator_supports: {
    label: 'Student Supports',
    headers: [
      'student_id_number', 'support_type', 'start_date', 'assigned_by_email',
      'campus_name', 'status', 'assigned_to_email', 'end_date', 'notes',
    ],
    requiredFields: ['student_id_number', 'support_type', 'start_date', 'assigned_by_email', 'campus_name'],
    sampleRows: [
      ['STU001', 'cico', '2025-09-20', 'bob.jones@district.edu', 'Lincoln Middle School', 'active', 'jane.smith@district.edu', '', 'Check-in/check-out with counselor daily'],
      ['STU002', 'counseling_referral', '2025-10-05', 'bob.jones@district.edu', 'Washington High School', 'completed', '', '2025-11-05', 'Completed 4-session counseling cycle'],
    ],
    instructions: [
      { field: 'student_id_number', description: 'District student ID (required, must match existing student)', example: 'STU001' },
      { field: 'support_type', description: 'Support type (required). Valid: cico, behavior_contract, counseling_referral, parent_contact, mentoring, other', example: 'cico' },
      { field: 'start_date', description: 'Start date in YYYY-MM-DD format (required)', example: '2025-09-20' },
      { field: 'assigned_by_email', description: 'Email of staff who assigned the support (required, must match existing staff)', example: 'bob.jones@district.edu' },
      { field: 'campus_name', description: 'Campus name (required, must match existing campus)', example: 'Lincoln Middle School' },
      { field: 'status', description: 'Support status (optional, default: active). Valid: active, completed, discontinued', example: 'active' },
      { field: 'assigned_to_email', description: 'Email of staff delivering support (optional)', example: 'jane.smith@district.edu' },
      { field: 'end_date', description: 'End date in YYYY-MM-DD format (optional)', example: '2025-11-05' },
      { field: 'notes', description: 'Additional notes (optional)', example: 'Check-in/check-out with counselor daily' },
    ],
  },
}

/**
 * Download a template Excel file for the given import type
 */
export function downloadTemplate(importType) {
  const template = IMPORT_TEMPLATES[importType]
  if (!template) return

  const wb = XLSX.utils.book_new()

  // Sheet 1: Data template with headers and sample rows
  const dataSheet = XLSX.utils.aoa_to_sheet([
    template.headers,
    ...template.sampleRows,
  ])

  // Set column widths
  dataSheet['!cols'] = template.headers.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data')

  // Sheet 2: Instructions
  const instructionRows = [
    ['Field', 'Description', 'Example'],
    ...template.instructions.map(i => [i.field, i.description, i.example]),
  ]
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows)
  instructionSheet['!cols'] = [{ wch: 20 }, { wch: 60 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, instructionSheet, 'Instructions')

  XLSX.writeFile(wb, `${importType}_import_template.xlsx`)
}
