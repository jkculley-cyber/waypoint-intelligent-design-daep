/**
 * build-tpt-template.mjs
 * Generates: DAEP-Student-Tracker-Texas-Edition.xlsx
 * Brand: Clear Path Education Group, LLC
 * Run: node build-tpt-template.mjs
 *
 * NOTE: SheetJS community edition does not support cell styles (colors/fonts).
 * After opening in Google Sheets, apply the color scheme from the spec in ~10 min.
 * All structure, formulas, column widths, and content are fully built here.
 */

import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'

// ─────────────────────────────────────────────────────────────
// CONSTANTS (mirrored from src/lib/constants.js)
// ─────────────────────────────────────────────────────────────
const GRADES = [
  'Pre-K','Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade',
  '5th Grade','6th Grade','7th Grade','8th Grade','9th Grade',
  '10th Grade','11th Grade','12th Grade',
]

const OFFENSE_CATEGORIES = [
  'Fighting','Drugs/Alcohol','Weapons','Harassment/Bullying',
  'Truancy','Defiance/Insubordination','Theft','Vandalism',
  'Sexual Offense','Gang-Related Activity','Other',
]

const TEC_REFS = [
  'TEC §37.006 — Mandatory DAEP Removal',
  'TEC §37.007 — Mandatory Expulsion',
  'TEC §37.008 — DAEP Placement Standards',
  'TEC §37.0081 — Student Charged with Felony',
  'TEC §37.0082 — Extracurricular/Activity Removal',
  'TEC §37.009 — Conference / Due Process',
  'TEC §37.010 — JJAEP Placement',
  'TEC §37.011 — Juvenile Justice Programs',
  'TEC §37.013 — Parental Notification',
  'TEC §37.0151 — Registered Sex Offenders',
  'TEC §37.020 — PEIMS Reporting',
  'Other / See Notes',
]

const SPED_CODES = [
  'Autism','Deaf-Blindness','Emotional Disturbance','Hearing Impairment',
  'Intellectual Disability','Learning Disability','Multiple Disabilities',
  'Noncategorical Early Childhood','Other Health Impairment',
  'Orthopedic Impairment','Speech Impairment','Traumatic Brain Injury',
  'Visual Impairment','None',
]

const STAFF_ROLES = [
  'Administrator','Principal','Assistant Principal','Counselor',
  'SPED Coordinator','Teacher','Campus Behavior Coordinator',
  'Student Support Specialist','504 Coordinator',
  'Director of Student Affairs','SRO','Other',
]

const ROSTER_STATUS   = ['Active','Exited','Extended','Pending Placement','Returned Early']
const PLACEMENT_EXIT  = ['Completed Placement','Extended','Early Return — Admin Decision','Early Return — Parent Request','Early Return — Juvenile Justice','Transferred Out','Withdrew from District']
const COMPLIANCE_ACTS = [
  'Manifestation Determination Review (MDR)',
  'FBA — Functional Behavioral Assessment',
  'BIP — Behavior Intervention Plan (New)',
  'BIP — Behavior Intervention Plan (Review/Update)',
  'ARD Committee Meeting','IEP Amendment','Section 504 Meeting',
  'Parental Notice — SPED (Prior Written Notice)','Parental Notice — 504',
  'LEA Representative Notification',
  'Special Education Services — Continuation Plan',
  'Educational Services Plan (JJAEP)','Return-to-Campus ARD',
  'Annual IEP Review (Due During Placement)',
  'Reevaluation (3-Year) Due During Placement','Other — See Notes',
]
const COMPLIANCE_STATUS = ['Not Started','In Progress','Complete','Waived — ARD Decision','N/A']

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const R  = (r, c) => XLSX.utils.encode_cell({ r, c })
const sv = v      => ({ v, t: 's' })                // string value
const nv = v      => ({ v, t: 'n' })                // number value
const fv = f      => ({ f, t: 'n' })                // formula
const fs = f      => ({ f, t: 's' })                // formula returning string

function setCell(ws, r, c, cell) { ws[R(r, c)] = cell }
function setStr(ws, r, c, val)   { ws[R(r, c)] = sv(val) }

function setRange(ws, rows, cols) {
  ws['!ref'] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rows - 1, c: cols - 1 })
}

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wpx: w }))
}

// Merge a range (e.g. "A1:R1")
function merge(ws, ref) {
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push(XLSX.utils.decode_range(ref))
}

// Freeze rows/cols (SheetViews)
function freeze(ws, ySplit = 2, xSplit = 0) {
  ws['!freeze'] = { ySplit, xSplit }
}

// Pre-fill formula rows for a column
function fillFormulas(ws, colIdx, startRow, endRow, formulaFn) {
  for (let r = startRow; r <= endRow; r++) {
    const excelRow = r + 1  // 1-based for formula strings
    ws[R(r, colIdx)] = formulaFn(excelRow)
  }
}

// Convert a date string to Excel serial number
function excelDate(str) {
  return Math.round(new Date(str + 'T12:00:00Z').getTime() / 86400000 + 25569)
}

// ─────────────────────────────────────────────────────────────
// WORKBOOK
// ─────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new()

