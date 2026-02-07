-- ============================================
-- IDS: Intelligent Discipline System
-- Initial Database Schema
-- ============================================

-- 1. Districts
CREATE TABLE districts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  tea_district_id TEXT UNIQUE NOT NULL,
  state           TEXT NOT NULL DEFAULT 'TX',
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Campuses
CREATE TABLE campuses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     UUID NOT NULL REFERENCES districts(id),
  name            TEXT NOT NULL,
  tea_campus_id   TEXT UNIQUE NOT NULL,
  campus_type     TEXT NOT NULL CHECK (campus_type IN ('elementary','middle','high','daep','jjaep','other')),
  address         JSONB DEFAULT '{}',
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_campuses_district ON campuses(district_id);

-- 3. Profiles (extends auth.users)
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  district_id     UUID NOT NULL REFERENCES districts(id),
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','principal','ap','counselor','sped_coordinator','teacher','parent','student')),
  title           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_profiles_district ON profiles(district_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 4. Profile-Campus assignments (many-to-many)
CREATE TABLE profile_campus_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campus_id       UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  is_primary      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, campus_id)
);
CREATE INDEX idx_pca_profile ON profile_campus_assignments(profile_id);
CREATE INDEX idx_pca_campus ON profile_campus_assignments(campus_id);

-- 5. Students
CREATE TABLE students (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id           UUID NOT NULL REFERENCES districts(id),
  campus_id             UUID NOT NULL REFERENCES campuses(id),
  student_id_number     TEXT NOT NULL,
  peims_id              TEXT,
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  middle_name           TEXT,
  date_of_birth         DATE NOT NULL,
  grade_level           INTEGER NOT NULL CHECK (grade_level BETWEEN -1 AND 12),
  gender                TEXT CHECK (gender IN ('M','F','X')),
  race_ethnicity        TEXT,

  -- Special population flags
  is_sped               BOOLEAN DEFAULT false,
  sped_eligibility      TEXT,
  is_504                BOOLEAN DEFAULT false,
  is_ell                BOOLEAN DEFAULT false,
  ell_program_code      TEXT,
  is_homeless           BOOLEAN DEFAULT false,
  is_foster_care        BOOLEAN DEFAULT false,
  is_military_connected BOOLEAN DEFAULT false,
  is_gifted             BOOLEAN DEFAULT false,

  -- Parent link
  parent_profile_id     UUID REFERENCES profiles(id),
  emergency_contact     JSONB DEFAULT '{}',

  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(district_id, student_id_number)
);
CREATE INDEX idx_students_campus ON students(campus_id);
CREATE INDEX idx_students_district ON students(district_id);
CREATE INDEX idx_students_sped ON students(is_sped) WHERE is_sped = true;
CREATE INDEX idx_students_parent ON students(parent_profile_id);

-- 6. Offense Codes (Texas Education Code reference data)
CREATE TABLE offense_codes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id             UUID REFERENCES districts(id),
  code                    TEXT NOT NULL,
  category                TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  tec_reference           TEXT,
  severity                TEXT NOT NULL CHECK (severity IN ('minor','moderate','serious','severe')),
  is_mandatory_daep       BOOLEAN DEFAULT false,
  is_mandatory_expulsion  BOOLEAN DEFAULT false,
  is_discretionary_daep   BOOLEAN DEFAULT false,
  peims_action_code       TEXT,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_offense_codes_district ON offense_codes(district_id);
CREATE INDEX idx_offense_codes_category ON offense_codes(category);

