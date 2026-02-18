// Subscription tiers
export const TIERS = {
  ESSENTIAL: 'essential',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
}

export const TIER_LABELS = {
  [TIERS.ESSENTIAL]: 'Essential',
  [TIERS.PROFESSIONAL]: 'Professional',
  [TIERS.ENTERPRISE]: 'Enterprise',
}

export const TIER_LEVELS = {
  [TIERS.ESSENTIAL]: 1,
  [TIERS.PROFESSIONAL]: 2,
  [TIERS.ENTERPRISE]: 3,
}

// User roles
export const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  AP: 'ap',
  COUNSELOR: 'counselor',
  SPED_COORDINATOR: 'sped_coordinator',
  TEACHER: 'teacher',
  CBC: 'cbc',
  SSS: 'sss',
  SECTION_504_COORDINATOR: 'section_504_coordinator',
  DIRECTOR_STUDENT_AFFAIRS: 'director_student_affairs',
  PARENT: 'parent',
  STUDENT: 'student',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.PRINCIPAL]: 'Principal',
  [ROLES.AP]: 'Assistant Principal',
  [ROLES.COUNSELOR]: 'Counselor',
  [ROLES.SPED_COORDINATOR]: 'SPED Coordinator',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.CBC]: 'Campus Behavior Coordinator',
  [ROLES.SSS]: 'Student Support Specialist',
  [ROLES.SECTION_504_COORDINATOR]: '504 Coordinator',
  [ROLES.DIRECTOR_STUDENT_AFFAIRS]: 'Director of Student Affairs',
  [ROLES.PARENT]: 'Parent',
  [ROLES.STUDENT]: 'Student',
}

// Staff roles (can access the main app shell)
export const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.AP,
  ROLES.COUNSELOR,
  ROLES.SPED_COORDINATOR,
  ROLES.TEACHER,
  ROLES.CBC,
  ROLES.SSS,
  ROLES.SECTION_504_COORDINATOR,
  ROLES.DIRECTOR_STUDENT_AFFAIRS,
]

// Roles that can access the DAEP Dashboard
export const DAEP_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.AP,
  ROLES.COUNSELOR,
  ROLES.SPED_COORDINATOR,
  ROLES.TEACHER,
  ROLES.CBC,
  ROLES.SSS,
  ROLES.SECTION_504_COORDINATOR,
  ROLES.DIRECTOR_STUDENT_AFFAIRS,
]

// Roles that can manage compliance
export const COMPLIANCE_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.AP,
  ROLES.SPED_COORDINATOR,
]

// Roles that can view alerts
export const ALERT_ROLES = [
  ROLES.ADMIN,
  ROLES.PRINCIPAL,
  ROLES.AP,
  ROLES.COUNSELOR,
  ROLES.SPED_COORDINATOR,
]

// Incident statuses
export const INCIDENT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  COMPLIANCE_HOLD: 'compliance_hold',
  APPROVED: 'approved',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  APPEALED: 'appealed',
  OVERTURNED: 'overturned',
  PENDING_APPROVAL: 'pending_approval',
  DENIED: 'denied',
  RETURNED: 'returned',
}

