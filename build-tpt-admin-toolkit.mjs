/**
 * build-tpt-admin-toolkit.mjs
 * Generates: Campus-Admin-Discipline-Command-Center-Texas-Edition.xlsx
 * Brand: Clear Path Education Group, LLC
 * Product: Campus Administrator's Discipline Command Center — Texas Edition
 * Run: node build-tpt-admin-toolkit.mjs
 *
 * 14 tabs:
 *  1. Cover
 *  2. Command Dashboard (auto-populates, no data entry)
 *  3. Incident Intake (master record — feeds all other tabs)
 *  4. Investigation Notes (structured per-case notes log)
 *  5. Evidence Tracker (chain of custody)
 *  6. Parent Contact Log + Communication Scripts
 *  7. 10-Day Removal Compliance (SPED MDR alerts)
 *  8. Investigation Pipeline (intake → close, stage tracker)
 *  9. Appeal Tracker (campus → supt → board → TEA)
 * 10. Discipline Trends (auto-summary from Intake)
 * 11. Threat Assessment Log (HB 3 required)
 * 12. SCOC Quick Reference (TEC offense lookup)
 * 13. ↑ Upgrade to Waypoint
 * 14. Lists (dropdown sources)
 */

import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const OFFENSE_CATEGORIES = [
  'Fighting / Mutual Combat',
  'Assault — Bodily Injury',
  'Assault — Serious Bodily Injury',
  'Drugs / Alcohol — Possession',
  'Drugs / Alcohol — Distribution',
  'Weapons — Prohibited (non-firearm)',
  'Weapons — Firearm / Explosive',
  'Harassment / Bullying (In-Person)',
  'Cyberbullying',
  'Threats / Terroristic Threat',
  'Truancy / Chronic Absence',
  'Defiance / Insubordination',
  'Theft / Robbery',
  'Vandalism / Criminal Mischief',
  'Sexual Misconduct',
  'Gang-Related Activity',
  'Technology / Device Misuse',
  'Other — See Notes',
]

const TEC_REFS = [
  'TEC §37.002 — Teacher Removal',
  'TEC §37.005 — Suspension (up to 3 days)',
  'TEC §37.006 — Mandatory DAEP Removal',
  'TEC §37.007 — Mandatory Expulsion',
  'TEC §37.008 — DAEP Standards',
  'TEC §37.0081 — Student Charged with Felony',
  'TEC §37.009 — Conference / Due Process',
  'TEC §37.010 — JJAEP Placement',
  'TEC §37.013 — Parental Notification',
  'TEC §37.020 — PEIMS Reporting',
  'Penal Code §22.07 — Terroristic Threat',
  'Other / See Notes',
]

const LOCATIONS = [
  'Classroom', 'Hallway', 'Cafeteria', 'Gymnasium / PE',
  'Restroom', 'Parking Lot', 'School Bus',
  'Before/After School Program', 'Off Campus — School Event',
  'Off Campus — Non-School Event', 'Online / Social Media', 'Other',
]

const CASE_STATUS = [
  'Intake Filed',
  'Investigation Open',
  'Conference Pending',
  'Decision Pending',
  'Disposition Made',
  'Appeal Filed',
  'Closed — No Action',
  'Closed — Resolved',
]

const NOTE_TYPES = [
  'Timeline Entry',
  'Student Statement',
  'Witness Statement',
  'Staff Statement',
  'Evidence Note',
  'Admin Observation',
  'Parent Communication Note',
  'Preliminary Finding',
  'Final Finding',
  'Legal Note',
  'Other',
]

const EVIDENCE_TYPES = [
  'Written Statement',
  'Video Recording',
  'Photo',
  'Social Media Screenshot',
  'Audio Recording',
  'Physical Item',
  'Electronic Device / Data',
  'Document / Report',
  'Other',
]

const CONTACT_METHODS = [
  'Phone Call', 'Email', 'In-Person Meeting',
  'Certified Mail', 'Text Message', 'School Messenger / ParentSquare',
]

const THREAT_TYPES = [
  'Verbal — Direct',
  'Verbal — Overheard',
  'Written / Note',
  'Social Media / Online Post',
  'Physical Gesture',
  'Combination',
]

const THREAT_LEVELS = [
  'Level 1 — Low (ideation, no plan)',
  'Level 2 — Medium (some specificity)',
  'Level 3 — High (plan, means, or intent identified)',
  'Level 4 — Severe / Imminent (act appears impending)',
]

const THREAT_STATUS = [
  'Open', 'Monitoring', 'Escalated to Law Enforcement',
  'Closed — No Threat Found', 'Closed — Resolved',
]

const DISPOSITIONS = [
  'Warning — No Removal',
  'Suspension — 1 Day',
  'Suspension — 2 Days',
  'Suspension — 3 Days',
  'Discretionary DAEP — 30 Days',
  'Discretionary DAEP — 45 Days',
  'Discretionary DAEP — 60 Days',
  'Discretionary DAEP — 90 Days',
  'Mandatory DAEP',
  'JJAEP Referral',
  'Mandatory Expulsion Recommended',
  'Other — See Notes',
]

const APPEAL_OUTCOMES = [
  'Upheld — Original Decision Stands',
  'Reduced — Consequence Lessened',
  'Overturned',
  'Remanded for Further Review',
  'Withdrawn by Family',
  'Pending',
]

const GRADES = [
  'Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade',
  '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
]

const STAFF_ROLES = [
  'Principal', 'Assistant Principal', 'Counselor',
  'SPED Coordinator', 'Teacher', 'Campus Behavior Coordinator',
  'Student Support Specialist', '504 Coordinator',
  'Director of Student Affairs', 'SRO', 'Other',
]

const REMOVAL_TYPES = [
  'Mandatory — TEC §37.006 DAEP',
  'Mandatory — TEC §37.007 Expulsion',
  'Discretionary DAEP',
  'Suspension (up to 3 days)',
  'No Removal',
]

const YES_NO     = ['Yes', 'No']
const YES_NO_NA  = ['Yes', 'No', 'N/A']
const STAGES     = [
  'Intake Only', 'Investigation Open', 'Student Conference',
  'Parent Conference', 'Evidence Review', 'Preliminary Decision',
  'Decision Made', 'Appeal Filed', 'Closed',
]

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const R  = (r, c) => XLSX.utils.encode_cell({ r, c })
const sv = v      => ({ v, t: 's' })
const nv = v      => ({ v, t: 'n' })
const fv = f      => ({ f, t: 'n' })
const fs = f      => ({ f, t: 's' })

function setStr(ws, r, c, val)   { ws[R(r, c)] = sv(val) }
function setCell(ws, r, c, cell) { ws[R(r, c)] = cell }
function setRange(ws, rows, cols) {
  ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rows - 1, c: cols - 1 })
}
function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wpx: w }))
}
function merge(ws, ref) {
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push(XLSX.utils.decode_range(ref))
}
function fillFormulas(ws, colIdx, startRow, endRow, fn) {
  for (let r = startRow; r <= endRow; r++) ws[R(r, colIdx)] = fn(r + 1)
}
function excelDate(str) {
  return Math.round(new Date(str + 'T12:00:00Z').getTime() / 86400000 + 25569)
}

// ─────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new()

