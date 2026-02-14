/**
 * Compliance Guidance Documents
 * Aligned with Texas Education Code (TEC) and IDEA federal requirements
 * for DAEP placement of students with disabilities (SPED/504)
 */

export const COMPLIANCE_GUIDANCE = {
  ard_committee_notified: {
    title: 'ARD/IEP Committee Notification',
    subtitle: 'TEC §37.004 | 34 CFR §300.530',
    overview:
      'Before a student with a disability can be removed to a DAEP, the Admission, Review, and Dismissal (ARD) committee must be formally notified. This ensures the student\'s IEP team is involved in all disciplinary decisions that may constitute a change in placement.',
    legalReferences: [
      {
        code: 'TEC §37.004(a)',
        title: 'Placement of Students with Disabilities',
        text: 'Placement of a student with a disability who receives special education services may be made only by a duly constituted ARD committee.',
      },
      {
        code: 'TEC §37.004(b)',
        title: 'Manifestation Determination Required',
        text: 'Any disciplinary action regarding a student with a disability that constitutes a change in placement under federal law may be taken only after the student\'s ARD committee conducts a manifestation determination review under 20 U.S.C. Section 1415(k)(4).',
      },
      {
        code: 'TEC §37.006(a)',
        title: 'Removal to DAEP — Mandatory',
        text: 'A student shall be removed to a DAEP if the student engages in conduct listed under this section. For students with disabilities, the ARD committee must review the placement.',
      },
      {
        code: '34 CFR §300.530(e)',
        title: 'IDEA — Manifestation Determination',
        text: 'Within 10 school days of any decision to change the placement of a child with a disability because of a violation of a code of student conduct, the LEA, parent, and relevant members of the IEP Team must review all relevant information.',
      },
      {
        code: '19 TAC §89.1050(g)',
        title: 'Texas SPED Rules — Discipline',
        text: 'When a student receiving special education services is considered for removal that constitutes a change in placement, the ARD committee shall convene.',
      },
    ],
    steps: [
      'Identify all ARD/IEP committee members for the student (required: parent, LEA representative, general education teacher, special education teacher, evaluation personnel as needed)',
      'Send written notification to all committee members within 1 business day of the discipline referral',
      'Include in the notification: date/time/location of ARD meeting, purpose (manifestation determination review), description of the behavior incident, and procedural safeguards notice',
      'Document the method of notification for each member (letter, email, phone, hand-delivered)',
      'Schedule the ARD meeting to occur within 10 school days of the decision to change placement',
      'If parent cannot attend, document at least two attempts to involve the parent and the methods used',
    ],
    requiredDocumentation: [
      'Written notice to all ARD committee members with date sent',
      'Copy of the meeting invitation/notice',
      'Documentation of parent contact attempts (minimum 2)',
      'List of all required attendees and their roles',
      'Proof of procedural safeguards notice provided to parent',
    ],
    keyConsiderations: [
      'The 10-school-day timeline is federal law — failure to meet it is a procedural violation',
      'If cumulative removals exceed 10 school days in a year, this constitutes a change in placement requiring a manifestation determination',
      'Parents must receive procedural safeguards notice on the same day as notification',
      'All required ARD members must be notified — excusal requires written parent consent per 34 CFR §300.321(e)',
      'Document everything — notification records are frequently reviewed in due process hearings',
    ],
    timeline: '1 business day from discipline referral; ARD meeting within 10 school days',
  },

  manifestation_determination: {
    title: 'Manifestation Determination Review (MDR)',
    subtitle: 'TEC §37.004 | 34 CFR §300.530(e)-(f)',
    overview:
      'The Manifestation Determination Review is a critical IDEA protection. The ARD committee must determine whether the behavior that led to the disciplinary action was caused by, or had a direct and substantial relationship to, the student\'s disability, OR was the direct result of the LEA\'s failure to implement the IEP.',
    legalReferences: [
      {
        code: '34 CFR §300.530(e)',
        title: 'Manifestation Determination',
        text: 'The LEA, parent, and relevant members of the child\'s IEP Team shall review all relevant information in the student\'s file, including the child\'s IEP, any teacher observations, and any relevant information provided by the parents to determine: (1) if the conduct was caused by, or had a direct and substantial relationship to, the child\'s disability; or (2) if the conduct was the direct result of the LEA\'s failure to implement the IEP.',
      },
      {
        code: '34 CFR §300.530(f)',
        title: 'Determination that Behavior IS a Manifestation',
        text: 'If the LEA, parent, and relevant members determine that the conduct was a manifestation of the child\'s disability, the IEP Team shall: (1) conduct a functional behavioral assessment and implement a BIP (or review/modify existing BIP); and (2) return the child to the placement from which removed, unless the parent and LEA agree to a change of placement.',
      },
      {
        code: 'TEC §37.004(a)',
        title: 'Texas — Placement of Students with Disabilities',
        text: 'The placement of a student with a disability who receives special education services may be made only by a duly constituted ARD committee.',
      },
      {
        code: '19 TAC §89.1050(g)(1)',
        title: 'Texas SPED Rules',
        text: 'An ARD committee shall conduct a manifestation determination before a student with a disability is placed in a DAEP or expelled.',
      },
    ],
    steps: [
      'Convene the ARD committee (LEA representative, parent, special education teacher, general education teacher, and relevant members)',
      'Review ALL relevant information: student\'s IEP, teacher observations, discipline records, evaluation data, information provided by parents, BIP (if applicable)',
      'Answer Question 1: Was the conduct in question caused by, or did it have a direct and substantial relationship to, the child\'s disability?',
      'Answer Question 2: Was the conduct the direct result of the LEA\'s failure to implement the IEP?',
      'If EITHER answer is YES — the behavior IS a manifestation: (a) Conduct FBA if not already done, (b) Create or revise BIP, (c) Return student to prior placement (unless parent agrees otherwise or special circumstances apply under §300.530(g))',
      'If BOTH answers are NO — the behavior is NOT a manifestation: DAEP placement may proceed with continued FAPE, and the student must continue to receive educational services to enable participation in the general education curriculum and progress toward IEP goals',
      'Document the determination, reasoning, evidence reviewed, and committee vote in the ARD paperwork',
    ],
    requiredDocumentation: [
      'Completed MDR form with both questions answered and reasoning documented',
      'List of all information and records reviewed by the committee',
      'Signatures of all ARD committee members present',
      'Parent participation or documentation of attempts to include parent',
      'Written determination outcome (is/is not a manifestation)',
      'If IS manifestation: FBA plan and BIP revision documentation',
      'If NOT manifestation: FAPE continuation plan for DAEP placement',
    ],
    keyConsiderations: [
      'Both MDR questions must be answered — failure to address either is a procedural violation',
      'The standard is "direct and substantial relationship" — not merely tangential or coincidental',
      'If the school failed to implement the IEP, the behavior is automatically a manifestation regardless of disability relationship',
      'Even when behavior is NOT a manifestation, FAPE must continue during DAEP placement',
      'Special circumstances exception (34 CFR §300.530(g)): Weapons, drugs, or serious bodily injury allow 45-school-day interim alternative placement regardless of manifestation result',
      'Parents who disagree may request an expedited due process hearing',
      'The MDR must occur within 10 school days — this is not discretionary',
    ],
    manifestationIsYes: {
      title: 'When Behavior IS a Manifestation',
      actions: [
        'Student must be returned to prior placement (unless parent agrees to change)',
        'Conduct a Functional Behavioral Assessment if one has not been done',
        'Create or revise the Behavior Intervention Plan',
        'Review and revise the IEP to address the behavioral needs',
        'DAEP placement CANNOT proceed (except for weapons, drugs, or serious bodily injury per §300.530(g))',
      ],
    },
    manifestationIsNo: {
      title: 'When Behavior is NOT a Manifestation',
      actions: [
        'DAEP placement may proceed under the same terms as non-disabled peers',
        'Student must continue to receive FAPE during DAEP placement',
        'Educational services must enable continued participation in the general curriculum',
        'Student must continue to progress toward IEP goals',
        'Services may be provided in a different setting but cannot be reduced',
        'Complete the FAPE Plan for DAEP placement',
      ],
    },
    timeline: 'Must be completed within 10 school days of decision to change placement',
  },

  bip_reviewed: {
    title: 'Behavior Intervention Plan (BIP) Review',
    subtitle: 'TEC §37.004 | 34 CFR §300.530(d)(1)(ii) | 19 TAC §89.1055',
    overview:
      'If the student has an existing Behavior Intervention Plan, the ARD committee must review the BIP for implementation fidelity and effectiveness. This review determines whether the BIP was being properly implemented and whether modifications are needed.',
    legalReferences: [
      {
        code: '34 CFR §300.530(d)(1)(ii)',
        title: 'IDEA — BIP Review',
        text: 'If the child already has a behavior intervention plan, the IEP Team shall review the behavioral intervention plan and modify it, as necessary, to address the behavior.',
      },
      {
        code: '34 CFR §300.530(f)(1)(ii)',
        title: 'IDEA — Manifestation Result BIP',
        text: 'If a manifestation determination review results in IS a manifestation, and the child already has a BIP, the IEP Team shall review and modify the plan as necessary to address the behavior.',
      },
      {
        code: '19 TAC §89.1055(e)',
        title: 'Texas — Content of IEP',
        text: 'In the case of a child whose behavior impedes the child\'s learning or that of others, the ARD committee shall consider the use of positive behavioral interventions and supports, and other strategies, to address that behavior.',
      },
      {
        code: 'TEC §37.0013',
        title: 'Positive Behavior Program',
        text: 'A school district shall provide a positive behavior program as part of its discipline management plan.',
      },
    ],
    steps: [
      'Obtain the student\'s current BIP and review the target behaviors, replacement behaviors, and intervention strategies',
      'Assess implementation fidelity: Were all staff trained on the BIP? Were strategies consistently applied?',
      'Review behavior data: Has the BIP been effective in reducing target behaviors? Review office referrals, incident reports, teacher logs',
      'Determine whether the incident behavior is addressed in the current BIP',
      'If the BIP was not implemented with fidelity, document this finding (this impacts the MDR — failure to implement IEP)',
      'If the BIP needs modification, document recommended changes and update the IEP accordingly',
      'If no BIP exists, recommend whether an FBA and BIP should be developed',
    ],
    requiredDocumentation: [
      'Copy of current BIP with last revision date',
      'Staff implementation logs or fidelity checklists',
      'Behavior data and trend analysis',
      'BIP review notes from ARD committee',
      'Modifications recommended (if any)',
      'Staff training records on BIP implementation',
    ],
    keyConsiderations: [
      'If the BIP was not being implemented, this is a failure to implement the IEP — the behavior will likely be found to be a manifestation',
      'The BIP review should look at BOTH the quality of the plan AND the fidelity of implementation',
      'Positive behavioral interventions and supports must be considered before punitive measures',
      'A BIP must be based on an FBA — if no FBA exists, the BIP may be procedurally deficient',
      'All staff who interact with the student should have been trained on the BIP',
      'Data should demonstrate whether the interventions are working or need modification',
    ],
    timeline: 'Review should occur during or before the MDR meeting',
  },

  fba_conducted: {
    title: 'Functional Behavior Assessment (FBA)',
    subtitle: '34 CFR §300.530(d)(1)(i) | 19 TAC §89.1055',
    overview:
      'A Functional Behavior Assessment identifies the function (purpose) of a student\'s behavior through systematic data collection and analysis. Federal law requires an FBA when behavior is found to be a manifestation of disability, and best practice recommends one within the past 12 months for any DAEP-referred student with disabilities.',
    legalReferences: [
      {
        code: '34 CFR §300.530(d)(1)(i)',
        title: 'IDEA — FBA Requirement',
        text: 'If the LEA did not conduct a functional behavioral assessment before the behavior that resulted in the change of placement, the LEA shall conduct a functional behavioral assessment.',
      },
      {
        code: '34 CFR §300.530(f)(1)(i)',
        title: 'IDEA — FBA When IS Manifestation',
        text: 'If the ARD committee determines that the conduct was a manifestation of the child\'s disability, the IEP Team shall conduct a functional behavioral assessment, unless the LEA had conducted one before the behavior that resulted in the change of placement.',
      },
      {
        code: '19 TAC §89.1055(e)',
        title: 'Texas SPED — Behavioral Considerations',
        text: 'The ARD committee must consider the use of positive behavioral interventions and supports, and other strategies, to address behavior that impedes the child\'s learning.',
      },
      {
        code: 'TEC §37.004(b)',
        title: 'Texas — Change in Placement',
        text: 'Any disciplinary action regarding a student with a disability that constitutes a change in placement under federal law may be taken only after the student\'s ARD committee conducts a manifestation determination review under 20 U.S.C. Section 1415(k)(4).',
      },
    ],
    steps: [
      'Verify whether an FBA has been conducted within the past 12 months',
      'If no current FBA exists, initiate the assessment process: (a) Obtain parent consent for assessment, (b) Assign qualified personnel (LSSP, BCBA, or trained diagnostician)',
      'Collect data through multiple methods: direct observation, teacher/staff interviews, student interview, review of records, ABC (Antecedent-Behavior-Consequence) data',
      'Identify the function of the behavior (e.g., attention seeking, escape/avoidance, tangible access, sensory stimulation)',
      'Analyze setting events and antecedent triggers',
      'Develop a hypothesis statement: When [antecedent], the student [behavior], in order to [function]',
      'Use FBA results to develop or revise the Behavior Intervention Plan',
      'Present findings and recommendations to the ARD committee',
    ],
    requiredDocumentation: [
      'Parent consent for FBA (if new assessment)',
      'FBA report with data collection methods described',
      'Direct observation data (minimum 2-3 observations across settings)',
      'ABC data charts or summary',
      'Hypothesis statement with identified function',
      'Recommendations for BIP development or revision',
      'Qualifications of person conducting FBA',
    ],
    keyConsiderations: [
      'An FBA is REQUIRED when behavior is found to be a manifestation of disability (if one hasn\'t been done)',
      'Best practice: FBA should be current within 12 months for students with significant behavioral concerns',
      'The FBA must be conducted by qualified personnel — not merely a classroom teacher',
      'Parent consent is required for FBA as it is considered an evaluation under IDEA',
      'The FBA should examine behavior across multiple settings and times of day',
      'If the student has had repeated behavioral incidents, a pattern analysis should be included',
      'FBA results directly inform the BIP — they should be clearly connected',
    ],
    timeline: 'If required, parent consent must be obtained and FBA completed before placement (or within reasonable time if behavior warrants immediate interim placement)',
  },

  parent_notified: {
    title: 'Parent Notification of Procedural Safeguards',
    subtitle: 'TEC §37.009 | 34 CFR §300.503 | 34 CFR §300.532',
    overview:
      'Parents must be notified of their procedural rights before any change of placement occurs. Under both Texas and federal law, parents have the right to participate in placement decisions and to challenge them through due process. Notice must include a description of the proposed action, the reasons for it, and a copy of procedural safeguards.',
    legalReferences: [
      {
        code: 'TEC §37.009(a)',
        title: 'Texas — Post-Removal Conference',
        text: 'Not later than the third class day after the day on which a student is removed from class, the campus behavior coordinator shall schedule a conference with the student, the student\'s parent or guardian, and the teacher who removed the student. The student receives notice of the reasons for removal and an opportunity to respond.',
      },
      {
        code: 'TEC §37.009(b)',
        title: 'Texas — Extended Placement Hearing',
        text: 'If a student\'s placement in a DAEP extends beyond 60 days or the end of the next grading period (whichever is earlier), the student\'s parent or guardian is entitled to notice of and an opportunity to participate in a proceeding before the board of trustees or the board\'s designee.',
      },
      {
        code: '34 CFR §300.503(a)',
        title: 'IDEA — Prior Written Notice',
        text: 'Written notice must be given to the parents of a child with a disability a reasonable time before the public agency proposes to initiate or change the identification, evaluation, or educational placement of the child, or the provision of FAPE to the child.',
      },
      {
        code: '34 CFR §300.503(b)',
        title: 'Content of Notice',
        text: 'The notice must include: description of the proposed action; explanation of why the agency proposes the action; description of each evaluation procedure, assessment, record, or report used as a basis; sources for parents to obtain assistance; description of other options considered and reasons rejected; other relevant factors.',
      },
      {
        code: '34 CFR §300.532(a)',
        title: 'IDEA — Appeal Rights',
        text: 'The parent of a child with a disability who disagrees with any decision regarding placement or the manifestation determination may appeal the decision by requesting an expedited due process hearing.',
      },
      {
        code: '19 TAC §89.1050(g)(2)',
        title: 'Texas SPED — Parent Rights',
        text: 'The school district shall provide the parent with a copy of the notice of procedural safeguards.',
      },
    ],
    steps: [
      'Prepare written prior notice (PWN) describing: (a) the proposed DAEP placement, (b) the behavior incident, (c) the reasons for the proposed action',
      'Include a copy of the IDEA Procedural Safeguards Notice (Parent\'s Rights document) in the parent\'s native language',
      'Notify the parent of: (a) their right to participate in the ARD/MDR meeting, (b) their right to an independent educational evaluation, (c) their right to request a due process hearing or mediation',
      'Provide notice of the scheduled ARD/MDR meeting date, time, and location',
      'Document the method of delivery: hand-delivered, certified mail, or documented electronic communication',
      'If parent\'s primary language is not English, provide translated documents and/or interpreter',
      'Confirm receipt of notice — document parent\'s acknowledgment or certified mail receipt',
      'Inform parent of the right to bring advocates or legal representation to the ARD meeting',
    ],
    requiredDocumentation: [
      'Copy of Prior Written Notice (PWN) with date sent',
      'Copy of Procedural Safeguards Notice provided',
      'Method of delivery and date delivered',
      'Proof of receipt (signature, certified mail receipt, or documented delivery)',
      'Language accommodation documentation if applicable',
      'Record of parent contact attempts (minimum 2 documented attempts)',
      'Translation records if parent is non-English speaking',
    ],
    keyConsiderations: [
      'Notice must be provided in the parent\'s native language or mode of communication',
      'The procedural safeguards notice must be provided at least once per school year AND upon request AND when filing a due process complaint',
      'Under TEC §37.009(a), a post-removal conference must occur within 3 class days; for extended placements (beyond 60 days or next grading period), parents have the right to a proceeding before the board under §37.009(b)',
      'Parents may waive the TEC §37.009 conference — document the waiver in writing',
      'If parents cannot be reached, document at least two attempts by different methods (e.g., phone call + certified letter)',
      'Notice is time-sensitive — it must be provided before the placement change occurs',
      'Failure to provide proper notice is a significant procedural violation that can void the placement decision',
    ],
    timeline: 'Notice must be provided before the ARD/MDR meeting and before any change of placement',
  },

  fape_plan_documented: {
    title: 'Free Appropriate Public Education (FAPE) Continuation Plan',
    subtitle: 'TEC §37.008 | 34 CFR §300.530(d) | 34 CFR §300.101',
    overview:
      'When a student with a disability is placed in a DAEP, the district must ensure the student continues to receive a Free Appropriate Public Education. The FAPE plan documents how IEP services, accommodations, and modifications will be provided in the DAEP setting. Services cannot be reduced simply because the setting has changed.',
    legalReferences: [
      {
        code: 'TEC §37.008(a)',
        title: 'Texas — DAEP Requirements',
        text: 'Each DAEP shall provide for the students who are assigned to the program to: (1) be supervised by a certified teacher; (2) have the opportunity to complete coursework required for graduation; (3) receive credit for coursework completed.',
      },
      {
        code: 'TEC §37.008(l)',
        title: 'Texas — DAEP Academic Standards',
        text: 'A school district shall ensure that each DAEP meets the educational and behavioral needs of the students assigned to the program.',
      },
      {
        code: '34 CFR §300.530(d)(1)',
        title: 'IDEA — Services During Removal',
        text: 'A child with a disability who is removed from the child\'s current placement shall continue to receive educational services so as to enable the child to continue to participate in the general education curriculum and to progress toward meeting the goals set out in the child\'s IEP.',
      },
      {
        code: '34 CFR §300.101',
        title: 'IDEA — FAPE Obligation',
        text: 'A free appropriate public education must be available to all children residing in the State between the ages of 3 and 21, inclusive, including children with disabilities who have been suspended or expelled.',
      },
      {
        code: '19 TAC §89.1050(g)(3)',
        title: 'Texas SPED — DAEP FAPE',
        text: 'The ARD committee shall determine the educational services to be provided in the DAEP setting, including the special education and related services necessary to provide FAPE.',
      },
    ],
    steps: [
      'Review the student\'s current IEP, including all goals, services, accommodations, and modifications',
      'Identify each IEP service and determine how it will be delivered at the DAEP campus: (a) Who will provide each service? (b) How often? (c) In what setting?',
      'Document schedule of special education services at DAEP (e.g., resource support, speech therapy, counseling, OT/PT)',
      'Identify accommodations and modifications that must transfer to DAEP (testing accommodations, assistive technology, classroom modifications)',
      'Determine general education curriculum access plan — how will the student access grade-level content?',
      'Address related services: transportation to/from DAEP, counseling, assistive technology, behavioral supports',
      'Specify progress monitoring plan — how and how often will progress toward IEP goals be measured and reported?',
      'Identify DAEP staff responsible for implementation and ensure they receive the IEP and training',
      'Document the FAPE plan in the ARD paperwork with start/end dates aligned to the DAEP placement period',
    ],
    requiredDocumentation: [
      'FAPE continuation plan signed by ARD committee',
      'Service delivery schedule at DAEP (service, provider, frequency, duration)',
      'List of accommodations and modifications to be implemented',
      'Related services plan (transportation, counseling, etc.)',
      'Progress monitoring schedule and responsible staff',
      'Copy of IEP provided to DAEP campus and all service providers',
      'Staff training documentation on student-specific needs',
      'Parent agreement or ARD meeting notes documenting discussion',
    ],
    keyConsiderations: [
      'FAPE is non-negotiable — it must be provided even during disciplinary removal',
      'Services cannot be reduced simply because the student is in a DAEP setting',
      'If the DAEP cannot provide a specific IEP service, the district must arrange for it (e.g., contracted services)',
      'The FAPE plan should address both academic and behavioral needs',
      'Progress monitoring must continue — IEP goals don\'t pause during DAEP placement',
      'DAEP staff must be trained on the student\'s IEP, accommodations, and BIP',
      'Parents should be informed of how services will be delivered at the DAEP',
      'If the student requires assistive technology, it must be available at the DAEP',
      'Consider the student\'s unique needs when planning — a generic DAEP program is not sufficient for SPED students',
    ],
    timeline: 'FAPE plan must be documented before DAEP placement begins; services must start on the first day of placement',
  },

  iep_goals_reviewed: {
    title: 'IEP Goals Review and Service Alignment',
    subtitle: '34 CFR §300.320 | 34 CFR §300.530(d) | 19 TAC §89.1055',
    overview:
      'The ARD committee must review the student\'s current IEP goals to ensure they can be addressed during DAEP placement. This review ensures continuity of instruction and that the DAEP service plan is aligned with the student\'s individualized goals across all areas of need.',
    legalReferences: [
      {
        code: '34 CFR §300.320(a)(2)',
        title: 'IDEA — IEP Content',
        text: 'The IEP must include measurable annual goals, including academic and functional goals, designed to meet the child\'s needs that result from the disability and enable the child to be involved in and make progress in the general education curriculum.',
      },
      {
        code: '34 CFR §300.530(d)(1)',
        title: 'IDEA — Continued Services',
        text: 'The child must continue to receive educational services to enable the child to continue to participate in the general education curriculum and to progress toward meeting the goals set out in the child\'s IEP.',
      },
      {
        code: '19 TAC §89.1055(a)',
        title: 'Texas — IEP Content',
        text: 'The individualized education program must address each area of need identified by the full individual and initial evaluation.',
      },
    ],
    steps: [
      'Review all current IEP goals (academic, behavioral, functional, transition if applicable)',
      'For each goal, determine: (a) Can this goal be addressed at the DAEP? (b) What materials or resources are needed? (c) Who at the DAEP will be responsible?',
      'Identify any goals that require specialized instruction or equipment not available at the DAEP',
      'Develop a plan for goals that cannot be fully addressed — consider supplemental services, virtual instruction, or itinerant support',
      'Align DAEP curriculum with IEP goals — ensure assignments and instruction address identified skill deficits',
      'Review and update present levels of performance if necessary',
      'Document goal progress data to date and provide to DAEP staff',
      'Establish a progress reporting schedule consistent with IEP requirements',
    ],
    requiredDocumentation: [
      'Current IEP with all goals listed',
      'Goal-by-goal alignment plan for DAEP setting',
      'Progress data on each goal at time of transfer',
      'Staff assignments for goal implementation at DAEP',
      'Materials/resources needed list',
      'Progress reporting schedule',
    ],
    keyConsiderations: [
      'ALL IEP goals must be addressed — not just academic goals',
      'Behavioral goals are especially important during DAEP placement',
      'Transition goals (age 14+) must continue during DAEP placement',
      'If the DAEP setting cannot fully address a goal, the ARD committee must document alternative arrangements',
      'Progress monitoring data should transfer with the student to the DAEP',
      'Report cards and progress reports on IEP goals must continue on the IEP-specified schedule',
    ],
    timeline: 'Review should occur during the ARD meeting before DAEP placement begins',
  },

  educational_services_arranged: {
    title: 'Educational Services Arrangement at DAEP',
    subtitle: 'TEC §37.008 | 34 CFR §300.530(d)',
    overview:
      'Before the student begins DAEP placement, the district must verify that all required special education and related services have been arranged and are ready for delivery at the DAEP campus. This includes confirming staff assignments, scheduling, materials, and facilities.',
    legalReferences: [
      {
        code: 'TEC §37.008(a)',
        title: 'Texas — DAEP Program Requirements',
        text: 'A DAEP must focus on English language arts, mathematics, science, history, and self-discipline. Students must be supervised by a certified teacher and have the opportunity to complete coursework for graduation.',
      },
      {
        code: 'TEC §37.008(l-1)',
        title: 'Texas — DAEP Best Practices',
        text: 'A school district shall develop best practices for DAEPs regarding behavioral interventions, academic rigor, and transition back to the regular classroom.',
      },
      {
        code: 'TEC §37.0081',
        title: 'Texas — Expulsion and Certain Placements',
        text: 'Addresses the board\'s authority regarding expulsion and placement of certain students (such as those charged with serious felonies) in alternative education settings.',
      },
      {
        code: '34 CFR §300.530(d)(1)',
        title: 'IDEA — Continued Services',
        text: 'Educational services must enable the child to continue to participate in the general education curriculum and to progress toward meeting IEP goals.',
      },
    ],
    steps: [
      'Confirm special education teacher availability at the DAEP campus for the student\'s scheduled placement dates',
      'Arrange related services providers (speech, OT, PT, counseling, etc.) — confirm schedules and contact information',
      'Verify that all assistive technology devices and software are available at the DAEP',
      'Provide DAEP staff with copies of: IEP, BIP, FAPE plan, accommodations list, and current class schedules',
      'Coordinate with general education teachers to provide current curriculum materials and assignments',
      'Confirm that testing accommodations are in the DAEP system (for any upcoming assessments, including STAAR)',
      'Set up transportation if required by the IEP',
      'Schedule an orientation meeting between DAEP staff and the student/parent',
      'Confirm that progress monitoring tools and data collection systems are in place',
    ],
    requiredDocumentation: [
      'Service provider schedule at DAEP (who, what, when)',
      'DAEP staff acknowledgment of receiving IEP/BIP documents',
      'Transportation arrangement confirmation',
      'Assistive technology transfer documentation',
      'Curriculum materials delivery confirmation',
      'DAEP orientation meeting notes (if conducted)',
      'Emergency contact and health information transfer',
    ],
    keyConsiderations: [
      'Services must begin on the first day of DAEP placement — no gap in service delivery',
      'If a service provider is not available at the DAEP, the district must contract or provide itinerant services',
      'STAAR accommodations must be maintained — coordinate with the DAEP testing coordinator',
      'Medications and health plans must transfer to the DAEP campus',
      'Consider whether the student needs a modified schedule during the adjustment period',
      'DAEP staff should have the same level of training on the student\'s needs as the home campus staff',
      'Confidentiality requirements apply to all records shared with DAEP staff',
    ],
    timeline: 'All services must be arranged and confirmed before the first day of DAEP placement',
  },

  placement_justification: {
    title: 'Placement Justification Analysis',
    subtitle: 'TEC §37.006 | TEC §37.007 | 34 CFR §300.114',
    overview:
      'The district must document the justification for placing a student with a disability in a DAEP. This analysis must demonstrate that the placement is based on the behavior, not the disability, and that the DAEP is the appropriate setting considering the student\'s individual needs and the continuum of placement options.',
    legalReferences: [
      {
        code: 'TEC §37.006',
        title: 'Texas — Removal to DAEP',
        text: 'Specifies the mandatory and discretionary offenses for which a student may be removed to a DAEP. For students with disabilities, the removal must be based on behavior and comply with IDEA procedural requirements.',
      },
      {
        code: 'TEC §37.007',
        title: 'Texas — Expulsion',
        text: 'Lists offenses for which a student may be expelled. For students with disabilities, expulsion is subject to IDEA protections and ARD committee review.',
      },
      {
        code: 'TEC §37.004(a)-(b)',
        title: 'Texas — Placement of Students with Disabilities',
        text: 'Placement of a student with a disability may be made only by a duly constituted ARD committee. Any disciplinary action constituting a change in placement may be taken only after the ARD committee conducts a manifestation determination review. A student may not be placed in alternative education programs solely for educational purposes.',
      },
      {
        code: '34 CFR §300.114',
        title: 'IDEA — Least Restrictive Environment',
        text: 'To the maximum extent appropriate, children with disabilities should be educated with children who are not disabled. Special classes, separate schooling, or other removal from the regular educational environment should occur only if the nature or severity of the disability is such that education in regular classes cannot be achieved satisfactorily.',
      },
    ],
    steps: [
      'Document the specific behavior/offense that warrants DAEP placement (cite TEC §37.006 category)',
      'Verify that the behavior meets the legal threshold for DAEP removal (mandatory vs. discretionary)',
      'Confirm that the MDR has been completed and the behavior was found NOT to be a manifestation of disability',
      'Analyze the student\'s disciplinary history: prior interventions attempted, progressive discipline applied, effectiveness of previous placements',
      'Document why less restrictive alternatives (in-school suspension, behavior contract, campus reassignment) are insufficient',
      'Consider aggravating and mitigating factors: (a) seriousness of offense, (b) student\'s age and grade, (c) frequency of misbehavior, (d) attitude, (e) potential effect on school environment, (f) economic impact on stolen/damaged property',
      'Review TEC §37.001(a)(4) mitigating factors that must be considered before placement',
      'Document the ARD committee\'s reasoning for why DAEP is the appropriate placement',
    ],
    requiredDocumentation: [
      'Written justification statement with TEC offense category cited',
      'MDR outcome documentation (NOT a manifestation)',
      'Disciplinary history and prior interventions attempted',
      'Analysis of less restrictive alternatives considered and rejected',
      'TEC §37.001(a)(4) mitigating factor analysis',
      'ARD committee meeting notes with placement rationale',
      'Length of DAEP placement determination with reasoning',
    ],
    keyConsiderations: [
      'Placement cannot be based on disability — it must be based on behavior',
      'For all disciplinary decisions, the administrator must consider the TEC §37.001(a)(4) mitigating factors (self-defense, intent, disciplinary history, disability, foster care status, homelessness)',
      'Mandatory DAEP placements under TEC §37.006(b)-(c) still require IDEA compliance for SPED students',
      'The length of placement should be proportional to the offense and the student\'s needs',
      'TEC §37.009(e) requires placement review of the student\'s status, including academic status, at intervals not exceeding 120 days',
      'For SPED students, the ARD committee (not just the administrator) determines the appropriateness of the DAEP placement',
      'Consider whether the student\'s disability-related needs can be met at the DAEP',
    ],
    timeline: 'Justification must be documented before DAEP placement begins',
  },

  least_restrictive_environment: {
    title: 'Least Restrictive Environment (LRE) Consideration',
    subtitle: '34 CFR §300.114-§300.117 | TEC §37.004 | 19 TAC §89.1050',
    overview:
      'Federal law requires that before placing a student with a disability in a more restrictive setting like a DAEP, the district must demonstrate that it has considered the full continuum of placement options and that less restrictive alternatives have been tried or considered and found inappropriate. The LRE analysis is a critical safeguard.',
    legalReferences: [
      {
        code: '34 CFR §300.114(a)(2)',
        title: 'IDEA — LRE Requirements',
        text: 'Each public agency must ensure that: (i) to the maximum extent appropriate, children with disabilities are educated with children who are not disabled; and (ii) special classes, separate schooling, or other removal occurs only when the nature or severity of the disability is such that education in regular classes with the use of supplementary aids and services cannot be achieved satisfactorily.',
      },
      {
        code: '34 CFR §300.115',
        title: 'IDEA — Continuum of Placements',
        text: 'Each public agency must ensure that a continuum of alternative placements is available to meet the needs of children with disabilities, including instruction in regular classes, special classes, special schools, home instruction, and instruction in hospitals and institutions.',
      },
      {
        code: '34 CFR §300.116',
        title: 'IDEA — Placements',
        text: 'The child\'s placement must be determined at least annually, based on the child\'s IEP, and as close as possible to the child\'s home. Unless the IEP requires otherwise, the child is educated in the school they would attend if not disabled.',
      },
      {
        code: '19 TAC §89.1050(c)',
        title: 'Texas — Least Restrictive Environment',
        text: 'The ARD committee shall consider the LRE for each student and document the consideration of supplementary aids and services before recommending a more restrictive placement.',
      },
    ],
    steps: [
      'Review the full continuum of placement options available in the district',
      'For each less restrictive option, document why it is or is not appropriate for this student and situation:',
      '  (a) General education classroom with supports — Why insufficient?',
      '  (b) In-school suspension/time-out — Why insufficient?',
      '  (c) Behavior contract or daily report card — Why insufficient?',
      '  (d) Reassignment to another campus — Why insufficient?',
      '  (e) Partial-day alternative placement — Why insufficient?',
      '  (f) Full-day DAEP placement — Why this is the recommended option',
      'Document the supplementary aids and services that were tried or considered before recommending DAEP',
      'Consider the potential harmful effects of the DAEP placement on the student',
      'Consider the effect of the student\'s behavior on the school environment and other students\' education',
      'Document the ARD committee\'s analysis and rationale for each option considered',
      'If DAEP is selected, document how the district will work to return the student to the least restrictive setting as quickly as possible',
    ],
    requiredDocumentation: [
      'LRE continuum analysis worksheet documenting each option considered',
      'Supplementary aids and services tried or considered (with outcomes)',
      'Prior interventions and their effectiveness',
      'ARD committee discussion notes on LRE',
      'Rationale for why DAEP is the least restrictive appropriate setting',
      'Transition-back plan for returning student to less restrictive setting',
      'Documentation of harmful effects consideration',
    ],
    keyConsiderations: [
      'LRE is a procedural requirement — you must SHOW that you considered less restrictive options',
      'Simply stating "DAEP is appropriate" without analyzing alternatives is a procedural violation',
      'The district bears the burden of demonstrating that the DAEP placement is necessary',
      'Even during DAEP placement, the student should have access to the maximum extent appropriate to non-disabled peers',
      'Consider partial-day placements as a less restrictive alternative to full-day DAEP',
      'The LRE analysis should be conducted by the ARD committee, not unilaterally by administration',
      'A plan to transition the student back to the least restrictive setting should be part of the placement decision',
      'LRE violations are among the most common findings in IDEA due process hearings',
    ],
    timeline: 'LRE analysis must be completed as part of the ARD committee meeting before DAEP placement',
  },
}

