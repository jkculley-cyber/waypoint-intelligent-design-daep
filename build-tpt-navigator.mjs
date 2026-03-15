/**
 * build-tpt-navigator.mjs
 * Generates: Navigator-Student-Behavior-Tracker-Texas-Edition.xlsx
 * Brand: Clear Path Education Group, LLC
 * Product: Navigator — RTI/MTSS Behavior & Intervention Tracker
 * Accent color: Blue (#1A6FB5)
 * Run: node build-tpt-navigator.mjs
 */

import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────
// CONSTANTS (from useNavigator.js)
// ─────────────────────────────────────────────────────────────
const SKILL_GAPS = [
  'Emotional Regulation',
  'Executive Functioning',
  'Peer Conflict Resolution',
  'Academic Frustration Tolerance',
  'Impulse Control',
  'Adult Communication',
]

const SUPPORT_TYPES = [
  'CICO (Check-In / Check-Out)',
  'Counseling Referral',
  'Peer Mediation',
  'Social Skills Group',
  'Behavior Contract',
  'Academic Support',
  'Mindfulness Protocol',
  'Parent Conference',
  'Mentoring',
  'Restorative Circle',
  'Other',
]

const REFERRAL_STATUS  = ['Open', 'In Progress', 'Resolved', 'Escalated to DAEP']
const REFERRAL_OUTCOME = [
  'No Action Taken',
  'Support Assigned',
  'ISS Assigned',
  'OSS Assigned',
  'Escalated to DAEP',
  'Parent Conference Held',
  'Admin Conference Held',
  'Referral Withdrawn',
]
const PLACEMENT_TYPES  = ['ISS — In-School Suspension', 'OSS — Out-of-School Suspension']
const SUPPORT_STATUS   = ['Active', 'Completed', 'Discontinued']
const RISK_LEVELS      = ['Low (0–34)', 'Medium (35–69)', 'High (70–100)']
const YES_NO           = ['Yes', 'No']
const YES_NO_NA        = ['Yes', 'No', 'N/A']

const OFFENSE_CATEGORIES = [
  'Fighting','Drugs/Alcohol','Weapons','Harassment/Bullying',
  'Truancy','Defiance/Insubordination','Theft','Vandalism',
  'Sexual Offense','Gang-Related Activity','Other',
]

const GRADES = [
  'Pre-K','Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade',
  '5th Grade','6th Grade','7th Grade','8th Grade','9th Grade',
  '10th Grade','11th Grade','12th Grade',
]

const STAFF_ROLES = [
  'Administrator','Principal','Assistant Principal','Counselor',
  'SPED Coordinator','Teacher','Campus Behavior Coordinator',
  'Student Support Specialist','504 Coordinator',
  'Director of Student Affairs','SRO','Other',
]

const ROSTER_STATUS = ['Active','Transferred Out','Withdrew','Graduated','Exited']

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const R  = (r, c) => XLSX.utils.encode_cell({ r, c })
const sv = v => ({ v, t: 's' })
const fv = f => ({ f, t: 'n' })
const fs = f => ({ f, t: 's' })

function setStr(ws, r, c, val) { ws[R(r, c)] = sv(val) }
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
  for (let r = startRow; r <= endRow; r++) {
    ws[R(r, colIdx)] = fn(r + 1)
  }
}

// Convert date string to Excel serial number
function excelDate(str) {
  return Math.round(new Date(str + 'T12:00:00Z').getTime() / 86400000 + 25569)
}

// ─────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new()

// ═════════════════════════════════════════════════════════════
// COVER
// ═════════════════════════════════════════════════════════════
function buildCover() {
  const ws = {}
  setStr(ws, 0, 0, 'Navigator — Student Behavior & Intervention Tracker')
  setStr(ws, 1, 0, 'RTI / MTSS / ISS / OSS Edition  |  Clear Path Education Group, LLC')
  setStr(ws, 2, 0, 'Built for Texas campus behavior coordinators, counselors, and assistant principals.')
  setStr(ws, 3, 0, 'Track referrals, suspensions, student supports, and intervention effectiveness — all in one place.')
  merge(ws, 'A1:J1') ; merge(ws, 'A2:J2') ; merge(ws, 'A3:J3') ; merge(ws, 'A4:J4')

  setStr(ws, 5, 0, '─── FILL IN YOUR CAMPUS INFORMATION ─────────────────────────────')
  merge(ws, 'A6:J6')
  setStr(ws, 6, 0, 'District Name:')   ; setStr(ws, 6, 2, '')
  setStr(ws, 7, 0, 'Campus Name:')     ; setStr(ws, 7, 2, '')
  setStr(ws, 8, 0, 'School Year:')     ; setStr(ws, 8, 2, '2025-26')
  setStr(ws, 9, 0, 'Behavior Coordinator / Counselor:') ; setStr(ws, 9, 2, '')
  setStr(ws, 10, 0, 'Date Updated:')   ; setStr(ws, 10, 2, '')

  setStr(ws, 12, 0, '─── HOW TO USE THIS TRACKER ──────────────────────────────────────')
  merge(ws, 'A13:J13')
  const steps = [
    '1.  STUDENT ROSTER — Add every student you are tracking. This tab feeds all other tabs.',
    '2.  REFERRAL LOG — Log each behavioral referral. One row per referral. Reference the Student ID.',
    '3.  ISS / OSS PLACEMENTS — Record each suspension. Auto-calculates days elapsed.',
    '4.  STUDENT SUPPORTS — Log every intervention assigned. Track effectiveness when completed.',
    '5.  RISK SCORE CALCULATOR — Manually score students using the weighted algorithm from Navigator.',
    '6.  DASHBOARD — Auto-summary. No data entry needed here.',
    '7.  REFERENCE — RTI/MTSS framework, skill gap definitions, intervention menu.',
    '8.  Yellow = approaching threshold. Red = escalation flag. Green = resolved/on-track.',
    '9.  Gray cells = auto-calculated formulas — do NOT type in them.',
    '10. Works in Google Sheets AND Microsoft Excel.',
    '11. For automated risk scoring, multi-campus tracking, and real-time alerts: see UPGRADE TO NAVIGATOR tab.',
    '12. Questions? Email: support@clearpatheg.com',
  ]
  steps.forEach((s, i) => { setStr(ws, 13 + i, 0, s) ; merge(ws, `A${14+i}:J${14+i}`) })

  setStr(ws, 26, 0, '─── ESCALATION THRESHOLDS (built into Navigator\'s Risk Engine) ──')
  merge(ws, 'A27:J27')
  setStr(ws, 27, 0, '3+ OSS in 90 days → High Risk escalation flag. 5+ referrals in 30 days → Referral frequency alert. 2 referrals in 14 days → Immediate review trigger. These thresholds are tracked manually in this tracker; Navigator automates them.')
  merge(ws, 'A28:J28')

  setStr(ws, 30, 0, '© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  For organizational use only — not legal advice.')
  merge(ws, 'A31:J31')

  setRange(ws, 32, 10)
  setColWidths(ws, [240, 20, 200, 150, 150, 100, 100, 100, 100, 100])
  return ws
}