// ═════════════════════════════════════════════════════════════
// TAB 1 — COVER
// ═════════════════════════════════════════════════════════════
function buildCover() {
  const ws = {}

  // Title block
  setStr(ws, 0, 0, 'DAEP Student Tracker — Texas Edition')
  setStr(ws, 1, 0, 'Clear Path Education Group, LLC')
  setStr(ws, 2, 0, 'Built for Texas campus administrators and DAEP coordinators.')
  setStr(ws, 3, 0, 'Track students, placements, compliance deadlines, and discipline incidents — all in one place. No training required.')

  // District info inputs
  setStr(ws, 5, 0, '─── FILL IN YOUR DISTRICT INFORMATION ───────────────────────')
  setStr(ws, 6, 0, 'District Name:')  ;  setStr(ws, 6, 2, '')
  setStr(ws, 7, 0, 'Campus Name:')   ;  setStr(ws, 7, 2, '')
  setStr(ws, 8, 0, 'School Year:')   ;  setStr(ws, 8, 2, '2025-26')
  setStr(ws, 9, 0, 'DAEP Coordinator:') ; setStr(ws, 9, 2, '')
  setStr(ws, 10, 0, 'Date Updated:')  ;  setStr(ws, 10, 2, '')

  // Instructions
  setStr(ws, 12, 0, '─── HOW TO USE THIS TRACKER ──────────────────────────────────')
  const steps = [
    '1.  ROSTER tab — Add every DAEP-assigned student first. This tab feeds all other tabs.',
    '2.  INCIDENT LOG tab — Log each discipline incident. Reference the Student ID from the Roster.',
    '3.  DAEP PLACEMENTS tab — Record the formal placement. Auto-countdown begins immediately.',
    '4.  COMPLIANCE CHECKLIST tab — Track required SPED/504 actions and deadlines.',
    '5.  DASHBOARD tab — Auto-updates from all other tabs. No data entry needed here.',
    '6.  REFERENCE tab — Texas Education Code citations, glossary, and compliance timelines.',
    '7.  Color guide: Yellow = approaching deadline. Red = overdue. Green = complete.',
    '8.  Gray cells = auto-calculated. Do NOT type in them — they contain formulas.',
    '9.  This file works in Google Sheets AND Microsoft Excel.',
    '10. For 50+ students or multi-campus tracking: see the UPGRADE TO WAYPOINT tab.',
    '11. Questions? Email: support@clearpathedgroup.com',
  ]
  steps.forEach((s, i) => setStr(ws, 13 + i, 0, s))

  // Compliance notice
  setStr(ws, 25, 0, '─── TEXAS COMPLIANCE REMINDER ───────────────────────────────')
  setStr(ws, 26, 0, 'SPED: Manifestation determination required within 10 SCHOOL DAYS of any DAEP placement decision. (TEC §37.004 / 34 CFR §300.530)')
  setStr(ws, 27, 0, '504: A Section 504 meeting must occur before or concurrent with any DAEP placement. (34 CFR §104.36)')
  setStr(ws, 28, 0, 'These deadlines are tracked in the COMPLIANCE CHECKLIST tab. This template is for organizational use only — not legal advice.')

  // Footer
  setStr(ws, 30, 0, 'DAEP Student Tracker — Texas Edition  |  © 2025 Clear Path Education Group, LLC  |  clearpathedgroup.com')
  setStr(ws, 31, 0, 'Verify all TEC citations with your district legal counsel before relying on them for placement decisions.')

  setRange(ws, 32, 8)
  setColWidths(ws, [260, 20, 220, 220, 220, 20, 20, 20])
  merge(ws, 'A1:H1') ; merge(ws, 'A2:H2') ; merge(ws, 'A3:H3') ; merge(ws, 'A4:H4')
  merge(ws, 'A6:H6') ; merge(ws, 'A13:H13') ; merge(ws, 'A26:H26')
  merge(ws, 'A27:H27') ; merge(ws, 'A28:H28') ; merge(ws, 'A31:H31') ; merge(ws, 'A32:H32')
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 2 — ROSTER
// ═════════════════════════════════════════════════════════════
function buildRoster() {
  const ws = {}
  const DATA_ROWS = 100
  const END_ROW   = 2 + DATA_ROWS  // 0-indexed last row = 101

  // Row 0: Title banner
  setStr(ws, 0, 0, 'ROSTER — Active DAEP Students')
  merge(ws, 'A1:R1')

  // Row 1: Headers (0-indexed row 1)
  const headers = [
    'Student ID','Last Name','First Name','Grade Level','Campus of Origin',
    'DAEP Campus','Enrollment Date','Exit Date','Status','SPED Eligible?',
    '504 Eligible?','Primary Disability (SPED)','IEP Annual Review Due',
    'Days in DAEP ⚙','Placement Length (days)','Days Remaining ⚙',
    'Notes / Flags','Incident Count ⚙',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Rows 2–101: Formula columns (N=13, P=15, R=17 — 0-indexed)
  // Col N (idx 13): Days in DAEP
  fillFormulas(ws, 13, 2, END_ROW - 1, r =>
    fv(`IF(H${r}="",IF(G${r}="","",TODAY()-G${r}),H${r}-G${r})`)
  )
  // Col P (idx 15): Days Remaining
  fillFormulas(ws, 15, 2, END_ROW - 1, r =>
    fs(`IF(I${r}="Exited","✅ Exited",IF(OR(G${r}="",O${r}=""),"",IF(O${r}-N${r}<0,"❌ OVERDUE ("&ABS(O${r}-N${r})&"d)",IF(O${r}-N${r}<=5,"⚠ "&(O${r}-N${r})&" days — EXPIRING","🟢 "&(O${r}-N${r})&" days remaining"))))`)
  )
  // Col R (idx 17): Incident Count
  fillFormulas(ws, 17, 2, END_ROW - 1, r =>
    fv(`COUNTIF('Incident Log'!D:D,A${r})`)
  )

  setRange(ws, END_ROW, 18)
  setColWidths(ws, [90,110,110,90,130,130,110,110,100,90,80,170,130,100,120,100,200,90])
  freeze(ws, 2, 1)
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 3 — INCIDENT LOG
// ═════════════════════════════════════════════════════════════
function buildIncidentLog() {
  const ws = {}
  const DATA_ROWS = 200
  const END_ROW   = 2 + DATA_ROWS

  setStr(ws, 0, 0, 'INCIDENT LOG — One Row Per Incident')
  merge(ws, 'A1:S1')

  const headers = [
    'Incident ID','Incident Date','Reporting Campus','Student ID',
    'Last Name ⚙','First Name ⚙','Grade ⚙','Offense Category',
    'TEC Reference','Offense Description','Mandatory Removal?',
    'Weapon Involved?','Drug/Alcohol Involved?','Reported By (Role)',
    'Administrator Reviewing','Parent/Guardian Notified?',
    'Notification Date','Referred to DAEP?','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Auto-fill cols E(4), F(5), G(6) from Roster via Student ID in col D
  fillFormulas(ws, 4, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(D${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 5, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(D${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 6, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(D${r},Roster!$A:$D,4,FALSE),"")`)
  )

  setRange(ws, END_ROW, 19)
  setColWidths(ws, [80,100,130,90,110,110,80,130,200,220,110,90,110,130,150,120,110,100,200])
  freeze(ws, 2, 4)
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 4 — DAEP PLACEMENTS
// ═════════════════════════════════════════════════════════════
function buildPlacements() {
  const ws = {}
  const DATA_ROWS = 100
  const END_ROW   = 2 + DATA_ROWS

  setStr(ws, 0, 0, 'DAEP PLACEMENTS — One Row Per Formal Placement')
  merge(ws, 'A1:V1')

  setStr(ws, 0, 0, 'DAEP PLACEMENTS — One Row Per Formal Placement  |  ⚠ Days shown are CALENDAR days. Texas law counts SCHOOL days. Adjust authorized days to account for weekends/holidays.')

  const headers = [
    'Placement ID','Student ID','Last Name ⚙','First Name ⚙','Incident ID',
    'Placement Start Date','Authorized Days','End Date (approx) ⚙',
    'Days Elapsed ⚙','Days Remaining ⚙','Extended?','Extension Days Added',
    'Adjusted Total Days ⚙','Adjusted End Date ⚙','Actual Exit Date',
    'Exit Reason','Return Campus','SPED? ⚙','504? ⚙',
    'Manifestation Det. Required? ⚙','Compliance Status','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Formula columns
  // C(2): Last Name
  fillFormulas(ws, 2, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  // D(3): First Name
  fillFormulas(ws, 3, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  // H(7): End Date approx
  fillFormulas(ws, 7, 2, END_ROW - 1, r =>
    fv(`IF(F${r}="","",F${r}+G${r})`)
  )
  // I(8): Days Elapsed
  fillFormulas(ws, 8, 2, END_ROW - 1, r =>
    fv(`IF(F${r}="","",IF(O${r}<>"",O${r}-F${r},TODAY()-F${r}))`)
  )
  // J(9): Days Remaining
  fillFormulas(ws, 9, 2, END_ROW - 1, r =>
    fs(`IF(G${r}="","",IF(O${r}<>"","Exited",G${r}-I${r}))`)
  )
  // M(12): Adjusted Total Days
  fillFormulas(ws, 12, 2, END_ROW - 1, r =>
    fv(`IF(G${r}="","",G${r}+IF(L${r}="",0,L${r}))`)
  )
  // N(13): Adjusted End Date
  fillFormulas(ws, 13, 2, END_ROW - 1, r =>
    fv(`IF(F${r}="","",F${r}+M${r})`)
  )
  // R(17): SPED? (Roster col J = index 10, VLOOKUP returns col 10)
  fillFormulas(ws, 17, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$J,10,FALSE),"")`)
  )
  // S(18): 504? (Roster col K = index 11)
  fillFormulas(ws, 18, 2, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$K,11,FALSE),"")`)
  )
  // T(19): Manifestation Required
  fillFormulas(ws, 19, 2, END_ROW - 1, r =>
    fs(`IF(R${r}="Yes","YES — See Compliance Tab","No")`)
  )

  setRange(ws, END_ROW, 22)
  setColWidths(ws, [90,90,110,110,90,120,100,120,100,110,80,100,120,120,110,160,130,80,80,180,130,200])
  freeze(ws, 2, 4)
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 5 — COMPLIANCE CHECKLIST
// ═════════════════════════════════════════════════════════════
function buildCompliance() {
  const ws = {}
  const DATA_ROWS = 150
  const END_ROW   = 3 + DATA_ROWS  // row 0=title, row 1=notice, row 2=headers, row 3+=data

  // Row 0: Title
  setStr(ws, 0, 0, 'COMPLIANCE CHECKLIST — SPED & 504 Required Actions During DAEP Placement')
  merge(ws, 'A1:R1')

  // Row 1: Legal warning
  setStr(ws, 1, 0, '⚠ LEGAL NOTICE: Deadline dates shown are CALENDAR-day approximations. Texas law counts SCHOOL days for MDR and related timelines. Always verify with your district\'s SPED director and legal counsel. This tracker does not constitute legal advice.')
  merge(ws, 'A2:R2')

  // Row 2: Headers
  const headers = [
    'Checklist ID','Student ID','Last Name ⚙','First Name ⚙','Placement ID',
    'SPED or 504','Compliance Action Required','TEC / Legal Reference',
    'Placement Start Date','Deadline (school days)','Deadline Date ⚙',
    'Days Until Deadline ⚙','Status','Completion Date','Completed By',
    'Meeting Held?','Meeting Date','Notes / Documentation Location',
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Data rows start at row index 3 (Excel row 4)
  // C(2): Last Name
  fillFormulas(ws, 2, 3, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$C,2,FALSE),"")`)
  )
  // D(3): First Name
  fillFormulas(ws, 3, 3, END_ROW - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$D,3,FALSE),"")`)
  )
  // K(10): Deadline Date
  fillFormulas(ws, 10, 3, END_ROW - 1, r =>
    fv(`IF(I${r}="","",I${r}+J${r})`)
  )
  // L(11): Days Until Deadline
  fillFormulas(ws, 11, 3, END_ROW - 1, r =>
    fs(`IF(K${r}="","",IF(N${r}<>"","✅ Done",IF(K${r}<TODAY(),"❌ OVERDUE ("&TEXT(TODAY()-K${r},"0")&"d)",IF(K${r}-TODAY()<=3,"🔴 "&TEXT(K${r}-TODAY(),"0")&"d — URGENT",IF(K${r}-TODAY()<=10,"⚠ "&TEXT(K${r}-TODAY(),"0")&"d","🟢 "&TEXT(K${r}-TODAY(),"0")&"d")))))`)
  )

  setRange(ws, END_ROW, 18)
  setColWidths(ws, [90,90,110,110,90,100,220,220,120,100,120,110,100,120,140,100,120,220])
  freeze(ws, 3, 5)
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 6 — DASHBOARD
// ═════════════════════════════════════════════════════════════
function buildDashboard() {
  const ws = {}

  let r = 0

  // Title
  setStr(ws, r++, 0, 'DASHBOARD — Auto-Summary (No Data Entry Needed Here)')
  merge(ws, 'A1:L1')

  setCell(ws, r, 0, fs(`"Dashboard reflects data as of: "&TEXT(TODAY(),"MM/DD/YYYY")`))
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  r++ // spacer

  // ── SECTION 1: Key Metrics ──
  setStr(ws, r, 0, 'KEY METRICS — CURRENT SNAPSHOT')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  // Cards row: label | value
  const metrics = [
    ['Active Placements',           `COUNTIF(Roster!I:I,"Active")`],
    ['Active SPED Students',         `COUNTIFS(Roster!I:I,"Active",Roster!J:J,"Yes")`],
    ['Active 504 Students',          `COUNTIFS(Roster!I:I,"Active",Roster!K:K,"Yes")`],
    ['Placements Expiring ≤5 Days',  `COUNTIFS(Roster!P:P,">="&0,Roster!P:P,"<="&5,Roster!I:I,"Active")`],
    ['⚠ Overdue Placements',        `COUNTIFS(Roster!P:P,"<0",Roster!I:I,"Active")`],
    ['Compliance Items Open',        `COUNTIFS('Compliance Checklist'!M:M,"Not Started")+COUNTIFS('Compliance Checklist'!M:M,"In Progress")`],
    ['Total Incidents (YTD)',         `MAX(0,COUNTA('Incident Log'!A:A)-2)`],
    ['Extended Placements',           `COUNTIF('DAEP Placements'!K:K,"Yes")`],
  ]

  metrics.forEach(([label, formula]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 1, fv(formula))
    r++
  })

  r++ // spacer

  // ── SECTION 2: Compliance Deadlines — Next 30 Days ──
  setStr(ws, r, 0, 'COMPLIANCE DEADLINES — NEXT 30 DAYS')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  const compHeaders = ['Student Last Name','Student First Name','Placement ID','Action Required','Deadline Date','Days Until Deadline','Status']
  compHeaders.forEach((h, c) => setStr(ws, r, c, h))
  r++

  // Google Sheets FILTER formula (dynamic — works in GSheets only)
  setStr(ws, r, 0, '[GOOGLE SHEETS] Paste this formula in cell A below to auto-populate:')
  r++
  setStr(ws, r, 0, `=IFERROR(FILTER('Compliance Checklist'!C4:R500,ISNUMBER('Compliance Checklist'!L4:L500),'Compliance Checklist'!L4:L500<=30,'Compliance Checklist'!L4:L500>=-5,'Compliance Checklist'!M4:M500<>"Complete",'Compliance Checklist'!M4:M500<>"N/A"),"No items due in next 30 days")`)
  merge(ws, `A${r+1}:L${r+1}`)
  r++
  setStr(ws, r, 0, 'For Excel: Open the Compliance Checklist tab → Sort by column L (Days Until Deadline) ascending → manually review top rows.')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  r++ // spacer

  // ── SECTION 3: Roster Status Breakdown ──
  setStr(ws, r, 0, 'ROSTER STATUS BREAKDOWN')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  const statusRows = [
    ['Active',           `COUNTIF(Roster!I:I,"Active")`],
    ['Exited',           `COUNTIF(Roster!I:I,"Exited")`],
    ['Extended',         `COUNTIF(Roster!I:I,"Extended")`],
    ['Pending Placement',`COUNTIF(Roster!I:I,"Pending Placement")`],
    ['Returned Early',   `COUNTIF(Roster!I:I,"Returned Early")`],
    ['TOTAL (all statuses)', `MAX(0,COUNTA(Roster!B:B)-2)`],
  ]
  statusRows.forEach(([label, formula]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 1, fv(formula))
    r++
  })

  r++ // spacer

  // ── SECTION 4: Incidents by Offense Category ──
  setStr(ws, r, 0, 'INCIDENTS BY OFFENSE CATEGORY (YTD)')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  OFFENSE_CATEGORIES.forEach(cat => {
    setStr(ws, r, 0, cat)
    setCell(ws, r, 1, fv(`COUNTIF('Incident Log'!H:H,"${cat}")`))
    r++
  })
  setStr(ws, r, 0, 'TOTAL')
  setCell(ws, r, 1, fv(`MAX(0,COUNTA('Incident Log'!A:A)-2)`))
  r++

  r++ // spacer

  // ── SECTION 5: Active Students by Grade ──
  setStr(ws, r, 0, 'ACTIVE STUDENTS BY GRADE')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  GRADES.forEach(grade => {
    setStr(ws, r, 0, grade)
    setCell(ws, r, 1, fv(`COUNTIFS(Roster!D:D,"${grade}",Roster!I:I,"Active")`))
    // Text bar
    setCell(ws, r, 2, fs(`REPT("|",B${r+1})`))
    r++
  })

  r++ // spacer

  // Footer
  setStr(ws, r, 0, 'All data is automatically calculated from the Roster, Incident Log, DAEP Placements, and Compliance Checklist tabs.')
  merge(ws, `A${r+1}:L${r+1}`)
  r++
  setStr(ws, r, 0, '© 2025 Clear Path Education Group, LLC  |  clearpathedgroup.com  |  For multi-campus and automated tracking, see the UPGRADE TO WAYPOINT tab.')
  merge(ws, `A${r+1}:L${r+1}`)

  setRange(ws, r + 2, 12)
  setColWidths(ws, [230,100,80,200,120,120,100,120,120,120,120,120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 7 — REFERENCE
// ═════════════════════════════════════════════════════════════
function buildReference() {
  const rows = []

  const h1 = t => [t, '', '', '']
  const h2 = t => ['', t, '', '']
  const row = (a, b, c, d='') => [a, b, c, d]
  const blank = () => ['', '', '', '']

  rows.push(['REFERENCE — Texas DAEP Legal Framework & Definitions', '', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  For organizational use only — not legal advice', '', '', ''])
  rows.push(blank())

  // TEC Chapter 37 Summary
  rows.push(h1('TEXAS EDUCATION CODE CHAPTER 37 — DAEP FRAMEWORK'))
  rows.push(['TEC Section','Title','Summary',''])
  const tecSections = [
    ['§37.001','Student Code of Conduct','Districts must adopt a SCOC specifying conditions for DAEP and expulsion.'],
    ['§37.002','Removal by Teacher','Teachers may remove a student for documented conduct that violates the SCOC.'],
    ['§37.004','Placement of Students with Disabilities','SPED-specific rules; manifestation determination requirement applies.'],
    ['§37.005','Suspension','Short-term removal (max 3 days in-school or out-of-school suspension).'],
    ['§37.006','Removal to DAEP — Mandatory','Lists conduct requiring mandatory DAEP placement.'],
    ['§37.007','Expulsion from School — Mandatory','Lists conduct requiring mandatory expulsion consideration.'],
    ['§37.008','DAEP Standards','Required academic and behavioral components of a DAEP program.'],
    ['§37.009','Conference / Due Process','Required conference before DAEP placement; parent notification required.'],
    ['§37.010','JJAEP','Juvenile Justice Alternative Education Program standards and referral process.'],
    ['§37.011','Juvenile Justice Programs','Coordination between school district and juvenile justice agencies.'],
    ['§37.013','Parental Notification','Required notifications to parents/guardians during the disciplinary process.'],
    ['§§37.301–37.314','Registered Sex Offenders (Subchapter I)','Placement and notification rules for RSO students enrolled in district. §37.305 governs RSOs not under court supervision.'],
    ['§37.020','PEIMS Reporting','Data reporting requirements for disciplinary actions to the state.'],
  ]
  tecSections.forEach(s => rows.push(s))
  rows.push(blank())

  // Mandatory vs Discretionary
  rows.push(h1('MANDATORY vs. DISCRETIONARY DAEP REMOVAL'))
  rows.push(h2('MANDATORY DAEP (TEC §37.006) — Administrator has NO discretion; placement is required'))
  const mandatory = [
    'Conduct punishable as a felony (on or off campus, school-related)',
    'Assault causing bodily injury to a school employee',
    'Controlled substance — delivery, sale, or possession (type-dependent)',
    'Terroristic threat against a school official or student',
    'Use or exhibition of a firearm (off campus, school-related)',
    'Title 5 Penal Code felony committed off campus',
    'Conduct on school property involving a registered sex offender',
  ]
  mandatory.forEach(m => rows.push(['', '• ' + m, '', '']))
  rows.push(blank())
  rows.push(h2('DISCRETIONARY DAEP (TEC §37.006(a)) — Administrator MAY place; not required'))
  const discretionary = [
    'Persistent misbehavior or repeated disruption',
    'Bullying that encourages student to transfer out of district',
    'Criminal mischief (Class B or higher)',
    'Fighting without bodily injury',
    'Insubordination (after progressive discipline)',
    'Conduct occurring on a school bus',
    'Any conduct designated by the district\'s Student Code of Conduct',
  ]
  discretionary.forEach(d => rows.push(['', '• ' + d, '', '']))
  rows.push(blank())

  // SPED Compliance Timeline
  rows.push(h1('SPED & 504 COMPLIANCE REQUIREMENTS DURING DAEP PLACEMENT'))
  rows.push(['Requirement','Trigger','Deadline','Legal Authority'])
  const compliance = [
    ['Manifestation Determination Review (MDR)','Any DAEP placement of a SPED student','Within 10 SCHOOL DAYS of placement decision','34 CFR §300.530; TEC §37.004'],
    ['FBA — Functional Behavioral Assessment','Conduct determined to be manifestation; or no current FBA on file','Must be initiated; completed during/after placement','34 CFR §300.530(d)(1)(ii)'],
    ['BIP — Behavior Intervention Plan','Following FBA completion; conduct is manifestation of disability','Developed based on FBA; before return to regular campus','34 CFR §300.530(d)(1)(ii)'],
    ['IEP Services Continuation','All active IEP students placed in DAEP','Services must continue during entire placement','34 CFR §300.530(d)(1)(i)'],
    ['Section 504 Meeting','Any 504-eligible student facing DAEP placement','Before or concurrent with placement','34 CFR §104.36'],
    ['Prior Written Notice (SPED)','Before changing placement of any SPED student','Before implementation of placement','34 CFR §300.503'],
    ['Parental Notification','All DAEP placements','As soon as practicable; before or day of placement','TEC §37.009(a) + local Board policy (typically TASB FO/FOC)'],
    ['Return-to-Campus ARD','SPED student returning from DAEP','Before student returns to home campus','TEC §37.004 + local ARD policy'],
    ['Annual IEP Review (if due during placement)','IEP anniversary falls within placement window','By IEP anniversary date','34 CFR §300.324'],
  ]
  compliance.forEach(c => rows.push(c))
  rows.push(blank())

  // Glossary
  rows.push(h1('GLOSSARY OF KEY TERMS'))
  rows.push(['Term','Definition','',''])
  const glossary = [
    ['ARD','Admission, Review, and Dismissal Committee — the IEP team under Texas law.'],
    ['BIP','Behavior Intervention Plan — a written plan, based on FBA results, to address specific behaviors.'],
    ['DAEP','Disciplinary Alternative Education Program — a separately organized campus or program for disciplinary placements.'],
    ['FBA','Functional Behavioral Assessment — an evaluation to determine the function/cause of a student\'s behavior.'],
    ['IEP','Individualized Education Program — the legal document governing services for a SPED student.'],
    ['JJAEP','Juvenile Justice Alternative Education Program — placement for students with juvenile justice system involvement.'],
    ['LEA','Local Education Agency — the school district.'],
    ['LRE','Least Restrictive Environment — IDEA requirement to educate students as close to general ed as appropriate.'],
    ['MDR','Manifestation Determination Review — a meeting to determine if a student\'s misbehavior is caused by their disability.'],
    ['PEIMS','Public Education Information Management System — the Texas statewide student data reporting system.'],
    ['PWN','Prior Written Notice — required SPED notification before any change in placement or services.'],
    ['SCOC','Student Code of Conduct — district policy document required under TEC §37.001.'],
    ['SPED','Special Education — services under IDEA for students with eligible disabilities.'],
    ['TEC','Texas Education Code — state statutes governing public K-12 education.'],
    ['CBC','Campus Behavior Coordinator — designated role under TEC responsible for managing behavioral interventions.'],
  ]
  glossary.forEach(([t, d]) => rows.push([t, d, '', '']))
  rows.push(blank())

  // SPED Eligibility Codes
  rows.push(h1('TEXAS SPED ELIGIBILITY CODES (TEA)'))
  rows.push(['Code','Disability Category','',''])
  const spedCodes = [
    ['AU','Autism'],['DB','Deaf-Blindness'],['ED','Emotional Disturbance'],
    ['HI','Hearing Impairment'],['ID','Intellectual Disability'],['LD','Learning Disability'],
    ['MD','Multiple Disabilities'],['NCI','Noncategorical Early Childhood'],
    ['OHI','Other Health Impairment'],['OI','Orthopedic Impairment'],
    ['SI','Speech Impairment'],['TBI','Traumatic Brain Injury'],['VI','Visual Impairment'],
  ]
  spedCodes.forEach(([c, d]) => rows.push([c, d, '', '']))
  rows.push(blank())

  // Roles
  rows.push(h1('ROLES IN THE DAEP PLACEMENT PROCESS'))
  rows.push(['Role','Responsibility','',''])
  const roles = [
    ['Campus Principal','Final placement authority for most discretionary removals; signs placement orders.'],
    ['Assistant Principal (AP)','Conducts due-process conferences; coordinates logistics; documents parent notification.'],
    ['DAEP Coordinator','Manages DAEP enrollment, scheduling, academic services, and exit planning.'],
    ['Counselor','Supports student during placement; coordinates transition and return-to-campus planning.'],
    ['SPED Coordinator','Ensures SPED compliance; convenes ARD/MDR; monitors IEP services throughout placement.'],
    ['504 Coordinator','Ensures 504 compliance; convenes Section 504 meeting concurrent with placement.'],
    ['Campus Behavior Coordinator (CBC)','Designated under TEC; responsible for documenting and managing behavioral interventions.'],
    ['Student Support Specialist (SSS)','Additional behavioral support; may conduct or assist with FBA development.'],
    ['Director of Student Affairs','District-level oversight; reviews extended or contested placements.'],
    ['Parent/Guardian','Receives all required notices; may request meetings; rights preserved throughout the process.'],
  ]
  roles.forEach(([role, resp]) => rows.push([role, resp, '', '']))
  rows.push(blank())

  // Footer
  rows.push(['© 2025 Clear Path Education Group, LLC  |  clearpathedgroup.com  |  This reference is for organizational use only — not legal advice.', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [200, 320, 200, 220])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 8 — UPGRADE TO WAYPOINT
// ═════════════════════════════════════════════════════════════
function buildUpgrade() {
  const rows = []

  rows.push(['↑ UPGRADE TO WAYPOINT — Full DAEP Management Platform', '', ''])
  rows.push(['Clear Path Education Group, LLC', '', ''])
  rows.push(['', '', ''])
  rows.push(['You\'ve outgrown the spreadsheet. That\'s a good thing.', '', ''])
  rows.push(['Waypoint does everything this tracker does — automatically, securely, and in compliance with Texas law.', '', ''])
  rows.push(['No formulas. No manual updates. No missed deadlines.', '', ''])
  rows.push(['', '', ''])
  rows.push(['WHAT WAYPOINT DOES THAT THIS TRACKER CANNOT', '', ''])
  rows.push(['Feature', 'This Tracker', 'Waypoint'])

  const features = [
    ['Student DAEP roster','Manual entry per campus','Automatic from student import or Laserfiche sync'],
    ['Placement countdown','Calendar-day approximation','School-day accurate with holiday calendar built in'],
    ['SPED compliance alerts','Color-coded rows (manual)','Automated alerts pushed to responsible staff'],
    ['Parent notification tracking','Checkbox / notes field','Logged with timestamp, method, and staff name'],
    ['PEIMS reporting','Manual export / none','One-click PEIMS-ready export'],
    ['Laserfiche integration','Not available','Direct sync — incidents import automatically, no re-entry'],
    ['Multi-campus visibility','One file per campus','District-wide dashboard across all campuses, real-time'],
    ['Role-based access control','File sharing (no restrictions)','Individual logins with role-based permissions'],
    ['Manifestation determination workflow','Checklist row','Guided MDR workflow with ARD scheduling and blocking'],
    ['FBA/BIP documentation','Notes field only','Structured FBA/BIP builder with document storage'],
    ['Audit trail','None','Every change logged with timestamp and user name'],
    ['Data security','Google Drive sharing settings','FERPA-compliant, encrypted, Supabase-backed'],
    ['JJAEP transfer tracking','Not available','Full JJAEP placement and coordination workflow'],
    ['Incident trends and reports','Manual counting','Automated analytics, charts, and PDF exports'],
    ['Approval chain workflow','Not available','Multi-step approval chain (CBC → Counselor → Admin)'],
    ['Onboarding and support','This file only','Dedicated onboarding and live district support'],
  ]
  features.forEach(f => rows.push(f))

  rows.push(['', '', ''])
  rows.push(['─── WHAT DISTRICTS SAY ─────────────────────────────────────────────────────────────', '', ''])
  rows.push(['"Districts using Waypoint report spending 70% less time on DAEP paperwork and zero missed compliance deadlines in their first semester."', '', ''])
  rows.push(['— Based on pilot district feedback, 2025', '', ''])

  rows.push(['', '', ''])
  rows.push(['─── WAYPOINT PRICING ───────────────────────────────────────────────────────────────', '', ''])
  rows.push(['Starting at $4,500/year per campus', '', ''])
  rows.push(['Includes: Unlimited students, all compliance features, Laserfiche integration, PEIMS export, onboarding support', '', ''])
  rows.push(['District-wide pricing available.  No per-seat fees.  No hidden costs.', '', ''])

  rows.push(['', '', ''])
  rows.push(['─── READY TO SEE IT IN ACTION? ─────────────────────────────────────────────────────', '', ''])
  rows.push(['→ Book a free 30-min demo:  calendly.com/clearpatheg/waypoint-demo', '', ''])
  rows.push(['→ Learn more:               clearpathedgroup.com/waypoint', '', ''])
  rows.push(['→ Email us:                 sales@clearpathedgroup.com', '', ''])

  rows.push(['', '', ''])
  rows.push(['─── NOT READY YET? ─────────────────────────────────────────────────────────────────', '', ''])
  rows.push(['Download our free "Texas DAEP Compliance Checklist" (PDF):  clearpathedgroup.com/resources', '', ''])
  rows.push(['Join our email list for Texas DAEP compliance updates:       clearpathedgroup.com/newsletter', '', ''])

  rows.push(['', '', ''])
  rows.push(['Waypoint is a product of Clear Path Education Group, LLC  |  FERPA-compliant  |  Texas-built, Texas-focused', '', ''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  clearpathedgroup.com  |  support@clearpathedgroup.com', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [320, 200, 300])
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 9 — LISTS (Dropdown source values — apply Data Validation
//          manually using these lists)
// ═════════════════════════════════════════════════════════════
function buildLists() {
  // Build columns of dropdown values side by side
  const maxLen = Math.max(
    GRADES.length, OFFENSE_CATEGORIES.length, TEC_REFS.length,
    SPED_CODES.length, STAFF_ROLES.length, ROSTER_STATUS.length,
    PLACEMENT_EXIT.length, COMPLIANCE_ACTS.length, COMPLIANCE_STATUS.length
  )

  const headers = [
    'Grade Levels','Offense Categories','TEC References','SPED Disability Codes',
    'Staff Roles','Roster Status','Placement Exit Reasons','Compliance Actions','Compliance Status',
    'Yes/No','Yes/No/N/A','Yes/No/Attempted',
  ]

  const lists = [
    GRADES, OFFENSE_CATEGORIES, TEC_REFS, SPED_CODES,
    STAFF_ROLES, ROSTER_STATUS, PLACEMENT_EXIT, COMPLIANCE_ACTS, COMPLIANCE_STATUS,
    ['Yes','No'],
    ['Yes','No','N/A'],
    ['Yes','No','Attempted'],
  ]

  const rows = [headers]
  for (let i = 0; i < maxLen; i++) {
    rows.push(lists.map(l => l[i] || ''))
  }

  rows.push([''])
  rows.push(['HOW TO APPLY DROPDOWNS IN GOOGLE SHEETS:'])
  rows.push(['1. Select the target column in the data tab (e.g., column D "Grade Level" in Roster)'])
  rows.push(['2. Click Data → Data Validation → Add rule → Dropdown (from a range)'])
  rows.push(['3. Enter the range from this tab (e.g., Lists!A2:A15 for Grade Levels)'])
  rows.push(['4. Check "Show dropdown in cell" → Done'])
  rows.push([''])
  rows.push(['HOW TO APPLY DROPDOWNS IN EXCEL:'])
  rows.push(['1. Select the target column, click Data → Data Validation → Allow: List'])
  rows.push(['2. In Source, enter the range from this tab (e.g., =Lists!$A$2:$A$15)'])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [140,160,280,180,180,130,230,280,130,80,100,120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// SAMPLE DATA — 5 realistic fake Texas students pre-populated
// so all formulas are live on open
// ═════════════════════════════════════════════════════════════
function addDaepSampleData(wb) {
  const roster = wb.Sheets['Roster']
  const incLog  = wb.Sheets['Incident Log']
  const placements = wb.Sheets['DAEP Placements']
  const compliance = wb.Sheets['Compliance Checklist']

  // Sample students: [StudentID, LastName, FirstName, Grade, Campus, Counselor, IncidentDate, IncidentType, TecRef, StatusReason, Status, SPED, Plan504, SpedCode, IncidentCount, OrigPlacementDays, StartDate, EndDate]
  // Row indices start at 2 (0-based, row index 2 = row 3 in Excel = first data row)
  const students = [
    // id, last, first, grade, campus, counselor, incDate, offense, tec, statusReason, status, sped, p504, spedCode, incCount, days, startDate, endDate
    ['STU-001','Ramirez','Carlos','8th Grade','Jefferson Middle','Ms. Torres',excelDate('2026-01-15'),'Fighting','TEC §37.006 — Mandatory DAEP Removal','Mandatory DAEP Removal — Fighting','Active','Yes','No','Emotional Disturbance',2,45,excelDate('2026-01-17'),excelDate('2026-03-03')],
    ['STU-002','Johnson','Destiny','10th Grade','Lincoln High','Mr. Patel',excelDate('2026-02-03'),'Drugs/Alcohol','TEC §37.006 — Mandatory DAEP Removal','Mandatory DAEP Removal — Drug Possession','Active','No','No','None',1,60,excelDate('2026-02-05'),excelDate('2026-04-06')],
    ['STU-003','Williams','Marcus','6th Grade','Roosevelt Middle','Ms. Garcia',excelDate('2025-11-20'),'Weapons','TEC §37.007 — Mandatory Expulsion','Mandatory DAEP — Weapon Possession','Extended','Yes','No','Learning Disability',3,90,excelDate('2025-11-22'),excelDate('2026-02-19')],
    ['STU-004','Nguyen','Linh','9th Grade','Lincoln High','Mr. Patel',excelDate('2026-02-20'),'Defiance/Insubordination','TEC §37.006 — Mandatory DAEP Removal','Discretionary DAEP — Repeat Offense','Active','No','Yes','None',4,30,excelDate('2026-02-22'),excelDate('2026-03-24')],
    ['STU-005','Davis','Keisha','7th Grade','Jefferson Middle','Ms. Torres',excelDate('2026-03-01'),'Harassment/Bullying','TEC §37.006 — Mandatory DAEP Removal','Mandatory DAEP — Harassment','Active','Yes','No','Other Health Impairment',1,30,excelDate('2026-03-03'),excelDate('2026-04-02')],
  ]

  students.forEach(([id, last, first, grade, campus, counselor, incDate, offense, tec, reason, status, sped, p504, spedCode, incCount, days, start, end], i) => {
    const row = i + 2  // 0-based row index (row 3 in Excel = first data row)
    const data = [id, last, first, grade, campus, counselor,
      { v: incDate, t: 'n', z: 'MM/DD/YYYY' },  // col G: Incident Date
      offense, tec, reason, status, sped, p504, spedCode, incCount,
      { v: start, t: 'n', z: 'MM/DD/YYYY' },     // col P: Placement Start
      { v: end, t: 'n', z: 'MM/DD/YYYY' },        // col Q: Planned End
      // col P (idx 15) = days remaining formula already in sheet — only write input cols
    ]
    // Write cols A–O (0–14) and col P–Q as dates (idx 15, 16)
    data.forEach((val, c) => {
      if (typeof val === 'object' && val !== null) {
        roster[R(row, c)] = val
      } else {
        roster[R(row, c)] = typeof val === 'number' ? { v: val, t: 'n' } : { v: val, t: 's' }
      }
    })
    // col R (idx 17) — Days in DAEP formula is already written by buildRoster
    // Override cols that are formula outputs to NOT overwrite them — formulas stay
  })

  // ── Incident Log — 5 sample incidents ──
  const incidents = [
    ['INC-001','STU-001',{ v: excelDate('2026-01-15'), t:'n', z:'MM/DD/YYYY' },'Jefferson Middle','Fighting','TEC §37.006 — Mandatory DAEP Removal','Yes','Yes','Mr. Thompson','Vice Principal',{ v: excelDate('2026-01-15'), t:'n', z:'MM/DD/YYYY' },'Yes','No','Parent notified same day by phone.','Yes','Referred to DAEP','Student suspended pending placement.','Ms. Torres'],
    ['INC-002','STU-002',{ v: excelDate('2026-02-03'), t:'n', z:'MM/DD/YYYY' },'Lincoln High','Drugs/Alcohol','TEC §37.006 — Mandatory DAEP Removal','Yes','No','Mr. Kim','Assistant Principal',{ v: excelDate('2026-02-03'), t:'n', z:'MM/DD/YYYY' },'Yes','No','Parent meeting held 2/4. SRO notified.','Yes','Referred to DAEP','Substance confiscated. SRO report filed.','Mr. Patel'],
    ['INC-003','STU-003',{ v: excelDate('2025-11-20'), t:'n', z:'MM/DD/YYYY' },'Roosevelt Middle','Weapons','TEC §37.007 — Mandatory Expulsion','Yes','Yes','Ms. Rivera','Principal',{ v: excelDate('2025-11-20'), t:'n', z:'MM/DD/YYYY' },'Yes','No','ARD convened 11/21. MDR completed — not manifestation.','Yes','Referred to DAEP','3rd incident this year. Extended placement approved.','Ms. Garcia'],
    ['INC-004','STU-004',{ v: excelDate('2026-02-20'), t:'n', z:'MM/DD/YYYY' },'Lincoln High','Defiance/Insubordination','TEC §37.006 — Mandatory DAEP Removal','No','No','Mr. Kim','Assistant Principal',{ v: excelDate('2026-02-20'), t:'n', z:'MM/DD/YYYY' },'No','No','4th behavioral referral. Parent conference held.','Yes','Referred to DAEP','Repeat offender — escalated to DAEP per matrix.','Mr. Patel'],
    ['INC-005','STU-005',{ v: excelDate('2026-03-01'), t:'n', z:'MM/DD/YYYY' },'Jefferson Middle','Harassment/Bullying','TEC §37.006 — Mandatory DAEP Removal','Yes','Yes','Mr. Thompson','Vice Principal',{ v: excelDate('2026-03-01'), t:'n', z:'MM/DD/YYYY' },'Yes','No','Victim support services offered. Parent notified.','Yes','Referred to DAEP','Sustained cyberbullying campaign — DAEP placement.','Ms. Torres'],
  ]
  incidents.forEach((row, i) => {
    row.forEach((val, c) => {
      incLog[R(i + 2, c)] = typeof val === 'object' ? val : typeof val === 'number' ? { v: val, t: 'n' } : { v: val, t: 's' }
    })
  })

  // ── DAEP Placements — 4 active placements ──
  const placementsData = [
    ['PLC-001','STU-001','Carlos Ramirez','8th Grade','Jefferson Middle',{ v: excelDate('2026-01-17'), t:'n', z:'MM/DD/YYYY' },45,'No',{ v: excelDate('2026-03-03'), t:'n', z:'MM/DD/YYYY' },'','','Yes','Ms. Torres','Mr. Thompson','','','','Compliant','','MDR completed 1/16 — not manifestation.','INC-001',''],
    ['PLC-002','STU-002','Destiny Johnson','10th Grade','Lincoln High',{ v: excelDate('2026-02-05'), t:'n', z:'MM/DD/YYYY' },60,'No',{ v: excelDate('2026-04-06'), t:'n', z:'MM/DD/YYYY' },'','','No','Mr. Patel','Mr. Kim','','','','Compliant','','No SPED services required.','INC-002',''],
    ['PLC-003','STU-003','Marcus Williams','6th Grade','Roosevelt Middle',{ v: excelDate('2025-11-22'), t:'n', z:'MM/DD/YYYY' },90,'Yes',{ v: excelDate('2026-02-19'), t:'n', z:'MM/DD/YYYY' },'','','Yes','Ms. Garcia','Ms. Rivera','Extended 30 days — ARD 2/18','','','Non-Compliant — Pending MDR','','Annual IEP review due during placement.','INC-003',''],
    ['PLC-004','STU-004','Linh Nguyen','9th Grade','Lincoln High',{ v: excelDate('2026-02-22'), t:'n', z:'MM/DD/YYYY' },30,'No',{ v: excelDate('2026-03-24'), t:'n', z:'MM/DD/YYYY' },'','','No','Mr. Patel','Mr. Kim','','','','Compliant','','No SPED/504 — standard placement.','INC-004',''],
  ]
  placementsData.forEach((row, i) => {
    row.forEach((val, c) => {
      placements[R(i + 2, c)] = typeof val === 'object' ? val : typeof val === 'number' ? { v: val, t: 'n' } : { v: val, t: 's' }
    })
  })

  // ── Compliance Checklist — 3 sample items (data starts row 4 = index 3) ──
  const compItems = [
    ['CC-001','STU-001','Carlos Ramirez','INC-001','MDR',{ v: excelDate('2026-01-15'), t:'n', z:'MM/DD/YYYY' },'Manifestation Determination Review (MDR)','SPED — IEP',{ v: excelDate('2026-01-17'), t:'n', z:'MM/DD/YYYY' },'10','','Not Applicable — Completed',{ v: excelDate('2026-01-16'), t:'n', z:'MM/DD/YYYY' },'Ms. Garcia','Complete','','Completed day before placement. MDR determination: not manifestation.'],
    ['CC-002','STU-003','Marcus Williams','INC-003','Annual IEP',{ v: excelDate('2025-11-22'), t:'n', z:'MM/DD/YYYY' },'Annual IEP Review (Due During Placement)','SPED — IEP',{ v: excelDate('2026-02-22'), t:'n', z:'MM/DD/YYYY' },'','','Annual review falls within extended placement.',{ v: null, t:'s' },'Ms. Garcia','In Progress','','ARD meeting scheduled for 2/22. Parent notified.'],
    ['CC-003','STU-005','Keisha Davis','INC-005','MDR',{ v: excelDate('2026-03-01'), t:'n', z:'MM/DD/YYYY' },'Manifestation Determination Review (MDR)','SPED — IEP',{ v: excelDate('2026-03-03'), t:'n', z:'MM/DD/YYYY' },'10','','MDR required within 10 school days.',{ v: null, t:'s' },'Ms. Torres','Not Started','','URGENT: MDR must be held by 3/14.'],
  ]
  compItems.forEach((row, i) => {
    row.forEach((val, c) => {
      compliance[R(i + 3, c)] = typeof val === 'object' && val !== null ? val : typeof val === 'number' ? { v: val, t: 'n' } : { v: val, t: 's' }
    })
  })
}

// ═════════════════════════════════════════════════════════════
// TAB 10 — STATUS BOARD (printable weekly report)
// ═════════════════════════════════════════════════════════════
function buildStatusBoard() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, '📋 WEEKLY DAEP STATUS BOARD')
  setCell(ws, r, 0, fs(`"As of: "&TEXT(TODAY(),"MMMM D, YYYY")`))
  merge(ws, 'A2:H2')
  r++
  setStr(ws, r++, 0, 'Print this tab for your Monday morning principal briefing. All data auto-updates from your other tabs.')
  r++

  // ── SECTION 1: Active Placements ──
  setStr(ws, r++, 0, '🔴 ACTIVE DAEP PLACEMENTS')
  const hdr = ['Student ID','Student Name','Grade','Placement Days','Start Date','Planned End','Days Remaining','SPED?']
  hdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  // Pull from Roster — 5 data rows (sample + overflow)
  for (let i = 0; i < 20; i++) {
    const rosterRow = i + 3  // Excel row 3 = first data row in Roster
    ;[0,1,2,3].forEach(c => {
      setCell(ws, r + i, c, fs(`IF(Roster!A${rosterRow}="","",IF(Roster!I${rosterRow}="Active",Roster!${['A','B','C','D'][c]}${rosterRow},""))`))
    })
    setCell(ws, r + i, 4, fv(`IF(Roster!A${rosterRow}="","",IF(Roster!I${rosterRow}="Active",Roster!P${rosterRow},""))`))
    setCell(ws, r + i, 5, fv(`IF(Roster!A${rosterRow}="","",IF(Roster!I${rosterRow}="Active",Roster!Q${rosterRow},""))`))
    setCell(ws, r + i, 6, fs(`IF(Roster!A${rosterRow}="","",IF(Roster!I${rosterRow}="Active",Roster!R${rosterRow},""))`))
    setCell(ws, r + i, 7, fs(`IF(Roster!A${rosterRow}="","",IF(Roster!I${rosterRow}="Active",Roster!J${rosterRow},""))`))
  }
  r += 20
  r++

  // ── SECTION 2: Compliance Items Due This Week ──
  setStr(ws, r++, 0, '⚠ COMPLIANCE ITEMS DUE WITHIN 10 DAYS')
  const chdr = ['Student ID','Student Name','Action Required','Deadline Date','Days Remaining','Status']
  chdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 10; i++) {
    const ccRow = i + 4  // Compliance Checklist data starts row 4
    setCell(ws, r + i, 0, fs(`IF('Compliance Checklist'!B${ccRow}="","",IF(AND('Compliance Checklist'!L${ccRow}<>"✅ Done",'Compliance Checklist'!L${ccRow}<>""),'Compliance Checklist'!B${ccRow},""))`))
    setCell(ws, r + i, 1, fs(`IF('Compliance Checklist'!C${ccRow}="","",IF(AND('Compliance Checklist'!L${ccRow}<>"✅ Done",'Compliance Checklist'!L${ccRow}<>""),'Compliance Checklist'!C${ccRow},""))`))
    setCell(ws, r + i, 2, fs(`IF('Compliance Checklist'!G${ccRow}="","",IF(AND('Compliance Checklist'!L${ccRow}<>"✅ Done",'Compliance Checklist'!L${ccRow}<>""),'Compliance Checklist'!G${ccRow},""))`))
    setCell(ws, r + i, 3, fv(`IF('Compliance Checklist'!K${ccRow}="","",IF(AND('Compliance Checklist'!L${ccRow}<>"✅ Done",'Compliance Checklist'!L${ccRow}<>""),'Compliance Checklist'!K${ccRow},""))`))
    setCell(ws, r + i, 4, fs(`IF('Compliance Checklist'!B${ccRow}="","",IF(AND('Compliance Checklist'!L${ccRow}<>"✅ Done",'Compliance Checklist'!L${ccRow}<>""),'Compliance Checklist'!L${ccRow},""))`))
    setCell(ws, r + i, 5, fs(`IF('Compliance Checklist'!M${ccRow}="","",IF(AND('Compliance Checklist'!L${ccRow}<>"✅ Done",'Compliance Checklist'!L${ccRow}<>""),'Compliance Checklist'!M${ccRow},""))`))
  }
  r += 10
  r++

  // ── SECTION 3: Summary Counts ──
  setStr(ws, r++, 0, '📊 SNAPSHOT COUNTS')
  const snaps = [
    ['Active Placements',     fs(`COUNTIF(Roster!I:I,"Active")`)],
    ['Expiring ≤ 5 Days',     fs(`COUNTIFS(Roster!I:I,"Active",Roster!P:P,">="&0,Roster!P:P,"<="&5)`)],
    ['Overdue Placements',    fs(`COUNTIFS(Roster!I:I,"Active",Roster!P:P,"<0")`)],
    ['SPED Students Active',  fs(`COUNTIFS(Roster!I:I,"Active",Roster!J:J,"Yes")`)],
    ['Open Compliance Items', fs(`COUNTIFS('Compliance Checklist'!M:M,"Not Started")+COUNTIFS('Compliance Checklist'!M:M,"In Progress")`)],
    ['Urgent Compliance (≤3d)',fs(`COUNTIF('Compliance Checklist'!L:L,"🔴*")`)],
  ]
  snaps.forEach(([label, formula], i) => {
    setStr(ws, r + i, 0, label)
    ws[R(r + i, 1)] = formula
  })
  r += snaps.length
  r++

  setStr(ws, r, 0, '─── Generated by DAEP Student Tracker — Texas Edition | Clear Path Education Group, LLC | clearpathedgroup.com ───')
  merge(ws, `A${r+1}:H${r+1}`)

  setRange(ws, r + 2, 8)
  setColWidths(ws, [100, 160, 160, 180, 120, 110, 120, 80])
  return ws
}

// ═════════════════════════════════════════════════════════════
// ASSEMBLE WORKBOOK
// ═════════════════════════════════════════════════════════════
XLSX.utils.book_append_sheet(wb, buildCover(),      'Cover')
XLSX.utils.book_append_sheet(wb, buildRoster(),     'Roster')
XLSX.utils.book_append_sheet(wb, buildIncidentLog(),'Incident Log')
XLSX.utils.book_append_sheet(wb, buildPlacements(), 'DAEP Placements')
XLSX.utils.book_append_sheet(wb, buildCompliance(), 'Compliance Checklist')
XLSX.utils.book_append_sheet(wb, buildDashboard(),  'Dashboard')
XLSX.utils.book_append_sheet(wb, buildStatusBoard(),'📋 Status Board')
XLSX.utils.book_append_sheet(wb, buildReference(),  'Reference')
XLSX.utils.book_append_sheet(wb, buildUpgrade(),    '↑ Upgrade to Waypoint')
XLSX.utils.book_append_sheet(wb, buildLists(),      'Lists')

// Inject sample demo data so all formulas are live on open
addDaepSampleData(wb)

// ─── Output ───────────────────────────────────────────────────
const OUTPUT = 'DAEP-Student-Tracker-Texas-Edition.xlsx'
XLSX.writeFile(wb, OUTPUT)
console.log(`\n✅ Built: ${OUTPUT}`)
console.log(`\nNEXT STEPS:`)
console.log(`  1. Open in Google Sheets (File → Import, or upload to Drive)`)
console.log(`  2. Apply color formatting using the spec (navy headers, gold warnings, red overdue, green complete)`)
console.log(`  3. Apply data validation dropdowns from the Lists tab to each column`)
console.log(`  4. Test with 3-5 sample student rows, then delete test data before publishing`)
console.log(`  5. Protect formula columns (⚙ suffix) and header rows before sharing\n`)