export const INCIDENT_STATUS_LABELS = {
  [INCIDENT_STATUS.DRAFT]: 'Draft',
  [INCIDENT_STATUS.SUBMITTED]: 'Submitted',
  [INCIDENT_STATUS.UNDER_REVIEW]: 'Under Review',
  [INCIDENT_STATUS.COMPLIANCE_HOLD]: 'Compliance Hold',
  [INCIDENT_STATUS.APPROVED]: 'Approved',
  [INCIDENT_STATUS.ACTIVE]: 'Active',
  [INCIDENT_STATUS.COMPLETED]: 'Completed',
  [INCIDENT_STATUS.APPEALED]: 'Appealed',
  [INCIDENT_STATUS.OVERTURNED]: 'Overturned',
  [INCIDENT_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [INCIDENT_STATUS.DENIED]: 'Denied',
  [INCIDENT_STATUS.RETURNED]: 'Returned',
}

export const INCIDENT_STATUS_COLORS = {
  [INCIDENT_STATUS.DRAFT]: 'gray',
  [INCIDENT_STATUS.SUBMITTED]: 'blue',
  [INCIDENT_STATUS.UNDER_REVIEW]: 'yellow',
  [INCIDENT_STATUS.COMPLIANCE_HOLD]: 'red',
  [INCIDENT_STATUS.APPROVED]: 'green',
  [INCIDENT_STATUS.ACTIVE]: 'indigo',
  [INCIDENT_STATUS.COMPLETED]: 'green',
  [INCIDENT_STATUS.APPEALED]: 'orange',
  [INCIDENT_STATUS.OVERTURNED]: 'gray',
  [INCIDENT_STATUS.PENDING_APPROVAL]: 'yellow',
  [INCIDENT_STATUS.DENIED]: 'red',
  [INCIDENT_STATUS.RETURNED]: 'orange',
}

// Consequence types
export const CONSEQUENCE_TYPES = {
  WARNING: 'warning',
  DETENTION: 'detention',
  ISS: 'iss',
  OSS: 'oss',
  DAEP: 'daep',
  EXPULSION: 'expulsion',
}

export const CONSEQUENCE_TYPE_LABELS = {
  [CONSEQUENCE_TYPES.WARNING]: 'Warning',
  [CONSEQUENCE_TYPES.DETENTION]: 'Detention',
  [CONSEQUENCE_TYPES.ISS]: 'In-School Suspension (ISS)',
  [CONSEQUENCE_TYPES.OSS]: 'Out-of-School Suspension (OSS)',
  [CONSEQUENCE_TYPES.DAEP]: 'DAEP Placement',
  [CONSEQUENCE_TYPES.EXPULSION]: 'Expulsion',
}

// Offense severity levels
export const SEVERITY = {
  MINOR: 'minor',
  MODERATE: 'moderate',
  SERIOUS: 'serious',
  SEVERE: 'severe',
}

export const SEVERITY_LABELS = {
  [SEVERITY.MINOR]: 'Minor',
  [SEVERITY.MODERATE]: 'Moderate',
  [SEVERITY.SERIOUS]: 'Serious',
  [SEVERITY.SEVERE]: 'Severe',
}

export const SEVERITY_COLORS = {
  [SEVERITY.MINOR]: 'blue',
  [SEVERITY.MODERATE]: 'yellow',
  [SEVERITY.SERIOUS]: 'orange',
  [SEVERITY.SEVERE]: 'red',
}

// Offense categories
export const OFFENSE_CATEGORIES = {
  FIGHTING: 'fighting',
  DRUGS_ALCOHOL: 'drugs_alcohol',
  WEAPONS: 'weapons',
  HARASSMENT_BULLYING: 'harassment_bullying',
  TRUANCY: 'truancy',
  DEFIANCE: 'defiance',
  THEFT: 'theft',
  VANDALISM: 'vandalism',
  SEXUAL_OFFENSE: 'sexual_offense',
  GANG_RELATED: 'gang_related',
  OTHER: 'other',
}

export const OFFENSE_CATEGORY_LABELS = {
  [OFFENSE_CATEGORIES.FIGHTING]: 'Fighting',
  [OFFENSE_CATEGORIES.DRUGS_ALCOHOL]: 'Drugs/Alcohol',
  [OFFENSE_CATEGORIES.WEAPONS]: 'Weapons',
  [OFFENSE_CATEGORIES.HARASSMENT_BULLYING]: 'Harassment/Bullying',
  [OFFENSE_CATEGORIES.TRUANCY]: 'Truancy',
  [OFFENSE_CATEGORIES.DEFIANCE]: 'Defiance/Insubordination',
  [OFFENSE_CATEGORIES.THEFT]: 'Theft',
  [OFFENSE_CATEGORIES.VANDALISM]: 'Vandalism',
  [OFFENSE_CATEGORIES.SEXUAL_OFFENSE]: 'Sexual Offense',
  [OFFENSE_CATEGORIES.GANG_RELATED]: 'Gang-Related Activity',
  [OFFENSE_CATEGORIES.OTHER]: 'Other',
}

// Alert levels
export const ALERT_LEVEL = {
  RED: 'red',
  YELLOW: 'yellow',
}

export const ALERT_LEVEL_LABELS = {
  [ALERT_LEVEL.RED]: 'Red Flag',
  [ALERT_LEVEL.YELLOW]: 'Yellow Flag',
}

// Alert trigger types
export const ALERT_TRIGGERS = {
  DAEP_REPEAT: 'daep_repeat',
  ISS_FREQUENCY: 'iss_frequency',
  OFFENSE_REPEAT: 'offense_repeat',
  REFERRAL_FREQUENCY: 'referral_frequency',
  SPED_CUMULATIVE_WARNING: 'sped_cumulative_warning',
  SPED_CUMULATIVE_MDR: 'sped_cumulative_mdr',
}

export const ALERT_TRIGGER_LABELS = {
  [ALERT_TRIGGERS.DAEP_REPEAT]: '2nd DAEP Placement (Same Year)',
  [ALERT_TRIGGERS.ISS_FREQUENCY]: '3+ ISS in 30 Days',
  [ALERT_TRIGGERS.OFFENSE_REPEAT]: 'Same Offense 3+ Times',
  [ALERT_TRIGGERS.REFERRAL_FREQUENCY]: '5+ Referrals in 30 Days',
  [ALERT_TRIGGERS.SPED_CUMULATIVE_WARNING]: 'SPED/504 Cumulative Removal Days Warning (5+)',
  [ALERT_TRIGGERS.SPED_CUMULATIVE_MDR]: 'SPED/504 MDR Required (10+ Cumulative Days)',
}

// Alert statuses
export const ALERT_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
}