/**
 * Quick-reference mapping of TEC §37.001(a)(4) mitigating factors
 * that must be considered in each decision concerning suspension,
 * removal to DAEP, expulsion, or placement in JJAEP
 */
export const TEC_37_006_F_FACTORS = [
  {
    factor: 'Self-Defense',
    description: 'Whether the student acted in self-defense',
    code: 'TEC §37.001(a)(4)(A)',
  },
  {
    factor: 'Intent or Lack of Intent',
    description: 'Whether the student had intent at the time the student engaged in the conduct',
    code: 'TEC §37.001(a)(4)(B)',
  },
  {
    factor: 'Disciplinary History',
    description: 'The student\'s disciplinary history',
    code: 'TEC §37.001(a)(4)(C)',
  },
  {
    factor: 'Disability',
    description: 'Whether the student has a disability that substantially impairs the student\'s capacity to appreciate the wrongfulness of the student\'s conduct',
    code: 'TEC §37.001(a)(4)(D)',
  },
  {
    factor: 'Status in Foster Care',
    description: 'A student\'s status in the conservatorship of the Department of Family and Protective Services (foster care)',
    code: 'TEC §37.001(a)(4)(E)',
  },
  {
    factor: 'Homelessness',
    description: 'Whether the student is currently homeless',
    code: 'TEC §37.001(a)(4)(F)',
  },
]

/**
 * Special Circumstances under IDEA - 45-school-day exception
 */
export const IDEA_SPECIAL_CIRCUMSTANCES = {
  title: 'Special Circumstances — 45-School-Day Interim Alternative Placement',
  code: '34 CFR §300.530(g)',
  overview: 'School personnel may remove a student to an interim alternative educational setting for not more than 45 school days without regard to whether the behavior is a manifestation of the child\'s disability, if the child:',
  circumstances: [
    {
      type: 'Weapons',
      description: 'Carries a weapon to or possesses a weapon at school, on school premises, or at a school function',
      code: '34 CFR §300.530(g)(1)',
    },
    {
      type: 'Drugs',
      description: 'Knowingly possesses or uses illegal drugs, or sells or solicits the sale of a controlled substance, while at school, on school premises, or at a school function',
      code: '34 CFR §300.530(g)(2)',
    },
    {
      type: 'Serious Bodily Injury',
      description: 'Has inflicted serious bodily injury upon another person while at school, on school premises, or at a school function',
      code: '34 CFR §300.530(g)(3)',
    },
  ],
  note: 'Even under special circumstances, FAPE must still be provided and an MDR must still be conducted.',
}