// ═════════════════════════════════════════════════════════════
// STUDENT ROSTER
// ═════════════════════════════════════════════════════════════
function buildRoster() {
  const ws = {}
  const END = 101  // rows 2–101 (0-indexed)

  setStr(ws, 0, 0, 'STUDENT ROSTER — Students Under Behavior Monitoring')
  merge(ws, 'A1:N1')

  const headers = [
    'Student ID','Last Name','First Name','Grade','Campus',
    'SPED Eligible?','504 Eligible?','Status',
    'Referral Count ⚙','ISS Count ⚙','OSS Count ⚙',
    'Active Supports ⚙','Risk Level','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Col H (8): Referral Count
  fillFormulas(ws, 8, 2, END - 1, r =>
    fv(`COUNTIF('Referral Log'!D:D,A${r})`)
  )
  // Col I (9): ISS Count
  fillFormulas(ws, 9, 2, END - 1, r =>
    fv(`COUNTIFS('ISS-OSS Placements'!B:B,A${r},'ISS-OSS Placements'!F:F,"ISS — In-School Suspension")`)
  )
  // Col J (10): OSS Count
  fillFormulas(ws, 10, 2, END - 1, r =>
    fv(`COUNTIFS('ISS-OSS Placements'!B:B,A${r},'ISS-OSS Placements'!F:F,"OSS — Out-of-School Suspension")`)
  )
  // Col K (11): Active Supports
  fillFormulas(ws, 11, 2, END - 1, r =>
    fv(`COUNTIFS('Student Supports'!B:B,A${r},'Student Supports'!J:J,"Active")`)
  )

  setRange(ws, END, 14)
  setColWidths(ws, [90,110,110,90,130,90,80,100,90,80,80,100,100,200])
  ws['!freeze'] = { ySplit: 2, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// REFERRAL LOG
// ═════════════════════════════════════════════════════════════
function buildReferralLog() {
  const ws = {}
  const END = 201

  setStr(ws, 0, 0, 'REFERRAL LOG — One Row Per Behavioral Referral')
  merge(ws, 'A1:Q1')

  const headers = [
    'Referral ID','Referral Date','Campus','Student ID',
    'Last Name ⚙','First Name ⚙','Grade ⚙',
    'Offense Category','Description (brief)',
    'Skill Gap Identified','Reported By (Role)',
    'Reviewed By (Role)','Status','Outcome',
    'OSS/ISS Assigned?','Referral # for Student ⚙','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Auto-fill from Roster
  fillFormulas(ws, 4, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(D${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 5, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(D${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 6, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(D${r},Roster!$A:$E,4,FALSE),"")`)
  )
  // Referral # for this student (sequential count)
  fillFormulas(ws, 15, 2, END - 1, r =>
    fv(`IF(D${r}="","",COUNTIF(D$3:D${r},D${r}))`)
  )

  setRange(ws, END, 17)
  setColWidths(ws, [90,100,130,90,110,110,80,130,220,160,130,130,100,160,110,90,200])
  ws['!freeze'] = { ySplit: 2, xSplit: 4 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// ISS / OSS PLACEMENTS
// ═════════════════════════════════════════════════════════════
function buildPlacements() {
  const ws = {}
  const END = 201

  setStr(ws, 0, 0, 'ISS / OSS PLACEMENTS — One Row Per Suspension')
  merge(ws, 'A1:R1')

  const headers = [
    'Placement ID','Student ID','Last Name ⚙','First Name ⚙','Grade ⚙',
    'Placement Type','Start Date','End Date (actual)',
    'Authorized Days','Days Elapsed ⚙','Days Remaining ⚙',
    'Referral ID (cross-ref)','Assigned By (Role)',
    'Parent Notified?','Notification Date','Return Date',
    'OSS Count (90d) ⚙','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Auto-fill from Roster
  fillFormulas(ws, 2, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 3, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 4, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$E,4,FALSE),"")`)
  )
  // Days Elapsed
  fillFormulas(ws, 9, 2, END - 1, r =>
    fv(`IF(G${r}="","",IF(H${r}<>"",H${r}-G${r},TODAY()-G${r}))`)
  )
  // Days Remaining
  fillFormulas(ws, 10, 2, END - 1, r =>
    fs(`IF(I${r}="","",IF(H${r}<>"","✅ Ended",IF(I${r}-J${r}<0,"❌ EXCEEDED ("&ABS(I${r}-J${r})&"d)",IF(I${r}-J${r}=0,"⚠ Last Day",IF(I${r}-J${r}<=2,"⚠ "&(I${r}-J${r})&"d remaining","🟢 "&(I${r}-J${r})&"d remaining")))))`)
  )
  // OSS Count in rolling 90 days for this student — with escalation flag
  setStr(ws, 1, 16, 'OSS Count (90d) ⚙')
  fillFormulas(ws, 16, 2, END - 1, r =>
    fs(`IF(B${r}="","",IF(COUNTIFS($B:$B,B${r},$F:$F,"OSS — Out-of-School Suspension",$G:$G,">="&(TODAY()-90))>=3,"🚨 ESCALATE — "&COUNTIFS($B:$B,B${r},$F:$F,"OSS — Out-of-School Suspension",$G:$G,">="&(TODAY()-90))&" OSS in 90d",TEXT(COUNTIFS($B:$B,B${r},$F:$F,"OSS — Out-of-School Suspension",$G:$G,">="&(TODAY()-90)),"0")))`)
  )

  setRange(ws, END, 18)
  setColWidths(ws, [90,90,110,110,80,160,110,110,100,100,100,100,130,100,110,110,100,200])
  ws['!freeze'] = { ySplit: 2, xSplit: 4 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// STUDENT SUPPORTS
// ═════════════════════════════════════════════════════════════
function buildSupports() {
  const ws = {}
  const END = 201

  setStr(ws, 0, 0, 'STUDENT SUPPORTS — Interventions Assigned to Students')
  merge(ws, 'A1:Q1')

  const headers = [
    'Support ID','Student ID','Last Name ⚙','First Name ⚙','Grade ⚙',
    'Support Type','Start Date','End Date',
    'Assigned To (Staff Name)','Assigned By (Role)',
    'Status','Incidents Before (30d)','Incidents After (30d)',
    'Reduction ⚙','Effective? ⚙',
    'Referral ID (cross-ref)','Notes',
  ]
  headers.forEach((h, c) => setStr(ws, 1, c, h))

  // Auto-fill from Roster
  fillFormulas(ws, 2, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$C,2,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 3, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$D,3,FALSE),"⚠ ID Not Found")`)
  )
  fillFormulas(ws, 4, 2, END - 1, r =>
    fs(`IFERROR(VLOOKUP(B${r},Roster!$A:$E,4,FALSE),"")`)
  )
  // Reduction
  fillFormulas(ws, 13, 2, END - 1, r =>
    fs(`IF(OR(L${r}="",M${r}=""),"",IF(L${r}=0,"N/A",TEXT((L${r}-M${r})/L${r},"0%")&" reduction"))`)
  )
  // Effective?
  fillFormulas(ws, 14, 2, END - 1, r =>
    fs(`IF(OR(L${r}="",M${r}=""),"",IF(M${r}<L${r},"Yes","No"))`)
  )

  setRange(ws, END, 17)
  setColWidths(ws, [90,90,110,110,80,180,110,110,160,130,100,110,110,110,100,100,200])
  ws['!freeze'] = { ySplit: 2, xSplit: 4 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// RISK SCORE CALCULATOR
// ═════════════════════════════════════════════════════════════
function buildRiskCalc() {
  const ws = {}

  // Title
  setStr(ws, 0, 0, 'RISK SCORE CALCULATOR — Navigator Escalation Risk Engine (Manual Version)')
  merge(ws, 'A1:H1')
  setStr(ws, 1, 0, 'Enter student data below. Scores are calculated automatically. Navigator computes this in real time across all students automatically.')
  merge(ws, 'A2:H2')

  // Algorithm explanation
  setStr(ws, 3, 0, 'HOW SCORES ARE CALCULATED')
  merge(ws, 'A4:H4')
  const algo = [
    ['Factor','Points','Notes'],
    ['Referral in last 14 days','+30','Any referral in past 14 days'],
    ['2+ referrals in last 14 days','+15','Additional points for multiple recent referrals'],
    ['2+ referrals in last 30 days','+15','Frequency pattern indicator'],
    ['5+ referrals in last 60 days','+10','Chronic referral pattern'],
    ['OSS in last 30 days','+25','Any out-of-school suspension'],
    ['2+ OSS in last 30 days','+10','Additional for repeated OSS'],
    ['ISS in last 30 days','+10','In-school suspension'],
    ['Prior DAEP escalation (any time)','+20','Student has been escalated to DAEP before'],
    ['Each active support assigned','−12','Supports reduce risk score (protective factor)'],
    ['Score range','0–100','Capped: Low 0–34 | Medium 35–69 | High 70–100'],
  ]
  algo.forEach((row, i) => {
    row.forEach((val, c) => setStr(ws, 4 + i, c, String(val)))
  })

  // Student input area
  setStr(ws, 17, 0, 'STUDENT RISK SCORING — Enter data manually for each student')
  merge(ws, 'A18:H18')

  const headers = [
    'Student ID','Student Name','Refs (14d)','Refs (30d)','Refs (60d)',
    'OSS (30d)','ISS (30d)','Prior DAEP','Active Supports','Score ⚙','Risk Level ⚙',
  ]
  headers.forEach((h, c) => setStr(ws, 18, c, h))

  // Score formula (rows 19–68 = 50 students, 0-indexed rows 18-67)
  for (let r = 19; r <= 68; r++) {
    const exR = r + 1  // Excel 1-based
    // Score: sum weighted factors, subtract supports
    setCell(ws, r, 9, fv(
      `MAX(0,MIN(100,` +
      `IF(C${exR}>=1,30,0)+` +
      `IF(C${exR}>=2,15,0)+` +
      `IF(D${exR}>=2,15,0)+` +
      `IF(E${exR}>=5,10,0)+` +
      `IF(F${exR}>=1,25,0)+` +
      `IF(F${exR}>=2,10,0)+` +
      `IF(G${exR}>=1,10,0)+` +
      `IF(H${exR}="Yes",20,0)-` +
      `(I${exR}*12)))`
    ))
    // Risk Level
    setCell(ws, r, 10, fs(
      `IF(J${exR}="","",IF(J${exR}>=70,"🔴 HIGH",IF(J${exR}>=35,"🟡 MEDIUM","🟢 LOW")))`
    ))
  }

  setRange(ws, 70, 11)
  setColWidths(ws, [90,150,80,80,80,80,80,90,100,80,100])
  ws['!freeze'] = { ySplit: 19, xSplit: 0 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════
function buildDashboard() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, 'DASHBOARD — Auto-Summary (No Data Entry Needed)')
  merge(ws, 'A1:J1')
  setCell(ws, r, 0, fs(`"Reflects data as of: "&TEXT(TODAY(),"MM/DD/YYYY")`))
  merge(ws, `A${r+1}:J${r+1}`)
  r++ ; r++

  setStr(ws, r, 0, 'KEY METRICS — CURRENT SCHOOL YEAR')
  merge(ws, `A${r+1}:J${r+1}`)
  r++

  const metrics = [
    ['Students Being Monitored',   `MAX(0,COUNTA(Roster!B:B)-2)`],
    ['Total Referrals (YTD)',       `MAX(0,COUNTA('Referral Log'!A:A)-2)`],
    ['Open Referrals',             `COUNTIF('Referral Log'!M:M,"Open")`],
    ['Escalated to DAEP',          `COUNTIF('Referral Log'!N:N,"Escalated to DAEP")`],
    ['Active ISS Placements',       `COUNTIF('ISS-OSS Placements'!K:K,">"&0)`],
    ['Active OSS Placements',       `COUNTIFS('ISS-OSS Placements'!F:F,"OSS — Out-of-School Suspension",'ISS-OSS Placements'!H:H,"")`],
    ['Students with 3+ OSS (90d)', `COUNTIF('ISS-OSS Placements'!Q:Q,">="&3)`],
    ['Active Supports',             `COUNTIF('Student Supports'!K:K,"Active")`],
    ['Supports Completed',          `COUNTIF('Student Supports'!K:K,"Completed")`],
    ['⚠ High Risk Students',       `COUNTIF('Risk Score Calculator'!K:K,"🔴 HIGH")`],
  ]

  metrics.forEach(([label, formula]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 1, fv(formula))
    r++
  })
  r++

  setStr(ws, r, 0, 'REFERRALS BY OFFENSE CATEGORY (YTD)')
  merge(ws, `A${r+1}:J${r+1}`)
  r++
  OFFENSE_CATEGORIES.forEach(cat => {
    setStr(ws, r, 0, cat)
    setCell(ws, r, 1, fv(`COUNTIF('Referral Log'!H:H,"${cat}")`))
    setCell(ws, r, 2, fs(`REPT("|",B${r+1})`))
    r++
  })
  r++

  setStr(ws, r, 0, 'REFERRALS BY SKILL GAP (YTD)')
  merge(ws, `A${r+1}:J${r+1}`)
  r++
  SKILL_GAPS.forEach(gap => {
    setStr(ws, r, 0, gap)
    setCell(ws, r, 1, fv(`COUNTIF('Referral Log'!J:J,"${gap}")`))
    setCell(ws, r, 2, fs(`REPT("|",B${r+1})`))
    r++
  })
  r++

  setStr(ws, r, 0, 'SUPPORTS BY TYPE (YTD)')
  merge(ws, `A${r+1}:J${r+1}`)
  r++
  SUPPORT_TYPES.forEach(t => {
    setStr(ws, r, 0, t)
    setCell(ws, r, 1, fv(`COUNTIF('Student Supports'!F:F,"${t}")`))
    r++
  })
  r++

  setStr(ws, r, 0, 'SUPPORT EFFECTIVENESS SUMMARY')
  merge(ws, `A${r+1}:J${r+1}`)
  r++
  setStr(ws, r, 0, 'Supports showing improvement (incidents decreased)')
  setCell(ws, r, 1, fv(`COUNTIF('Student Supports'!O:O,"Yes")`))
  r++
  setStr(ws, r, 0, 'Supports showing no improvement')
  setCell(ws, r, 1, fv(`COUNTIF('Student Supports'!O:O,"No")`))
  r++
  setStr(ws, r, 0, 'Note: Effectiveness requires Incidents Before and After to be filled in on Student Supports tab.')
  merge(ws, `A${r+1}:J${r+1}`)
  r++ ; r++

  setStr(ws, r, 0, '© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  Upgrade to Navigator for real-time, automated tracking.')
  merge(ws, `A${r+1}:J${r+1}`)

  setRange(ws, r + 2, 10)
  setColWidths(ws, [240, 100, 80, 120, 120, 120, 120, 120, 120, 120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// REFERENCE
// ═════════════════════════════════════════════════════════════
function buildReference() {
  const rows = []

  rows.push(['REFERENCE — RTI/MTSS Framework, Behavior Intervention, and Escalation Thresholds', '', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  clearpatheg.com  |  For organizational use only', '', '', ''])
  rows.push(['', '', '', ''])

  rows.push(['RTI / MTSS TIER FRAMEWORK', '', '', ''])
  rows.push(['Tier', 'Description', 'Student Population', 'Typical Supports'])
  rows.push(['Tier 1 — Universal', 'Core instruction and prevention for all students', '~80% of students', 'PBIS, classroom management, social-emotional learning curriculum'])
  rows.push(['Tier 2 — Targeted', 'Small-group and strategic interventions for at-risk students', '~15% of students', 'CICO, social skills groups, academic support, counseling check-ins'])
  rows.push(['Tier 3 — Intensive', 'Individualized, intensive support for highest-need students', '~5% of students', 'Behavior contracts, individual counseling, FBA/BIP, potential SPED evaluation'])
  rows.push(['', '', '', ''])

  rows.push(['NAVIGATOR RISK SCORE — ESCALATION THRESHOLDS', '', '', ''])
  rows.push(['Threshold', 'Score Impact', 'What It Means', 'Recommended Response'])
  rows.push(['Referral in past 14 days', '+30 points', 'Recent behavior event', 'Assign support within 3 business days'])
  rows.push(['2+ referrals in 14 days', '+15 additional', 'Acute pattern emerging', 'Counselor meeting within 1 business day'])
  rows.push(['2+ referrals in 30 days', '+15 additional', 'Frequency pattern', 'Initiate Tier 2 intervention'])
  rows.push(['5+ referrals in 60 days', '+10 additional', 'Chronic pattern', 'FBA consideration, possible ARD referral'])
  rows.push(['OSS in past 30 days', '+25 points', 'Suspension occurred', 'Re-entry plan, SPED check if applicable'])
  rows.push(['2+ OSS in past 30 days', '+10 additional', 'Repeated suspension', 'Administrator review, DAEP consideration'])
  rows.push(['ISS in past 30 days', '+10 points', 'In-school suspension', 'Support assignment review'])
  rows.push(['Prior DAEP escalation', '+20 points', 'High-risk history', 'Intensive monitoring, active support required'])
  rows.push(['Each active support', '−12 points', 'Protective factor', 'Maintain active supports to reduce score'])
  rows.push(['', '', '', ''])
  rows.push(['Risk Levels: Low = 0–34  |  Medium = 35–69  |  High = 70–100', '', '', ''])
  rows.push(['', '', '', ''])

  rows.push(['SKILL GAP DEFINITIONS', '', '', ''])
  rows.push(['Skill Gap', 'Definition', 'Behavior Indicators', 'Recommended Supports'])
  const gaps = [
    ['Emotional Regulation', 'Difficulty managing emotional responses to frustration, conflict, or perceived injustice', 'Outbursts, crying, aggressive reactions to minor frustrations', 'CICO, Mindfulness Protocol, Counseling Referral'],
    ['Executive Functioning', 'Difficulty with planning, organization, task initiation, and self-monitoring', 'Incomplete work, off-task behavior, difficulty transitioning', 'Academic Support, Behavior Contract, CICO'],
    ['Peer Conflict Resolution', 'Difficulty resolving disagreements with peers appropriately', 'Fighting, verbal altercations, social exclusion behavior', 'Peer Mediation, Social Skills Group, Counseling'],
    ['Academic Frustration Tolerance', 'Low tolerance for academic difficulty; avoidance or acting out when work is hard', 'Refusing assignments, tearing up work, classroom disruption during instruction', 'Academic Support, Behavior Contract, Counseling'],
    ['Impulse Control', 'Acting before thinking; difficulty inhibiting immediate responses', 'Blurting out, leaving seat, grabbing, impulsive aggression', 'CICO, Behavior Contract, Counseling Referral'],
    ['Adult Communication', 'Difficulty communicating respectfully with adults; defiance or disrespect', 'Arguing, talking back, refusing requests from staff', 'Social Skills Group, Counseling, Parent Conference'],
  ]
  gaps.forEach(g => rows.push(g))
  rows.push(['', '', '', ''])

  rows.push(['INTERVENTION MENU', '', '', ''])
  rows.push(['Intervention', 'Tier', 'Description', 'Best For'])
  const interventions = [
    ['CICO (Check-In / Check-Out)', 'Tier 2', 'Daily check-in with a trusted adult; daily point card reviewed at end of day', 'Students needing structure and adult connection'],
    ['Counseling Referral', 'Tier 2–3', 'Structured counseling sessions addressing the underlying skill gap', 'Students with emotional or relational skill deficits'],
    ['Peer Mediation', 'Tier 2', 'Structured conflict resolution facilitated by trained peer mediators', 'Peer conflict, social skills building'],
    ['Social Skills Group', 'Tier 2', 'Small group instruction in specific social skills (communication, conflict resolution)', 'Students with peer conflict or adult communication deficits'],
    ['Behavior Contract', 'Tier 2–3', 'Written agreement between student, staff, and family outlining behavioral expectations and rewards', 'Students with persistent non-compliance or academic avoidance'],
    ['Academic Support', 'Tier 2', 'Targeted academic tutoring, re-teaching, or modified assignments', 'Students acting out due to academic frustration'],
    ['Mindfulness Protocol', 'Tier 2', 'Brief mindfulness exercises (breathing, grounding) used during escalation prevention', 'Students with emotional regulation deficits'],
    ['Parent Conference', 'Tier 2–3', 'Structured meeting with parent/guardian to align school and home behavioral expectations', 'Any escalating pattern; SPED eligibility concern'],
    ['Restorative Circle', 'Tier 2', 'Facilitated conversation between student and affected parties to repair harm', 'Peer conflict, community harm incidents'],
    ['Mentoring', 'Tier 2–3', 'Regular one-on-one meetings with a trusted adult mentor', 'Students lacking adult connection and positive role models'],
    ['FBA — Functional Behavioral Assessment', 'Tier 3', 'Formal evaluation to determine the function of a student\'s behavior (SPED students)', 'Students with SPED eligibility and persistent, severe behavior'],
    ['BIP — Behavior Intervention Plan', 'Tier 3', 'Written plan based on FBA results with specific strategies and reinforcement', 'Students with active IEP and behavior as a barrier to learning'],
  ]
  interventions.forEach(i => rows.push(i))
  rows.push(['', '', '', ''])

  rows.push(['GLOSSARY', '', '', ''])
  rows.push(['Term', 'Definition', '', ''])
  const glossary = [
    ['CICO', 'Check-In / Check-Out — a Tier 2 behavior support strategy using daily adult check-ins and point cards'],
    ['DAEP', 'Disciplinary Alternative Education Program — separate program for students removed under TEC §37.006'],
    ['FBA', 'Functional Behavioral Assessment — evaluation to determine the cause/function of a student\'s challenging behavior'],
    ['BIP', 'Behavior Intervention Plan — written plan developed from FBA results for SPED students'],
    ['MTSS', 'Multi-Tiered System of Supports — a framework for providing academic and behavioral support at increasing intensity'],
    ['OSS', 'Out-of-School Suspension — removal from school grounds for disciplinary reasons'],
    ['ISS', 'In-School Suspension — placement in a separate supervised setting within the school building'],
    ['PBIS', 'Positive Behavioral Interventions and Supports — school-wide framework for teaching and reinforcing appropriate behavior'],
    ['RTI', 'Response to Intervention — tiered academic and behavioral support framework; sometimes used interchangeably with MTSS'],
    ['SCOC', 'Student Code of Conduct — district policy document that governs disciplinary consequences (TEC §37.001)'],
    ['CBC', 'Campus Behavior Coordinator — designated role under TEC responsible for managing behavioral interventions'],
  ]
  glossary.forEach(([t, d]) => rows.push([t, d, '', '']))

  rows.push(['', '', '', ''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  clearpatheg.com  |  For organizational use only', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [220, 280, 240, 240])
  return ws
}

// ═════════════════════════════════════════════════════════════
// UPGRADE TO NAVIGATOR
// ═════════════════════════════════════════════════════════════
function buildUpgrade() {
  const rows = []
  rows.push(['↑ UPGRADE TO NAVIGATOR — Full Behavior & RTI/MTSS Management Platform', '', ''])
  rows.push(['Clear Path Education Group, LLC  |  clearpatheg.com/navigator', '', ''])
  rows.push(['', '', ''])
  rows.push(['This tracker gives you structure. Navigator gives you automation.', '', ''])
  rows.push(['', '', ''])
  rows.push(['WHAT NAVIGATOR DOES THAT THIS TRACKER CANNOT', '', ''])
  rows.push(['Feature', 'This Tracker', 'Navigator'])
  const features = [
    ['Risk score calculation','Manual entry','Automated — recalculates daily for every student'],
    ['Escalation alerts','Color-coded rows','Push notifications to CBC, counselor, and admin'],
    ['Multi-campus visibility','One file','District-wide real-time dashboard'],
    ['Referral routing','Notes field','Built-in workflow: submit → review → assign → resolve'],
    ['ISS/OSS countdown','Manual','Automatic — flags 3+ OSS in 90 days district-wide'],
    ['Intervention effectiveness','Manual before/after','Auto-linked to referral data; tracks recidivism'],
    ['Skill gap analytics','COUNTIF','Trend analysis by campus, grade, and skill gap'],
    ['DAEP escalation handoff','Cross-reference note','One-click escalation to Waypoint DAEP module'],
    ['Role-based access','File sharing','Individual logins with CBC/counselor/admin roles'],
    ['Disproportionality analysis','Not available','Referral rate by campus and grade auto-calculated'],
    ['Year-over-year comparison','Not available','Side-by-side charts: current vs prior school year'],
    ['Audit trail','None','Every action logged with timestamp and user'],
  ]
  features.forEach(f => rows.push(f))
  rows.push(['', '', ''])
  rows.push(['NAVIGATOR PRICING', '', ''])
  rows.push(['Starting at $3,500/year per campus', '', ''])
  rows.push(['Bundle with Waypoint (DAEP) for district-wide behavior management at reduced rate.', '', ''])
  rows.push(['', '', ''])
  rows.push(['→ Book a free demo:  calendly.com/clearpatheg/navigator-demo', '', ''])
  rows.push(['→ Learn more:        clearpatheg.com/navigator', '', ''])
  rows.push(['→ Email:             sales@clearpatheg.com', '', ''])
  rows.push(['', '', ''])
  rows.push(['© 2025 Clear Path Education Group, LLC  |  FERPA-compliant  |  Texas-built', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [300, 200, 300])
  return ws
}

// ═════════════════════════════════════════════════════════════
// LISTS
// ═════════════════════════════════════════════════════════════
function buildLists() {
  const lists = [
    { header: 'Grade Levels',       values: GRADES },
    { header: 'Offense Categories', values: OFFENSE_CATEGORIES },
    { header: 'Skill Gaps',         values: SKILL_GAPS },
    { header: 'Support Types',      values: SUPPORT_TYPES },
    { header: 'Referral Status',    values: REFERRAL_STATUS },
    { header: 'Referral Outcome',   values: REFERRAL_OUTCOME },
    { header: 'Placement Types',    values: PLACEMENT_TYPES },
    { header: 'Support Status',     values: SUPPORT_STATUS },
    { header: 'Staff Roles',        values: STAFF_ROLES },
    { header: 'Roster Status',      values: ROSTER_STATUS },
    { header: 'Yes / No',           values: YES_NO },
    { header: 'Yes / No / N/A',     values: YES_NO_NA },
  ]

  const maxLen = Math.max(...lists.map(l => l.values.length))
  const rows = [lists.map(l => l.header)]
  for (let i = 0; i < maxLen; i++) {
    rows.push(lists.map(l => l.values[i] || ''))
  }
  rows.push([''])
  rows.push(['HOW TO APPLY DROPDOWNS — Google Sheets: Data → Data Validation → Dropdown from range (e.g., Lists!A2:A15)'])
  rows.push(['HOW TO APPLY DROPDOWNS — Excel: Data → Data Validation → Allow: List → Source: =Lists!$A$2:$A$15'])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColWidths(ws, [140,160,180,200,130,180,180,130,160,130,80,100])
  return ws
}

// ═════════════════════════════════════════════════════════════
// SAMPLE DATA — 5 students at varying risk levels
// ═════════════════════════════════════════════════════════════
function addNavigatorSampleData(wb) {
  const roster    = wb.Sheets['Roster']
  const referrals = wb.Sheets['Referral Log']
  const placements = wb.Sheets['ISS-OSS Placements']
  const supports  = wb.Sheets['Student Supports']

  const d = (s) => ({ v: excelDate(s), t: 'n', z: 'MM/DD/YYYY' })
  const sv = (v) => ({ v, t: 's' })
  const nv = (v) => ({ v, t: 'n' })
  const set = (ws, r, c, val) => {
    ws[R(r, c)] = typeof val === 'object' ? val : typeof val === 'number' ? nv(val) : sv(val)
  }

  // Roster: [StudentID, LastName, FirstName, Grade, Campus, Counselor, Status, SPED?, Notes]
  const students = [
    ['NAV-001','Torres','Miguel','9th Grade','Lincoln High','Ms. Rivera','Active','No','High-risk — 3 OSS this semester'],
    ['NAV-002','Chen','Amy','7th Grade','Roosevelt Middle','Mr. Davis','Active','No','2 referrals — CICO assigned'],
    ['NAV-003','Jackson','DeShawn','10th Grade','Lincoln High','Ms. Rivera','Active','Yes','SPED — ED; FBA completed 9/15'],
    ['NAV-004','Martinez','Sofia','6th Grade','Jefferson Middle','Mr. Kim','Active','No','1 referral — monitoring'],
    ['NAV-005','Patel','Raj','8th Grade','Roosevelt Middle','Mr. Davis','Active','Yes','SPED — LD; behavior contract active'],
  ]
  students.forEach((row, i) => {
    row.forEach((val, c) => set(roster, i + 2, c, val))
  })

  // Referral Log: [ID, Date, Campus, StudentID, Offense, SkillGap, ReportedBy, ReviewedBy, Status, Outcome, OSSAssigned, RefCount]
  const refs = [
    ['REF-001',d('2026-01-08'),'Lincoln High','NAV-001','Fighting','Peer Conflict Resolution','Teacher','Assistant Principal','Resolved','OSS Assigned','Yes','Ms. Rivera',''],
    ['REF-002',d('2026-01-22'),'Lincoln High','NAV-001','Fighting','Peer Conflict Resolution','Teacher','Assistant Principal','Resolved','OSS Assigned','Yes','Ms. Rivera','2nd referral — escalation warning issued.'],
    ['REF-003',d('2026-02-10'),'Lincoln High','NAV-001','Defiance/Insubordination','Adult Communication','Teacher','Assistant Principal','Resolved','OSS Assigned','Yes','Ms. Rivera','3rd incident — DAEP escalation triggered.'],
    ['REF-004',d('2026-01-15'),'Roosevelt Middle','NAV-002','Defiance/Insubordination','Emotional Regulation','Teacher','Counselor','In Progress','Support Assigned','No','Mr. Davis','CICO assigned 1/17.'],
    ['REF-005',d('2026-02-05'),'Roosevelt Middle','NAV-002','Truancy','Academic Frustration Tolerance','Teacher','Counselor','Open','Support Assigned','No','Mr. Davis',''],
    ['REF-006',d('2026-01-10'),'Lincoln High','NAV-003','Defiance/Insubordination','Emotional Regulation','Teacher','SPED Coordinator','Resolved','Support Assigned','No','Ms. Rivera','BIP reviewed — updated 1/12.'],
    ['REF-007',d('2026-03-01'),'Jefferson Middle','NAV-004','Harassment/Bullying','Peer Conflict Resolution','Teacher','Counselor','Open','No Action Taken','No','Mr. Kim','First referral. Monitoring.'],
  ]
  refs.forEach((row, i) => {
    row.forEach((val, c) => set(referrals, i + 2, c, val))
  })

  // ISS/OSS Placements: [ID, StudentID, Type, StartDate, EndDate, AuthDays, RefID, AssignedBy, ParentNotified, NotifDate]
  const plcData = [
    ['PLC-001','NAV-001','OSS — Out-of-School Suspension',d('2026-01-09'),d('2026-01-13'),5,'REF-001','Assistant Principal','Yes',d('2026-01-09'),'',d('2026-01-14'),''],
    ['PLC-002','NAV-001','OSS — Out-of-School Suspension',d('2026-01-23'),d('2026-01-27'),5,'REF-002','Assistant Principal','Yes',d('2026-01-23'),'',d('2026-01-28'),'Second OSS — escalation warning.'],
    ['PLC-003','NAV-001','OSS — Out-of-School Suspension',d('2026-02-11'),d('2026-02-17'),5,'REF-003','Assistant Principal','Yes',d('2026-02-11'),'',d('2026-02-18'),'3rd OSS in 90 days — DAEP referral initiated.'],
    ['PLC-004','NAV-002','ISS — In-School Suspension',d('2026-01-16'),d('2026-01-17'),2,'REF-004','Counselor','Yes',d('2026-01-16'),'',d('2026-01-18'),''],
  ]
  plcData.forEach((row, i) => {
    row.forEach((val, c) => set(placements, i + 2, c, val))
  })

  // Student Supports: [ID, StudentID, Type, StartDate, EndDate, AssignedTo, AssignedBy, Status, IncBefore, IncAfter, RefID, Notes]
  const supData = [
    ['SUP-001','NAV-002','CICO (Check-In / Check-Out)',d('2026-01-17'),'','Ms. Johnson','Mr. Davis','Active',3,'','REF-004','Daily CICO with Ms. Johnson. Showing improvement.'],
    ['SUP-002','NAV-003','Social Skills Group',d('2026-01-12'),d('2026-02-27'),'Mr. Lee','Ms. Rivera','Completed',5,2,'REF-006','Completed 6-week group. 60% incident reduction.'],
    ['SUP-003','NAV-005','Behavior Contract',d('2026-02-01'),'','Mr. Davis','Mr. Davis','Active',4,'','','Active contract — weekly check-in Fridays.'],
  ]
  supData.forEach((row, i) => {
    row.forEach((val, c) => set(supports, i + 2, c, val))
  })
}

// ═════════════════════════════════════════════════════════════
// TAB — RISK ALERT BOARD (printable weekly briefing)
// ═════════════════════════════════════════════════════════════
function buildRiskAlertBoard() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, '🚨 WEEKLY RISK ALERT BOARD — Navigator Behavior Tracker')
  setCell(ws, r, 0, fs(`"As of: "&TEXT(TODAY(),"MMMM D, YYYY")`))
  merge(ws, 'A2:I2')
  r++
  setStr(ws, r++, 0, 'Print this tab for your Monday morning behavior briefing. All data auto-updates from your other tabs.')
  r++

  // Section 1: OSS Escalation Flags
  setStr(ws, r++, 0, '🚨 OSS ESCALATION FLAGS (3+ OSS in 90 days)')
  const ossHdr = ['Student ID','Last Name','First Name','Grade','Campus','OSS Count (90d)','Status']
  ossHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 10; i++) {
    const pr = i + 3  // Placements data row (1-based, row 3 = first data)
    setCell(ws, r + i, 0, fs(`IF('ISS-OSS Placements'!B${pr}="","",IF(COUNTIFS('ISS-OSS Placements'!$B:$B,'ISS-OSS Placements'!B${pr},'ISS-OSS Placements'!$F:$F,"OSS — Out-of-School Suspension",'ISS-OSS Placements'!$G:$G,">="&(TODAY()-90))>=3,'ISS-OSS Placements'!B${pr},""))`))
    ;[2,3,4].forEach((col, offset) => {
      setCell(ws, r + i, 1 + offset, fs(`IF('ISS-OSS Placements'!B${pr}="","",IF(COUNTIFS('ISS-OSS Placements'!$B:$B,'ISS-OSS Placements'!B${pr},'ISS-OSS Placements'!$F:$F,"OSS — Out-of-School Suspension",'ISS-OSS Placements'!$G:$G,">="&(TODAY()-90))>=3,'ISS-OSS Placements'!${['C','D','E'][offset]}${pr},""))`))
    })
    setCell(ws, r + i, 5, fs(`'ISS-OSS Placements'!Q${pr}`))
    setCell(ws, r + i, 6, sv('Review for DAEP referral'))
  }
  r += 10
  r++

  // Section 2: Open Referrals
  setStr(ws, r++, 0, '📋 OPEN REFERRALS (no outcome assigned yet)')
  const refHdr = ['Referral ID','Date','Student ID','Last Name','Offense','Skill Gap','Status']
  refHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 10; i++) {
    const rr = i + 3
    setCell(ws, r + i, 0, fs(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!A${rr},""))`))
    setCell(ws, r + i, 1, fv(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!B${rr},""))`))
    setCell(ws, r + i, 2, fs(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!D${rr},""))`))
    setCell(ws, r + i, 3, fs(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!E${rr},""))`))
    setCell(ws, r + i, 4, fs(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!H${rr},""))`))
    setCell(ws, r + i, 5, fs(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!J${rr},""))`))
    setCell(ws, r + i, 6, fs(`IF('Referral Log'!A${rr}="","",IF('Referral Log'!M${rr}="Open",'Referral Log'!M${rr},""))`))
  }
  r += 10
  r++

  // Section 3: Snapshot
  setStr(ws, r++, 0, '📊 SNAPSHOT COUNTS')
  const snaps = [
    ['Active Supports',         fs(`COUNTIF('Student Supports'!K:K,"Active")`)],
    ['Open Referrals',          fs(`COUNTIF('Referral Log'!M:M,"Open")`)],
    ['Students w/ 3+ OSS (90d)',fs(`SUMPRODUCT((COUNTIFS('ISS-OSS Placements'!$B:$B,IF('ISS-OSS Placements'!$B:$B<>"",Roster!$A:$A,"NOMATCH"),'ISS-OSS Placements'!$F:$F,"OSS — Out-of-School Suspension",'ISS-OSS Placements'!$G:$G,">="&(TODAY()-90))>=3)*1)`)],
    ['Total Referrals (YTD)',    fv(`MAX(0,COUNTA('Referral Log'!A:A)-2)`)],
    ['Completed Supports',      fs(`COUNTIF('Student Supports'!K:K,"Completed")`)],
  ]
  snaps.forEach(([label, formula], i) => {
    setStr(ws, r + i, 0, label)
    ws[R(r + i, 1)] = formula
  })
  r += snaps.length
  r++

  setStr(ws, r, 0, '─── Generated by Navigator — Student Behavior Tracker | Clear Path Education Group, LLC | clearpatheg.com ───')
  merge(ws, `A${r+1}:I${r+1}`)

  setRange(ws, r + 2, 9)
  setColWidths(ws, [100, 130, 130, 100, 150, 160, 160, 120, 100])
  return ws
}

// ═════════════════════════════════════════════════════════════
// ASSEMBLE
// ═════════════════════════════════════════════════════════════
XLSX.utils.book_append_sheet(wb, buildCover(),        'Cover')
XLSX.utils.book_append_sheet(wb, buildRoster(),       'Roster')
XLSX.utils.book_append_sheet(wb, buildReferralLog(),  'Referral Log')
XLSX.utils.book_append_sheet(wb, buildPlacements(),   'ISS-OSS Placements')
XLSX.utils.book_append_sheet(wb, buildSupports(),     'Student Supports')
XLSX.utils.book_append_sheet(wb, buildRiskCalc(),     'Risk Score Calculator')
XLSX.utils.book_append_sheet(wb, buildDashboard(),    'Dashboard')
XLSX.utils.book_append_sheet(wb, buildRiskAlertBoard(),'🚨 Risk Alert Board')
XLSX.utils.book_append_sheet(wb, buildReference(),    'Reference')
XLSX.utils.book_append_sheet(wb, buildUpgrade(),      '↑ Upgrade to Navigator')
XLSX.utils.book_append_sheet(wb, buildLists(),        'Lists')

// Inject sample demo data so all formulas are live on open
addNavigatorSampleData(wb)

const OUTPUT = 'Navigator-Student-Behavior-Tracker-Texas-Edition.xlsx'
XLSX.writeFile(wb, OUTPUT)
console.log(`\n✅ Built: ${OUTPUT}`)
console.log(`   10 tabs | Referrals, ISS/OSS, Supports, Risk Score Calculator, Dashboard\n`)