-- 7. Discipline Matrix (offense -> consequence mapping)
CREATE TABLE discipline_matrix (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id             UUID NOT NULL REFERENCES districts(id),
  offense_code_id         UUID NOT NULL REFERENCES offense_codes(id),
  occurrence              INTEGER NOT NULL DEFAULT 1,
  grade_group             TEXT CHECK (grade_group IN ('pk-2','3-5','6-8','9-12','all')),

  min_consequence         TEXT NOT NULL,
  max_consequence         TEXT NOT NULL,
  default_consequence     TEXT NOT NULL,
  consequence_days_min    INTEGER,
  consequence_days_max    INTEGER,

  required_supports       TEXT[] DEFAULT '{}',
  required_notifications  TEXT[] DEFAULT '{}',
  transition_plan_required BOOLEAN DEFAULT false,

  notes                   TEXT,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_matrix_district ON discipline_matrix(district_id);
CREATE INDEX idx_matrix_offense ON discipline_matrix(offense_code_id);
CREATE UNIQUE INDEX idx_matrix_unique ON discipline_matrix(district_id, offense_code_id, occurrence, grade_group);

-- 8. Incidents (discipline events)
CREATE TABLE incidents (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id               UUID NOT NULL REFERENCES districts(id),
  campus_id                 UUID NOT NULL REFERENCES campuses(id),
  student_id                UUID NOT NULL REFERENCES students(id),
  reported_by               UUID NOT NULL REFERENCES profiles(id),

  incident_date             DATE NOT NULL,
  incident_time             TIME,
  location                  TEXT,
  offense_code_id           UUID NOT NULL REFERENCES offense_codes(id),
  description               TEXT NOT NULL,

  consequence_type          TEXT NOT NULL,
  consequence_days          INTEGER,
  consequence_start         DATE,
  consequence_end           DATE,

  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                              'draft','submitted','under_review','compliance_hold',
                              'approved','active','completed','appealed','overturned'
                            )),

  sped_compliance_required  BOOLEAN DEFAULT false,
  compliance_checklist_id   UUID,
  compliance_cleared        BOOLEAN DEFAULT false,

  peims_action_code         TEXT,
  peims_reported            BOOLEAN DEFAULT false,
  peims_reported_at         TIMESTAMPTZ,

  transition_plan_id        UUID,

  reviewed_by               UUID REFERENCES profiles(id),
  reviewed_at               TIMESTAMPTZ,
  notes                     TEXT,
  attachments               JSONB DEFAULT '[]',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_incidents_student ON incidents(student_id);
CREATE INDEX idx_incidents_campus ON incidents(campus_id);
CREATE INDEX idx_incidents_district ON incidents(district_id);
CREATE INDEX idx_incidents_date ON incidents(incident_date DESC);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_offense ON incidents(offense_code_id);
CREATE INDEX idx_incidents_compliance ON incidents(sped_compliance_required) WHERE sped_compliance_required = true;

