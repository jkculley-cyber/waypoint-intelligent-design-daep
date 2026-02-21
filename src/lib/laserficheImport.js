import * as XLSX from 'xlsx'
import { supabase } from './supabase'

// ── Status mapping ──────────────────────────────────────────────────────────
// Laserfiche Status + Current step → Waypoint incident status

function mapStatus(status, currentStep) {
  const s = (status || '').toLowerCase().trim()
  const step = (currentStep || '').toLowerCase().trim()

  if (s.includes('terminate')) return 'overturned'  // early exit / withdrawn
  if (s === 'completed') return 'completed'

  // In progress — look at current step
  if (step === 'daep') return 'active'
  if (step.includes('correction') || step.includes('cbc')) return 'returned'
  return 'under_review'
}

// ── Consequence type ────────────────────────────────────────────────────────
// Infer from which date fields are populated (DAEP > OSS > ISS)

function mapConsequenceType(row) {
  const step = (row['Current step'] || '').toLowerCase()
  const stage = (row['Current stage'] || '').toLowerCase()
  if (row['Last_Date_of_Enrollment_at_DAEP'] || step.includes('daep') || stage.includes('daep')) {
    return 'daep'
  }
  if (row['First_Day_OSS']) return 'oss'
  if (row['First_Day_of_ISS']) return 'iss'
  return 'daep' // default — this is always a DAEP process
}

// ── Date helpers ────────────────────────────────────────────────────────────

