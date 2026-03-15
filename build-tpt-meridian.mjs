/**
 * build-tpt-meridian.mjs
 * Generates: Meridian-SPED-Compliance-Tracker-Texas-Edition.xlsx
 * Brand: Clear Path Education Group, LLC
 * Product: Meridian — Special Education Compliance Tracker
 * Accent color: Purple (#7B2D8B)
 * Run: node build-tpt-meridian.mjs
 */

import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────
// CONSTANTS (from useMeridian.js + Texas SPED law)
// ─────────────────────────────────────────────────────────────
const SPED_STATUS   = ['Eligible — Active IEP','Referred — Evaluation Pending','Exited SPED','Not Eligible','504 Only','Dyslexia Only']
const IEP_STATUS    = ['Active','Draft — Not Yet Signed','Annual Review Due','Expired — Needs Renewal','Exited']
const PLAN_504_STATUS = ['Active','Draft','Annual Review Due','Expired','Discontinued']
const HB3928_STATUS = ['Pending Review','Review Complete','Not Applicable']
const CAP_STATUS    = ['Open','In Progress','Systemic Corrected — Child Pending','Closed']
const TRANSITION_YN = ['Yes','No','N/A']
const SPED_CODES    = [
  'Autism (AU)','Deaf-Blindness (DB)','Emotional Disturbance (ED)',
  'Hearing Impairment (HI)','Intellectual Disability (ID)',
  'Learning Disability (LD)','Multiple Disabilities (MD)',
  'Noncategorical Early Childhood (NCI)','Other Health Impairment (OHI)',
  'Orthopedic Impairment (OI)','Speech Impairment (SI)',
  'Traumatic Brain Injury (TBI)','Visual Impairment (VI)',
]
const GRADES = [
  'Pre-K','Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade',
  '5th Grade','6th Grade','7th Grade','8th Grade','9th Grade',
  '10th Grade','11th Grade','12th Grade',
]
const YES_NO = ['Yes','No']

const SPPI_INDICATORS = [
  'SPPI-1 — Graduation Rate',
  'SPPI-2 — Drop-Out Rate',
  'SPPI-3 — Assessment Participation & Performance',
  'SPPI-4 — Suspension/Expulsion Rates',
  'SPPI-5 — LRE — School-Age',
  'SPPI-6 — LRE — Preschool',
  'SPPI-7 — Preschool Outcomes',
  'SPPI-8 — Parent Involvement',
  'SPPI-9 — Disproportionate Representation',
  'SPPI-10 — Disproportionate Representation by Disability',
  'SPPI-11 — Child Find / Timely Evaluation',
  'SPPI-12 — Early Childhood Transition',
  'SPPI-13 — Secondary Transition (age 16+)',
  'SPPI-14 — Post-Secondary Outcomes',
]

const RDA_LEVELS = ['DL1 — Needs Assistance','DL2 — Needs Intervention (90-day check-in)','DL3 — Needs Substantial Intervention (60-day check-in)','DL4 — Needs Intensive Intervention (30-day check-in)']

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const R  = (r, c) => XLSX.utils.encode_cell({ r, c })
const sv = v => ({ v, t: 's' })
const fv = f => ({ f, t: 'n' })
const fs = f => ({ f, t: 's' })

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

// Convert date string to Excel serial number
function excelDate(str) {
  return Math.round(new Date(str + 'T12:00:00Z').getTime() / 86400000 + 25569)
}

const wb = XLSX.utils.book_new()

// ═════════════════════════════════════════════════════════════
// COVER
// ═════════════════════════════════════════════════════════════
function buildCover() {
  const ws = {}

  setStr(ws, 0, 0, 'Meridian — Special Education Compliance Tracker')
  setStr(ws, 1, 0, 'IEP · 504 · Dyslexia/HB 3928 · CAP Findings · SPPI-13 Secondary Transition')
  setStr(ws, 2, 0, 'Clear Path Education Group, LLC  |  Built for Texas SPED coordinators and special education directors.')
  setStr(ws, 3, 0, 'Track compliance deadlines, IEP annual reviews, HB 3928 obligations, and TEA corrective action — all in one file.')
  merge(ws, 'A1:L1') ; merge(ws, 'A2:L2') ; merge(ws, 'A3:L3') ; merge(ws, 'A4:L4')

  setStr(ws, 5, 0, '─── FILL IN YOUR DISTRICT INFORMATION ─────────────────────────────')
  merge(ws, 'A6:L6')
  setStr(ws, 6, 0, 'District Name:')   ; setStr(ws, 6, 2, '')
  setStr(ws, 7, 0, 'School Year:')     ; setStr(ws, 7, 2, '2025-26')
  setStr(ws, 8, 0, 'SPED Director:')   ; setStr(ws, 8, 2, '')
  setStr(ws, 9, 0, '504 Coordinator:') ; setStr(ws, 9, 2, '')
  setStr(ws, 10, 0, 'Date Updated:')   ; setStr(ws, 10, 2, '')

  setStr(ws, 12, 0, '─── HOW TO USE THIS TRACKER ──────────────────────────────────────────')
  merge(ws, 'A13:L13')
  const steps = [
    '1.  SPED STUDENT ROSTER — Add every SPED and 504-eligible student. This tab feeds all other tabs.',
    '2.  IEP TRACKER — One row per student with an active IEP. Tracks annual review dates and ARD status.',
    '3.  504 PLAN TRACKER — One row per student with a 504 plan. Tracks review dates, dyslexia flags, and HB 3928.',
    '4.  DYSLEXIA / HB 3928 — Tracks students with dyslexia identification and required review status.',
    '5.  CAP FINDINGS TRACKER — Log TEA Corrective Action Plan findings, tasks, and deadlines.',
    '6.  SPPI-13 SECONDARY TRANSITION — Tracks grades 10–12 SPED students against SPPI-13 compliance requirements.',
    '7.  DASHBOARD — Auto-summary. No data entry needed here.',
    '8.  REFERENCE — IDEA compliance timelines, SPPI indicators, HB 3928 requirements, glossary.',
    '9.  Gray cells = auto-calculated formulas — do NOT type in them.',
    '10. Works in Google Sheets AND Microsoft Excel.',
    '11. For automated deadline tracking, multi-campus visibility, and TEA reporting: see UPGRADE TO MERIDIAN tab.',
  ]
  steps.forEach((s, i) => { setStr(ws, 13 + i, 0, s) ; merge(ws, `A${14+i}:L${14+i}`) })

  setStr(ws, 25, 0, '─── KEY TEXAS SPED COMPLIANCE DATES ─────────────────────────────────')
  merge(ws, 'A26:L26')
  const notices = [
    'IEP Annual Review: Must be held within 12 months of the previous annual review (IDEA 34 CFR §300.324).',
    'Initial Evaluation: Must be completed within 60 calendar days of receiving parental consent (19 TAC §89.1011).',
    'ARD Meeting Notice: Written notice required at least 5 calendar days before any ARD meeting (19 TAC §89.1050).',
    'HB 3928 Review: Annual review of all students with dyslexia plans required under Texas HB 3928 (2021).',
    'SPPI-13 Compliance: Transition planning required in IEP for all eligible students at age 16 (or earlier).',
    'CAP Deadlines: Vary by TEA finding — track systemic and child-specific correction deadlines separately.',
  ]
  notices.forEach((n, i) => { setStr(ws, 26 + i, 0, n) ; merge(ws, `A${27+i}:L${27+i}`) })

  setStr(ws, 33, 0, '© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  For organizational use only — not legal advice.')
  merge(ws, 'A34:L34')

  setRange(ws, 35, 12)
  setColWidths(ws, [250, 20, 200, 150, 150, 100, 100, 100, 100, 100, 100, 100])
  return ws
}