// Compliance checklist statuses
export const COMPLIANCE_STATUS = {
  INCOMPLETE: 'incomplete',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  WAIVED: 'waived',
}

// Manifestation determination results
export const MANIFESTATION_RESULT = {
  IS_MANIFESTATION: 'is_manifestation',
  NOT_MANIFESTATION: 'not_manifestation',
  PENDING: 'pending',
}

export const MANIFESTATION_RESULT_LABELS = {
  [MANIFESTATION_RESULT.IS_MANIFESTATION]: 'Is a Manifestation of Disability',
  [MANIFESTATION_RESULT.NOT_MANIFESTATION]: 'Not a Manifestation of Disability',
  [MANIFESTATION_RESULT.PENDING]: 'Pending Determination',
}

// Transition plan types
export const PLAN_TYPE = {
  DAEP_ENTRY: 'daep_entry',
  DAEP_EXIT: 'daep_exit',
  ISS_REENTRY: 'iss_reentry',
  BEHAVIORAL: 'behavioral',
  CUSTOM: 'custom',
}

export const PLAN_TYPE_LABELS = {
  [PLAN_TYPE.DAEP_ENTRY]: 'DAEP Entry Plan',
  [PLAN_TYPE.DAEP_EXIT]: 'DAEP Exit/Transition Plan',
  [PLAN_TYPE.ISS_REENTRY]: 'ISS Re-Entry Plan',
  [PLAN_TYPE.BEHAVIORAL]: 'Behavioral Support Plan',
  [PLAN_TYPE.CUSTOM]: 'Custom Plan',
}

// Transition plan statuses
export const PLAN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  UNDER_REVIEW: 'under_review',
  COMPLETED: 'completed',
  EXTENDED: 'extended',
  FAILED: 'failed',
}

export const PLAN_STATUS_LABELS = {
  [PLAN_STATUS.DRAFT]: 'Draft',
  [PLAN_STATUS.ACTIVE]: 'Active',
  [PLAN_STATUS.UNDER_REVIEW]: 'Under Review',
  [PLAN_STATUS.COMPLETED]: 'Completed',
  [PLAN_STATUS.EXTENDED]: 'Extended',
  [PLAN_STATUS.FAILED]: 'Failed',
}

export const PLAN_STATUS_COLORS = {
  [PLAN_STATUS.DRAFT]: 'gray',
  [PLAN_STATUS.ACTIVE]: 'green',
  [PLAN_STATUS.UNDER_REVIEW]: 'yellow',
  [PLAN_STATUS.COMPLETED]: 'blue',
  [PLAN_STATUS.EXTENDED]: 'orange',
  [PLAN_STATUS.FAILED]: 'red',
}