function toDateString(val) {
  if (!val) return null
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    return val.toISOString().split('T')[0]
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

function parseGrade(val) {
  const n = parseInt(val, 10)
  return isNaN(n) ? 0 : Math.max(-1, Math.min(12, n))
}

function parseGender(val) {
  const v = (val || '').toUpperCase().trim()
  return (v === 'M' || v === 'F' || v === 'X') ? v : null
}

// Deterministic synthetic student ID for students created from Laserfiche
// (stable so re-importing the same student doesn't create a duplicate)
function syntheticStudentId(firstName, lastName, grade) {
  const f = (firstName || '').toUpperCase().replace(/\s+/g, '_')
  const l = (lastName || '').toUpperCase().replace(/\s+/g, '_')
  return `LF-${l}-${f}-G${grade ?? 0}`
}

// ── Main processor ──────────────────────────────────────────────────────────

/**
 * Process a Laserfiche DAEP report (array of raw Excel rows).
 * For each row:
 *   1. Match campus by name
 *   2. Find-or-create student by first+last name
 *   3. Upsert incident by laserfiche_instance_id
 *
 * @param {object[]} rows - Raw rows from xlsx sheet_to_json
 * @param {string}   districtId
 * @param {Function} [onProgress] - (processed, total) => void
 * @returns {{ successCount, errorCount, skippedCount, errors[] }}
 */
export async function processLaserficheImport(rows, districtId, onProgress) {
  // ── Pre-fetch lookup tables ──────────────────────────────────────────────

  const [campusRes, studentRes, incidentRes] = await Promise.all([
    supabase.from('campuses').select('id, name').eq('district_id', districtId),
    supabase.from('students').select('id, first_name, last_name').eq('district_id', districtId),
    supabase.from('incidents').select('id, laserfiche_instance_id')
      .eq('district_id', districtId)
      .not('laserfiche_instance_id', 'is', null),
  ])

  // campus name (lowercase) → campus_id
  const campusMap = {}
  for (const c of (campusRes.data || [])) {
    campusMap[c.name.toLowerCase().trim()] = c.id
  }

  // "firstname|lastname" (lowercase) → student_id
  const studentMap = {}
  for (const s of (studentRes.data || [])) {
    const key = `${s.first_name.toLowerCase()}|${s.last_name.toLowerCase()}`
    studentMap[key] = s.id
  }

  // laserfiche_instance_id → incident_id
  const instanceMap = {}
  for (const inc of (incidentRes.data || [])) {
    instanceMap[inc.laserfiche_instance_id] = inc.id
  }

  // ── Process rows ─────────────────────────────────────────────────────────

  const result = { successCount: 0, errorCount: 0, skippedCount: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    onProgress?.(i + 1, rows.length)

    try {
      // Instance ID is the dedup key — skip if missing
      const instanceId = String(row['Instance ID'] || '').trim()
      if (!instanceId) { result.skippedCount++; continue }

      const firstName = (row['First_Name'] || '').trim()
      const lastName  = (row['Last_Name'] || '').trim()
      if (!firstName || !lastName) {
        result.errors.push({ rowNumber: i + 2, error_message: 'Missing student name', row_data: { instanceId } })
        result.errorCount++
        continue
      }

      // ── Campus lookup ──────────────────────────────────────────────────
      const campusName = (row['Campus'] || '').trim()
      const campusId = campusMap[campusName.toLowerCase()] || null

      // ── Student find-or-create ─────────────────────────────────────────
      const studentKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`
      let studentId = studentMap[studentKey]

      if (!studentId) {
        if (!campusId) {
          result.errors.push({
            rowNumber: i + 2,
            error_message: `Campus "${campusName}" not found in Waypoint; cannot create student. Add the campus first.`,
            row_data: { instanceId, firstName, lastName },
          })
          result.errorCount++
          continue
        }

        const grade = parseGrade(row['Grade'])
        const { data: newStudent, error: studentErr } = await supabase
          .from('students')
          .upsert({
            district_id:       districtId,
            campus_id:         campusId,
            student_id_number: syntheticStudentId(firstName, lastName, grade),
            first_name:        firstName,
            last_name:         lastName,
            grade_level:       grade,
            gender:            parseGender(row['Gender']),
            is_ell:            !!(row['LEP_2'] || row['LEP_File_Upload']),
            is_active:         true,
          }, { onConflict: 'district_id,student_id_number' })
          .select('id')
          .single()

        if (studentErr) throw new Error(`Create student: ${studentErr.message}`)
        studentId = newStudent.id
        studentMap[studentKey] = studentId
      }

      // ── Build incident payload ─────────────────────────────────────────
      const incidentDate = toDateString(row['Date_of_Violation'])
                        || toDateString(row['Referral_Date'])
                        || toDateString(row['Date'])
                        || new Date().toISOString().split('T')[0]

      const payload = {
        district_id:              districtId,
        student_id:               studentId,
        campus_id:                campusId,
        laserfiche_instance_id:   instanceId,
        laserfiche_step:          (row['Current step'] || '').trim() || null,
        incident_date:            incidentDate,
        status:                   mapStatus(row['Status'], row['Current step']),
        consequence_type:         mapConsequenceType(row),
        consequence_days:         parseInt(row['Number'], 10) || null,
        consequence_start:        toDateString(row['First_Day_of_ISS']) || toDateString(row['First_Day_OSS']),
        consequence_end:          toDateString(row['Last_Date_of_Enrollment_at_DAEP']),
        description:              `Imported from Laserfiche — Instance ${instanceId}`,
        updated_at:               new Date().toISOString(),
      }

      // ── Upsert incident ───────────────────────────────────────────────
      if (instanceMap[instanceId]) {
        const { error: updateErr } = await supabase
          .from('incidents')
          .update(payload)
          .eq('id', instanceMap[instanceId])
        if (updateErr) throw new Error(`Update incident: ${updateErr.message}`)
      } else {
        const { data: newInc, error: insertErr } = await supabase
          .from('incidents')
          .insert(payload)
          .select('id')
          .single()
        if (insertErr) throw new Error(`Create incident: ${insertErr.message}`)
        instanceMap[instanceId] = newInc.id
      }

      result.successCount++
    } catch (err) {
      result.errors.push({
        rowNumber: i + 2,
        error_message: err.message,
        row_data: { 'Instance ID': row['Instance ID'], First_Name: row['First_Name'], Last_Name: row['Last_Name'] },
      })
      result.errorCount++
    }
  }

  return result
}

/**
 * Parse a Laserfiche Excel file and return raw rows.
 * Re-uses the xlsx library already in the project.
 */
export function parseLaserficheFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const sheet = wb.Sheets[wb.SheetNames[0]]
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
