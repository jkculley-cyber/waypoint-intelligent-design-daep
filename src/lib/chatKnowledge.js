/**
 * FAQ Knowledge Base for Waypoint Chat Support
 * Covers DAEP procedures, compliance, platform usage, and roles.
 */

const faqEntries = [
  // --- DAEP Procedures ---
  {
    question: 'What is DAEP?',
    keywords: ['what', 'daep', 'disciplinary', 'alternative', 'education', 'program'],
    answer: 'DAEP stands for Disciplinary Alternative Education Program. It is a program required by Texas Education Code Chapter 37 where students are placed as a consequence of certain behavioral violations. Students continue their education in a structured setting while serving their placement.',
  },
  {
    question: 'How does the DAEP placement process work?',
    keywords: ['placement', 'process', 'how', 'place', 'student', 'steps'],
    answer: 'The DAEP placement process involves: 1) An incident is documented, 2) The offense code is assigned per TEA Chapter 37, 3) A consequence is determined with the number of DAEP days, 4) The student is placed into the DAEP program, and 5) The student serves their assigned days. Administrators can create incidents from the Incidents page and assign consequences.',
  },
  {
    question: 'How are DAEP days calculated?',
    keywords: ['days', 'calculate', 'calculation', 'count', 'remaining', 'served', 'daep'],
    answer: 'DAEP days are calculated based on the consequence assigned to the incident. The system tracks the placement start date, total assigned days, and days served. Days remaining = total assigned days minus days served. Only school days count — weekends and holidays are excluded. You can see days remaining on the Students page and Student Detail page.',
  },
  {
    question: 'What are the consequence types?',
    keywords: ['consequence', 'types', 'iss', 'oss', 'expulsion', 'suspension'],
    answer: 'Common consequence types include: ISS (In-School Suspension), OSS (Out-of-School Suspension), DAEP Placement, JJAEP Placement, and Expulsion. Each consequence type has specific TEA reporting requirements. The consequence is assigned when creating or editing an incident.',
  },
  {
    question: 'What is TEA Chapter 37?',
    keywords: ['tea', 'chapter', '37', 'texas', 'education', 'code', 'law'],
    answer: 'TEA Chapter 37 of the Texas Education Code governs discipline management and alternative education programs. It defines which offenses require DAEP placement (mandatory vs. discretionary), sets timelines and procedures, and establishes protections for students with special needs. Waypoint helps ensure your district stays compliant with Chapter 37 requirements.',
  },
  {
    question: 'What is the difference between mandatory and discretionary DAEP placement?',
    keywords: ['mandatory', 'discretionary', 'required', 'optional', 'placement', 'difference'],
    answer: 'Mandatory DAEP placements are required by law for certain serious offenses (e.g., felony conduct, certain drug/alcohol/weapon offenses). Discretionary placements are at the district\'s discretion for other qualifying offenses. The offense code in Waypoint indicates whether a placement is mandatory or discretionary.',
  },
  {
    question: 'How long can a student be placed in DAEP?',
    keywords: ['long', 'duration', 'maximum', 'minimum', 'days', 'length', 'placement'],
    answer: 'DAEP placement length varies by offense and district policy. TEA requires a minimum placement period for certain offenses. The district\'s Student Code of Conduct typically defines the range of days for each offense level. Waypoint tracks the assigned days and alerts you if a placement approaches compliance thresholds.',
  },

  // --- Compliance ---
  {
    question: 'What is the SPED 10-day rule?',
    keywords: ['sped', 'special', 'education', '10', 'ten', 'day', 'rule', 'cumulative'],
    answer: 'The SPED 10-day rule states that when a special education student accumulates more than 10 cumulative days of removal (ISS, OSS, or DAEP) in a school year, it may constitute a change of placement. After 10 cumulative days, the ARD committee must meet to conduct a Manifestation Determination Review (MDR). Waypoint tracks cumulative removal days and alerts you when approaching this threshold.',
  },
  {
    question: 'What is a Manifestation Determination Review (MDR)?',
    keywords: ['manifestation', 'determination', 'review', 'mdr', 'ard'],
    answer: 'A Manifestation Determination Review (MDR) is a process required when a SPED student faces removal beyond 10 cumulative days. The ARD committee determines whether the behavior was caused by or substantially related to the student\'s disability. If yes, the student generally cannot be placed in DAEP for that behavior. Waypoint tracks MDR requirements in the compliance checklist.',
  },
  {
    question: 'What are 504 accommodations for discipline?',
    keywords: ['504', 'accommodation', 'discipline', 'section', 'plan'],
    answer: 'Students with Section 504 plans have protections similar to SPED students. Before a significant change of placement (typically more than 10 consecutive days or a pattern of removals), the 504 committee must determine if the behavior is related to the disability. Waypoint flags 504 students and includes 504 review steps in the compliance checklist.',
  },
  {
    question: 'What protections do ELL students have?',
    keywords: ['ell', 'english', 'learner', 'language', 'protection', 'lep'],
    answer: 'English Language Learners (ELL/LEP) must be provided language support during DAEP placement. Districts must ensure ELL students can meaningfully participate in DAEP instruction. Waypoint flags ELL students so staff can ensure appropriate accommodations are in place during placement.',
  },
  {
    question: 'What is the compliance checklist?',
    keywords: ['compliance', 'checklist', 'requirements', 'steps'],
    answer: 'The compliance checklist is a built-in tool that tracks all required procedural steps for each incident. It includes items like parent notification, MDR for SPED students, 504 review, hearing rights, and transition planning. You can access the compliance checklist from the Incident Detail page. Completing all items helps ensure TEA compliance.',
  },
  {
    question: 'What about homeless or foster care students?',
    keywords: ['homeless', 'foster', 'care', 'mckinney', 'vento', 'protection'],
    answer: 'Students experiencing homelessness (McKinney-Vento) and foster care students have additional protections. Districts must consider the unique circumstances of these students when making discipline decisions. Waypoint flags these students so staff can ensure proper procedures are followed.',
  },

  // --- Platform Usage: Incidents ---
  {
    question: 'How do I create an incident?',
    keywords: ['create', 'new', 'incident', 'add', 'report', 'how'],
    answer: 'To create an incident: 1) Go to the Incidents page from the sidebar, 2) Click the "New Incident" button, 3) Select the student, 4) Choose the offense code, 5) Fill in the incident details (date, description, location), 6) Assign a consequence and DAEP days if applicable, 7) Click Save. The system will automatically generate a compliance checklist based on the student\'s characteristics.',
  },
  {
    question: 'How do I edit an incident?',
    keywords: ['edit', 'modify', 'update', 'change', 'incident'],
    answer: 'To edit an incident: 1) Go to the Incidents page, 2) Click on the incident you want to edit, 3) Click the "Edit" button on the incident detail page, 4) Make your changes, 5) Click Save. Note that some fields may be restricted based on your role and the incident\'s approval status.',
  },
  {
    question: 'What is the approval chain?',
    keywords: ['approval', 'chain', 'approve', 'review', 'workflow', 'status'],
    answer: 'The approval chain is the workflow an incident goes through for review and approval. Incidents typically move through statuses like Draft → Pending Review → Approved. Different roles have different approval permissions. Administrators and principals can approve incidents. The approval chain ensures proper oversight of discipline decisions.',
  },

  // --- Platform Usage: Students ---
  {
    question: 'How do I find a student?',
    keywords: ['find', 'search', 'student', 'look', 'locate'],
    answer: 'You can find students from the Students page: 1) Go to Students in the sidebar, 2) Use the search bar to search by name or student ID, 3) Use filters to narrow by campus, grade level, or DAEP status. Click on a student to view their detail page with full history.',
  },
  {
    question: 'How do I view a student\'s DAEP history?',
    keywords: ['student', 'history', 'detail', 'record', 'view', 'past'],
    answer: 'To view a student\'s complete DAEP history: 1) Go to the Students page, 2) Search for and click on the student, 3) The Student Detail page shows all incidents, placements, interventions, and transition plans. You can also see compliance checklists and any SPED/504/ELL flags.',
  },
  {
    question: 'How do I manage student information?',
    keywords: ['manage', 'student', 'information', 'update', 'profile', 'edit'],
    answer: 'Student information can be managed from the Student Detail page. Administrators can update student flags (SPED, 504, ELL, Homeless, Foster Care), campus assignment, and grade level. Student demographic information is typically synced from the district\'s SIS system.',
  },

  // --- Platform Usage: Transition Plans ---
  {
    question: 'What is a transition plan?',
    keywords: ['transition', 'plan', 'what', 'reintegration'],
    answer: 'A transition plan documents the support and steps for a student\'s return to their home campus after DAEP placement. It typically includes academic goals, behavioral expectations, support services, and a reintegration timeline. Transition plans are required by TEA for DAEP placements and can be created from the student\'s detail page.',
  },
  {
    question: 'How do I create a transition plan?',
    keywords: ['create', 'transition', 'plan', 'new', 'how'],
    answer: 'To create a transition plan: 1) Go to the Student Detail page, 2) Navigate to the Transition Plans section, 3) Click "New Transition Plan," 4) Fill in the plan details including goals, interventions, and review dates, 5) Save the plan. The plan will go through a review process before finalization.',
  },

  // --- Platform Usage: Reports & Exports ---
  {
    question: 'How do I run reports?',
    keywords: ['report', 'run', 'generate', 'analytics', 'data', 'statistics'],
    answer: 'To access reports: 1) Go to the Reports page from the sidebar, 2) Select the report type (e.g., placement summary, compliance status, campus comparison), 3) Set your filters (date range, campus, etc.), 4) Click Generate. Reports provide insights into discipline trends, compliance rates, and DAEP program effectiveness.',
  },
  {
    question: 'How do I export data?',
    keywords: ['export', 'download', 'pdf', 'excel', 'spreadsheet', 'csv'],
    answer: 'You can export data in multiple formats: 1) Navigate to the page with the data you want (Reports, Students, Incidents), 2) Look for the Export button, 3) Choose your format — PDF for printable reports or Excel for data analysis. Exports include the currently filtered data set.',
  },

  // --- Platform Usage: Dashboard ---
  {
    question: 'What does the dashboard show?',
    keywords: ['dashboard', 'home', 'overview', 'summary', 'main'],
    answer: 'The Dashboard provides an at-a-glance overview of your DAEP program: active placements, upcoming compliance deadlines, recent incidents, alerts requiring attention, and key metrics. The data shown is scoped to your role and campus assignments. Administrators see district-wide data, while campus staff see their campus data.',
  },
  {
    question: 'What are alerts?',
    keywords: ['alert', 'notification', 'warning', 'attention', 'flag'],
    answer: 'Alerts notify you of items requiring attention, such as: approaching SPED cumulative day thresholds, overdue compliance checklist items, expiring DAEP placements, and transition plan review deadlines. You can view and manage alerts from the Alerts page. Resolving the underlying issue will clear the alert.',
  },

  // --- Roles & Permissions ---
  {
    question: 'What can administrators do?',
    keywords: ['admin', 'administrator', 'role', 'permission', 'access'],
    answer: 'Administrators have full access to all Waypoint features: create/edit/approve incidents, manage students across all campuses, run district-wide reports, configure system settings, manage user accounts, and oversee compliance district-wide. Admins can also import student data and manage offense codes.',
  },
  {
    question: 'What can principals and assistant principals do?',
    keywords: ['principal', 'ap', 'assistant', 'role', 'permission'],
    answer: 'Principals and Assistant Principals can: create and edit incidents for their campus, approve incidents in the approval chain, view campus-level reports, manage compliance checklists, and create transition plans. Their access is scoped to their assigned campus(es).',
  },
  {
    question: 'What can counselors do?',
    keywords: ['counselor', 'role', 'permission', 'access'],
    answer: 'Counselors can: view student records and incident history, manage transition plans, track interventions, and access compliance information for students at their campus. Counselors play a key role in the transition planning process.',
  },
  {
    question: 'What can SPED coordinators do?',
    keywords: ['sped', 'coordinator', 'special', 'education', 'role', 'permission'],
    answer: 'SPED Coordinators can: view SPED student discipline records, track cumulative removal days, manage MDR documentation, oversee compliance checklist items related to special education, and ensure SPED protections are followed. They receive alerts when SPED students approach the 10-day threshold.',
  },
  {
    question: 'What can teachers do?',
    keywords: ['teacher', 'role', 'permission', 'access'],
    answer: 'Teachers can: report incidents for students, view limited student information relevant to their reports, and track the status of incidents they\'ve reported. Teachers cannot approve incidents or access full student records.',
  },
  {
    question: 'What can parents see?',
    keywords: ['parent', 'guardian', 'family', 'role', 'access', 'portal'],
    answer: 'Parents have access to a Parent Portal where they can: view their child\'s incident records, see DAEP placement status and days remaining, review transition plans, and access compliance documentation related to their child. Parents only see information for their linked student(s).',
  },

  // --- General ---
  {
    question: 'How do I contact support?',
    keywords: ['support', 'help', 'contact', 'issue', 'problem', 'bug'],
    answer: 'For technical support or questions about Waypoint, contact your district administrator. For platform issues, you can also reach the Waypoint support team through your district\'s designated support channel.',
  },
  {
    question: 'What is the kiosk mode?',
    keywords: ['kiosk', 'check', 'in', 'attendance', 'mode'],
    answer: 'Kiosk mode provides a simplified check-in interface for DAEP attendance tracking. Students can check in and out using the kiosk, and attendance is automatically recorded. Administrators can set up kiosk mode from the system settings.',
  },
  {
    question: 'How do student interventions work?',
    keywords: ['intervention', 'support', 'service', 'student', 'behavioral'],
    answer: 'Student interventions track the support services provided during DAEP placement. You can add interventions from the Student Detail page or Transition Plan. Interventions can include counseling, academic support, behavioral programs, and other services. Tracking interventions helps demonstrate the district\'s commitment to student success.',
  },
  {
    question: 'What offense codes are used?',
    keywords: ['offense', 'code', 'violation', 'behavior', 'peims'],
    answer: 'Waypoint uses TEA-defined offense codes aligned with PEIMS reporting requirements. These include codes for weapons, drugs/alcohol, assault, bullying, and other violations. Each code maps to a mandatory or discretionary DAEP placement. Administrators can manage offense codes from the system settings.',
  },
]

/**
 * Find the best FAQ match for a user message.
 * Returns the FAQ entry if the keyword overlap score exceeds the threshold, otherwise null.
 */
export function findFaqMatch(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return null

  const tokens = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 1)

  if (tokens.length === 0) return null

  let bestMatch = null
  let bestScore = 0

  for (const entry of faqEntries) {
    const matchedKeywords = entry.keywords.filter((kw) =>
      tokens.some((token) => token.includes(kw) || kw.includes(token))
    )
    const score = matchedKeywords.length / entry.keywords.length

    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }

  return bestScore > 0.4 ? bestMatch : null
}

export default faqEntries