// Review types
export const REVIEW_TYPE = {
  DAY_30: '30_day',
  DAY_60: '60_day',
  DAY_90: '90_day',
  AD_HOC: 'ad_hoc',
}

export const REVIEW_TYPE_LABELS = {
  [REVIEW_TYPE.DAY_30]: '30-Day Review',
  [REVIEW_TYPE.DAY_60]: '60-Day Review',
  [REVIEW_TYPE.DAY_90]: '90-Day Review',
  [REVIEW_TYPE.AD_HOC]: 'Ad Hoc Review',
}

// Progress ratings
export const PROGRESS_RATING = {
  EXCEEDING: 'exceeding',
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  FAILING: 'failing',
}

export const PROGRESS_RATING_LABELS = {
  [PROGRESS_RATING.EXCEEDING]: 'Exceeding Expectations',
  [PROGRESS_RATING.ON_TRACK]: 'On Track',
  [PROGRESS_RATING.AT_RISK]: 'At Risk',
  [PROGRESS_RATING.FAILING]: 'Failing',
}

export const PROGRESS_RATING_COLORS = {
  [PROGRESS_RATING.EXCEEDING]: 'green',
  [PROGRESS_RATING.ON_TRACK]: 'blue',
  [PROGRESS_RATING.AT_RISK]: 'yellow',
  [PROGRESS_RATING.FAILING]: 'red',
}

// Intervention tiers (MTSS)
export const INTERVENTION_TIERS = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
}

// Intervention categories
export const INTERVENTION_CATEGORIES = {
  BEHAVIORAL: 'behavioral',
  ACADEMIC: 'academic',
  SOCIAL_EMOTIONAL: 'social_emotional',
  MENTORING: 'mentoring',
  RESTORATIVE: 'restorative',
}

export const INTERVENTION_CATEGORY_LABELS = {
  [INTERVENTION_CATEGORIES.BEHAVIORAL]: 'Behavioral',
  [INTERVENTION_CATEGORIES.ACADEMIC]: 'Academic',
  [INTERVENTION_CATEGORIES.SOCIAL_EMOTIONAL]: 'Social-Emotional',
  [INTERVENTION_CATEGORIES.MENTORING]: 'Mentoring',
  [INTERVENTION_CATEGORIES.RESTORATIVE]: 'Restorative Justice',
}

// Effectiveness ratings
export const EFFECTIVENESS = {
  HIGHLY_EFFECTIVE: 'highly_effective',
  EFFECTIVE: 'effective',
  SOMEWHAT_EFFECTIVE: 'somewhat_effective',
  INEFFECTIVE: 'ineffective',
  NOT_RATED: 'not_rated',
}

// Campus types
export const CAMPUS_TYPES = {
  ELEMENTARY: 'elementary',
  MIDDLE: 'middle',
  HIGH: 'high',
  DAEP: 'daep',
  JJAEP: 'jjaep',
  OTHER: 'other',
}

export const CAMPUS_TYPE_LABELS = {
  [CAMPUS_TYPES.ELEMENTARY]: 'Elementary',
  [CAMPUS_TYPES.MIDDLE]: 'Middle School',
  [CAMPUS_TYPES.HIGH]: 'High School',
  [CAMPUS_TYPES.DAEP]: 'DAEP',
  [CAMPUS_TYPES.JJAEP]: 'JJAEP',
  [CAMPUS_TYPES.OTHER]: 'Other',
}

// Grade levels
export const GRADE_LEVELS = [
  { value: -1, label: 'Pre-K' },
  { value: 0, label: 'Kindergarten' },
  { value: 1, label: '1st Grade' },
  { value: 2, label: '2nd Grade' },
  { value: 3, label: '3rd Grade' },
  { value: 4, label: '4th Grade' },
  { value: 5, label: '5th Grade' },
  { value: 6, label: '6th Grade' },
  { value: 7, label: '7th Grade' },
  { value: 8, label: '8th Grade' },
  { value: 9, label: '9th Grade' },
  { value: 10, label: '10th Grade' },
  { value: 11, label: '11th Grade' },
  { value: 12, label: '12th Grade' },
]