-- 9. Compliance Checklists (SPED compliance tracking)
CREATE TABLE compliance_checklists (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id                 UUID NOT NULL REFERENCES districts(id),
  incident_id                 UUID NOT NULL REFERENCES incidents(id),
  student_id                  UUID NOT NULL REFERENCES students(id),

  ard_committee_notified      TIMESTAMPTZ,
  ard_committee_met           TIMESTAMPTZ,
  manifestation_determination TIMESTAMPTZ,
  manifestation_result        TEXT CHECK (manifestation_result IN ('is_manifestation','not_manifestation','pending')),
  bip_reviewed                TIMESTAMPTZ,
  bip_updated                 TIMESTAMPTZ,
  fba_conducted               TIMESTAMPTZ,
  parent_notified             TIMESTAMPTZ,
  parent_notification_method  TEXT,
  fape_plan_documented        TIMESTAMPTZ,
  educational_services_arranged TIMESTAMPTZ,

  iep_goals_reviewed          TIMESTAMPTZ,
  placement_justification     TEXT,
  least_restrictive_considered BOOLEAN DEFAULT false,

  status                      TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete','in_progress','completed','waived')),
  completed_by                UUID REFERENCES profiles(id),
  completed_at                TIMESTAMPTZ,

  placement_blocked           BOOLEAN DEFAULT true,
  block_overridden            BOOLEAN DEFAULT false,
  override_reason             TEXT,
  override_by                 UUID REFERENCES profiles(id),

  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_compliance_incident ON compliance_checklists(incident_id);
CREATE INDEX idx_compliance_student ON compliance_checklists(student_id);
CREATE INDEX idx_compliance_status ON compliance_checklists(status);

-- Add FK from incidents to compliance_checklists
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_compliance
  FOREIGN KEY (compliance_checklist_id) REFERENCES compliance_checklists(id);

-- 10. Alerts (Repeat Offender Alert System)
CREATE TABLE alerts (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id                     UUID NOT NULL REFERENCES districts(id),
  campus_id                       UUID NOT NULL REFERENCES campuses(id),
  student_id                      UUID NOT NULL REFERENCES students(id),

  alert_level                     TEXT NOT NULL CHECK (alert_level IN ('yellow','red')),
  trigger_type                    TEXT NOT NULL,
  trigger_description             TEXT NOT NULL,
  trigger_data                    JSONB DEFAULT '{}',

  root_cause_analysis_completed   TIMESTAMPTZ,
  previous_plan_reviewed          TIMESTAMPTZ,
  sped_referral_considered        TIMESTAMPTZ,
  sped_referral_outcome           TEXT,
  threat_assessment_completed     TIMESTAMPTZ,
  mental_health_referral          TIMESTAMPTZ,

  notifications_sent              JSONB DEFAULT '[]',
  suggested_interventions         TEXT[] DEFAULT '{}',

  status                          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','in_progress','resolved','dismissed')),
  resolved_by                     UUID REFERENCES profiles(id),
  resolved_at                     TIMESTAMPTZ,
  resolution_notes                TEXT,

  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_alerts_student ON alerts(student_id);
CREATE INDEX idx_alerts_campus ON alerts(campus_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_level ON alerts(alert_level);

-- 11. Interventions (catalog)
CREATE TABLE interventions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id             UUID REFERENCES districts(id),
  name                    TEXT NOT NULL,
  category                TEXT NOT NULL,
  description             TEXT,
  tier                    INTEGER CHECK (tier BETWEEN 1 AND 3),
  target_population       TEXT[] DEFAULT '{}',
  recommended_duration_days INTEGER,
  required_staff_role     TEXT,
  evidence_level          TEXT,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- 12. Student Interventions (tracking assignments)
CREATE TABLE student_interventions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id         UUID NOT NULL REFERENCES districts(id),
  student_id          UUID NOT NULL REFERENCES students(id),
  intervention_id     UUID NOT NULL REFERENCES interventions(id),
  incident_id         UUID REFERENCES incidents(id),
  transition_plan_id  UUID,
  assigned_by         UUID NOT NULL REFERENCES profiles(id),
  implemented_by      UUID REFERENCES profiles(id),

  start_date          DATE NOT NULL,
  target_end_date     DATE,
  actual_end_date     DATE,

  status              TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','active','completed','discontinued')),
  effectiveness       TEXT CHECK (effectiveness IN ('highly_effective','effective','somewhat_effective','ineffective','not_rated')),
  notes               TEXT,
  progress_data       JSONB DEFAULT '[]',

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_si_student ON student_interventions(student_id);
CREATE INDEX idx_si_plan ON student_interventions(transition_plan_id);

-- 13. Transition Plans
CREATE TABLE transition_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id         UUID NOT NULL REFERENCES districts(id),
  student_id          UUID NOT NULL REFERENCES students(id),
  incident_id         UUID NOT NULL REFERENCES incidents(id),

  plan_type           TEXT NOT NULL CHECK (plan_type IN ('daep_entry','daep_exit','iss_reentry','behavioral','custom')),
  offense_category    TEXT NOT NULL,

  behavioral_supports JSONB DEFAULT '[]',
  academic_supports   JSONB DEFAULT '[]',
  parent_engagement   JSONB DEFAULT '[]',

  success_metrics     JSONB DEFAULT '[]',

  start_date          DATE NOT NULL,
  end_date            DATE,
  review_30_date      DATE,
  review_60_date      DATE,
  review_90_date      DATE,

  escalation_protocol JSONB DEFAULT '{}',

  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','under_review','completed','extended','failed')),
  created_by          UUID NOT NULL REFERENCES profiles(id),
  approved_by         UUID REFERENCES profiles(id),
  approved_at         TIMESTAMPTZ,

  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tp_student ON transition_plans(student_id);
CREATE INDEX idx_tp_incident ON transition_plans(incident_id);
CREATE INDEX idx_tp_status ON transition_plans(status);

-- Add FK from incidents to transition_plans
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_transition_plan
  FOREIGN KEY (transition_plan_id) REFERENCES transition_plans(id);

-- Add FK from student_interventions to transition_plans
ALTER TABLE student_interventions ADD CONSTRAINT fk_si_transition_plan
  FOREIGN KEY (transition_plan_id) REFERENCES transition_plans(id);

-- 14. Transition Plan Reviews (30/60/90 day reviews)
CREATE TABLE transition_plan_reviews (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_plan_id      UUID NOT NULL REFERENCES transition_plans(id),
  district_id             UUID NOT NULL REFERENCES districts(id),
  student_id              UUID NOT NULL REFERENCES students(id),

  review_type             TEXT NOT NULL CHECK (review_type IN ('30_day','60_day','90_day','ad_hoc')),
  review_date             DATE NOT NULL,

  office_referrals_count  INTEGER DEFAULT 0,
  cico_average_score      DECIMAL(5,2),
  grade_average           DECIMAL(5,2),
  attendance_rate         DECIMAL(5,2),
  behavioral_score        DECIMAL(5,2),
  custom_metrics          JSONB DEFAULT '{}',

  overall_progress        TEXT CHECK (overall_progress IN ('exceeding','on_track','at_risk','failing')),
  strengths               TEXT,
  concerns                TEXT,
  modifications           TEXT,

  continue_plan           BOOLEAN DEFAULT true,
  plan_modified           BOOLEAN DEFAULT false,
  escalation_needed       BOOLEAN DEFAULT false,

  reviewed_by             UUID NOT NULL REFERENCES profiles(id),
  attendees               UUID[] DEFAULT '{}',
  parent_present          BOOLEAN DEFAULT false,

  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tpr_plan ON transition_plan_reviews(transition_plan_id);
CREATE INDEX idx_tpr_student ON transition_plan_reviews(student_id);

-- 15. Daily Behavior Tracking (Student kiosk)
CREATE TABLE daily_behavior_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     UUID NOT NULL REFERENCES districts(id),
  campus_id       UUID NOT NULL REFERENCES campuses(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  tracking_date   DATE NOT NULL DEFAULT CURRENT_DATE,

  checked_in      BOOLEAN DEFAULT false,
  check_in_time   TIMESTAMPTZ,

  behavior_scores JSONB DEFAULT '[]',
  daily_total     DECIMAL(5,2),
  daily_goal      DECIMAL(5,2),
  goal_met        BOOLEAN,

  checked_out     BOOLEAN DEFAULT false,
  check_out_time  TIMESTAMPTZ,
  check_out_notes TEXT,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, tracking_date)
);
CREATE INDEX idx_dbt_student ON daily_behavior_tracking(student_id);
CREATE INDEX idx_dbt_date ON daily_behavior_tracking(tracking_date);
CREATE INDEX idx_dbt_campus ON daily_behavior_tracking(campus_id);

-- 16. Notification Log
CREATE TABLE notification_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id         UUID NOT NULL REFERENCES districts(id),

  trigger_type        TEXT NOT NULL,
  trigger_entity_type TEXT NOT NULL,
  trigger_entity_id   UUID NOT NULL,

  recipient_id        UUID REFERENCES profiles(id),
  recipient_email     TEXT NOT NULL,
  recipient_role      TEXT,

  subject             TEXT NOT NULL,
  body                TEXT NOT NULL,
  notification_type   TEXT NOT NULL CHECK (notification_type IN ('email','in_app','both')),

  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','read')),
  sent_at             TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,
  error_message       TEXT,

  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_recipient ON notification_log(recipient_id);
CREATE INDEX idx_notifications_trigger ON notification_log(trigger_entity_type, trigger_entity_id);
CREATE INDEX idx_notifications_status ON notification_log(status);

-- 17. Audit Log
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     UUID NOT NULL REFERENCES districts(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  changes         JSONB DEFAULT '{}',
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_date ON audit_log(created_at DESC);
