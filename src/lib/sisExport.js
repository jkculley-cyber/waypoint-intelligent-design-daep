/**
 * SIS Export Utility
 * Generates CSV data formatted for specific Student Information Systems.
 */

const SIS_FORMATS = {
  skyward: {
    name: 'Skyward',
    columns: ['Student ID', 'Last Name', 'First Name', 'Grade', 'Incident Date', 'Offense Code', 'Offense Description', 'Consequence', 'Consequence Start', 'Consequence End', 'Days', 'Location', 'Description', 'Reported By', 'Campus'],
    mapIncident: (incident, student, campus, reporter) => [
      student?.student_id_number || '',
      student?.last_name || '',
      student?.first_name || '',
      student?.grade_level || '',
      incident.incident_date || '',
      incident.offense?.code || incident.offense_code?.code || '',
      incident.offense?.title || incident.offense_code?.title || '',
      incident.consequence_type || '',
      incident.consequence_start || '',
      incident.consequence_end || '',
      incident.consequence_days || '',
      incident.location || '',
      incident.description || '',
      reporter?.full_name || '',
      campus?.name || '',
    ],
  },
  powerschool: {
    name: 'PowerSchool',
    columns: ['Student_Number', 'Last_Name', 'First_Name', 'Grade_Level', 'Incident_Date', 'Offense_Code', 'Offense_Description', 'Action_Taken', 'Action_Start_Date', 'Action_End_Date', 'Duration_Days', 'Location', 'Incident_Description', 'Reported_By', 'School_Name'],
    mapIncident: (incident, student, campus, reporter) => [
      student?.student_id_number || '',
      student?.last_name || '',
      student?.first_name || '',
      student?.grade_level || '',
      incident.incident_date || '',
      incident.offense?.code || incident.offense_code?.code || '',
      incident.offense?.title || incident.offense_code?.title || '',
      incident.consequence_type || '',
      incident.consequence_start || '',
      incident.consequence_end || '',
      incident.consequence_days || '',
      incident.location || '',
      incident.description || '',
      reporter?.full_name || '',
      campus?.name || '',
    ],
  },
  infinite_campus: {
    name: 'Infinite Campus',
    columns: ['studentNumber', 'lastName', 'firstName', 'grade', 'eventDate', 'incidentType', 'incidentDescription', 'resolutionType', 'startDate', 'endDate', 'days', 'locationName', 'comments', 'reportedBy', 'schoolName'],
    mapIncident: (incident, student, campus, reporter) => [
      student?.student_id_number || '',
      student?.last_name || '',
      student?.first_name || '',
      student?.grade_level || '',
      incident.incident_date || '',
      incident.offense?.code || incident.offense_code?.code || '',
      incident.offense?.title || incident.offense_code?.title || '',
      incident.consequence_type || '',
      incident.consequence_start || '',
      incident.consequence_end || '',
      incident.consequence_days || '',
      incident.location || '',
      incident.description || '',
      reporter?.full_name || '',
      campus?.name || '',
    ],
  },
  txeis: {
    name: 'TxEIS',
    columns: ['STUDENT-ID', 'LAST-NAME', 'FIRST-NAME', 'GRADE-LEVEL', 'DATE-OF-INCIDENT', 'PEIMS-OFFENSE-CODE', 'OFFENSE-DESCRIPTION', 'PEIMS-ACTION-CODE', 'ACTION-START-DATE', 'ACTION-END-DATE', 'ACTION-DAYS', 'LOCATION', 'INCIDENT-DESCRIPTION', 'REPORTED-BY', 'CAMPUS-ID'],
    mapIncident: (incident, student, campus, reporter) => [
      student?.student_id_number || '',
      student?.last_name || '',
      student?.first_name || '',
      student?.grade_level || '',
      incident.incident_date || '',
      incident.offense?.code || incident.offense_code?.code || '',
      incident.offense?.title || incident.offense_code?.title || '',
      incident.consequence_type || '',
      incident.consequence_start || '',
      incident.consequence_end || '',
      incident.consequence_days || '',
      incident.location || '',
      incident.description || '',
      reporter?.full_name || '',
      campus?.campus_number || campus?.name || '',
    ],
  },
  other: {
    name: 'Generic',
    columns: ['Student ID', 'Last Name', 'First Name', 'Grade', 'Incident Date', 'Offense Code', 'Offense Description', 'Consequence', 'Consequence Start', 'Consequence End', 'Days', 'Location', 'Description', 'Reported By', 'Campus'],
    mapIncident: (incident, student, campus, reporter) => [
      student?.student_id_number || '',
      student?.last_name || '',
      student?.first_name || '',
      student?.grade_level || '',
      incident.incident_date || '',
      incident.offense?.code || incident.offense_code?.code || '',
      incident.offense?.title || incident.offense_code?.title || '',
      incident.consequence_type || '',
      incident.consequence_start || '',
      incident.consequence_end || '',
      incident.consequence_days || '',
      incident.location || '',
      incident.description || '',
      reporter?.full_name || '',
      campus?.name || '',
    ],
  },
}

export const SIS_OPTIONS = [
  { value: 'skyward', label: 'Skyward' },
  { value: 'powerschool', label: 'PowerSchool' },
  { value: 'infinite_campus', label: 'Infinite Campus' },
  { value: 'txeis', label: 'TxEIS' },
  { value: 'other', label: 'Other' },
]

/**
 * Get the display name for a SIS type key.
 */
export function getSISName(sisType) {
  return SIS_FORMATS[sisType]?.name || SIS_FORMATS.other.name
}

/**
 * Escape a value for CSV output.
 */
function csvEscape(val) {
  const s = String(val == null ? '' : val)
  return `"${s.replace(/"/g, '""')}"`
}

/**
 * Export a single incident as CSV in the specified SIS format.
 * Returns a CSV string.
 */
export function exportIncidentToSIS(sisType, incident, student, campus, reporter) {
  const format = SIS_FORMATS[sisType] || SIS_FORMATS.other
  const row = format.mapIncident(incident, student, campus, reporter)
  const header = format.columns.map(csvEscape).join(',')
  const dataRow = row.map(csvEscape).join(',')
  return header + '\n' + dataRow
}

/**
 * Export multiple incidents as CSV in the specified SIS format.
 * Each incident object should have nested student, campus, reporter data.
 * Returns a CSV string.
 */
export function exportIncidentBatchToSIS(sisType, incidents, campusMap, reporterMap) {
  const format = SIS_FORMATS[sisType] || SIS_FORMATS.other
  const header = format.columns.map(csvEscape).join(',')
  const rows = incidents.map(inc => {
    const student = inc.student || null
    const campus = inc.campus || (campusMap && campusMap[inc.campus_id]) || null
    const reporter = inc.reporter || (reporterMap && reporterMap[inc.reported_by]) || null
    return format.mapIncident(inc, student, campus, reporter).map(csvEscape).join(',')
  })
  return [header, ...rows].join('\n')
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
