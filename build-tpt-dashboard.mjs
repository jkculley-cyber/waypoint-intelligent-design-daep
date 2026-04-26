/**
 * build-tpt-dashboard.mjs
 * Generates: Campus-Discipline-Command-Dashboard.xlsx
 * Brand: Clear Path Education Group, LLC
 * Run: node build-tpt-dashboard.mjs
 *
 * 5 clean, focused tabs — each does ONE thing well:
 *  1. Command Dashboard  — all open cases at a glance, auto-populates
 *  2. Case Log           — one row per incident (the only data entry tab)
 *  3. 10-Day Compliance  — countdown + due process checklist per removal
 *  4. Parent Contact Log — every contact + 12 scripts
 *  5. Discipline Trends  — auto-counts from Case Log
 *
 * Companion to: Investigation Template Packet (.docx files)
 * Case IDs link this dashboard to the investigation documents.
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
  'Harassment / Bullying',
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

const CONTACT_METHODS = [
  'Phone Call', 'Email', 'In-Person Meeting',
  'Certified Mail', 'Text Message', 'School Messenger',
]

const GRADES = [
  'Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade',
  '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
]

const YES_NO    = ['Yes', 'No']
const YES_NO_NA = ['Yes', 'No', 'N/A']

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

const wb = XLSX.utils.book_new()

// ═════════════════════════════════════════════════════════════
// TAB 1 — COMMAND DASHBOARD
//
// Case Log column map (1-indexed VLOOKUP):
//   1=CaseID  2=Date  3=Student  4=Grade  5=SPED  6=504
//   7=Offense  8=RemovalType  9=RemovalDate  10=Status
//   11=AssignedTo  12=InvestigationDoc  13=Notes
// ═════════════════════════════════════════════════════════════
function buildCommandDashboard() {
  const ws = {}
  let r = 0

  // Title
  setStr(ws, r++, 0, '🎯  COMMAND DASHBOARD')
  setCell(ws, r, 0, fs(`"As of: "&TEXT(TODAY(),"MMMM D, YYYY")&"   |   Campus: (fill in on Cover)"  `))
  merge(ws, 'A2:K2')
  r++
  setStr(ws, r++, 0, 'Everything here auto-updates from your Case Log. No data entry on this tab.')
  r++

  // ── KEY NUMBERS ──
  setStr(ws, r++, 0, '━━  KEY NUMBERS')
  const metrics = [
    ['Open Cases',
      fv(`SUMPRODUCT(('Case Log'!$A$3:$A$302<>"")*('Case Log'!$J$3:$J$302<>"Closed — No Action")*('Case Log'!$J$3:$J$302<>"Closed — Resolved"))`)],
    ['Removals Requiring 10-Day Action',
      fv(`SUMPRODUCT(('10-Day Compliance'!$A$3:$A$102<>"")*('10-Day Compliance'!$G$3:$G$102<>"")*('10-Day Compliance'!$G$3:$G$102<=TODAY())*('10-Day Compliance'!$L$3:$L$102=""))`)],
    ['SPED Students in Open Cases',
      fv(`SUMPRODUCT(('Case Log'!$A$3:$A$302<>"")*('Case Log'!$E$3:$E$302="Yes")*('Case Log'!$J$3:$J$302<>"Closed — No Action")*('Case Log'!$J$3:$J$302<>"Closed — Resolved"))`)],
    ['Parent Follow-Ups Overdue',
      fv(`SUMPRODUCT(('Parent Contact Log'!$N$3:$N$302<>"")*('Parent Contact Log'!$N$3:$N$302<TODAY()))`)],
    ['Active Appeals',
      fv(`COUNTIF('Case Log'!$J:$J,"Appeal Filed")`)],
    ['Total Incidents (YTD)',
      fv(`MAX(0,COUNTA('Case Log'!$A:$A)-2)`)],
  ]
  metrics.forEach(([label, formula], i) => {
    setStr(ws, r + i, 0, label)
    ws[R(r + i, 2)] = formula
  })
  r += metrics.length
  r++

  // ── 10-DAY COUNTDOWN ALERTS ──
  setStr(ws, r++, 0, '━━  10-DAY REMOVAL ALERTS  (cases at Day 7 or later)')
  const alertHdr = ['Case ID','Student','Grade','Removal Date','Days Elapsed ⚙','Day 10 Deadline ⚙','Status ⚙','SPED? ⚙','MDR Required? ⚙']
  alertHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 10; i++) {
    const tr = i + 3
    ;[0,1,2].forEach(c => setCell(ws, r + i, c, fs(`'10-Day Compliance'!${['A','B','C'][c]}${tr}`)))
    setCell(ws, r + i, 3, fv(`IF('10-Day Compliance'!F${tr}="","",TEXT('10-Day Compliance'!F${tr},"MM/DD/YY"))`))
    setCell(ws, r + i, 4, fv(`'10-Day Compliance'!E${tr}`))
    setCell(ws, r + i, 5, fv(`IF('10-Day Compliance'!G${tr}="","",TEXT('10-Day Compliance'!G${tr},"MM/DD/YY"))`))
    setCell(ws, r + i, 6, fs(`'10-Day Compliance'!H${tr}`))
    setCell(ws, r + i, 7, fs(`'10-Day Compliance'!D${tr}`))
    setCell(ws, r + i, 8, fs(`'10-Day Compliance'!I${tr}`))
  }
  r += 10
  r++

  // ── ALL ACTIVE CASES ──
  setStr(ws, r++, 0, '━━  ALL CASES  (first 30 — use filters to sort by status, days open, assigned admin)')
  const caseHdr = ['Case ID','Date','Student','Grade','Offense','Status','Days Open ⚙','SPED?','Removal?','Assigned To','Investigation Doc?']
  caseHdr.forEach((h, c) => setStr(ws, r, c, h))
  r++
  for (let i = 0; i < 30; i++) {
    const lr = i + 3
    setCell(ws, r + i, 0,  fs(`'Case Log'!A${lr}`))
    setCell(ws, r + i, 1,  fv(`IF('Case Log'!A${lr}="","",IF('Case Log'!B${lr}<>"",'Case Log'!B${lr},""))`))
    setCell(ws, r + i, 2,  fs(`'Case Log'!C${lr}`))
    setCell(ws, r + i, 3,  fs(`'Case Log'!D${lr}`))
    setCell(ws, r + i, 4,  fs(`'Case Log'!G${lr}`))
    setCell(ws, r + i, 5,  fs(`'Case Log'!J${lr}`))
    setCell(ws, r + i, 6,  fs(`IF('Case Log'!A${lr}="","",IF(OR('Case Log'!J${lr}="Closed — No Action",'Case Log'!J${lr}="Closed — Resolved"),"✅ Closed",IF('Case Log'!B${lr}="","",TEXT(TODAY()-'Case Log'!B${lr},"0")&" days")))`))
    setCell(ws, r + i, 7,  fs(`'Case Log'!E${lr}`))
    setCell(ws, r + i, 8,  fs(`IF('Case Log'!H${lr}="","—",'Case Log'!H${lr})`))
    setCell(ws, r + i, 9,  fs(`'Case Log'!K${lr}`))
    setCell(ws, r + i, 10, fs(`IF('Case Log'!L${lr}="","⚠ Not linked",'Case Log'!L${lr})`))
  }
  r += 30
  r++

  setStr(ws, r, 0, 'Waypoint automates all of this with real-time alerts, role-based access, and Laserfiche sync → clearpathedgroup.com/waypoint  |  Clear Path Education Group, LLC')
  merge(ws, `A${r+1}:K${r+1}`)

  setRange(ws, r + 2, 11)
  setColWidths(ws, [100,90,160,70,190,140,80,60,120,130,140])
  ws['!freeze'] = { ySplit: 1, xSplit: 0 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 2 — CASE LOG
// The ONLY tab where you type new data. Everything else reads from here.
// Columns A–M (13 cols), data starts row 3 (index 2)
//
//  A=CaseID  B=Date  C=Student  D=Grade  E=SPED  F=504
//  G=Offense  H=RemovalType  I=RemovalDate  J=Status
//  K=AssignedTo  L=InvestigationDoc  M=Notes
// ═════════════════════════════════════════════════════════════
function buildCaseLog() {
  const ws = {}
  const END = 302

  setStr(ws, 0, 0, 'CASE LOG  —  One Row Per Incident  |  This is the only tab you type new data into. Everything else reads from here.')
  merge(ws, 'A1:M1')
  setStr(ws, 1, 0, 'Assign a Case ID for each incident (e.g. ADM-001). Use the SAME Case ID in your Investigation Template document and 10-Day Compliance tab to link everything together.')
  merge(ws, 'A2:M2')

  const headers = [
    'Case ID',               // A  0   ← unique, assigned by admin
    'Incident Date',         // B  1
    'Student Name',          // C  2   ← Last, First
    'Grade',                 // D  3
    'SPED?',                 // E  4
    '504?',                  // F  5
    'Offense Category',      // G  6
    'Removal Type',          // H  7
    'Removal Date',          // I  8
    'Case Status',           // J  9
    'Assigned To (Admin)',   // K  10
    'Investigation Doc',     // L  11  ← filename or "Fighting Template — ADM-001"
    'Notes',                 // M  12
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  setRange(ws, END, 13)
  setColWidths(ws, [90,100,160,80,60,60,200,180,110,150,140,200,240])
  ws['!freeze'] = { ySplit: 3, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 3 — 10-DAY COMPLIANCE
// Enter Case ID. Removal date + student info auto-fill from Case Log.
// Cols A–M (13 cols), data starts row 3 (index 2)
//
//  A=CaseID  B=Student⚙  C=Grade⚙  D=SPED⚙  E=DaysElapsed⚙
//  F=RemovalDate⚙  G=Day10Deadline⚙  H=Status⚙  I=MDRRequired⚙
//  J=NoticeProvided  K=ConferenceHeld  L=ParentNotified  M=Disposition
// ═════════════════════════════════════════════════════════════
function buildTenDayCompliance() {
  const ws = {}
  const END = 102

  setStr(ws, 0, 0, '10-DAY REMOVAL COMPLIANCE  —  Enter Case ID Below. Student info auto-fills from Case Log.')
  merge(ws, 'A1:M1')
  setStr(ws, 1, 0, 'Enter a Case ID for EVERY case with a removal. The 10-day clock is the most dangerous compliance deadline in school discipline. SPED students: MDR must happen within 10 SCHOOL days — not calendar days.')
  merge(ws, 'A2:M2')

  const headers = [
    'Case ID',               // A  0   ← enter here
    'Student ⚙',             // B  1   ← VLOOKUP
    'Grade ⚙',               // C  2   ← VLOOKUP
    'SPED? ⚙',               // D  3   ← VLOOKUP
    'Days Elapsed ⚙',        // E  4   ← TODAY() - removal date
    'Removal Date ⚙',        // F  5   ← VLOOKUP
    'Day 10 Deadline ⚙',     // G  6   ← removal + 10
    'Status ⚙',              // H  7   ← emoji countdown
    'MDR Required? ⚙',       // I  8   ← if SPED = Yes
    '☐ Notice Provided?',    // J  9
    '☐ Conference Held?',    // K  10
    '☐ Parent Notified?',    // L  11
    'Final Disposition',     // M  12
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-fill from Case Log
  // Case Log: A=1 B=2 C=3 D=4 E=5 F=6 G=7 H=8 I=9 J=10 K=11
  fillFormulas(ws, 1, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Case Log'!$A:$C,3,FALSE),"⚠ Case ID not found"))`)
  )
  fillFormulas(ws, 2, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Case Log'!$A:$D,4,FALSE),""))`)
  )
  fillFormulas(ws, 3, 3, END - 1, r =>
    fs(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Case Log'!$A:$E,5,FALSE),""))`)
  )
  // Removal date (col I = index 8 = VLOOKUP col 9)
  fillFormulas(ws, 5, 3, END - 1, r =>
    fv(`IF(A${r}="","",IFERROR(VLOOKUP(A${r},'Case Log'!$A:$I,9,FALSE),""))`)
  )
  fillFormulas(ws, 4, 3, END - 1, r =>
    fv(`IF(F${r}="","",TODAY()-F${r})`)
  )
  fillFormulas(ws, 6, 3, END - 1, r =>
    fv(`IF(F${r}="","",F${r}+10)`)
  )
  fillFormulas(ws, 7, 3, END - 1, r =>
    fs(`IF(F${r}="","",IF(M${r}<>"","✅ Disposition Made",IF(TODAY()-F${r}>10,"❌ OVERDUE — Day "&TEXT(TODAY()-F${r},"0"),IF(TODAY()-F${r}>=8,"🔴 Day "&TEXT(TODAY()-F${r},"0")&" — URGENT",IF(TODAY()-F${r}>=5,"⚠ Day "&TEXT(TODAY()-F${r},"0"),"🟢 Day "&TEXT(TODAY()-F${r},"0"))))))`)
  )
  fillFormulas(ws, 8, 3, END - 1, r =>
    fs(`IF(D${r}="Yes","⚠ MDR REQUIRED — schedule within 10 school days",IF(D${r}="No","N/A",""))`)
  )

  setRange(ws, END, 13)
  setColWidths(ws, [90,160,80,70,90,110,120,180,260,120,120,120,200])
  ws['!freeze'] = { ySplit: 3, xSplit: 1 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 4 — PARENT CONTACT LOG + SCRIPTS
// ═════════════════════════════════════════════════════════════
function buildParentContactLog() {
  const ws = {}
  const DATA_END = 302

  setStr(ws, 0, 0, 'PARENT CONTACT LOG  —  Every Call, Email, and In-Person Contact  |  Communication Scripts start below row 305')
  merge(ws, 'A1:N1')
  setStr(ws, 1, 0, 'Log EVERY attempt — even unanswered calls and voicemails. This is your evidence in any appeal or TEA complaint. TEC §37.009(a) + local Board policy (typically TASB FO/FOC) require parent notification — your log proves you did it.')
  merge(ws, 'A2:N2')

  const headers = [
    'Contact ID',         // A  0
    'Case ID',            // B  1
    'Student Name',       // C  2
    'Parent / Guardian',  // D  3
    'Relationship',       // E  4
    'Phone / Email',      // F  5
    'Contact Method',     // G  6
    'Date',               // H  7
    'Time',               // I  8
    'Attempt #  ⚙',       // J  9
    'Successful?',        // K  10
    'Summary of Contact', // L  11
    'Follow-Up Required?',// M  12
    'Follow-Up Date',     // N  13
  ]
  headers.forEach((h, c) => setStr(ws, 2, c, h))

  // Auto-pull student name from Case Log
  fillFormulas(ws, 2, 3, DATA_END - 1, r =>
    fs(`IF(B${r}="","",IF(C${r}<>"",C${r},IFERROR(VLOOKUP(B${r},'Case Log'!$A:$C,3,FALSE),"Enter student name")))`)
  )
  // Attempt counter per case
  fillFormulas(ws, 9, 3, DATA_END - 1, r =>
    fv(`IF(B${r}="","",COUNTIF(B$3:B${r},B${r}))`)
  )

  // ── SCRIPTS SECTION ──
  let sr = DATA_END + 2

  setStr(ws, sr++, 0, '══════════════════════════════════════════════════════════════════════')
  setStr(ws, sr++, 0, '📞  COMMUNICATION SCRIPTS — Campus Administrator Edition — Texas')
  setStr(ws, sr++, 0, 'Clear Path Education Group, LLC  |  For organizational use only — not legal advice.')
  setStr(ws, sr++, 0, 'Adapt each script to your voice. Log every call above in the contact log.')
  setStr(ws, sr++, 0, '══════════════════════════════════════════════════════════════════════')
  sr++

  const scripts = [
    {
      title: 'SCRIPT 1 — Initial Removal Notification',
      context: 'First call after a mandatory or discretionary removal. Required under TEC §37.013. Make this call within the same school day.',
      lines: [
        'OPENING:    "Hello, is this [Parent Name]? This is [Name], [Title] at [Campus]."',
        'NOTICE:     "I\'m calling about [Student Name]. There was an incident today that requires me to place [him/her/them] in [DAEP / suspension]."',
        'FACTS:      "The incident involved [brief factual description — no other student names, no speculation]."',
        'LEGAL:      "This placement is [mandatory under Texas Education Code §37.006 / discretionary based on our SCOC]."',
        'DURATION:   "The placement begins [Date] and is set for [X] days, ending approximately [Date]."',
        'RIGHTS:     "You have the right to a conference with me before the placement begins. Would you like to schedule one?"',
        'NEXT STEP:  "You\'ll receive a written notice [today / within 1 business day]. My direct number is [number]."',
        'CLOSE:      "I know this is hard news. Our goal is [Student\'s] success. I\'m here to support you through this."',
        'LOG:         Document: date, time, who answered, what was communicated, any requests or questions from parent.',
      ],
    },
    {
      title: 'SCRIPT 2 — Parent Is Hostile or Refuses to Engage',
      context: 'Use when a parent denies the incident, refuses to listen, or becomes verbally aggressive.',
      lines: [
        'STEP 1:  Lower your own voice. Do not match their volume.',
        'STEP 2:  "I hear that you\'re upset, and your concerns matter to me."',
        'STEP 3:  "I want [Student] to be treated fairly. The best way to address your concerns is a formal conference — not this phone call."',
        'STEP 4:  "Can we schedule a meeting? I\'ll make sure you have time to share your perspective before any final decision."',
        'STEP 5:  If they continue: "I\'m going to need to end this call. I\'ll send you a written notice of your rights and conference options today."',
        'NEVER:   Argue facts, raise your voice, make threats, or promise outcomes you can\'t guarantee.',
        'AFTER:   Document verbatim what was said (both sides). Notify principal. Send written notice by certified mail same day.',
      ],
    },
    {
      title: 'SCRIPT 3 — Mandatory Expulsion Notification',
      context: 'TEC §37.007 offense. Board hearing rights must be explained. Keep this call focused on rights and process — not facts.',
      lines: [
        'OPENING:  "This is a serious call. I\'m [Name], [Title] at [Campus], calling about [Student]."',
        'NOTICE:   "Based on today\'s incident, district policy and Texas law require me to recommend expulsion. I know that is very serious, and I want to explain your rights."',
        'RIGHTS:   "You have the right to a conference before any expulsion action. You also have the right to a hearing before the school board."',
        'PROCESS:  "A formal written notice with the hearing date and your full rights will be sent to you today. Please confirm your mailing address."',
        'LEGAL:    "You have the right to bring an attorney to the board hearing if you choose."',
        'LIMIT:    Do NOT discuss evidence details, other students, or staff opinions on this call.',
        'LOG:      Document time called, parent\'s response, whether they asked questions, and whether address was confirmed.',
      ],
    },
    {
      title: 'SCRIPT 4 — SPED Parent: MDR Rights Notice',
      context: 'Any time a student with an IEP is being considered for removal. MDR within 10 school days is non-negotiable under IDEA.',
      lines: [
        'OPENING:  "Hello, this is [Name]. I\'m calling about a disciplinary matter and [Student\'s] special education rights — both are important."',
        'INCIDENT: "[Student] was involved in [brief description]. We are considering a change in placement."',
        'RIGHTS:   "Because [Student] receives special education services, we are required by federal law to hold a Manifestation Determination Review — an MDR — before any removal becomes final."',
        'EXPLAIN:  "The MDR is a meeting where our ARD committee reviews whether the behavior was caused by [Student\'s] disability. You are a required member of that team."',
        'SCHEDULE: "Our deadline is 10 school days from today — [calculated date]. Can you attend on [proposed date]?"',
        'WRITTEN:  "You\'ll receive a written meeting invitation and Prior Written Notice within [timeframe]. Do I have your correct email?"',
        'LOG:      Document that MDR rights were verbally explained, date/time of call, and whether a meeting was proposed.',
      ],
    },
    {
      title: 'SCRIPT 5 — Victim Family Notification (FERPA-Safe)',
      context: 'Calling the family of a student who was harmed. FERPA prohibits sharing information about the other student.',
      lines: [
        'OPENING:  "Hello, this is [Name] from [Campus]. I\'m calling about an incident involving [Student] today."',
        'FACTS:    "[Student] was involved in a [type — e.g., altercation, harassment situation] and we took immediate action."',
        'FERPA:    "I\'m not able to share information about any other students involved, but I can tell you that action was taken."',
        'SAFETY:   "[Describe safety measures for this student — separation, escort, counseling]."',
        'SUPPORT:  "Would you like me to connect [Student] with our school counselor? Is there anything you need right now?"',
        'FOLLOW:   "I\'ll follow up with you [tomorrow / this week]. My direct line is [number]."',
        'LOG:      Document what was shared (and not shared), parent\'s response, and any support requests.',
      ],
    },
    {
      title: 'SCRIPT 6 — Explaining Appeal Rights',
      context: 'Use after communicating a placement decision to ensure parent understands their rights. Required best practice.',
      lines: [
        '"I want to make sure you understand that you have the right to appeal this decision."',
        '"The first step is a conference with [Principal / campus-level reviewer]."',
        '"If you\'re not satisfied, you may appeal to the Superintendent\'s office."',
        '"If that is also unsuccessful, you have the right to a hearing before the school board."',
        '"Your written notice will include the appeal timeline. Filing deadlines are strict — late filings may not be accepted."',
        '"Do you have any questions about the process right now?"',
        'LOG:      Document that appeal rights were verbally explained and that written notice was provided.',
      ],
    },
    {
      title: 'SCRIPT 7 — Witness Parent (FERPA Boundary)',
      context: 'Use when the parent of a witness calls asking about the other student\'s discipline.',
      lines: [
        '"I understand you want to know the outcome. That\'s completely understandable."',
        '"Under FERPA — the Family Educational Rights and Privacy Act — I\'m not permitted to share disciplinary information about other students."',
        '"What I can tell you is that the matter was investigated and appropriate action was taken."',
        '"If you have ongoing safety concerns for your own child, I want to hear those and address them directly."',
        'Do NOT: confirm or deny what discipline was given, share the other student\'s name, or discuss evidence.',
        'LOG:     Document that FERPA was cited and what was/was not shared.',
      ],
    },
    {
      title: 'SCRIPT 8 — Return-to-Campus Conditions',
      context: 'Communicating the terms for a student\'s return from DAEP, suspension, or ISS.',
      lines: [
        '"I want to talk with you about [Student\'s] return to campus on [Date]."',
        '"We\'ve put some conditions in place to make this return as successful as possible."',
        '"[List specific conditions: schedule change, no contact with specific students, counselor check-in, etc.]"',
        '"These aren\'t meant to be additional punishment — they\'re here to support [Student\'s] transition back."',
        '"If any of these create a hardship, please call me and we\'ll work through it together."',
        '"I\'ll follow up personally in the first week to check in with you and [Student]."',
        'LOG:     Document conditions communicated, parent acknowledgment, and any concerns raised.',
      ],
    },
    {
      title: 'SCRIPT 9 — Law Enforcement Is Involved',
      context: 'Informing a parent that an SRO or outside law enforcement was notified or made an arrest.',
      lines: [
        '"I\'m also calling because today\'s incident involved law enforcement."',
        '"[Officer/SRO Name] from [Agency] was contacted and [describe: arrest made / report filed / referred for review]."',
        '"I want to be transparent with you. The school discipline process and the law enforcement process are completely separate."',
        '"What happens on our end is governed by the Texas Education Code and our district policy."',
        '"For questions about the law enforcement side, you\'ll need to contact [Agency] directly."',
        'Do NOT: provide legal advice, speculate on charges, or promise any outcome.',
        'LOG:    Document law enforcement action, what was shared, and parent response.',
      ],
    },
    {
      title: 'SCRIPT 10 — Threat Assessment: Parent of Student Who Made Threat',
      context: 'Calling the parent of a student who made a threat. This call should happen in person if at all possible.',
      lines: [
        '"This is a serious call and I appreciate you taking it. [Student] made a [written/verbal/online] statement today that requires immediate attention."',
        '"We are required under Texas law to conduct a formal Threat Assessment. That process has already started."',
        '"[Student] is safe and currently with [staff member] while we complete this."',
        '"I need to meet with you in person — today if at all possible. This is not optional."',
        '"Until the assessment is complete, [Student] will [remain with supervision on campus / go home with you pending outcome]."',
        '"My goal is [Student\'s] safety and the safety of every student on this campus. I\'m going to need your full partnership here."',
        'LOG:    Document time, parent response, whether in-person meeting was agreed to, and outcome.',
      ],
    },
    {
      title: 'SCRIPT 11 — Conference Rights (Before Any Placement)',
      context: 'Explaining the conference right before a DAEP or suspension placement. Required under TEC §37.009.',
      lines: [
        '"Before [Student\'s] placement is finalized, I want to make sure you know your rights."',
        '"You — and [Student] — have the right to an informal conference with me before the placement begins."',
        '"At this conference, you can hear exactly why we\'re recommending this placement and share any information you believe is relevant."',
        '"This conference doesn\'t change what Texas law requires for mandatory placements, but it\'s your right and I strongly encourage you to use it."',
        '"The conference needs to happen before the placement begins. Can we meet today or tomorrow morning?"',
        '"If you choose not to attend, I\'ll document that the conference was offered and declined."',
        'LOG:    Document whether conference was offered, accepted, declined, or scheduled.',
      ],
    },
    {
      title: 'SCRIPT 12 — De-Escalation: Highly Hostile Parent',
      context: 'Use when the conversation has become impossible due to the parent\'s emotional state.',
      lines: [
        'STEP 1 — Slow down:       Respond slowly and quietly. Let silence do the work.',
        'STEP 2 — Name it calmly:  "I want to help you, and right now the level of this conversation is making that very difficult."',
        'STEP 3 — Offer a reset:   "Can we take a moment and start over? I want to make sure [Student] gets fair treatment."',
        'STEP 4 — Set the limit:   "If this continues, I\'m going to need to end this call and communicate in writing."',
        'STEP 5 — End if needed:   "I\'m ending this call now. I\'ll send you a written summary and your rights documentation today."',
        'AFTER:   Document every specific statement made (both sides). Notify principal immediately. Send certified mail same day.',
        'NEVER:   Argue about facts, make threats, raise your voice, or say anything in anger. Everything said becomes evidence.',
      ],
    },
  ]

  scripts.forEach(({ title, context, lines }) => {
    setStr(ws, sr, 0, `━━━  ${title}  ━━━`)
    merge(ws, `A${sr+1}:N${sr+1}`)
    sr++
    setStr(ws, sr++, 0, `Context: ${context}`)
    lines.forEach(line => setStr(ws, sr++, 0, line))
    sr++
  })

  setRange(ws, sr + 1, 14)
  setColWidths(ws, [80,90,160,160,120,160,130,100,80,80,90,300,120,110])
  ws['!freeze'] = { ySplit: 3, xSplit: 2 }
  return ws
}

// ═════════════════════════════════════════════════════════════
// TAB 5 — DISCIPLINE TRENDS
// ═════════════════════════════════════════════════════════════
function buildTrends() {
  const ws = {}
  let r = 0

  setStr(ws, r++, 0, 'DISCIPLINE TRENDS  —  Auto-calculated from Case Log  |  No data entry required')
  setCell(ws, r, 0, fs(`"As of: "&TEXT(TODAY(),"MMMM D, YYYY")&"   Total incidents: "&TEXT(MAX(0,COUNTA('Case Log'!$A:$A)-2),"0")`))
  merge(ws, 'A2:F2')
  r++
  setStr(ws, r++, 0, 'Select any table and insert a chart (Insert → Chart) for your CIP, board report, or weekly briefing. All numbers update automatically.')
  r++

  // Monthly counts
  setStr(ws, r, 0, 'MONTHLY COUNT — 2025–26')
  setStr(ws, r, 1, 'Incidents')
  r++
  const months = [
    ['Aug 2025', 8, 2025], ['Sep 2025', 9, 2025], ['Oct 2025', 10, 2025],
    ['Nov 2025', 11, 2025], ['Dec 2025', 12, 2025], ['Jan 2026', 1, 2026],
    ['Feb 2026', 2, 2026], ['Mar 2026', 3, 2026], ['Apr 2026', 4, 2026],
    ['May 2026', 5, 2026], ['Jun 2026', 6, 2026], ['Jul 2026', 7, 2026],
  ]
  months.forEach(([label, m, y]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 1, fv(`SUMPRODUCT(('Case Log'!$B$3:$B$302<>0)*(MONTH('Case Log'!$B$3:$B$302)=${m})*(YEAR('Case Log'!$B$3:$B$302)=${y}))`))
    r++
  })
  r++

  // By offense
  setStr(ws, r, 0, 'BY OFFENSE CATEGORY')
  setStr(ws, r, 1, 'Count')
  setStr(ws, r, 2, '% of Total ⚙')
  r++
  const total = `MAX(1,COUNTA('Case Log'!$A:$A)-2)`
  OFFENSE_CATEGORIES.forEach(cat => {
    setStr(ws, r, 0, cat)
    setCell(ws, r, 1, fv(`COUNTIF('Case Log'!$G:$G,"${cat}")`))
    setCell(ws, r, 2, fs(`TEXT(COUNTIF('Case Log'!$G:$G,"${cat}")/(${total}),"0%")`))
    r++
  })
  r++

  // By grade
  setStr(ws, r, 0, 'BY GRADE')
  setStr(ws, r, 1, 'Count')
  r++
  GRADES.forEach(g => {
    setStr(ws, r, 0, g)
    setCell(ws, r, 1, fv(`COUNTIF('Case Log'!$D:$D,"${g}")`))
    r++
  })
  r++

  // SPED breakdown
  setStr(ws, r, 0, 'SPED / 504 BREAKDOWN')
  setStr(ws, r, 1, 'Count')
  r++
  const breakdown = [
    ['SPED (IEP) Students',  `COUNTIF('Case Log'!$E:$E,"Yes")`],
    ['504 Students',         `COUNTIF('Case Log'!$F:$F,"Yes")`],
    ['General Ed Only',      `COUNTIFS('Case Log'!$E:$E,"No",'Case Log'!$F:$F,"No",'Case Log'!$A:$A,"<>")`],
    ['Mandatory Removals',   `COUNTIF('Case Log'!$H:$H,"Mandatory*")`],
    ['Suspensions',          `COUNTIF('Case Log'!$H:$H,"Suspension*")`],
    ['No Removal',           `COUNTIF('Case Log'!$H:$H,"Warning*")`],
    ['Open Cases',           `SUMPRODUCT(('Case Log'!$A:$A<>"")*('Case Log'!$J:$J<>"Closed — No Action")*('Case Log'!$J:$J<>"Closed — Resolved"))`],
    ['Closed Cases',         `COUNTIF('Case Log'!$J:$J,"Closed*")`],
  ]
  breakdown.forEach(([label, formula]) => {
    setStr(ws, r, 0, label)
    setCell(ws, r, 1, fv(formula))
    r++
  })
  r++

  setStr(ws, r, 0, '─── All data auto-populated from Case Log | Clear Path Education Group, LLC | clearpathedgroup.com ───')
  merge(ws, `A${r+1}:F${r+1}`)

  setRange(ws, r + 2, 6)
  setColWidths(ws, [220, 90, 100, 120, 120, 120])
  return ws
}

// ═════════════════════════════════════════════════════════════
// SAMPLE DATA — 5 pre-loaded cases
// ═════════════════════════════════════════════════════════════
function addSampleData(wb) {
  const caseLog  = wb.Sheets['Case Log']
  const tenDay   = wb.Sheets['10-Day Compliance']
  const contacts = wb.Sheets['Parent Contact Log']

  const d   = s => ({ v: excelDate(s), t: 'n', z: 'MM/DD/YYYY' })
  const set = (ws, r, c, val) => {
    ws[R(r, c)] = typeof val === 'object' && val !== null ? val
      : typeof val === 'number' ? { v: val, t: 'n' }
      : { v: val, t: 's' }
  }

  // Case Log rows (index 2 = row 3 in Excel = first data row)
  const cases = [
    // CaseID, Date, Student, Grade, SPED, 504, Offense, RemovalType, RemovalDate, Status, AssignedTo, InvestDoc, Notes
    ['ADM-001', d('2026-03-03'), 'Thompson, Marcus', '10th Grade', 'Yes', 'No',
     'Fighting / Mutual Combat', 'Mandatory — TEC §37.006 DAEP', d('2026-03-03'),
     'Investigation Open', 'Mr. Kim (AP)', 'Investigation-Template-Fighting-Assault.docx — ADM-001',
     'SPED — MDR must be held by 3/14. Evidence secured. Parent called 3/3.'],
    ['ADM-002', d('2026-02-20'), 'Nguyen, Linh', '8th Grade', 'No', 'No',
     'Drugs / Alcohol — Possession', 'Mandatory — TEC §37.006 DAEP', d('2026-02-20'),
     'Closed — Resolved', 'Ms. Patel (AP)', 'Investigation-Template-Drugs-Alcohol.docx — ADM-002',
     '45-day DAEP. Parent conference held 2/21. Substance confiscated and logged.'],
    ['ADM-003', d('2026-01-15'), 'Davis, Jordan', '11th Grade', 'No', 'No',
     'Threats / Terroristic Threat', 'Mandatory Expulsion Recommended', d('2026-01-15'),
     'Appeal Filed', 'Mr. Kim (AP)', 'Investigation-Template-Threats.docx — ADM-003',
     'Board appeal in progress. Legal counsel engaged. Threat Assessment log: TA-001.'],
    ['ADM-004', d('2026-03-10'), 'Williams, Destiny', '7th Grade', 'Yes', 'No',
     'Defiance / Insubordination', 'Suspension — 3 Days', d('2026-03-10'),
     'Conference Pending', 'Ms. Patel (AP)', 'Investigation-Template-General-Misconduct.docx — ADM-004',
     'SPED student. Teacher removal. Parent conference scheduled 3/12.'],
    ['ADM-005', d('2026-03-12'), 'Ramirez, Sofia', '9th Grade', 'No', 'Yes',
     'Cyberbullying', 'Mandatory — TEC §37.006 DAEP', d('2026-03-12'),
     'Intake Filed', 'Mr. Torres (AP)', 'Investigation-Template-Harassment-Bullying.docx — ADM-005',
     '504 student. Screenshots secured. Victim in counseling. Investigation opened today.'],
  ]
  cases.forEach((row, i) => {
    row.forEach((val, c) => set(caseLog, i + 2, c, val))
  })

  // 10-Day Compliance — enter Case IDs for removal cases
  const tenDayCases = ['ADM-001', 'ADM-002', 'ADM-003', 'ADM-005']
  tenDayCases.forEach((id, i) => set(tenDay, i + 3, 0, id))
  // Mark ADM-002 as completed
  const idx002 = 3 + 1
  set(tenDay, idx002, 9,  'Yes')  // notice provided
  set(tenDay, idx002, 10, 'Yes')  // conference held
  set(tenDay, idx002, 11, 'Yes')  // parent notified
  set(tenDay, idx002, 12, '45-day DAEP confirmed. Start 2/22.')

  // Parent Contact Log
  const contactData = [
    ['PCT-001','ADM-001','Thompson, Marcus','Mrs. Thompson','Mother','(512) 555-0142','Phone Call',d('2026-03-03'),'10:50 AM',1,'Yes','Notified of removal and mandatory DAEP. Explained SPED rights and MDR requirement. Conference scheduled 3/5.','Yes',d('2026-03-05')],
    ['PCT-002','ADM-002','Nguyen, Linh','Mrs. Nguyen','Mother','(512) 555-0277','Phone Call',d('2026-02-20'),'2:00 PM',1,'Yes','Notified of possession and DAEP placement. Parent requested in-person conference.','Yes',d('2026-02-21')],
    ['PCT-003','ADM-002','Nguyen, Linh','Mrs. Nguyen','Mother','(512) 555-0277','In-Person Meeting',d('2026-02-21'),'9:00 AM',2,'Yes','Conference held. Placement accepted. Academic services confirmed. Device returned.','No',''],
    ['PCT-004','ADM-003','Davis, Jordan','Mr. Davis','Father','(512) 555-0391','Phone Call',d('2026-01-15'),'9:30 AM',1,'Yes','Notified of written threat and expulsion recommendation. Attorney retained. Appeal filed 1/22.','Yes',d('2026-01-22')],
    ['PCT-005','ADM-004','Williams, Destiny','Ms. Williams','Mother','(512) 555-0518','Phone Call',d('2026-03-10'),'2:45 PM',1,'No','Left voicemail. Notified of teacher removal and pending conference.','Yes',d('2026-03-11')],
    ['PCT-006','ADM-005','Ramirez, Sofia','Mr. Ramirez','Father','(512) 555-0644','Phone Call',d('2026-03-12'),'12:30 PM',1,'Yes','Notified of cyberbullying investigation and DAEP consideration. Explained 504 rights. Will call back tomorrow.','Yes',d('2026-03-13')],
  ]
  contactData.forEach((row, i) => {
    row.forEach((val, c) => set(contacts, i + 3, c, val))
  })
}

// ═════════════════════════════════════════════════════════════
// ASSEMBLE
// ═════════════════════════════════════════════════════════════
XLSX.utils.book_append_sheet(wb, buildCommandDashboard(), 'Command Dashboard')
XLSX.utils.book_append_sheet(wb, buildCaseLog(),          'Case Log')
XLSX.utils.book_append_sheet(wb, buildTenDayCompliance(), '10-Day Compliance')
XLSX.utils.book_append_sheet(wb, buildParentContactLog(), 'Parent Contact Log')
XLSX.utils.book_append_sheet(wb, buildTrends(),           'Discipline Trends')

addSampleData(wb)

const OUTPUT = 'Campus-Discipline-Command-Dashboard.xlsx'
XLSX.writeFile(wb, OUTPUT)
console.log(`\n✅ Built: ${OUTPUT}`)
console.log(`   5 tabs | Case Log → Dashboard → 10-Day Compliance → Parent Contact Log + 12 Scripts → Trends`)
console.log(`\n   5 sample cases pre-loaded (ADM-001 through ADM-005)`)
console.log(`   Day 10 clock ticking on ADM-001 | ADM-002 completed | ADM-003 in appeal | ADM-005 just opened`)
console.log(`\n   Companion files:`)
console.log(`   Investigation-Template-Fighting-Assault.docx     ← linked to ADM-001`)
console.log(`   Investigation-Template-Drugs-Alcohol.docx        ← linked to ADM-002`)
console.log(`   Investigation-Template-Threats.docx              ← linked to ADM-003`)
console.log(`   Investigation-Template-General-Misconduct.docx   ← linked to ADM-004`)
console.log(`   Investigation-Template-Harassment-Bullying.docx  ← linked to ADM-005\n`)