// ═════════════════════════════════════════════════════════════
// TAB 1 — COVER
// ═════════════════════════════════════════════════════════════
function buildCover() {
  const ws = {}

  setStr(ws, 0, 0, 'Campus Administrator\'s Discipline Command Center — Texas Edition')
  setStr(ws, 1, 0, 'Incident Intake · Investigation Workflow · Evidence Tracking · Parent Contact Scripts · Compliance Alerts · Trends · Threat Assessment')
  setStr(ws, 2, 0, 'Clear Path Education Group, LLC  |  Built for Texas campus administrators and assistant principals.')
  setStr(ws, 3, 0, 'From the first report to final disposition — everything documented, nothing missed. One file. Zero spreadsheet double-work.')
  merge(ws, 'A1:L1') ; merge(ws, 'A2:L2') ; merge(ws, 'A3:L3') ; merge(ws, 'A4:L4')

  setStr(ws, 5, 0, '─── YOUR CAMPUS INFORMATION ───────────────────────────────────────')
  merge(ws, 'A6:L6')
  setStr(ws, 6, 0, 'Campus Name:')     ; setStr(ws, 6, 2, '')
  setStr(ws, 7, 0, 'District:')        ; setStr(ws, 7, 2, '')
  setStr(ws, 8, 0, 'School Year:')     ; setStr(ws, 8, 2, '2025–26')
  setStr(ws, 9, 0, 'Principal:')       ; setStr(ws, 9, 2, '')
  setStr(ws, 10, 0, 'AP / CBC:')       ; setStr(ws, 10, 2, '')
  setStr(ws, 11, 0, 'Date Updated:')   ; setStr(ws, 11, 2, '')

  setStr(ws, 13, 0, '─── WHAT THIS SOLVES THAT YOUR SIS DOESN\'T ───────────────────────')
  merge(ws, 'A14:L14')
  const problems = [
    '❌  BEFORE: Incident notes scattered across Word docs, emails, and yellow pads.',
    '✅  AFTER:  Every investigation documented in one structured file — ready for a board hearing or TEA audit.',
    '',
    '❌  BEFORE: 10-day removal clock tracked by memory. SPED MDR requirements missed.',
    '✅  AFTER:  Automatic countdown from removal date. MDR deadline auto-flagged for every SPED student.',
    '',
    '❌  BEFORE: Parent call notes nowhere to be found when an appeal is filed 60 days later.',
    '✅  AFTER:  Every contact logged with date, method, outcome, follow-up status — and scripts for every scenario.',
    '',
    '❌  BEFORE: 8 open investigations. No visibility into which are stalled or overdue.',
    '✅  AFTER:  Command Dashboard shows every case, its stage, and what needs action today.',
    '',
    '❌  BEFORE: HB 3 threat assessment log = a Word doc nobody can find.',
    '✅  AFTER:  Structured log with threat level, response actions, and return-to-campus conditions — all in one place.',
    '',
    '❌  BEFORE: New AP inherits 12 open cases and has no idea what happened.',
    '✅  AFTER:  Complete investigation trail from incident to resolution, fully handed over.',
  ]
  problems.forEach((p, i) => {
    setStr(ws, 14 + i, 0, p)
    merge(ws, `A${15 + i}:L${15 + i}`)
  })

  setStr(ws, 30, 0, '─── HOW TO USE ────────────────────────────────────────────────────')
  merge(ws, 'A31:L31')
  const steps = [
    '1.  INCIDENT INTAKE — One row per incident. Assign a Case ID (ADM-001, ADM-002…). This tab feeds everything else. Start here.',
    '2.  COMMAND DASHBOARD — Open every morning. All metrics and alerts auto-update. No data entry required here.',
    '3.  INVESTIGATION NOTES — Log every note, statement, and observation. Reference the Case ID from Intake.',
    '4.  EVIDENCE TRACKER — One row per evidence item. Chain of custody, storage location, transfers — legally critical.',
    '5.  PARENT CONTACT LOG — Log every call and contact. Scripts for 12 difficult scenarios are at the bottom of this tab.',
    '6.  10-DAY COMPLIANCE — Enter a Case ID for any case with a removal. Removal date auto-fills. Track due process per case.',
    '7.  INVESTIGATION PIPELINE — Tracks each case stage from intake to close. Stalled cases highlight automatically.',
    '8.  APPEAL TRACKER — Campus → Superintendent → Board level. TEA/OCR complaint flags. Legal counsel flag.',
    '9.  DISCIPLINE TRENDS — Auto-calculated from Intake. Monthly counts, offense breakdown, grade, location. No re-entry.',
    '10. THREAT ASSESSMENT — Separate log for HB 3 threat assessments. Required by Texas law — most campuses have nothing.',
    '11. SCOC REFERENCE — TEC offense-to-consequence lookup table. Mandatory vs. discretionary at a glance.',
    '12. Cells marked with ⚙ in the header are auto-calculated formulas. Do NOT type over them.',
    '13. Works in Google Sheets and Microsoft Excel.',
    '14. For full automation — automated alerts, role-based access, Laserfiche sync, and district-wide visibility — see the Upgrade tab.',
  ]
  steps.forEach((s, i) => {
    setStr(ws, 31 + i, 0, s)
    merge(ws, `A${32 + i}:L${32 + i}`)
  })

  setStr(ws, 47, 0, '⚠ LEGAL NOTICE: This toolkit is for organizational and documentation purposes only — not legal advice. Consult your district\'s legal counsel for specific disciplinary determinations. TEC references are for general guidance only.')
  merge(ws, 'A48:L48')
  setStr(ws, 48, 0, '© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  support@clearpatheg.com')
  merge(ws, 'A49:L49')

  setRange(ws, 50, 12)
  setColWidths(ws, [220,180,180,120,120,120,120,120,120,120,120,120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 2 — COMMAND DASHBOARD
// Incident Intake column map (1-indexed for VLOOKUP):
//   1=CaseID  2=Date  3=Time  4=Campus  5=Location
//   6=LastName  7=FirstName  8=Grade  9=SPED  10=504
//   11=ReportingStaff  12=StaffRole  13=OffenseCategory  14=TECRef
//   15=Description  16=MandatoryRemoval  17=RemovalDate
//   18=CaseStatus  19=AssignedTo  20=WitnessCount  21=EvidenceCollected  22=Notes
// ═════════════════════════════════════════════════════════════
function buildCommandDashboard() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, '🎯 COMMAND DASHBOARD — Morning Briefing View')
  setCell(ws, r, 0, fs(`"Auto-updated as of: "&TEXT(TODAY(),"MMMM D, YYYY")`))
  merge(ws, 'A2:L2')
  r++
  setStr(ws, r++, 0, 'All data auto-populates from your other tabs. This tab requires NO data entry. Open here every morning.')
  r++

  // ── KEY METRICS ──
  setStr(ws, r++, 0, '📊 KEY METRICS')
  const metricHdr = ['Metric', 'Count', 'Notes']
  metricHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++

  const metrics = [
    ['Open Investigations',
      fv(`SUMPRODUCT(('Incident Intake'!$A$3:$A$502<>"")*('Incident Intake'!$R$3:$R$502<>"Closed — No Action")*('Incident Intake'!$R$3:$R$502<>"Closed — Resolved"))`),
      'Cases that are not yet closed'],
    ['Cases Requiring Action Today',
      fv(`SUMPRODUCT(('10-Day Compliance'!$A$3:$A$202<>"")*('10-Day Compliance'!$G$3:$G$202<>"")*('10-Day Compliance'!$G$3:$G$202<=TODAY())*('10-Day Compliance'!$Q$3:$Q$202=""))`),
      '← Day 10 deadline reached, no final disposition entered yet'],
    ['SPED Students in Open Cases',
      fv(`SUMPRODUCT(('Incident Intake'!$A$3:$A$502<>"")*('Incident Intake'!$I$3:$I$502="Yes")*('Incident Intake'!$R$3:$R$502<>"Closed — No Action")*('Incident Intake'!$R$3:$R$502<>"Closed — Resolved"))`),
      '← Each requires MDR within 10 school days of removal'],
    ['Parent Follow-Ups Overdue',
      fv(`SUMPRODUCT(('Parent Contact Log'!$N$3:$N$502<>"")*('Parent Contact Log'!$N$3:$N$502<TODAY()))`),
      '← Follow-up date passed with no new contact entry logged'],
    ['Active Appeals',
      fv(`SUMPRODUCT(('Appeal Tracker'!$B$3:$B$202<>"")*('Appeal Tracker'!$P$3:$P$202<>"Upheld — Original Decision Stands")*('Appeal Tracker'!$P$3:$P$202<>"Overturned")*('Appeal Tracker'!$P$3:$P$202<>"Withdrawn by Family"))`),
      'Appeals still in progress at any level'],
    ['Open Threat Assessments',
      fv(`COUNTIF('Threat Assessment'!$S:$S,"Open")+COUNTIF('Threat Assessment'!$S:$S,"Monitoring")+COUNTIF('Threat Assessment'!$S:$S,"Escalated to Law Enforcement")`),
      '← HB 3 threat assessment required. See Threat Assessment tab.'],
    ['Mandatory Removals (YTD)',
      fv(`COUNTIF('Incident Intake'!$P:$P,"Mandatory*")`),
      'Cases where mandatory DAEP or expulsion was initiated'],
    ['Total Incidents (YTD)',
      fv(`MAX(0,COUNTA('Incident Intake'!$A:$A)-2)`),
      'All incidents logged in Incident Intake'],
  ]

  metrics.forEach(([label, formula, note], i) => {
    setStr(ws, r + i, 0, label)
    ws[R(r + i, 1)] = formula
    setStr(ws, r + i, 2, note)
  })
  r += metrics.length
  r++

  // ── COMPLIANCE URGENCY LIST ──
  setStr(ws, r++, 0, '⏰ COMPLIANCE ALERTS — Cases With Imminent Deadlines')
  setStr(ws, r++, 0, 'Check the 10-Day Compliance tab for full details on each flagged case.')
  const cHdr = ['Case ID','Student','Grade','Removal Date','Day Count ⚙','Day 10 Deadline ⚙','Status ⚙','SPED? ⚙','MDR Required? ⚙']
  cHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 15; i++) {
    const tr = i + 3
    setCell(ws, r + i, 0, fs(`'10-Day Compliance'!A${tr}`))
    setCell(ws, r + i, 1, fs(`'10-Day Compliance'!B${tr}`))
    setCell(ws, r + i, 2, fs(`'10-Day Compliance'!C${tr}`))
    setCell(ws, r + i, 3, fv(`IF('10-Day Compliance'!F${tr}="","",IF('10-Day Compliance'!F${tr}<>"",TEXT('10-Day Compliance'!F${tr},"MM/DD/YY"),""))`))
    setCell(ws, r + i, 4, fv(`'10-Day Compliance'!E${tr}`))
    setCell(ws, r + i, 5, fv(`IF('10-Day Compliance'!G${tr}="","",TEXT('10-Day Compliance'!G${tr},"MM/DD/YY"))`))
    setCell(ws, r + i, 6, fs(`'10-Day Compliance'!H${tr}`))
    setCell(ws, r + i, 7, fs(`'10-Day Compliance'!D${tr}`))
    setCell(ws, r + i, 8, fs(`'10-Day Compliance'!O${tr}`))
  }
  r += 15
  r++

  // ── ALL ACTIVE CASES ──
  setStr(ws, r++, 0, '📋 ALL CASES — First 30 Entries (Use Filters to Sort by Status, Days Open, etc.)')
  const caseHdr = ['Case ID','Date','Student','Grade','Offense','Status','Days Open ⚙','SPED?','Assigned To','Action Needed ⚙']
  caseHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 30; i++) {
    const ir = i + 3
    setCell(ws, r + i, 0, fs(`'Incident Intake'!A${ir}`))
    setCell(ws, r + i, 1, fv(`IF('Incident Intake'!A${ir}="","",IF('Incident Intake'!B${ir}<>"",'Incident Intake'!B${ir},""))`))
    setCell(ws, r + i, 2, fs(`IF('Incident Intake'!A${ir}="","",IF('Incident Intake'!F${ir}<>"",'Incident Intake'!F${ir}&", "&'Incident Intake'!G${ir},""))`))
    setCell(ws, r + i, 3, fs(`'Incident Intake'!H${ir}`))
    setCell(ws, r + i, 4, fs(`'Incident Intake'!M${ir}`))
    setCell(ws, r + i, 5, fs(`'Incident Intake'!R${ir}`))
    setCell(ws, r + i, 6, fs(`IF('Incident Intake'!A${ir}="","",IF(OR('Incident Intake'!R${ir}="Closed — No Action",'Incident Intake'!R${ir}="Closed — Resolved"),"✅ Closed",IF('Incident Intake'!B${ir}="","",TEXT(TODAY()-'Incident Intake'!B${ir},"0")&" days")))`))
    setCell(ws, r + i, 7, fs(`'Incident Intake'!I${ir}`))
    setCell(ws, r + i, 8, fs(`'Incident Intake'!S${ir}`))
    setCell(ws, r + i, 9, fs(`IF('Incident Intake'!A${ir}="","",IF(OR('Incident Intake'!R${ir}="Closed — No Action",'Incident Intake'!R${ir}="Closed — Resolved"),"—",IF(AND('Incident Intake'!I${ir}="Yes",'Incident Intake'!P${ir}="Mandatory — TEC §37.006 DAEP"),"⚠ MDR Required",IF(OR('Incident Intake'!R${ir}="Intake Filed",'Incident Intake'!R${ir}="Conference Pending"),"📋 Action pending",IF(TODAY()-'Incident Intake'!B${ir}>10,"⚠ Review case age","✔ In progress")))))`))
  }
  r += 30
  r++

  setStr(ws, r, 0, '─── Waypoint automates all of this — real-time alerts, role-based access, Laserfiche sync. clearpatheg.com/waypoint | Clear Path Education Group, LLC ───')
  merge(ws, `A${r+1}:L${r+1}`)

  setRange(ws, r + 2, 12)
  setColWidths(ws, [110,90,160,80,180,140,80,60,130,170])
  ws['!freeze'] = { ySplit: 1, xSplit: 0 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 3 — INCIDENT INTAKE
// Master record. Columns A–V (22 cols), data starts row 3 (index 2)
// ═════════════════════════════════════════════════════════════
function buildIncidentIntake() {
  const ws = {}
  const END = 302

  setStr(ws, 0, 0, 'INCIDENT INTAKE — One Row Per Incident  |  Assign a Case ID (e.g. ADM-001). This tab feeds ALL other tabs.')
  merge(ws, 'A1:V1')
  setStr(ws, 1, 0, '⚠ Every incident should be logged here first — this is the master record. Case ID must be unique. SPED = Yes triggers mandatory MDR review in the 10-Day Compliance tab.')
  merge(ws, 'A2:V2')

  const headers = [
    'Case ID',          // A  0
    'Incident Date',    // B  1
    'Time',             // C  2
    'Campus',           // D  3
    'Location',         // E  4
    'Student Last',     // F  5
    'Student First',    // G  6
    'Grade',            // H  7
    'SPED?',            // I  8
    '504?',             // J  9
    'Reporting Staff',  // K  10
    'Staff Role',       // L  11
    'Offense Category', // M  12
    'TEC Reference',    // N  13
    'Description',      // O  14
    'Mandatory Removal?', // P 15
    'Removal Date',     // Q  16
    'Case Status',      // R  17
    'Assigned To (Admin)', // S 18
    'Witness Count',    // T  19
    'Evidence Collected?', // U 20
    'Notes',            // V  21
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Days open formula — not in headers (formula col)
  // Note: auto-calc for case age lives on Dashboard

  setRange(ws, END, 22)
  setColWidths(ws, [90,100,70,130,130,110,110,90,60,60,140,130,180,200,240,130,110,140,140,80,120,220])
  ws['!freeze'] = { ySplit: 3, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 4 — INVESTIGATION NOTES
// ═════════════════════════════════════════════════════════════
function buildInvestigationNotes() {
  const ws = {}
  const END = 302

  setStr(ws, 0, 0, 'INVESTIGATION NOTES — One Row Per Note Entry  |  Reference Case ID from Incident Intake')
  merge(ws, 'A1:L1')
  setStr(ws, 1, 0, '⚠ Log every statement, observation, and finding here. These notes — with dates, times, and names — are what hold up in a board hearing, TEA complaint, or lawsuit. Be specific, factual, and timestamped.')
  merge(ws, 'A2:L2')
  setStr(ws, 2, 0, '⚠ KEY RULE: Separate facts from interpretations. Write what you OBSERVED or were told — not your conclusions. Save conclusions for "Preliminary Finding" and "Final Finding" note types.')
  merge(ws, 'A3:L3')

  const headers = [
    'Case ID',           // A  0
    'Entry Date',        // B  1
    'Entry Time',        // C  2
    'Note Type',         // D  3
    'Person (Name)',     // E  4
    'Role / Relationship', // F 5
    'Statement / Notes', // G  6   ← widest column
    'Verified?',         // H  7
    'Verified By',       // I  8
    'Date Verified',     // J  9
    'Attachments?',      // K  10
    'Logged By (Admin)', // L  11
  ]
  headers.forEach((h, c) => setStr(ws, 3, c, h))

  // Auto-fill offense description from Intake for reference
  fillFormulas(ws, 6, 4, END - 1, r =>
    fs(`IF(A${r}="","",IF(G${r}<>"",G${r},IFERROR("[Offense: "&VLOOKUP(A${r},'Incident Intake'!$A:$M,13,FALSE)&" — "&TEXT(VLOOKUP(A${r},'Incident Intake'!$A:$B,2,FALSE),"MM/DD/YY")&"]","Enter notes here")))`)
  )

  setRange(ws, END, 12)
  setColWidths(ws, [90,100,70,150,150,150,360,80,130,100,100,130])
  ws['!freeze'] = { ySplit: 4, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 5 — EVIDENCE TRACKER
// ═════════════════════════════════════════════════════════════
function buildEvidenceTracker() {
  const ws = {}
  const END = 202

  setStr(ws, 0, 0, 'EVIDENCE TRACKER — Chain of Custody Log  |  One Row Per Evidence Item')
  merge(ws, 'A1:N1')
  setStr(ws, 1, 0, '⚠ Chain of custody documentation is legally critical. Every item collected must be logged here — even if no action is taken. If evidence is transferred or released, that transfer must be recorded.')
  merge(ws, 'A2:N2')

  const headers = [
    'Evidence ID',      // A  0
    'Case ID',          // B  1
    'Date Collected',   // C  2
    'Time Collected',   // D  3
    'Collected By',     // E  4
    'Description',      // F  5
    'Type',             // G  6
    'Storage Location', // H  7
    'Digital Copy Made?', // I 8
    'File Name / Path', // J  9
    'Transferred To',   // K  10
    'Transfer Date',    // L  11
    'Legal Hold?',      // M  12
    'Notes',            // N  13
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Cross-reference: auto-pull offense from Intake
  fillFormulas(ws, 13, 3, END - 1, r =>
    fs(`IF(B${r}="","",IF(N${r}<>"",N${r},IFERROR("[Linked to: "&VLOOKUP(B${r},'Incident Intake'!$A:$M,13,FALSE)&"]","")))`)
  )

  setRange(ws, END, 14)
  setColWidths(ws, [90,90,110,80,140,220,160,180,110,200,150,110,90,200])
  ws['!freeze'] = { ySplit: 3, xSplit: 2 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 6 — PARENT CONTACT LOG + COMMUNICATION SCRIPTS
// ═════════════════════════════════════════════════════════════
function buildParentContactLog() {
  const ws = {}
  const DATA_END = 202

  setStr(ws, 0, 0, 'PARENT CONTACT LOG — Every Call, Email, and In-Person Contact  |  See COMMUNICATION SCRIPTS below row 205')
  merge(ws, 'A1:P1')
  setStr(ws, 1, 0, '⚠ Documentation of every parent contact attempt is required under TEC §37.009(a) and your district\'s local Board policy (typically TASB-model FO/FOC) — and is your primary defense in any appeal. Log EVERY attempt — even voicemails and unanswered calls. Note what was said and what follow-up was promised.')
  merge(ws, 'A2:P2')

  const headers = [
    'Contact ID',           // A  0
    'Case ID',              // B  1
    'Student Name',         // C  2
    'Parent / Guardian',    // D  3
    'Relationship',         // E  4
    'Phone / Email',        // F  5
    'Contact Method',       // G  6
    'Date',                 // H  7
    'Time',                 // I  8
    'Attempt #',            // J  9
    'Successful?',          // K  10
    'Summary of Communication', // L 11
    'Rights Explained?',    // M  12
    'Follow-Up Required?',  // N  13
    'Follow-Up Date',       // O  14
    'Logged By (Admin)',    // P  15
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-pull student name from Intake
  fillFormulas(ws, 2, 3, DATA_END - 1, r =>
    fs(`IF(B${r}="","",IF(C${r}<>"",C${r},IFERROR(VLOOKUP(B${r},'Incident Intake'!$A:$G,6,FALSE)&", "&VLOOKUP(B${r},'Incident Intake'!$A:$G,7,FALSE),"Enter student name")))`)
  )
  // Attempt # auto-count
  fillFormulas(ws, 9, 3, DATA_END - 1, r =>
    fv(`IF(B${r}="","",COUNTIF(B$3:B${r},B${r}))`)
  )

  // ── COMMUNICATION SCRIPTS ── (starts at row 204 = index 203)
  let sr = DATA_END + 2

  setStr(ws, sr++, 0, '══════════════════════════════════════════════════════════════════════════════════════════════════════════')
  setStr(ws, sr++, 0, '📞 COMMUNICATION SCRIPTS FOR CAMPUS ADMINISTRATORS — Texas Edition')
  setStr(ws, sr++, 0, 'Clear Path Education Group, LLC  |  For organizational use only — not legal advice.')
  setStr(ws, sr++, 0, 'Adapt each script to your campus voice. Always log the call in the Parent Contact Log above.')
  setStr(ws, sr++, 0, '══════════════════════════════════════════════════════════════════════════════════════════════════════════')
  sr++

  const scripts = [
    {
      title: 'SCRIPT 1 — Initial Removal Notification Call',
      context: 'Use within 24 hours of a mandatory or discretionary removal. Required under TEC §37.013.',
      lines: [
        'OPENING:  "Hello, is this [Parent Name]? This is [Your Name], [Your Title] at [Campus]. I\'m calling about [Student Name]."',
        'NOTICE:   "I want to let you know that [Student] was involved in an incident today that requires us to place them in [DAEP / alternative placement] beginning [Date]."',
        'DETAILS:  "The incident involved [brief factual description]. This placement is [mandatory under TEC §37.006 / discretionary based on our SCOC]."',
        'DURATION: "The placement is for [X] days and is set to end on [Date], barring any extensions."',
        'RIGHTS:   "You have the right to a conference with [Principal/AP] before the placement begins. Would you like to request one?"',
        'NEXT:     "You\'ll receive a written notice within [1 business day / per district policy]. Please call me at [number] if you have any questions."',
        'CLOSE:    "I know this is difficult news. Our goal is [Student\'s] success and safety. We\'re here to support you through this process."',
        'LOG:       Document: date, time, who answered, what was communicated, and any requests made.',
      ],
    },
    {
      title: 'SCRIPT 2 — Parent Refuses to Acknowledge / Hostile Response',
      context: 'Use when a parent denies the incident occurred, refuses to discuss, or becomes verbally aggressive.',
      lines: [
        'ACKNOWLEDGE: "I understand you\'re upset, and I want to hear your concerns."',
        'PAUSE:       Let them speak without interruption. Do not argue with facts in this call.',
        'REDIRECT:    "I want to make sure [Student] is treated fairly. The best way to address your concerns is at a formal conference."',
        'OFFER:       "I\'d like to schedule a meeting so you can review the information we have and share yours. Can we meet [date/time]?"',
        'IF STILL HOSTILE: "I\'m going to need to end this call, but I want you to know your rights and the conference option remain open."',
        'LOG:         Document exact language used, tone, refusal, and any threats or statements made by parent.',
        'FOLLOW UP:   Send written notification of conference rights same day — by email AND certified mail.',
      ],
    },
    {
      title: 'SCRIPT 3 — Mandatory Expulsion Notification',
      context: 'Use for TEC §37.007 mandatory expulsion offenses. Legal and board hearing rights must be explained.',
      lines: [
        'OPENING:  "Hello, this is [Name] at [Campus]. I\'m calling about a very serious matter involving [Student]."',
        'NOTICE:   "Based on today\'s incident involving [offense — keep factual, not detailed], district policy and Texas law require us to recommend expulsion."',
        'RIGHTS:   "You have the right to a conference before any formal expulsion action. You also have the right to be heard before the school board."',
        'TIMELINE: "A formal notice with hearing date and your rights will be sent to you within [district timeframe]. Do I have your correct mailing address?"',
        'LEGAL:    "You have the right to have an attorney present at the board hearing if you choose."',
        'CAUTION:  Do NOT discuss evidence details, other students, or staff actions on this call. Limit to rights and timeline.',
        'LOG:       Document time, what was communicated, parent\'s response, and whether written notice was sent.',
      ],
    },
    {
      title: 'SCRIPT 4 — SPED Parent: Mandatory MDR Notice',
      context: 'Use when a student with an IEP or 504 is being considered for removal. MDR must be held within 10 school days.',
      lines: [
        'OPENING:  "Hello, this is [Name] calling about [Student]. This call is regarding both a disciplinary matter and [Student\'s] special education rights."',
        'INCIDENT: "[Student] was involved in [brief description] today. We are considering a placement change."',
        'RIGHTS:   "Because [Student] receives special education services, we are required to hold a Manifestation Determination Review — called an MDR — before or within 10 school days of any removal."',
        'EXPLAIN:  "The MDR is a meeting where our ARD committee will review whether the behavior was a manifestation of [Student\'s] disability. You are an essential member of that team."',
        'SCHEDULE: "I\'d like to schedule that meeting now. Our deadline is [Date]. Can you attend on [proposed date]?"',
        'RIGHTS:   "You\'ll receive a Prior Written Notice and meeting invitation in writing within [district policy timeframe]."',
        'LOG:       Document that MDR rights were explained, meeting offered, and date/time of call.',
      ],
    },
    {
      title: 'SCRIPT 5 — Victim Family Notification',
      context: 'Use when contacting the family of a student who was harmed. FERPA limits what you can share about the other student.',
      lines: [
        'OPENING:  "Hello, this is [Name] from [Campus]. I\'m calling about an incident involving [Student] that happened today."',
        'FACTS:    "I want you to know that [Student] was involved in a [type of incident] at school today. We took immediate action."',
        'FERPA:    "I\'m not able to share information about other students involved, but I can tell you what action was taken on your student\'s behalf."',
        'SAFETY:   "We have [describe safety measures — separation, campus security, etc.] in place."',
        'SUPPORT:  "We have counseling available for [Student]. Would you like us to connect them with a counselor? Is there anything you need right now?"',
        'FOLLOW:   "I will follow up with you [tomorrow / this week] to check in. My direct number is [number]."',
        'LOG:      Document what was shared (not shared), parent\'s response, and any support requests made.',
      ],
    },
    {
      title: 'SCRIPT 6 — Witness Parent: What You Can / Cannot Share (FERPA)',
      context: 'Use when a parent of a witness asks what is happening with the other student.',
      lines: [
        '"I understand you want to know the outcome of the investigation. I take that seriously."',
        '"Under the Family Educational Rights and Privacy Act (FERPA), I am not able to share disciplinary actions taken against other students — even to families directly involved."',
        '"What I can tell you is that the matter was thoroughly investigated and appropriate action was taken."',
        '"If you have ongoing safety concerns about your own child, I want to hear those and address them directly."',
        'Do NOT: confirm or deny what discipline was given, mention the other student by name, or share any details from the investigation.',
        'LOG:     Document that FERPA was cited, what was/was not shared, and parent\'s response.',
      ],
    },
    {
      title: 'SCRIPT 7 — Conference Rights Explanation (Any Removal)',
      context: 'Use when explaining conference rights before a placement begins. Required under TEC §37.009.',
      lines: [
        '"Before [Student\'s] placement begins, you have the right to an informal conference with me."',
        '"At this conference, you can hear the basis for the placement, share any information you believe is relevant, and ask questions."',
        '"This conference does not change the legal requirement for the placement, but it is your right, and I encourage you to use it."',
        '"The conference must happen before the placement begins, so timing matters. Can we meet today or tomorrow?"',
        '"If you choose not to attend, I\'ll need to document that you were offered a conference and declined."',
        'LOG:     Document whether conference was offered, accepted, declined, or scheduled.',
      ],
    },
    {
      title: 'SCRIPT 8 — Appeal Rights Explanation (Post-Disposition)',
      context: 'Use when informing a parent of their right to appeal a placement decision.',
      lines: [
        '"You have the right to appeal this placement decision. I want to make sure you understand that right."',
        '"The first level of appeal is a conference with [Principal / designated campus level reviewer]."',
        '"If you\'re not satisfied with that outcome, you may appeal to the Superintendent\'s office."',
        '"If that appeal is also unsuccessful, you have the right to a hearing before the school board."',
        '"Your written notice will include the timeline for filing an appeal. Deadlines matter — late filings may not be accepted."',
        '"Do you have any questions about the process right now?"',
        'LOG:     Document that appeal rights were verbally explained and that written notice was provided.',
      ],
    },
    {
      title: 'SCRIPT 9 — Return-to-Campus Conditions',
      context: 'Use when communicating the terms under which a student will return from DAEP or suspension.',
      lines: [
        '"I want to talk with you about [Student\'s] return to campus on [Date]."',
        '"We want this return to be successful. There are a few conditions in place to support that."',
        '"[List specific conditions: schedule change, no contact with specific students, check-in with counselor, etc.]"',
        '"These conditions are not punitive — they\'re designed to set [Student] up for success back in the regular school environment."',
        '"If any of these conditions create a hardship, please contact me and we\'ll work through it."',
        '"I\'ll also be following up with [Student] in the first week back. You\'ll hear from me directly."',
        'LOG:     Document the conditions communicated, parent\'s acknowledgment, and any concerns raised.',
      ],
    },
    {
      title: 'SCRIPT 10 — Law Enforcement Is Involved: What to Say',
      context: 'Use when SRO has made an arrest or law enforcement is involved in the investigation.',
      lines: [
        '"I\'m calling because the incident today also involved law enforcement."',
        '"An officer from [Agency] was contacted and [describe what happened — arrest, report filed, referred, etc.]."',
        '"I want to be transparent with you about what we know. The school\'s discipline process and the law enforcement process are separate."',
        '"What we do on the school side is governed by our SCOC and TEC. What happens in the legal system is outside our control."',
        '"If [Student] was taken into custody, you\'ll need to contact [Agency] directly for further information."',
        'Do NOT: provide legal advice, speculate on charges, or promise outcomes.',
        'LOG:    Document what law enforcement action occurred, what was shared with parent, and parent\'s response.',
      ],
    },
    {
      title: 'SCRIPT 11 — Threat Assessment: Parent of Student Making Threat',
      context: 'Use when notifying the parent of a student who made a threat.',
      lines: [
        '"This is a serious call. [Student] made a [written/verbal/online] statement today that was reported to me as a possible threat."',
        '"We are required by Texas law to conduct a formal Threat Assessment. That process has already been initiated."',
        '"[Student] is safe and currently with [staff member] while we complete this review."',
        '"I need to meet with you in person — today if possible. This is not optional."',
        '"Until the assessment is complete, [Student] will remain [on campus with supervision / at home pending outcome]."',
        '"I know this is alarming. My goal is [Student\'s] safety and the safety of everyone on this campus."',
        'LOG:    Document time, parent\'s response, whether they came in, and outcome of in-person meeting.',
      ],
    },
    {
      title: 'SCRIPT 12 — De-escalation: Highly Hostile Parent',
      context: 'Use when a parent is screaming, threatening, or making the conversation impossible.',
      lines: [
        'STEP 1 — Lower your voice:  Respond with calm, measured tone. Do not match their volume.',
        'STEP 2 — Name the dynamic:  "I want to help you, and I\'m finding it difficult to do that right now with the level of this conversation."',
        'STEP 3 — Offer a reset:     "Can we take a breath and start over? I want you to have all the information you deserve."',
        'STEP 4 — Set a limit:       "If this continues, I\'m going to need to end the call and follow up in writing."',
        'STEP 5 — End if necessary:  "I\'m going to end this call now. I\'ll send you a written summary and information about next steps."',
        'AFTER:   Document everything verbatim if possible. Notify your principal immediately.',
        'NEVER:   Argue about facts, make threats, or raise your voice. Anything said in anger becomes evidence in an appeal.',
      ],
    },
  ]

  scripts.forEach(({ title, context, lines }) => {
    setStr(ws, sr, 0, `━━━ ${title} ━━━`)
    merge(ws, `A${sr+1}:P${sr+1}`)
    sr++
    setStr(ws, sr++, 0, `Context: ${context}`)
    lines.forEach(line => {
      setStr(ws, sr++, 0, line)
    })
    sr++ // spacer
  })

  setRange(ws, sr + 1, 16)
  setColWidths(ws, [90,90,160,160,120,160,140,100,80,80,80,300,120,110,110,130])
  ws['!freeze'] = { ySplit: 3, xSplit: 2 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 7 — 10-DAY REMOVAL COMPLIANCE
// User enters Case ID. Everything else auto-fills from Intake.
// ═════════════════════════════════════════════════════════════
function buildTenDayCompliance() {
  const ws = {}
  const END = 102

  setStr(ws, 0, 0, '10-DAY REMOVAL COMPLIANCE — Due Process Tracker')
  merge(ws, 'A1:S1')
  setStr(ws, 1, 0, '⚠ ENTER CASE ID FOR EVERY CASE WITH A REMOVAL. Student info and removal date auto-fill from Incident Intake. Complete the due process checklist for each case. SPED students: MDR must be held within 10 SCHOOL days — no exceptions.')
  merge(ws, 'A2:S2')

  const headers = [
    'Case ID',                  // A  0
    'Student Name ⚙',           // B  1
    'Grade ⚙',                  // C  2
    'SPED? ⚙',                  // D  3
    'Calendar Days ⚙',          // E  4
    'Offense ⚙',                // F  5
    'Removal Date ⚙',           // G  6
    'Day 10 Deadline ⚙',        // H  7
    'Status ⚙',                 // I  8
    '☐ Notice Provided?',       // J  9
    '☐ Conference Offered?',    // K  10
    '☐ Conference Held?',       // L  11
    '☐ Parent Notified?',       // M  12
    '☐ Rights Explained?',      // N  13
    'MDR Required? ⚙',          // O  14
    'MDR Deadline ⚙',           // P  15
    '☐ MDR Scheduled?',         // Q  16
    'Final Disposition',        // R  17
    'Notes',                    // S  18
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-fill from Incident Intake (data starts row 3 = index 2)
  fillFormulas(ws, 1, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$G,6,FALSE)&", "&VLOOKUP(A${r},'Incident Intake'!$A:$G,7,FALSE),"⚠ Case ID not found"))`)
  )
  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$H,8,FALSE),""))`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$I,9,FALSE),""))`)
  )
  fillFormulas(ws, 5, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$M,13,FALSE),""))`)
  )
  // Removal date (col Q in Intake = VLOOKUP col 17)
  fillFormulas(ws, 6, 3, END - 1, r =>
    fv(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$Q,17,FALSE),""))`)
  )
  // Day 10 deadline = removal date + 10 calendar days
  fillFormulas(ws, 7, 3, END - 1, r =>
    fv(`IF(G${r}="","",G${r}+10)`)
  )
  // Calendar days elapsed
  fillFormulas(ws, 4, 3, END - 1, r =>
    fv(`IF(G${r}="","",TODAY()-G${r})`)
  )
  // Status with emoji
  fillFormulas(ws, 8, 3, END - 1, r =>
    fs(`IF(G${r}="","",IF(R${r}<>"","✅ Disposition Made",IF(TODAY()-G${r}>10,"❌ OVERDUE — Day "&TEXT(TODAY()-G${r},"0"),IF(TODAY()-G${r}>=8,"🔴 Day "&TEXT(TODAY()-G${r},"0")&" — URGENT",IF(TODAY()-G${r}>=5,"⚠ Day "&TEXT(TODAY()-G${r},"0"),"🟢 Day "&TEXT(TODAY()-G${r},"0"))))))`)
  )
  // MDR required?
  fillFormulas(ws, 14, 3, END - 1, r =>
    fs(`IF(D${r}="Yes","⚠ MDR REQUIRED",IF(D${r}="No","N/A",""))`)
  )
  // MDR deadline (approx 14 calendar days = 10 school days)
  fillFormulas(ws, 15, 3, END - 1, r =>
    fv(`IF(D${r}="Yes",G${r}+14,"")`)
  )

  setRange(ws, END, 19)
  setColWidths(ws, [90,160,80,70,80,180,110,120,180,110,120,110,110,110,130,120,120,180,220])
  ws['!freeze'] = { ySplit: 3, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 8 — INVESTIGATION PIPELINE
// ═════════════════════════════════════════════════════════════
function buildInvestigationPipeline() {
  const ws = {}
  const END = 202

  setStr(ws, 0, 0, 'INVESTIGATION PIPELINE — From Intake to Close  |  One Row Per Case')
  merge(ws, 'A1:S1')
  setStr(ws, 1, 0, '⚠ Enter a Case ID for each investigation. Student name, offense, and incident date auto-fill. Fill in milestone dates as each stage is completed. The Stage and Days Open columns update automatically to show stalled cases.')
  merge(ws, 'A2:S2')

  const headers = [
    'Case ID',               // A  0
    'Student ⚙',             // B  1
    'Offense ⚙',             // C  2
    'Assigned Admin ⚙',      // D  3
    'Incident Date ⚙',       // E  4
    'Investigation Opened',  // F  5
    'Student Conference',    // G  6
    'Parent Conference',     // H  7
    'Evidence Review Done',  // I  8
    'Preliminary Decision',  // J  9
    'Final Decision Date',   // K  10
    'Final Disposition',     // L  11
    'Notification Sent',     // M  12
    'Days Open ⚙',           // N  13
    'Current Stage ⚙',       // O  14
    'Appeal Filed?',         // P  15
    'Appeal Date',           // Q  16
    'Case Closed Date',      // R  17
    'Notes',                 // S  18
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-fill from Incident Intake
  fillFormulas(ws, 1, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$G,6,FALSE)&", "&VLOOKUP(A${r},'Incident Intake'!$A:$G,7,FALSE),"⚠ Not Found"))`)
  )
  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$M,13,FALSE),""))`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$S,19,FALSE),""))`)
  )
  fillFormulas(ws, 4, 3, END - 1, r =>
    fv(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Incident Intake'!$A:$B,2,FALSE),""))`)
  )
  // Days open
  fillFormulas(ws, 13, 3, END - 1, r =>
    fs(`IF(A${r}="","",IF(R${r}<>"","✅ "&TEXT(R${r}-E${r},"0")&"d (closed)",IF(E${r}="","",TEXT(TODAY()-E${r},"0")&" days open")))`)
  )
  // Current stage (check from most advanced to least)
  fillFormulas(ws, 14, 3, END - 1, r =>
    fs(`IF(A${r}="","",IF(R${r}<>"","✅ Closed",IF(P${r}="Yes","⚠ Appeal Filed",IF(M${r}<>"","📬 Notification Sent",IF(K${r}<>"","✔ Decision Made",IF(J${r}<>"","🔍 Preliminary Decision",IF(I${r}<>"","📋 Evidence Review",IF(H${r}<>"","👪 Parent Conference",IF(G${r}<>"","🗣 Student Conference",IF(F${r}<>"","🔎 Investigation Open","📥 Intake Only")))))))))))`)
  )

  setRange(ws, END, 19)
  setColWidths(ws, [90,160,180,140,100,120,120,120,120,120,120,180,120,120,170,100,110,120,220])
  ws['!freeze'] = { ySplit: 3, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 9 — APPEAL TRACKER
// ═════════════════════════════════════════════════════════════
function buildAppealTracker() {
  const ws = {}
  const END = 102

  setStr(ws, 0, 0, 'APPEAL TRACKER — Campus → Superintendent → Board  |  One Row Per Appeal')
  merge(ws, 'A1:R1')
  setStr(ws, 1, 0, '⚠ Log every appeal immediately when filed. Missing deadlines at any level is a common district vulnerability. Track TEA complaints separately from internal appeals — they have different timelines and require different documentation.')
  merge(ws, 'A2:R2')

  const headers = [
    'Appeal ID',                 // A  0
    'Case ID',                   // B  1
    'Student ⚙',                 // C  2
    'Original Disposition ⚙',   // D  3
    'Campus Appeal Filed',       // E  4
    'Campus Hearing Date',       // F  5
    'Campus Outcome',            // G  6
    'Supt Appeal Filed',         // H  7
    'Supt Hearing Date',         // I  8
    'Supt Outcome',              // J  9
    'Board Appeal Filed',        // K  10
    'Board Hearing Date',        // L  11
    'Board Outcome',             // M  12
    'TEA Complaint Filed?',      // N  13
    'OCR Complaint Filed?',      // O  14
    'Legal Counsel Engaged?',    // P  15
    'Final Resolution',          // Q  16
    'Notes',                     // R  17
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-fill student and disposition from Intake + Pipeline
  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IF(B${r}="","",IFERROR(VLOOKUP(B${r},'Incident Intake'!$A:$G,6,FALSE)&", "&VLOOKUP(B${r},'Incident Intake'!$A:$G,7,FALSE),"Enter student name"))`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IF(B${r}="","",IFERROR(VLOOKUP(B${r},'Investigation Pipeline'!$A:$L,12,FALSE),"Enter original disposition"))`)
  )

  setRange(ws, END, 18)
  setColWidths(ws, [90,90,160,180,120,120,180,120,120,180,120,120,180,110,110,120,180,220])
  ws['!freeze'] = { ySplit: 3, xSplit: 2 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 10 — DISCIPLINE TRENDS
// All auto-calculated from Incident Intake. No data entry.
// ═════════════════════════════════════════════════════════════
function buildDisciplineTrends() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, 'DISCIPLINE TRENDS — Auto-Summary from Incident Intake  |  No Data Entry Required')
  setCell(ws, r, 0, fs(`"Data as of: "&TEXT(TODAY(),"MMMM D, YYYY")&"  |  Total Incidents: "&TEXT(MAX(0,COUNTA('Incident Intake'!$A:$A)-2),"0")`))
  merge(ws, 'A2:H2')
  r++
  setStr(ws, r++, 0, 'Select any table below and insert a chart for your campus improvement plan or board report. All numbers update automatically.')
  r++

  // ── SECTION 1: Monthly Counts ──
  setStr(ws, r, 0, 'MONTHLY INCIDENT COUNT — 2025–26 School Year')
  setStr(ws, r, 2, 'Count')
  r++
  const months = [
    ['August 2025',    8, 2025],
    ['September 2025', 9, 2025],
    ['October 2025',  10, 2025],
    ['November 2025', 11, 2025],
    ['December 2025', 12, 2025],
    ['January 2026',   1, 2026],
    ['February 2026',  2, 2026],
    ['March 2026',     3, 2026],
    ['April 2026',     4, 2026],
    ['May 2026',       5, 2026],
    ['June 2026',      6, 2026],
    ['July 2026',      7, 2026],
  ]
  months.forEach(([label, m, y]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 2, fv(`SUMPRODUCT(('Incident Intake'!$B$3:$B$502<>0)*(MONTH('Incident Intake'!$B$3:$B$502)=${m})*(YEAR('Incident Intake'!$B$3:$B$502)=${y}))`))
    r++
  })
  r++

  // ── SECTION 2: By Offense ──
  setStr(ws, r, 0, 'BY OFFENSE CATEGORY')
  setStr(ws, r, 2, 'Count')
  setStr(ws, r, 3, '% of Total ⚙')
  r++
  const totalRef = `MAX(1,COUNTA('Incident Intake'!$A:$A)-2)`
  OFFENSE_CATEGORIES.forEach(cat => {
    setStr(ws, r, 0, cat)
    setCell(ws, r, 2, fv(`COUNTIF('Incident Intake'!$M:$M,"${cat}")`))
    setCell(ws, r, 3, fs(`TEXT(COUNTIF('Incident Intake'!$M:$M,"${cat}")/${totalRef},"0%")`))
    r++
  })
  r++

  // ── SECTION 3: By Grade ──
  setStr(ws, r, 0, 'BY GRADE LEVEL')
  setStr(ws, r, 2, 'Count')
  r++
  GRADES.forEach(g => {
    setStr(ws, r, 0, g)
    setCell(ws, r, 2, fv(`COUNTIF('Incident Intake'!$H:$H,"${g}")`))
    r++
  })
  r++

  // ── SECTION 4: By Location ──
  setStr(ws, r, 0, 'BY LOCATION')
  setStr(ws, r, 2, 'Count')
  r++
  LOCATIONS.forEach(loc => {
    setStr(ws, r, 0, loc)
    setCell(ws, r, 2, fv(`COUNTIF('Incident Intake'!$E:$E,"${loc}")`))
    r++
  })
  r++

  // ── SECTION 5: SPED/504 Breakdown ──
  setStr(ws, r, 0, 'SPED / 504 BREAKDOWN')
  setStr(ws, r, 2, 'Count')
  r++
  const spedRows = [
    ['SPED Students (IEP)',    `COUNTIF('Incident Intake'!$I:$I,"Yes")`],
    ['504 Students',           `COUNTIF('Incident Intake'!$J:$J,"Yes")`],
    ['General Education Only', `COUNTIFS('Incident Intake'!$I:$I,"No",'Incident Intake'!$J:$J,"No",'Incident Intake'!$A:$A,"<>")`],
    ['Mandatory Removals',     `COUNTIF('Incident Intake'!$P:$P,"Mandatory*")`],
    ['Discretionary Removals', `COUNTIF('Incident Intake'!$P:$P,"Discretionary*")`],
    ['No Removal',             `COUNTIF('Incident Intake'!$P:$P,"No Removal")`],
  ]
  spedRows.forEach(([label, formula]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 2, fv(formula))
    r++
  })
  r++

  // ── SECTION 6: Repeat Offender Check ──
  setStr(ws, r++, 0, 'REPEAT OFFENDER LOOKUP — Enter a student\'s last name in the yellow cell to see their incident count.')
  setStr(ws, r, 0, 'Enter Last Name →')
  setStr(ws, r, 1, '')   // user entry cell
  setCell(ws, r, 2, fv(`IF(B${r+1}="","",COUNTIF('Incident Intake'!$F:$F,B${r+1}))`))
  setCell(ws, r, 3, fs(`IF(B${r+1}="","",IF(C${r+1}>=3,"🚨 "&TEXT(C${r+1},"0")&" incidents — review for DAEP eligibility",TEXT(C${r+1},"0")&" incident(s) on record"))`))
  r += 2

  setStr(ws, r, 0, '─── All data auto-populated from Incident Intake. No manual entry needed. | Clear Path Education Group, LLC ───')
  merge(ws, `A${r+1}:H${r+1}`)

  setRange(ws, r + 2, 8)
  setColWidths(ws, [220, 160, 80, 130, 120, 120, 120, 120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 11 — THREAT ASSESSMENT LOG (HB 3 — required by Texas law)
// ═════════════════════════════════════════════════════════════
function buildThreatAssessment() {
  const ws = {}
  const END = 102

  setStr(ws, 0, 0, 'THREAT ASSESSMENT LOG — HB 3 Compliance  |  Texas Requires a Threat Assessment Team on Every Campus')
  merge(ws, 'A1:T1')
  setStr(ws, 1, 0, '⚠ Texas HB 3 (2019) requires every campus to have a Threat Assessment Team and a documented process. This log is the documentation. All threat assessments must be conducted and documented — regardless of whether a threat is deemed credible.')
  merge(ws, 'A2:T2')
  setStr(ws, 2, 0, '⚠ FERPA NOTE: Threat assessment records are education records and must be maintained confidentially. Do not share with other students or parents beyond what is legally required.')
  merge(ws, 'A3:T3')

  const headers = [
    'TA ID',                          // A  0
    'Date Reported',                  // B  1
    'Student Last',                   // C  2
    'Student First',                  // D  3
    'Grade',                          // E  4
    'Campus',                         // F  5
    'Threat Type',                    // G  6
    'Threat Description',             // H  7
    'Threat Level',                   // I  8
    'Assessment Team Members',        // J  9
    'Law Enforcement Notified?',      // K  10
    'LE Agency / Officer',            // L  11
    'LE Notified Date',               // M  12
    'Parent of Subject Notified?',    // N  13
    'Parent Notified Date',           // O  14
    'Action Taken',                   // P  15
    'Return-to-Campus Conditions',    // Q  16
    'Follow-Up Date',                 // R  17
    'Status',                         // S  18
    'Notes',                          // T  19
  ]
  headers.forEach((h, c) => setStr(ws, 3, c, h))

  setRange(ws, END, 20)
  setColWidths(ws, [80,100,110,110,80,130,150,280,200,220,120,180,120,120,120,220,220,110,160,220])
  ws['!freeze'] = { ySplit: 4, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 12 — SCOC QUICK REFERENCE
// ═════════════════════════════════════════════════════════════
function buildSCOCReference() {
  const rows = []

  rows.push(['STUDENT CODE OF CONDUCT — TEXAS QUICK REFERENCE', '', '', '', '', '', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  For general guidance only — not legal advice. Always consult your district SCOC and legal counsel for specific determinations.', '', '', '', '', '', '', ''])
  rows.push([''])
  rows.push(['OFFENSE', 'Primary TEC Reference', 'Removal Type', 'Mandatory or Discretionary', 'Typical Consequence Range', 'SPED / 504 Consideration', 'Required Notifications', 'JJAEP Eligible?'])

  const offenses = [
    [
      'Fighting / Mutual Combat (no serious injury)',
      'TEC §37.005, §37.006',
      'Suspension or Discretionary DAEP',
      'Discretionary',
      'OSS 1–3 days; DAEP 30–45 days (repeat or aggravating factors)',
      'MDR required if SPED. Conduct FBA if behavioral pattern. 504 meeting if 504 student.',
      'Parent notification (TEC §37.009(a) + local Board policy). Campus principal/AP.',
      'No',
    ],
    [
      'Assault — Bodily Injury (on school property or at school event)',
      'TEC §37.006(a)',
      'Mandatory DAEP',
      'Mandatory',
      'DAEP placement required. District sets duration per SCOC.',
      'MDR within 10 school days. IEP services must continue in DAEP. ARD may be convened.',
      'Parent notice + conference (TEC §37.009). Principal. May require SRO report.',
      'Possible — if prior DAEP or age-eligible',
    ],
    [
      'Assault — Serious Bodily Injury or Aggravated Assault',
      'TEC §37.007(a)',
      'Mandatory Expulsion',
      'Mandatory',
      'Expulsion. Board must act within statutory timeframe.',
      'MDR within 10 school days of removal. Cannot expel for manifestation behavior without ARD process.',
      'Written notice of board hearing. Parent rights notice. SRO / law enforcement likely involved.',
      'Yes — JJAEP placement required during expulsion if age-eligible',
    ],
    [
      'Drugs / Alcohol — Possession on Campus',
      'TEC §37.006, §37.007 (depends on substance)',
      'Mandatory DAEP or Mandatory Expulsion',
      'Mandatory (DAEP for possession; expulsion for distribution or certain controlled substances)',
      'DAEP 45–90 days (first offense). Expulsion for delivery/distribution.',
      'MDR if SPED. Substance use disorder screening recommended. FBA if behavioral component.',
      'Parent notification. SRO notification. Principal.',
      'Possible (expulsion cases)',
    ],
    [
      'Weapons — Firearm or Explosive',
      'TEC §37.007(a)(1)',
      'Mandatory Expulsion',
      'Mandatory — MINIMUM 1 year expulsion per federal Gun-Free Schools Act',
      '1 year minimum expulsion. Superintendent may modify on case-by-case basis.',
      'MDR required if SPED before expulsion can proceed. ARD must determine if behavior is manifestation.',
      'Immediate law enforcement notification. Board hearing notice. Written parent notice of rights.',
      'Yes — JJAEP required during expulsion period',
    ],
    [
      'Weapons — Prohibited (non-firearm: knife >5.5", club, etc.)',
      'TEC §37.007(a)(2)',
      'Mandatory Expulsion',
      'Mandatory',
      'Expulsion. Board determines duration.',
      'MDR if SPED. Cannot expel for manifestation without ARD.',
      'Law enforcement may be notified. Written board hearing notice. Parent notice.',
      'Yes',
    ],
    [
      'Threats / Terroristic Threat',
      'TEC §37.006; Penal Code §22.07',
      'Discretionary DAEP or Mandatory (if criminal charge)',
      'Discretionary → Mandatory if felony charge filed',
      'DAEP 45–90 days typical. Expulsion possible if charge involves serious threat.',
      'Threat Assessment REQUIRED under HB 3. MDR if SPED. Log in Threat Assessment tab.',
      'Law enforcement (if criminal threat). Parent of subject. Consider victim family notification.',
      'Possible',
    ],
    [
      'Harassment / Bullying (Including Cyberbullying)',
      'TEC §37.006(a)(2); TEC §37.0832 (cyberbullying)',
      'Mandatory DAEP (if retaliation or preventing victim attendance); Discretionary otherwise',
      'Mandatory if retaliation or forcing victim from school; otherwise discretionary',
      'Suspension 1–3 days (first offense). DAEP if sustained, serious, or retaliation.',
      'MDR if SPED. Consider FBA. 504 accommodations may need review for victim and/or subject.',
      'Parent of subject. Parent of victim (limited by FERPA). Counselor notification.',
      'No',
    ],
    [
      'Defiance / Insubordination',
      'TEC §37.002 (teacher removal); §37.005 (suspension)',
      'Teacher Removal or Suspension',
      'Discretionary',
      'OSS 1–3 days. Teacher removal → AP placement minimum 2 days.',
      'MDR if SPED. FBA if pattern of behavior. Document interventions tried first.',
      'Parent notification. If teacher removal: teacher conference required before return to class.',
      'No',
    ],
    [
      'Gang-Related Activity',
      'TEC §37.006',
      'Mandatory DAEP',
      'Mandatory (if conduct occurred on school property or at school event)',
      'DAEP placement. Law enforcement notification typical.',
      'MDR if SPED. Document gang indicators carefully — evidence needed for mandatory classification.',
      'Law enforcement. Parent notification.',
      'Possible',
    ],
    [
      'Technology / Device Misuse (non-criminal)',
      'District SCOC / Board Policy',
      'Suspension or Detention',
      'Discretionary',
      'Warning → detention → OSS (per SCOC escalation).',
      'Consider 504 needs if student relies on device for accommodation. Document if SPED.',
      'Parent notification. Campus tech coordinator.',
      'No',
    ],
    [
      'Controlled Substance — Distribution / Delivery',
      'TEC §37.007(d)',
      'Mandatory Expulsion',
      'Mandatory',
      'Expulsion. Board determines duration.',
      'MDR if SPED. Cannot expel for manifestation without ARD process.',
      'Law enforcement mandatory. Board hearing notice. Written rights notice.',
      'Yes',
    ],
  ]

  offenses.forEach(o => rows.push(o))
  rows.push([''])
  rows.push(['─── DUE PROCESS REQUIREMENTS — EVERY REMOVAL ────────────────────────────────────────────────────────────────────────────────────', '', '', '', '', '', '', ''])
  const dueProcess = [
    ['1. Parent Notification', 'Must be provided before or at the time of removal (TEC §37.009(a) + local Board policy — typically TASB FO/FOC). Document method, date, and time.'],
    ['2. Conference Rights', 'Parent must be offered a conference with the principal before placement begins (TEC §37.009). Document offer even if declined.'],
    ['3. Student Age 10+', 'Student has the right to a conference before a DAEP placement (TEC §37.009). Document conference or waiver.'],
    ['4. SPED — MDR', 'If student has IEP: MDR must be held within 10 SCHOOL DAYS of removal. No exceptions. (IDEA 34 CFR §300.530)'],
    ['5. SPED — Services', 'Educational services must continue during DAEP placement per IEP. DAEP campus must provide SPED services. (IDEA)'],
    ['6. Expulsion — Board', 'Mandatory expulsion requires a board hearing. Student and family must receive written notice with hearing date and rights.'],
    ['7. JJAEP', 'During expulsion, students must be placed in JJAEP if they are under 17 and in the district (TEC §37.010).'],
  ]
  dueProcess.forEach(([step, desc]) => rows.push([step, desc, '', '', '', '', '', '']))

  rows.push([''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  For organizational use only — not legal advice  |  clearpatheg.com', '', '', '', '', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [240, 180, 160, 140, 220, 260, 240, 100])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 13 — UPGRADE TO WAYPOINT
// ═════════════════════════════════════════════════════════════
function buildUpgrade() {
  const rows = []

  rows.push(['↑ UPGRADE TO WAYPOINT — Full Campus Discipline Management Platform', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  clearpatheg.com/waypoint', '', ''])
  rows.push(['', '', ''])
  rows.push(['You\'re doing the right work. Now let\'s stop doing it manually.', '', ''])
  rows.push(['Waypoint does everything in this toolkit — automatically, with alerts, role-based access, and district-wide visibility.', '', ''])
  rows.push(['', '', ''])
  rows.push(['WHAT WAYPOINT DOES THAT THIS TOOLKIT CANNOT', '', ''])
  rows.push(['Feature', 'This Toolkit', 'Waypoint'])

  const features = [
    ['Incident intake', 'Manual row entry', 'Structured intake form, auto-assigns case number, notifies assigned admin instantly'],
    ['Investigation notes', 'Manual log in spreadsheet', 'Timestamped entries, role-based visibility, locked after completion'],
    ['Evidence storage', 'Track file locations manually', 'File uploads stored securely and linked to the case — FERPA-compliant'],
    ['Parent contact log', 'Manual entry + scripts PDF', 'Logged with timestamp, auto-generates required written notice PDF'],
    ['10-day compliance clock', 'Formula-based countdown', 'Real-time alert sent to assigned admin at Day 7, Day 9, and Day 10 overdue'],
    ['MDR deadline alert', 'Formula flag in spreadsheet', 'Automatic alert to SPED coordinator the moment a SPED student is flagged in intake'],
    ['Investigation pipeline', 'Manual stage tracking', 'Case workflow with required fields per stage — nothing can be skipped'],
    ['Appeal tracking', 'Manual log', 'Each appeal level is a structured workflow with deadline alerts and outcome logging'],
    ['Discipline trends', 'COUNTIF formulas', 'Live dashboard with charts: by campus, grade, offense type, and staff member — updated in real time'],
    ['Threat assessment', 'Spreadsheet log', 'Guided HB 3 threat assessment workflow with team collaboration and outcome documentation'],
    ['Multi-campus visibility', 'One file per campus', 'Principal, AP, and director see all campuses in one dashboard — no file sharing'],
    ['Role-based access', 'File sharing only', 'Teachers log referrals, APs manage investigations, principals review — each sees only what they need'],
    ['Laserfiche integration', 'Not available', 'Incidents sync from Laserfiche automatically — no re-entry, no missed cases'],
    ['PEIMS reporting', 'Manual', 'One-click PEIMS-ready discipline export'],
    ['Audit trail', 'None', 'Every action logged with user name, timestamp, and IP address — complete chain of custody'],
    ['DAEP integration', 'Separate spreadsheet', 'Fully integrated with Waypoint DAEP module — incident escalates to DAEP placement in one click'],
  ]
  features.forEach(f => rows.push(f))

  rows.push(['', '', ''])
  rows.push(['─── WAYPOINT PRICING ────────────────────────────────────────────', '', ''])
  rows.push(['Starting at $4,500/year per campus', '', ''])
  rows.push(['Includes: Unlimited incidents, full investigation workflow, DAEP module, SPED compliance, Laserfiche integration, onboarding support', '', ''])
  rows.push(['District-wide pricing available.  No per-seat fees.  No hidden costs.', '', ''])
  rows.push(['Bundle: Campus Discipline Command + DAEP Tracker combined licensing available.', '', ''])
  rows.push(['', '', ''])
  rows.push(['─── READY TO SEE IT IN ACTION? ──────────────────────────────────', '', ''])
  rows.push(['→ Book a free 30-min demo:  calendly.com/clearpatheg/waypoint-demo', '', ''])
  rows.push(['→ Learn more:               clearpatheg.com/waypoint', '', ''])
  rows.push(['→ Email us:                 sales@clearpatheg.com', '', ''])
  rows.push(['', '', ''])
  rows.push(['─── NOT READY YET? ──────────────────────────────────────────────', '', ''])
  rows.push(['Download the free Texas DAEP Compliance Checklist (PDF):  clearpatheg.com/resources', '', ''])
  rows.push(['Join our list for Texas discipline compliance updates:     clearpatheg.com/newsletter', '', ''])
  rows.push(['', '', ''])
  rows.push(['Waypoint is a product of Clear Path Education Group, LLC  |  FERPA-compliant  |  Texas-built, Texas-focused', '', ''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  support@clearpatheg.com', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [280, 220, 340])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 14 — LISTS (dropdown sources)
// ═════════════════════════════════════════════════════════════
function buildLists() {
  const lists = [
    { header: 'Offense Categories',   values: OFFENSE_CATEGORIES },
    { header: 'TEC References',       values: TEC_REFS },
    { header: 'Locations',            values: LOCATIONS },
    { header: 'Case Status',          values: CASE_STATUS },
    { header: 'Note Types',           values: NOTE_TYPES },
    { header: 'Evidence Types',       values: EVIDENCE_TYPES },
    { header: 'Contact Methods',      values: CONTACT_METHODS },
    { header: 'Threat Types',         values: THREAT_TYPES },
    { header: 'Threat Levels',        values: THREAT_LEVELS },
    { header: 'Threat Status',        values: THREAT_STATUS },
    { header: 'Dispositions',         values: DISPOSITIONS },
    { header: 'Appeal Outcomes',      values: APPEAL_OUTCOMES },
    { header: 'Removal Types',        values: REMOVAL_TYPES },
    { header: 'Grade Levels',         values: GRADES },
    { header: 'Staff Roles',          values: STAFF_ROLES },
    { header: 'Pipeline Stages',      values: STAGES },
    { header: 'Yes / No',             values: YES_NO },
    { header: 'Yes / No / N/A',       values: YES_NO_NA },
  ]

  const maxLen = Math.max(...lists.map(l => l.values.length))
  const rows = [lists.map(l => l.header)]
  for (let i = 0; i < maxLen; i++) {
    rows.push(lists.map(l => l.values[i] || ''))
  }
  rows.push([''])
  rows.push(['HOW TO APPLY DROPDOWNS — Google Sheets: Select column → Data → Data Validation → Dropdown from range → enter range (e.g. Lists!A2:A20)'])
  rows.push(['HOW TO APPLY DROPDOWNS — Excel: Select column → Data → Data Validation → Allow: List → Source: =Lists!$A$2:$A$20'])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [200,200,160,140,160,180,180,180,240,180,200,200,180,140,160,160,80,100])
  return ws
}

// ═════════════════════════════════════════════════════════════
// SAMPLE DATA — 5 realistic cases at various stages
// ═════════════════════════════════════════════════════════════
function addSampleData(wb) {
  const intake   = wb.Sheets['Incident Intake']
  const notes    = wb.Sheets['Investigation Notes']
  const evidence = wb.Sheets['Evidence Tracker']
  const contacts = wb.Sheets['Parent Contact Log']
  const tenDay   = wb.Sheets['10-Day Compliance']
  const pipeline = wb.Sheets['Investigation Pipeline']
  const appeals  = wb.Sheets['Appeal Tracker']
  const threats  = wb.Sheets['Threat Assessment']

  const d  = (s) => ({ v: excelDate(s), t: 'n', z: 'MM/DD/YYYY' })
  const set = (ws, r, c, val) => {
    ws[R(r, c)] = typeof val === 'object' && val !== null
      ? val
      : typeof val === 'number'
        ? { v: val, t: 'n' }
        : { v: val, t: 's' }
  }

  // ── INCIDENT INTAKE — 5 cases ──
  // cols: CaseID, Date, Time, Campus, Location, LastName, FirstName, Grade, SPED, 504,
  //       ReportingStaff, StaffRole, Offense, TECRef, Description, MandatoryRemoval, RemovalDate,
  //       CaseStatus, AssignedTo, WitnessCount, EvidenceCollected, Notes
  const intakeData = [
    ['ADM-001', d('2026-03-03'), '10:15 AM', 'Lincoln High', 'Hallway',
     'Thompson', 'Marcus', '10th Grade', 'Yes', 'No',
     'Ms. Rivera', 'Teacher', 'Fighting / Mutual Combat', 'TEC §37.006 — Mandatory DAEP Removal',
     'Student struck another student in the hallway near locker bank B. Witness present. Security camera footage available.',
     'Mandatory — TEC §37.006 DAEP', d('2026-03-03'),
     'Investigation Open', 'Mr. Kim (AP)', 2, 'Yes', 'SPED student — MDR required. Camera footage secured.'],
    ['ADM-002', d('2026-02-20'), '1:30 PM', 'Jefferson Middle', 'Parking Lot',
     'Nguyen', 'Linh', '8th Grade', 'No', 'No',
     'Mr. Torres', 'SRO', 'Drugs / Alcohol — Possession', 'TEC §37.006 — Mandatory DAEP Removal',
     'SRO observed student with vape device in school parking lot. Device confiscated. Student admitted to possession.',
     'Mandatory — TEC §37.006 DAEP', d('2026-02-20'),
     'Disposition Made', 'Ms. Patel (AP)', 1, 'Yes', 'Vape device logged as evidence. Student admitted. Parent conference held 2/21.'],
    ['ADM-003', d('2026-01-15'), '8:45 AM', 'Lincoln High', 'Classroom',
     'Davis', 'Jordan', '11th Grade', 'No', 'No',
     'Ms. Chen', 'Teacher', 'Threats / Terroristic Threat', 'Penal Code §22.07 — Terroristic Threat',
     'Student made a written threat in a class journal stating intent to harm named classmates. Teacher immediately reported.',
     'Mandatory — TEC §37.007 Expulsion', d('2026-01-15'),
     'Appeal Filed', 'Mr. Kim (AP)', 3, 'Yes', 'Board recommended expulsion. Family appealing at board level.'],
    ['ADM-004', d('2026-03-10'), '2:00 PM', 'Jefferson Middle', 'Cafeteria',
     'Williams', 'Destiny', '7th Grade', 'Yes', 'No',
     'Mr. Lee', 'Teacher', 'Defiance / Insubordination', 'TEC §37.002 — Teacher Removal',
     'Student refused repeated directives from teacher, used profanity toward staff, and knocked materials off desk.',
     'Suspension (up to 3 days)', d('2026-03-10'),
     'Conference Pending', 'Ms. Patel (AP)', 1, 'No', 'SPED student. Teacher formally removed. Parent conference pending.'],
    ['ADM-005', d('2026-03-12'), '11:30 AM', 'Roosevelt Middle', 'Online / Social Media',
     'Ramirez', 'Sofia', '9th Grade', 'No', 'Yes',
     'Ms. Jackson', 'Counselor', 'Cyberbullying', 'TEC §37.006 — Mandatory DAEP Removal',
     'Multiple students reported a social media account posting humiliating photos and personal information about a 9th grade student. Victim reported emotional distress.',
     'Mandatory — TEC §37.006 DAEP', d('2026-03-12'),
     'Intake Filed', 'Mr. Torres (AP)', 3, 'Yes', '504 student. Screenshots preserved. Victim being supported by counselor. Investigation just opened.'],
  ]
  intakeData.forEach((row, i) => {
    row.forEach((val, c) => set(intake, i + 2, c, val))
  })

  // ── INVESTIGATION NOTES ──
  const notesData = [
    ['ADM-001', d('2026-03-03'), '10:30 AM', 'Timeline Entry', 'Mr. Kim', 'Assistant Principal',
     'Arrived on scene at 10:18 AM. Two students separated by Ms. Rivera and security. Marcus Thompson had visible redness on left cheek. Other student (not in this case) had no visible injury.',
     'Yes', 'Mr. Kim', d('2026-03-03'), 'No', 'Mr. Kim'],
    ['ADM-001', d('2026-03-03'), '11:15 AM', 'Student Statement', 'Thompson, Marcus', '10th Grade',
     'Marcus stated: "He started it. He grabbed my backpack and wouldn\'t let go. I hit him to get him to stop." Statement signed by student.',
     'Yes', 'Mr. Kim', d('2026-03-03'), 'Yes — signed statement', 'Mr. Kim'],
    ['ADM-001', d('2026-03-03'), '11:45 AM', 'Evidence Note', 'Security Camera', 'System',
     'Reviewed hallway camera footage 10:12–10:17 AM. Footage shows contact initiated by other party. Marcus responds with single strike. Video saved to server at ADM-001-video-0303.mp4.',
     'Yes', 'Mr. Kim', d('2026-03-03'), 'Yes — video file secured', 'Mr. Kim'],
    ['ADM-002', d('2026-02-20'), '1:45 PM', 'Student Statement', 'Nguyen, Linh', '8th Grade',
     'Linh stated: "It\'s mine, I use it for stress. I know it\'s not allowed." Voluntarily surrendered device. No further resistance.',
     'Yes', 'Ms. Patel', d('2026-02-20'), 'Yes — signed statement', 'Ms. Patel'],
    ['ADM-002', d('2026-02-21'), '9:00 AM', 'Parent Communication Note', 'Mrs. Nguyen', 'Parent',
     'Parent conference held in person. Parent acknowledged the incident. Accepted placement conditions. Requested academic work be sent home during DAEP.',
     'Yes', 'Ms. Patel', d('2026-02-21'), 'No', 'Ms. Patel'],
    ['ADM-003', d('2026-01-15'), '9:00 AM', 'Evidence Note', 'Written Threat', 'Physical Item',
     'Threat note recovered from Jordan Davis\'s class journal by Ms. Chen. Note states: "I\'m going to make [two named students] pay on Friday." Threat Assessment initiated immediately.',
     'Yes', 'Mr. Kim', d('2026-01-15'), 'Yes — original note secured, copy in file', 'Mr. Kim'],
    ['ADM-004', d('2026-03-10'), '2:30 PM', 'Staff Statement', 'Mr. Lee', 'Teacher',
     'Mr. Lee stated: "I asked Destiny to put away her phone three times. She refused, cursed at me, and slid materials off my desk intentionally." Formal teacher removal form completed.',
     'No', '', '', 'Yes — teacher removal form', 'Ms. Patel'],
  ]
  notesData.forEach((row, i) => {
    row.forEach((val, c) => set(notes, i + 4, c, val))
  })

  // ── EVIDENCE TRACKER ──
  const evidenceData = [
    ['EVD-001', 'ADM-001', d('2026-03-03'), '10:25 AM', 'Mr. Kim', 'Hallway security camera footage 10:12–10:17 AM', 'Video Recording', 'Server: \\\\lincoln\\security\\ADM-001', 'Yes', 'ADM-001-video-0303.mp4', '', '', 'No', 'Original footage preserved. Do not overwrite.'],
    ['EVD-002', 'ADM-001', d('2026-03-03'), '11:15 AM', 'Mr. Kim', 'Signed written statement — Marcus Thompson', 'Written Statement', 'Locked AP file cabinet — Room 101', 'Yes', 'ADM-001-stmt-thompson.pdf', '', '', 'No', ''],
    ['EVD-003', 'ADM-002', d('2026-02-20'), '1:35 PM', 'Mr. Torres (SRO)', 'Vape device — black, no branding', 'Physical Item', 'AP office lockbox', 'Yes', 'ADM-002-vape-photo.jpg', 'Returned to parent', d('2026-02-25'), 'No', 'Device photographed before return. SRO report filed.'],
    ['EVD-004', 'ADM-003', d('2026-01-15'), '9:05 AM', 'Ms. Chen', 'Written threat note — Jordan Davis class journal', 'Written Statement', 'Locked AP file cabinet — Room 101', 'Yes', 'ADM-003-threat-note-scan.pdf', '', '', 'Yes', 'LEGAL HOLD — board appeal in progress. Do not release.'],
    ['EVD-005', 'ADM-005', d('2026-03-12'), '12:00 PM', 'Ms. Jackson', 'Screenshots of 5 social media posts — bullying account', 'Social Media Screenshot', 'Digital — secure folder', 'Yes', 'ADM-005-screenshots-0312.pdf', '', '', 'No', 'Victim provided screenshots. Platform report filed. Preserve for investigation.'],
  ]
  evidenceData.forEach((row, i) => {
    row.forEach((val, c) => set(evidence, i + 3, c, val))
  })

  // ── PARENT CONTACT LOG ──
  const contactData = [
    ['PCT-001', 'ADM-001', 'Thompson, Marcus', 'Mrs. Thompson', 'Mother', '(512) 555-0142', 'Phone Call', d('2026-03-03'), '10:50 AM', 1, 'Yes', 'Notified of incident and mandatory removal. Explained SPED rights and MDR requirement. Parent upset but cooperative. Conference scheduled for 3/5.', 'Yes', 'Yes', d('2026-03-05'), 'Mr. Kim'],
    ['PCT-002', 'ADM-001', 'Thompson, Marcus', 'Mrs. Thompson', 'Mother', '(512) 555-0142', 'In-Person Meeting', d('2026-03-05'), '9:00 AM', 2, 'Yes', 'MDR conference held. Parent, SPED coordinator, and AP present. MDR determination: behavior NOT a manifestation. Placement confirmed. Parent given appeal rights.', 'Yes', 'No', '', 'Mr. Kim'],
    ['PCT-003', 'ADM-002', 'Nguyen, Linh', 'Mrs. Nguyen', 'Mother', '(512) 555-0277', 'Phone Call', d('2026-02-20'), '2:00 PM', 1, 'Yes', 'Notified of possession incident and mandatory DAEP placement. Parent asked about the device. Explained evidence. Requested in-person conference.', 'No', 'Yes', d('2026-02-21'), 'Ms. Patel'],
    ['PCT-004', 'ADM-002', 'Nguyen, Linh', 'Mrs. Nguyen', 'Mother', '(512) 555-0277', 'In-Person Meeting', d('2026-02-21'), '9:00 AM', 2, 'Yes', 'Conference held. Parent accepted placement. Academic services confirmed. Device released. Conference documented.', 'Yes', 'No', '', 'Ms. Patel'],
    ['PCT-005', 'ADM-003', 'Davis, Jordan', 'Mr. Davis', 'Father', '(512) 555-0391', 'Phone Call', d('2026-01-15'), '9:30 AM', 1, 'Yes', 'Notified of written threat and immediate removal. Explained mandatory expulsion recommendation. Parent immediately retained attorney. Appeal filed by attorney 1/22.', 'Yes', 'Yes', d('2026-01-22'), 'Mr. Kim'],
    ['PCT-006', 'ADM-004', 'Williams, Destiny', 'Ms. Williams', 'Mother', '(512) 555-0518', 'Phone Call', d('2026-03-10'), '2:45 PM', 1, 'No', 'Left voicemail. Notified of teacher removal and pending conference. Requested callback.', 'No', 'Yes', d('2026-03-11'), 'Ms. Patel'],
    ['PCT-007', 'ADM-004', 'Williams, Destiny', 'Ms. Williams', 'Mother', '(512) 555-0518', 'Phone Call', d('2026-03-11'), '8:30 AM', 2, 'Yes', 'Returned call. Explained teacher removal process and SPED consideration. Conference scheduled for 3/12.', 'Yes', 'Yes', d('2026-03-12'), 'Ms. Patel'],
  ]
  contactData.forEach((row, i) => {
    row.forEach((val, c) => set(contacts, i + 3, c, val))
  })

  // ── 10-DAY COMPLIANCE ──
  // User enters Case ID — rest auto-fills via formula. Pre-enter the IDs only.
  const tenDayCases = ['ADM-001', 'ADM-002', 'ADM-003', 'ADM-005']
  tenDayCases.forEach((id, i) => set(tenDay, i + 3, 0, id))
  // Pre-fill due process checklist for ADM-002 (completed case)
  const completedRow = 3 + 1  // ADM-002 is at index 1 → row index 4 (0-based)
  ;['Yes','Yes','Yes','Yes','Yes'].forEach((v, c) => set(tenDay, completedRow, 9 + c, v))
  set(tenDay, completedRow, 17, 'Discretionary DAEP — 45 Days')
  set(tenDay, completedRow, 18, 'Placed 2/20. Parent conference held 2/21. DAEP start 2/22.')
  // Pre-fill ADM-001 partial (MDR scheduled)
  set(tenDay, 3, 9, 'Yes') // notice provided
  set(tenDay, 3, 12, 'Yes') // parent notified
  set(tenDay, 3, 16, 'Yes') // MDR scheduled

  // ── INVESTIGATION PIPELINE ──
  const pipelineData = [
    ['ADM-001', '', '', '', '', d('2026-03-03'), '', '', '', '', '', '', '', '', '', 'No', '', '', 'SPED — MDR held 3/5. Awaiting final disposition.'],
    ['ADM-002', '', '', '', '', d('2026-02-20'), d('2026-02-20'), d('2026-02-21'), d('2026-02-21'), d('2026-02-21'), d('2026-02-21'), 'Discretionary DAEP — 45 Days', d('2026-02-21'), '', '', 'No', '', d('2026-02-21'), 'Closed. 45-day DAEP confirmed.'],
    ['ADM-003', '', '', '', '', d('2026-01-15'), d('2026-01-15'), d('2026-01-15'), d('2026-01-15'), d('2026-01-16'), d('2026-01-20'), 'Mandatory Expulsion Recommended', d('2026-01-20'), '', '', 'Yes', d('2026-01-22'), '', 'Board appeal filed. Pending board hearing date.'],
    ['ADM-004', '', '', '', '', d('2026-03-10'), d('2026-03-10'), '', '', '', '', '', '', '', '', 'No', '', '', 'Parent conference scheduled 3/12.'],
    ['ADM-005', '', '', '', '', d('2026-03-12'), d('2026-03-12'), '', '', '', '', '', '', '', '', 'No', '', '', 'Investigation opened same day. Evidence secured.'],
  ]
  pipelineData.forEach((row, i) => {
    row.forEach((val, c) => set(pipeline, i + 3, c, val))
  })

  // ── APPEAL TRACKER ──
  const appealData = [
    ['APL-001', 'ADM-003', '', '', d('2026-01-22'), d('2026-01-27'), 'Upheld — Original Decision Stands',
     d('2026-01-28'), d('2026-02-03'), 'Upheld — Original Decision Stands',
     d('2026-02-05'), d('2026-03-10'), 'Pending',
     'No', 'No', 'Yes', 'Pending',
     'Board hearing set 3/10. Family attorney present. Outcome pending board vote.'],
  ]
  appealData.forEach((row, i) => {
    row.forEach((val, c) => set(appeals, i + 3, c, val))
  })

  // ── THREAT ASSESSMENT ──
  const threatData = [
    ['TA-001', d('2026-01-15'), 'Davis', 'Jordan', '11th Grade', 'Lincoln High',
     'Written / Note', 'Written threat in class journal naming 2 specific students. "I\'m going to make them pay on Friday." Specific names and day identified.',
     'Level 3 — High (plan, means, or intent identified)',
     'Mr. Kim (AP), Ms. Rivera (Counselor), Ms. Chen (Teacher/Reporter), SRO Torres',
     'Yes', 'Officer M. Torres — LHPD', d('2026-01-15'), 'Yes', d('2026-01-15'),
     'Immediate removal. Law enforcement responded. Threat assessment completed same day. Expulsion recommended.',
     'Student must complete threat assessment counseling program before return. No contact with named students.',
     d('2026-03-15'), 'Escalated to Law Enforcement',
     'Board expulsion appeal pending. Threat assessment file maintained separately from discipline file.'],
  ]
  threatData.forEach((row, i) => {
    row.forEach((val, c) => set(threats, i + 4, c, val))
  })
}

// ═════════════════════════════════════════════════════════════
// ASSEMBLE
// ═════════════════════════════════════════════════════════════
XLSX.utils.book_append_sheet(wb, buildCover(),                'Cover')
XLSX.utils.book_append_sheet(wb, buildCommandDashboard(),     'Command Dashboard')
XLSX.utils.book_append_sheet(wb, buildIncidentIntake(),       'Incident Intake')
XLSX.utils.book_append_sheet(wb, buildInvestigationNotes(),   'Investigation Notes')
XLSX.utils.book_append_sheet(wb, buildEvidenceTracker(),      'Evidence Tracker')
XLSX.utils.book_append_sheet(wb, buildParentContactLog(),     'Parent Contact Log')
XLSX.utils.book_append_sheet(wb, buildTenDayCompliance(),     '10-Day Compliance')
XLSX.utils.book_append_sheet(wb, buildInvestigationPipeline(),'Investigation Pipeline')
XLSX.utils.book_append_sheet(wb, buildAppealTracker(),        'Appeal Tracker')
XLSX.utils.book_append_sheet(wb, buildDisciplineTrends(),     'Discipline Trends')
XLSX.utils.book_append_sheet(wb, buildThreatAssessment(),     'Threat Assessment')
XLSX.utils.book_append_sheet(wb, buildSCOCReference(),        'SCOC Reference')
XLSX.utils.book_append_sheet(wb, buildUpgrade(),              '↑ Upgrade to Waypoint')
XLSX.utils.book_append_sheet(wb, buildLists(),                'Lists')

// Inject sample demo data
addSampleData(wb)

// ─── Output ───────────────────────────────────────────────────
const OUTPUT = 'Campus-Admin-Discipline-Command-Center-Texas-Edition.xlsx'
XLSX.writeFile(wb, OUTPUT)
console.log(`\n✅ Built: ${OUTPUT}`)
console.log(`   14 tabs | Incident Intake → Investigation → Evidence → Parent Scripts → 10-Day Compliance → Pipeline → Appeals → Trends → Threat Assessment → SCOC Reference`)
console.log(`\n   5 sample cases pre-loaded: ADM-001 through ADM-005`)
console.log(`     ADM-001 — Fighting, SPED, MDR required, Day 10 approaching`)
console.log(`     ADM-002 — Drug possession, completed, DAEP placed`)
console.log(`     ADM-003 — Written threat, expulsion, board appeal in progress`)
console.log(`     ADM-004 — Teacher removal, SPED, conference pending`)
console.log(`     ADM-005 — Cyberbullying, 504, investigation just opened`)
console.log(`\n   TpT Packages:`)
console.log(`     Package 1 — Incident Essentials: $10`)
console.log(`     Package 2 — Investigation Toolkit: $20`)
console.log(`     Package 3 — Full Command Center: $35`)
console.log(`     Bundle with DAEP Tracker: $55\n`)