// ═════════════════════════════════════════════════════════════
// SPED STUDENT ROSTER
// ═════════════════════════════════════════════════════════════
function buildRoster() {
  const ws = {}
  const END = 201

  setStr(ws, 0, 0, 'SPED STUDENT ROSTER — Students with IEPs, 504 Plans, or Dyslexia Identification')
  merge(ws, 'A1:N1')

  const headers = [
    'Student ID','Last Name','First Name','Grade','Campus',
    'SPED Status','Primary Disability','504 Plan?',
    'Dyslexia Identified?','HB 3928 Review Status',
    'Waypoint Student ID (if linked)','IEP Count ⚙','504 Count ⚙','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  fillFormulas(ws, 11, 2, END - 1, r =>
    fv(`COUNTIF('IEP Tracker'!B:B,A${r})`)
  )
  fillFormulas(ws, 12, 2, END - 1, r =>
    fv(`COUNTIF('504 Plan Tracker'!B:B,A${r})`)
  )

  setRange(ws, END, 14)
  setColWidths(ws, [90,110,110,90,130,160,160,80,90,140,130,80,80,200])
  ws['!freeze'] = { ySplit: 2, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// IEP TRACKER
// ═════════════════════════════════════════════════════════════
function buildIEPTracker() {
  const ws = {}
  const END = 201

  setStr(ws, 0, 0, 'IEP TRACKER — One Row Per Active IEP')
  merge(ws, 'A1:R1')
  setStr(ws, 1, 0, '⚠ Annual review must be held within 12 months of the previous review date. ARD meeting notice required 5 calendar days in advance (19 TAC §89.1050).')
  merge(ws, 'A2:R2')

  const headers = [
    'IEP ID','Student ID','Last Name ⚙','First Name ⚙','Grade ⚙','Campus ⚙',
    'IEP Status','Case Manager',
    'Last Annual Review Date','Annual Review Due Date',
    'Days Until Review ⚙','Annual Review Held?','Date Review Held',
    'ARD Meeting Scheduled?','ARD Meeting Date',
    'Next Re-Evaluation Due','SPED Status ⚙','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Data starts row index 3 (Excel row 4)
  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 4, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$E,4,FALSE),"")`)
  )
  fillFormulas(ws, 5, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$F,5,FALSE),"")`)
  )
  // Days Until Review
  fillFormulas(ws, 10, 3, END - 1, r =>
    fs(`IF(J${r}="","",IF(L${r}="Yes","✅ Review Held",IF(J${r}<TODAY(),"❌ OVERDUE ("&TEXT(TODAY()-J${r},"0")&"d)",IF(J${r}-TODAY()<=7,"🔴 "&TEXT(J${r}-TODAY(),"0")&"d — URGENT",IF(J${r}-TODAY()<=30,"⚠ "&TEXT(J${r}-TODAY(),"0")&"d","🟢 "&TEXT(J${r}-TODAY(),"0")&"d")))))`)
  )
  // SPED Status from Roster
  fillFormulas(ws, 16, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$G,6,FALSE),"")`)
  )

  setRange(ws, END, 18)
  setColWidths(ws, [80,90,110,110,80,130,120,150,120,120,100,100,110,110,110,130,130,200])
  ws['!freeze'] = { ySplit: 3, xSplit: 4 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// 504 PLAN TRACKER
// ═════════════════════════════════════════════════════════════
function build504Tracker() {
  const ws = {}
  const END = 201

  setStr(ws, 0, 0, '504 PLAN TRACKER — One Row Per Active 504 Plan')
  merge(ws, 'A1:R1')
  setStr(ws, 1, 0, '⚠ Section 504 plans require annual review (34 CFR §104.36). Dyslexia plans must comply with HB 3928 and include MDT composition verification.')
  merge(ws, 'A2:R2')

  const headers = [
    '504 ID','Student ID','Last Name ⚙','First Name ⚙','Grade ⚙','Campus ⚙',
    '504 Status','Case Manager',
    'Last Annual Review Date','Annual Review Due Date',
    'Days Until Review ⚙','Review Held?','Date Review Held',
    'Is Dyslexia Plan?','HB 3928 Reviewed?','MDT Composition Verified?',
    'Progress Report Required?','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 4, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$E,4,FALSE),"")`)
  )
  fillFormulas(ws, 5, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$F,5,FALSE),"")`)
  )
  fillFormulas(ws, 10, 3, END - 1, r =>
    fs(`IF(J${r}="","",IF(L${r}="Yes","✅ Review Held",IF(J${r}<TODAY(),"❌ OVERDUE ("&TEXT(TODAY()-J${r},"0")&"d)",IF(J${r}-TODAY()<=7,"🔴 "&TEXT(J${r}-TODAY(),"0")&"d — URGENT",IF(J${r}-TODAY()<=30,"⚠ "&TEXT(J${r}-TODAY(),"0")&"d","🟢 "&TEXT(J${r}-TODAY(),"0")&"d")))))`)
  )

  setRange(ws, END, 18)
  setColWidths(ws, [80,90,110,110,80,130,110,150,120,120,100,100,110,100,110,130,120,200])
  ws['!freeze'] = { ySplit: 3, xSplit: 4 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// DYSLEXIA / HB 3928 TRACKER
// ═════════════════════════════════════════════════════════════
function buildDyslexia() {
  const ws = {}
  const END = 151

  setStr(ws, 0, 0, 'DYSLEXIA & HB 3928 TRACKER — Students with Dyslexia Identification')
  merge(ws, 'A1:P1')
  setStr(ws, 1, 0, 'Texas HB 3928 (2021) requires annual review of all students identified with dyslexia, MDT composition verification, and structured literacy instruction. This tracker monitors required annual actions.')
  merge(ws, 'A2:P2')

  const headers = [
    'Student ID','Last Name ⚙','First Name ⚙','Grade ⚙','Campus ⚙',
    'Dyslexia Identification Date','Dyslexia Program / Intervention',
    'HB 3928 Annual Review Status',
    '504 Plan Linked?','504 Plan ID',
    'MDT Composition Verified?',
    'Progress Report Required?','Progress Report Due Date',
    'Progress Report Status',
    'Structured Literacy Instruction Confirmed?','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-fill from Roster (dyslexia tab starts data at row index 3)
  fillFormulas(ws, 1, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$D,3,FALSE),"")`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$E,4,FALSE),"")`)
  )
  fillFormulas(ws, 4, 3, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$F,5,FALSE),"")`)
  )

  setRange(ws, END, 16)
  setColWidths(ws, [90,110,110,80,130,140,200,140,90,90,130,120,130,120,160,200])
  ws['!freeze'] = { ySplit: 3, xSplit: 3 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// CAP FINDINGS TRACKER
// ═════════════════════════════════════════════════════════════
function buildCAP() {
  const ws = {}

  setStr(ws, 0, 0, 'CAP FINDINGS TRACKER — TEA Corrective Action Plan Findings and Tasks')
  merge(ws, 'A1:N1')
  setStr(ws, 1, 0, 'Log each finding from a TEA monitoring visit or complaint investigation. Track systemic and child-specific correction deadlines separately. Each finding may have multiple tasks — use the CAP TASKS section below.')
  merge(ws, 'A2:N2')

  // FINDINGS (rows 3–52)
  setStr(ws, 2, 0, 'SECTION A: FINDINGS')
  merge(ws, 'A3:N3')

  const findingHeaders = [
    'Finding ID','Campus (if specific)','Finding Number (TEA)',
    'Description','Legal Citation',
    'Issued Date','Systemic Correction Due',
    'Child-Specific Correction Due',
    'Days Until Systemic Due ⚙','Days Until Child Due ⚙',
    'Status','Date Closed','TEA Response Required?','Notes',
  ]
  findingHeaders.forEach((h, c) => setStr(ws, 3, c, h))

  for (let r = 4; r <= 53; r++) {
    const er = r + 1
    setCell(ws, r, 8, fs(`IF(G${er}="","",IF(K${er}="Closed","Closed",TEXT(G${er}-TODAY(),"0")&" days"))`))
    setCell(ws, r, 9, fs(`IF(H${er}="","",IF(K${er}="Closed","Closed",TEXT(H${er}-TODAY(),"0")&" days"))`))
  }

  // TASKS (rows 55–154)
  setStr(ws, 54, 0, 'SECTION B: TASKS (one row per task; link to Finding ID in column A above)')
  merge(ws, 'A55:N55')

  const taskHeaders = [
    'Task ID','Finding ID (cross-ref)','Task Description',
    'Assigned To','Due Date',
    'Days Until Due ⚙','Status','Completion Date',
    'Evidence / Documentation','Notes','','','','',
  ]
  taskHeaders.forEach((h, c) => setStr(ws, 55, c, h))

  for (let r = 56; r <= 155; r++) {
    const er = r + 1
    setCell(ws, r, 5, fs(`IF(E${er}="","",IF(H${er}<>"","Done",TEXT(E${er}-TODAY(),"0")&" days"))`))
  }

  setRange(ws, 156, 14)
  setColWidths(ws, [80,130,130,250,180,120,130,130,100,100,100,100,120,200])
  ws['!freeze'] = { ySplit: 4, xSplit: 0 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// SPPI-13 SECONDARY TRANSITION
// ═════════════════════════════════════════════════════════════
function buildSPPI13() {
  const ws = {}
  const END = 101

  setStr(ws, 0, 0, 'SPPI-13 — SECONDARY TRANSITION COMPLIANCE TRACKER')
  merge(ws, 'A1:S1')
  setStr(ws, 1, 0, 'SPPI-13 requires that 100% of SPED students age 16+ (or younger if appropriate) have appropriate measurable postsecondary goals, transition services, and coordinated activities in their IEP. (IDEA 20 U.S.C. §1414(d)(1)(A)(VIII))')
  merge(ws, 'A2:S2')
  setStr(ws, 2, 0, 'This tracker covers all 5 core SPPI-13 compliance elements. Each column is a required component. ALL five must be "Yes" for a student to be counted as compliant.')
  merge(ws, 'A3:S3')

  const headers = [
    'Student ID','Last Name ⚙','First Name ⚙','Grade ⚙','Campus ⚙',
    'School Year',
    '1. Postsecondary Goals in IEP?','Goals Date',
    '2. Transition Assessments Completed?','Assessment Date','Assessment Types Used',
    '3. Transition Services in IEP?','Services Date',
    '4. Student Participated in Planning?','Participation Date',
    '5. Outside Agency Invited?','Agency Name','Agency Invitation Date',
    'SPPI-13 Compliant? ⚙','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 3, c, h))

  // Data rows start at index 4
  fillFormulas(ws, 1, 4, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 2, 4, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$D,3,FALSE),"")`)
  )
  fillFormulas(ws, 3, 4, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$E,4,FALSE),"")`)
  )
  fillFormulas(ws, 4, 4, END - 1, r =>
    fs(`IFERROR(VLOOKUP(A${r},Roster!$A:$F,5,FALSE),"")`)
  )
  // SPPI-13 Compliant? All 5 = Yes
  fillFormulas(ws, 18, 4, END - 1, r =>
    fs(`IF(OR(G${r}="",I${r}="",L${r}="",N${r}="",P${r}=""),"Incomplete",IF(AND(G${r}="Yes",I${r}="Yes",L${r}="Yes",N${r}="Yes",P${r}="Yes"),"✅ COMPLIANT","❌ NOT COMPLIANT"))`)
  )

  setRange(ws, END, 20)
  setColWidths(ws, [90,110,110,80,130,100,110,110,130,110,160,110,110,120,120,110,130,120,120,200])
  ws['!freeze'] = { ySplit: 4, xSplit: 3 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════
function buildDashboard() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, 'DASHBOARD — SPED Compliance Summary (No Data Entry Needed)')
  merge(ws, 'A1:L1')
  setCell(ws, r, 0, fs(`"Reflects data as of: "&TEXT(TODAY(),"MM/DD/YYYY")`))
  merge(ws, `A${r+1}:L${r+1}`)
  r++ ; r++

  setStr(ws, r, 0, 'KEY METRICS')
  merge(ws, `A${r+1}:L${r+1}`)
  r++

  const metrics = [
    ['Total SPED Students',           `MAX(0,COUNTA('SPED Student Roster'!B:B)-2)`],
    ['Students with Active IEPs',      `COUNTIF('IEP Tracker'!G:G,"Active")`],
    ['IEP Annual Reviews Due (30d)',    `COUNTIFS('IEP Tracker'!K:K,"<="&30,'IEP Tracker'!L:L,"<>Yes")`],
    ['IEP Annual Reviews Overdue',      `COUNTIFS('IEP Tracker'!J:J,"<"&TODAY(),'IEP Tracker'!L:L,"<>Yes")`],
    ['Active 504 Plans',               `COUNTIF('504 Plan Tracker'!G:G,"Active")`],
    ['504 Reviews Due (30d)',           `COUNTIFS('504 Plan Tracker'!K:K,"<="&30,'504 Plan Tracker'!L:L,"<>Yes")`],
    ['504 Reviews Overdue',             `COUNTIFS('504 Plan Tracker'!J:J,"<"&TODAY(),'504 Plan Tracker'!L:L,"<>Yes")`],
    ['Students with Dyslexia',          `MAX(0,COUNTA('Dyslexia-HB 3928'!A:A)-3)`],
    ['HB 3928 Reviews Pending',         `COUNTIF('Dyslexia-HB 3928'!H:H,"Pending Review")`],
    ['Open CAP Findings',              `COUNTIF('CAP Findings'!K:K,"Open")+COUNTIF('CAP Findings'!K:K,"In Progress")`],
    ['CAP Tasks Overdue',              `COUNTIFS('CAP Findings'!G:G,"<"&TODAY(),'CAP Findings'!H:H,"")`],
    ['SPPI-13 Compliant Students',     `COUNTIF('SPPI-13 Transition'!S:S,"✅ COMPLIANT")`],
    ['SPPI-13 Non-Compliant Students', `COUNTIF('SPPI-13 Transition'!S:S,"❌ NOT COMPLIANT")`],
  ]

  metrics.forEach(([label, formula]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 1, fv(formula))
    r++
  })
  r++

  setStr(ws, r, 0, 'SPED STUDENTS BY STATUS')
  merge(ws, `A${r+1}:L${r+1}`)
  r++
  SPED_STATUS.forEach(s => {
    setStr(ws, r, 0, s)
    setCell(ws, r, 1, fv(`COUNTIF('SPED Student Roster'!F:F,"${s}")`))
    r++
  })
  r++

  setStr(ws, r, 0, 'IEP ANNUAL REVIEW COUNTDOWN')
  merge(ws, `A${r+1}:L${r+1}`)
  r++
  setStr(ws, r, 0, '[GOOGLE SHEETS] Dynamic filter — paste in A below:')
  merge(ws, `A${r+1}:L${r+1}`)
  r++
  setStr(ws, r, 0, `=IFERROR(FILTER('IEP Tracker'!C4:R500,ISNUMBER(VALUE('IEP Tracker'!K4:K500)),'IEP Tracker'!L4:L500<>"Yes"),"No pending reviews")`)
  merge(ws, `A${r+1}:L${r+1}`)
  r++
  setStr(ws, r, 0, 'For Excel: Go to IEP Tracker tab → Sort by column K (Days Until Review) ascending.')
  merge(ws, `A${r+1}:L${r+1}`)
  r++ ; r++

  setStr(ws, r, 0, '© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  Upgrade to Meridian for automated compliance tracking.')
  merge(ws, `A${r+1}:L${r+1}`)

  setRange(ws, r + 2, 12)
  setColWidths(ws, [260, 100, 100, 120, 120, 120, 120, 120, 120, 120, 120, 120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// REFERENCE
// ═════════════════════════════════════════════════════════════
function buildReference() {
  const rows = []

  rows.push(['REFERENCE — IDEA Compliance, Texas SPED Law, HB 3928, CAP Process', '', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  For organizational use only — not legal advice', '', '', ''])
  rows.push(['', '', '', ''])

  rows.push(['IDEA KEY COMPLIANCE TIMELINES', '', '', ''])
  rows.push(['Requirement', 'Timeline', 'Legal Authority', 'Notes'])
  const timelines = [
    ['Initial Evaluation — Consent to Completion', '60 calendar days from consent (Texas: 45 school days)', '19 TAC §89.1011', 'Parent must provide written consent before evaluation begins'],
    ['ARD Meeting After Evaluation', 'Within 30 calendar days of evaluation completion', '34 CFR §300.323', 'ARD committee reviews evaluation results and determines eligibility'],
    ['IEP Annual Review', 'Within 12 months of previous annual review date', '34 CFR §300.324(b)', 'Must be completed on or before anniversary of last annual review'],
    ['Three-Year Reevaluation (Triennial)', 'Every 3 years from initial eligibility date', '34 CFR §300.303', 'May be waived if parent and district agree in writing'],
    ['ARD Meeting Notice', 'At least 5 calendar days before meeting', '19 TAC §89.1050', 'Written notice required; shorter notice allowed with parent consent'],
    ['Section 504 Annual Review', 'Annually (no federal deadline — local policy applies)', '34 CFR §104.36', 'Best practice: review before school year end or at anniversary'],
    ['Prior Written Notice (PWN)', 'Before any change in placement, identification, or services', '34 CFR §300.503', 'Required regardless of whether district proposes or refuses a change'],
    ['DAEP Placement — MDR Timeline', '10 school days from placement decision', 'TEC §37.004; 34 CFR §300.530', 'MDR required for any DAEP placement of a SPED student'],
  ]
  timelines.forEach(t => rows.push(t))
  rows.push(['', '', '', ''])

  rows.push(['SPPI INDICATORS — IDEA STATE PERFORMANCE PLAN', '', '', ''])
  rows.push(['Indicator', 'Description', '', ''])
  SPPI_INDICATORS.forEach(ind => {
    const [num, ...rest] = ind.split(' — ')
    rows.push([num, rest.join(' — '), '', ''])
  })
  rows.push(['', '', '', ''])

  rows.push(['SPPI-13 COMPLIANCE — FIVE REQUIRED COMPONENTS', '', '', ''])
  rows.push(['Component', 'Requirement', 'Legal Authority', 'Documentation Needed'])
  const sppi13 = [
    ['1. Postsecondary Goals', 'IEP must include appropriate measurable postsecondary goals for education/training, employment, and (where appropriate) independent living', 'IDEA 20 U.S.C. §1414(d)(1)(A)(VIII)', 'Goals documented in IEP; goals based on transition assessment'],
    ['2. Transition Assessments', 'Goals must be based on age-appropriate transition assessments', 'IDEA 20 U.S.C. §1414(d)(1)(A)(VIII)(aa)', 'Assessment types documented; results referenced in IEP'],
    ['3. Transition Services', 'IEP must include transition services aligned with postsecondary goals', 'IDEA 20 U.S.C. §1414(d)(1)(A)(VIII)(bb)', 'Services listed in IEP; responsible parties identified'],
    ['4. Student Participated', 'Student must be invited to and have opportunity to participate in IEP meeting', 'IDEA 20 U.S.C. §1414(d)(1)(B)(vii)', 'Invitation documented; notes reflect participation'],
    ['5. Outside Agency Invited', 'Agencies responsible for transition services must be invited if consent obtained', 'IDEA 20 U.S.C. §1414(d)(1)(B)(viii)', 'Agency invitation documented; participation noted'],
  ]
  sppi13.forEach(s => rows.push(s))
  rows.push(['', '', '', ''])

  rows.push(['HB 3928 (2021) — TEXAS DYSLEXIA REQUIREMENTS', '', '', ''])
  rows.push(['Requirement', 'Description', '', ''])
  const hb3928 = [
    ['Annual Review', 'All students identified with dyslexia must have their plan reviewed annually (not just assessed — the plan itself must be reviewed and updated)'],
    ['MDT Composition', 'The team reviewing the dyslexia plan must include specific members: a certified reading specialist or dyslexia specialist, a classroom teacher, and a parent/guardian'],
    ['Structured Literacy Instruction', 'Students with dyslexia must receive structured literacy instruction (Orton-Gillingham approach or evidence-based equivalent) delivered by trained personnel'],
    ['Progress Reports', 'Dyslexia program students must receive progress reports at each reporting period (aligned to report card schedule)'],
    ['HB 3928 Review Status', 'Districts must document the annual review, MDT composition verification, and structured literacy instruction for each student'],
  ]
  hb3928.forEach(([req, desc]) => rows.push([req, desc, '', '']))
  rows.push(['', '', '', ''])

  rows.push(['CAP (CORRECTIVE ACTION PLAN) PROCESS', '', '', ''])
  rows.push(['Stage', 'Description', '', ''])
  const capProcess = [
    ['TEA Finding Issued', 'Following a monitoring visit or complaint investigation, TEA issues written findings specifying the noncompliance'],
    ['Systemic Correction', 'District must correct the system-level issue (policy, procedure, training) by the deadline specified in the finding'],
    ['Child-Specific Correction', 'For findings affecting individual students, district must provide compensatory services or retroactive correction by a separate deadline'],
    ['Evidence Submission', 'District submits documentation to TEA demonstrating correction; TEA reviews and either accepts or extends the finding'],
    ['Finding Closed', 'TEA issues written closure when both systemic and child-specific corrections are verified'],
    ['RDA Determination', 'Based on the nature and number of findings, TEA assigns a Results-Driven Accountability level (DL1–DL4) that determines check-in frequency'],
  ]
  capProcess.forEach(([s, d]) => rows.push([s, d, '', '']))
  rows.push(['', '', '', ''])

  rows.push(['RDA DETERMINATION LEVELS', '', '', ''])
  RDA_LEVELS.forEach(l => rows.push([l, '', '', '']))
  rows.push(['', '', '', ''])

  rows.push(['GLOSSARY', '', '', ''])
  rows.push(['Term', 'Definition', '', ''])
  const glossary = [
    ['ARD', 'Admission, Review, and Dismissal Committee — the IEP team under Texas law'],
    ['BIP', 'Behavior Intervention Plan — written plan based on FBA results'],
    ['CAP', 'Corrective Action Plan — TEA-issued plan requiring districts to correct identified noncompliance'],
    ['FBA', 'Functional Behavioral Assessment — evaluation to determine cause/function of a student\'s behavior'],
    ['HB 3928', 'Texas House Bill 3928 (2021) — dyslexia instruction and program review requirements'],
    ['IDEA', 'Individuals with Disabilities Education Act — federal law governing special education (34 CFR Part 300)'],
    ['IEP', 'Individualized Education Program — legal document governing SPED services for an eligible student'],
    ['LEA', 'Local Education Agency — the school district'],
    ['LRE', 'Least Restrictive Environment — IDEA requirement to educate students in settings as close to general education as appropriate'],
    ['MDR', 'Manifestation Determination Review — meeting to determine if misbehavior is caused by disability'],
    ['MDT', 'Multidisciplinary Team — team that reviews dyslexia plans under HB 3928'],
    ['PWN', 'Prior Written Notice — required before any change in placement, evaluation, or services'],
    ['RDA', 'Results-Driven Accountability — TEA framework for monitoring district SPED compliance over time'],
    ['SPED', 'Special Education — services under IDEA for students with eligible disabilities'],
    ['SPPI', 'State Performance Plan Indicator — TEA measures of district SPED performance (1–14)'],
    ['504', 'Section 504 of the Rehabilitation Act — civil rights law prohibiting disability discrimination in programs receiving federal funds'],
  ]
  glossary.forEach(([t, d]) => rows.push([t, d, '', '']))

  rows.push(['', '', '', ''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  For organizational use only', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [220, 320, 200, 220])
  return ws
}

// ═════════════════════════════════════════════════════════════
// UPGRADE TO MERIDIAN
// ═════════════════════════════════════════════════════════════
function buildUpgrade() {
  const rows = []
  rows.push(['↑ UPGRADE TO MERIDIAN — Full SPED Compliance Management Platform', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  clearpatheg.com/meridian', '', ''])
  rows.push(['', '', ''])
  rows.push(['Managing SPED compliance in a spreadsheet works — until it doesn\'t.', '', ''])
  rows.push(['Meridian automates deadline tracking, surfaces overdue items before they become findings, and integrates with your Waypoint DAEP data.', '', ''])
  rows.push(['', '', ''])
  rows.push(['WHAT MERIDIAN DOES THAT THIS TRACKER CANNOT', '', ''])
  rows.push(['Feature', 'This Tracker', 'Meridian'])
  const features = [
    ['IEP annual review tracking','Manual date math','Automated countdown; alerts sent to case manager 30/14/7 days before'],
    ['504 plan tracking','Separate tab, manual','Integrated with IEP data; auto-flags dyslexia plan requirements'],
    ['HB 3928 review tracking','Manual checkboxes','Automated review workflow with MDT composition checklist'],
    ['Compliance deadline view','Dashboard COUNTIF','Real-time compliance deadline view: overdue, critical (≤7d), warning (≤14d)'],
    ['CAP finding tracking','This tab (manual)','Structured CAP workflow with evidence upload and TEA response tracking'],
    ['SPPI-13 compliance','Manual Yes/No columns','Auto-calculated SPPI-13 compliance rate by campus'],
    ['RDA determination tracking','Not available','Built-in RDA level tracking with check-in cadence calendar'],
    ['Folder readiness score','Not available','Auto-calculated % readiness per student and campus'],
    ['Multi-campus visibility','One file','District-wide compliance dashboard by campus'],
    ['Role-based access','File sharing','Case manager, coordinator, and director roles with scoped access'],
    ['Waypoint integration','Manual cross-reference','Direct sync — SPED students flagged during DAEP incidents automatically'],
    ['Audit trail','None','Every change logged with timestamp and user'],
    ['TEA reporting export','Manual','One-click export for PEIMS and TEA monitoring data'],
  ]
  features.forEach(f => rows.push(f))
  rows.push(['', '', ''])
  rows.push(['MERIDIAN PRICING', '', ''])
  rows.push(['Starting at $4,000/year for a district (not per campus)', '', ''])
  rows.push(['Bundle with Waypoint (DAEP) + Navigator (RTI/MTSS) for full Clear Path platform pricing.', '', ''])
  rows.push(['', '', ''])
  rows.push(['→ Book a free demo:  calendly.com/clearpatheg/meridian-demo', '', ''])
  rows.push(['→ Learn more:        clearpatheg.com/meridian', '', ''])
  rows.push(['→ Email:             sales@clearpatheg.com', '', ''])
  rows.push(['', '', ''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  FERPA-compliant  |  Texas-built, Texas-focused', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [320, 200, 320])
  return ws
}

// ═════════════════════════════════════════════════════════════
// LISTS
// ═════════════════════════════════════════════════════════════
function buildLists() {
  const lists = [
    { header: 'Grade Levels',       values: GRADES },
    { header: 'SPED Status',        values: SPED_STATUS },
    { header: 'SPED Disability Codes', values: SPED_CODES },
    { header: 'IEP Status',         values: IEP_STATUS },
    { header: '504 Plan Status',    values: PLAN_504_STATUS },
    { header: 'HB 3928 Status',     values: HB3928_STATUS },
    { header: 'CAP Status',         values: CAP_STATUS },
    { header: 'Transition Yes/No',  values: TRANSITION_YN },
    { header: 'Yes / No',           values: YES_NO },
    { header: 'RDA Levels',         values: RDA_LEVELS },
  ]
  const maxLen = Math.max(...lists.map(l => l.values.length))
  const rows = [lists.map(l => l.header)]
  for (let i = 0; i < maxLen; i++) rows.push(lists.map(l => l.values[i] || ''))
  rows.push([''])
  rows.push(['HOW TO APPLY DROPDOWNS — Google Sheets: Data → Data Validation → Dropdown from range'])
  rows.push(['HOW TO APPLY DROPDOWNS — Excel: Data → Data Validation → Allow: List → Source range'])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [140, 180, 200, 130, 130, 140, 130, 130, 80, 260])
  return ws
}

// ═════════════════════════════════════════════════════════════
// SAMPLE DATA — 5 SPED students with IEP/504/dyslexia data
// ═════════════════════════════════════════════════════════════
function addMeridianSampleData(wb) {
  const roster  = wb.Sheets['SPED Student Roster']
  const iep     = wb.Sheets['IEP Tracker']
  const plan504 = wb.Sheets['504 Plan Tracker']
  const dyslex  = wb.Sheets['Dyslexia-HB 3928']

  const d = (s) => ({ v: excelDate(s), t: 'n', z: 'MM/DD/YYYY' })
  const sv = (v) => ({ v, t: 's' })
  const nv = (v) => ({ v, t: 'n' })
  const set = (ws, r, c, val) => {
    ws[R(r, c)] = typeof val === 'object' && val !== null ? val : typeof val === 'number' ? nv(val) : sv(val)
  }

  // SPED Roster: [StudentID, LastName, FirstName, Grade, Campus, SpedStatus, DisabilityCode, IEP?, Plan504?, Dyslexia?, EligibilityDate, Notes]
  const students = [
    ['MER-001','Alvarez','Elena','11th Grade','Lincoln High','Eligible — Active IEP','Learning Disability (LD)','Yes','No','Yes',d('2020-08-15'),'Annual IEP review upcoming. Dyslexia — HB 3928 review due.'],
    ['MER-002','Brown','Jaylen','8th Grade','Roosevelt Middle','Eligible — Active IEP','Emotional Disturbance (ED)','Yes','No','No',d('2018-03-22'),'Behavior plan active. ARD meeting scheduled for review.'],
    ['MER-003','Kim','Sarah','6th Grade','Jefferson Middle','504 Only','None','No','Yes','Yes',d('2021-09-10'),'Dyslexia identified 9/10/2021. 504 plan with dyslexia accommodations.'],
    ['MER-004','Washington','Darius','12th Grade','Lincoln High','Eligible — Active IEP','Intellectual Disability (ID)','Yes','No','No',d('2016-04-18'),'SPPI-13 secondary transition tracking required. Graduating this year.'],
    ['MER-005','Nguyen','Mai','9th Grade','Lincoln High','Eligible — Active IEP','Other Health Impairment (OHI)','Yes','Yes','No',d('2019-11-05'),'ADHD — both IEP and 504 active. Annual reviews within 45 days.'],
  ]
  students.forEach((row, i) => {
    row.forEach((val, c) => set(roster, i + 2, c, val))
  })

  // IEP Tracker: [IEPID, StudentID, IEPStatus, CaseManager, LastReview, DueDate, AnnualHeld, DateHeld, ARDScheduled, ARDDate, ReEvalDue]
  const ieps = [
    ['IEP-001','MER-001','Annual Review Due','Ms. Garcia',d('2025-03-15'),d('2026-03-15'),'No','','Yes',d('2026-03-10'),d('2028-03-15'),'Annual review due 3/15 — ARD scheduled.'],
    ['IEP-002','MER-002','Active','Mr. Thompson',d('2025-09-20'),d('2026-09-20'),'No','','No','',d('2028-09-20'),'BIP review concurrent with ARD. Next annual Sept 2026.'],
    ['IEP-003','MER-004','Active','Ms. Rivera',d('2025-05-01'),d('2026-05-01'),'No','','No','',d('2025-05-01'),'Transition plan: post-secondary vocational training. Graduation May 2026.'],
    ['IEP-004','MER-005','Annual Review Due','Ms. Garcia',d('2025-03-01'),d('2026-03-01'),'No','','Yes',d('2026-02-28'),d('2028-03-01'),'Annual review overdue. ARD rescheduled for 2/28.'],
  ]
  ieps.forEach((row, i) => {
    row.forEach((val, c) => set(iep, i + 3, c, val))
  })

  // 504 Tracker: [504ID, StudentID, Status, CaseManager, LastReview, DueDate, ReviewHeld, DateHeld, IsDyslexia, HB3928Reviewed, MDTVerified, ProgressRequired]
  const plans = [
    ['504-001','MER-003','Annual Review Due','Mr. Kim',d('2025-02-15'),d('2026-02-15'),'No','','Yes','Yes','Yes','Yes','Dyslexia 504 — HB 3928 compliant. Annual review overdue.'],
    ['504-002','MER-005','Active','Ms. Garcia',d('2025-04-10'),d('2026-04-10'),'No','','No','No','No','No','Standard 504 for ADHD/OHI. Annual review April 2026.'],
  ]
  plans.forEach((row, i) => {
    row.forEach((val, c) => set(plan504, i + 3, c, val))
  })

  // Dyslexia Tracker: [StudentID, DyslexiaIdDate, Program, HB3928Status, 504Linked, 504ID, MDTVerified, ProgressReqd, ProgressDue, ProgressStatus, StructuredLiteracy]
  const dyslexData = [
    ['MER-001',d('2020-08-15'),'Barton Reading and Spelling','Review Complete','No','','Yes','Yes',d('2026-03-31'),'In Progress','Yes','Annual HB 3928 review completed. Progress report due 3/31.'],
    ['MER-003',d('2021-09-10'),'Wilson Reading System','Pending Review','Yes','504-001','Yes','Yes',d('2026-02-28'),'Not Started','Yes','Annual HB 3928 review not yet completed — URGENT.'],
  ]
  dyslexData.forEach((row, i) => {
    row.forEach((val, c) => set(dyslex, i + 3, c, val))
  })
}

// ═════════════════════════════════════════════════════════════
// TAB — COMPLIANCE HEALTH BOARD (printable weekly briefing)
// ═════════════════════════════════════════════════════════════
function buildComplianceHealthBoard() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, '📋 WEEKLY SPED COMPLIANCE HEALTH BOARD')
  setCell(ws, r, 0, fs(`"As of: "&TEXT(TODAY(),"MMMM D, YYYY")`))
  merge(ws, 'A2:H2')
  r++
  setStr(ws, r++, 0, 'Print this tab for your weekly SPED compliance review. All data auto-updates from your other tabs.')
  r++

  // Section 1: IEP Reviews Due Within 30 Days
  setStr(ws, r++, 0, '🔴 IEP ANNUAL REVIEWS DUE WITHIN 30 DAYS')
  const iepHdr = ['IEP ID','Student ID','Last Name','Grade','Campus','Review Due Date','Days Remaining','Case Manager']
  iepHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 15; i++) {
    const ir = i + 4  // IEP data starts row 4 (Excel)
    ;[0,1,2,3,4].forEach((c) => {
      setCell(ws, r + i, c, fs(`IF('IEP Tracker'!B${ir}="","",IF(AND('IEP Tracker'!L${ir}<>"Yes",'IEP Tracker'!J${ir}-TODAY()<=30),'IEP Tracker'!${['A','B','C','D','E','F'][c]}${ir},""))`))
    })
    setCell(ws, r + i, 5, fv(`IF('IEP Tracker'!B${ir}="","",IF(AND('IEP Tracker'!L${ir}<>"Yes",'IEP Tracker'!J${ir}-TODAY()<=30),'IEP Tracker'!J${ir},""))`))
    setCell(ws, r + i, 6, fs(`IF('IEP Tracker'!B${ir}="","",IF(AND('IEP Tracker'!L${ir}<>"Yes",'IEP Tracker'!J${ir}-TODAY()<=30),'IEP Tracker'!K${ir},""))`))
    setCell(ws, r + i, 7, fs(`IF('IEP Tracker'!B${ir}="","",IF(AND('IEP Tracker'!L${ir}<>"Yes",'IEP Tracker'!J${ir}-TODAY()<=30),'IEP Tracker'!H${ir},""))`))
  }
  r += 15
  r++

  // Section 2: 504 Reviews Due
  setStr(ws, r++, 0, '⚠ 504 PLAN REVIEWS DUE WITHIN 30 DAYS')
  const hdr504 = ['504 ID','Student ID','Last Name','Grade','Campus','Review Due Date','Days Remaining','Case Manager']
  hdr504.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 10; i++) {
    const pr = i + 4
    ;[0,1,2,3,4,5].forEach((c) => {
      setCell(ws, r + i, c, fs(`IF('504 Plan Tracker'!B${pr}="","",IF(AND('504 Plan Tracker'!L${pr}<>"Yes",'504 Plan Tracker'!J${pr}-TODAY()<=30),'504 Plan Tracker'!${['A','B','C','D','E','F'][c]}${pr},""))`))
    })
    setCell(ws, r + i, 6, fs(`IF('504 Plan Tracker'!B${pr}="","",IF(AND('504 Plan Tracker'!L${pr}<>"Yes",'504 Plan Tracker'!J${pr}-TODAY()<=30),'504 Plan Tracker'!K${pr},""))`))
    setCell(ws, r + i, 7, fs(`IF('504 Plan Tracker'!B${pr}="","",IF(AND('504 Plan Tracker'!L${pr}<>"Yes",'504 Plan Tracker'!J${pr}-TODAY()<=30),'504 Plan Tracker'!H${pr},""))`))
  }
  r += 10
  r++

  // Section 3: Snapshot Counts
  setStr(ws, r++, 0, '📊 COMPLIANCE SNAPSHOT')
  const snaps = [
    ['Active IEPs',              fv(`MAX(0,COUNTA('IEP Tracker'!B:B)-3)`)],
    ['IEP Reviews Overdue',      fs(`COUNTIF('IEP Tracker'!K:K,"❌*")`)],
    ['IEP Reviews Due ≤7 Days',  fs(`COUNTIF('IEP Tracker'!K:K,"🔴*")`)],
    ['Active 504 Plans',         fv(`MAX(0,COUNTA('504 Plan Tracker'!B:B)-3)`)],
    ['504 Reviews Overdue',      fs(`COUNTIF('504 Plan Tracker'!K:K,"❌*")`)],
    ['Dyslexia Reviews Pending', fs(`COUNTIF('Dyslexia-HB 3928'!H:H,"Pending Review")`)],
    ['Open CAP Findings',        fs(`COUNTIF('CAP Findings'!C:C,"Open")+COUNTIF('CAP Findings'!C:C,"In Progress")`)],
  ]
  snaps.forEach(([label, formula], i) => {
    setStr(ws, r + i, 0, label)
    ws[R(r + i, 1)] = formula
  })
  r += snaps.length
  r++

  setStr(ws, r, 0, '─── Generated by Meridian — SPED Compliance Tracker | Clear Path Education Group, LLC | clearpatheg.com ───')
  merge(ws, `A${r+1}:H${r+1}`)

  setRange(ws, r + 2, 8)
  setColWidths(ws, [100, 100, 140, 100, 150, 130, 120, 150])
  return ws
}

// ═════════════════════════════════════════════════════════════
// ASSEMBLE
// ═════════════════════════════════════════════════════════════
XLSX.utils.book_append_sheet(wb, buildCover(),                'Cover')
XLSX.utils.book_append_sheet(wb, buildRoster(),               'SPED Student Roster')
XLSX.utils.book_append_sheet(wb, buildIEPTracker(),           'IEP Tracker')
XLSX.utils.book_append_sheet(wb, build504Tracker(),           '504 Plan Tracker')
XLSX.utils.book_append_sheet(wb, buildDyslexia(),             'Dyslexia-HB 3928')
XLSX.utils.book_append_sheet(wb, buildCAP(),                  'CAP Findings')
XLSX.utils.book_append_sheet(wb, buildSPPI13(),               'SPPI-13 Transition')
XLSX.utils.book_append_sheet(wb, buildDashboard(),            'Dashboard')
XLSX.utils.book_append_sheet(wb, buildComplianceHealthBoard(),'📋 Compliance Health Board')
XLSX.utils.book_append_sheet(wb, buildReference(),            'Reference')
XLSX.utils.book_append_sheet(wb, buildUpgrade(),              '↑ Upgrade to Meridian')
XLSX.utils.book_append_sheet(wb, buildLists(),                'Lists')

// Inject sample demo data so all formulas are live on open
addMeridianSampleData(wb)

const OUTPUT = 'Meridian-SPED-Compliance-Tracker-Texas-Edition.xlsx'
XLSX.writeFile(wb, OUTPUT)
console.log(`\n✅ Built: ${OUTPUT}`)
console.log(`   11 tabs | IEP, 504, Dyslexia/HB 3928, CAP Findings, SPPI-13, Dashboard\n`)