// SPED eligibility codes (Texas)
export const SPED_ELIGIBILITY_CODES = {
  AU: 'Autism',
  DB: 'Deaf-Blindness',
  ED: 'Emotional Disturbance',
  HI: 'Hearing Impairment',
  ID: 'Intellectual Disability',
  LD: 'Learning Disability',
  MD: 'Multiple Disabilities',
  NCI: 'Noncategorical Early Childhood',
  OHI: 'Other Health Impairment',
  OI: 'Orthopedic Impairment',
  SI: 'Speech Impairment',
  TBI: 'Traumatic Brain Injury',
  VI: 'Visual Impairment',
}

// Incident locations
export const INCIDENT_LOCATIONS = [
  'Classroom',
  'Hallway',
  'Cafeteria',
  'Gymnasium',
  'Playground/Recess',
  'Restroom',
  'Bus',
  'Bus Stop',
  'Parking Lot',
  'Athletic Field',
  'Library',
  'Office',
  'Off Campus',
  'Online/Virtual',
  'Other',
]

// Notification methods
export const NOTIFICATION_METHODS = {
  EMAIL: 'email',
  PHONE: 'phone',
  LETTER: 'letter',
  IN_PERSON: 'in_person',
}

// Import system
export const IMPORT_TYPES = [
  { value: 'campuses', label: 'Campuses', description: 'Schools and facilities' },
  { value: 'students', label: 'Students', description: 'Student roster data' },
  { value: 'profiles', label: 'Staff', description: 'Staff accounts and roles' },
  { value: 'incidents', label: 'Incidents', description: 'Discipline incidents' },
]

export const IMPORT_TYPE_LABELS = {
  campuses: 'Campuses',
  students: 'Students',
  profiles: 'Staff',
  incidents: 'Incidents',
}

export const DUPLICATE_STRATEGIES = [
  { value: 'skip', label: 'Skip Duplicates', description: 'Existing records are left unchanged; only new records are imported.' },
  { value: 'upsert', label: 'Update Duplicates', description: 'Existing records are updated with the imported data; new records are created.' },
]

export const IMPORT_STATUS_CONFIG = {
  processing: { label: 'Processing', color: 'orange' },
  completed: { label: 'Completed', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  partial: { label: 'Partial', color: 'yellow' },
}

// DAEP Approval Chain
export const APPROVAL_STEP_STATUS = {
  PENDING: 'pending',
  WAITING: 'waiting',
  APPROVED: 'approved',
  DENIED: 'denied',
  RETURNED: 'returned',
  SKIPPED: 'skipped',
}

export const APPROVAL_CHAIN_STEPS = [
  { role: 'cbc', label: 'Campus Behavior Coordinator', order: 1 },
  { role: 'counselor', label: 'Counselor', order: 2 },
  { role: 'sped_coordinator', label: 'Special Education', order: 3, conditional: 'is_sped' },
  { role: 'section_504_coordinator', label: 'Section 504', order: 4, conditional: 'has_504' },
  { role: 'sss', label: 'Student Support Specialist', order: 5 },
  { role: 'director_student_affairs', label: 'Director of Student Affairs', order: 6 },
]

// DAEP Document Types
export const DAEP_DOCUMENT_TYPES = {
  TRANSCRIPT: 'transcript',
  SCHEDULE: 'schedule',
  MDR: 'mdr',
}

export const DAEP_DOCUMENT_LABELS = {
  [DAEP_DOCUMENT_TYPES.TRANSCRIPT]: 'Transcript',
  [DAEP_DOCUMENT_TYPES.SCHEDULE]: 'Current Schedule',
  [DAEP_DOCUMENT_TYPES.MDR]: 'Manifestation Determination Review (MDR)',
}

// Placement Scheduling Statuses
export const SCHEDULING_STATUS = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
}

export const SCHEDULING_STATUS_LABELS = {
  [SCHEDULING_STATUS.PENDING]: 'Pending',
  [SCHEDULING_STATUS.SCHEDULED]: 'Scheduled',
  [SCHEDULING_STATUS.COMPLETED]: 'Completed',
}

export const SCHEDULING_STATUS_COLORS = {
  [SCHEDULING_STATUS.PENDING]: 'yellow',
  [SCHEDULING_STATUS.SCHEDULED]: 'blue',
  [SCHEDULING_STATUS.COMPLETED]: 'green',
}

// Days of the week
export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
