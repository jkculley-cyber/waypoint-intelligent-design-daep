-- Migration 040: Meridian — SPED Compliance Engine
-- All tables prefixed with meridian_ to avoid collision with Waypoint tables.
-- Reuses existing: districts, campuses, profiles tables.
-- RLS uses existing user_district_id() and is_waypoint_admin() functions.

-- ─── STUDENTS (SPED/504 — sourced from Frontline eSped) ──────────────────────

CREATE TABLE IF NOT EXISTS meridian_students (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  campus_id       UUID REFERENCES campuses(id),

  -- Identifiers
  state_id        TEXT,             -- Texas PEIMS/TSDS student ID
  local_id        TEXT,
  frontline_id    TEXT,             -- Frontline eSped internal ID

  -- Demographics
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  date_of_birth   DATE,
  grade           TEXT,
  gender          TEXT,
  ethnicity       TEXT,

  -- SPED status
  sped_status     TEXT,             -- 'referred','eligible','ineligible','exited'
  primary_disability TEXT,
  secondary_disability TEXT,

  -- 504 status
  has_504         BOOLEAN DEFAULT FALSE,
  plan_type       TEXT,             -- 'IEP','504','both','none'

  -- Dyslexia / HB 3928
  dyslexia_identified    BOOLEAN DEFAULT FALSE,
  dyslexia_plan_type     TEXT,     -- '504','IEP','intervention_only'
  hb3928_review_status   TEXT DEFAULT 'not_required',

  -- Waypoint integration link
  waypoint_student_id TEXT,        -- links to Waypoint students.id

  -- Source tracking
  import_source   TEXT DEFAULT 'manual',
  last_import_at  TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ARD / IEP REFERRALS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meridian_referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES meridian_students(id) ON DELETE CASCADE,
  campus_id       UUID REFERENCES campuses(id),

  referral_date       DATE NOT NULL,
  referral_source     TEXT,
  referral_reason     TEXT,

  consent_sent_date   DATE,
  consent_signed_date DATE,
  consent_refused     BOOLEAN DEFAULT FALSE,

  eval_due_date       DATE,
  eval_completed_date DATE,
  eval_assigned_to    UUID REFERENCES profiles(id),

  ard_due_date        DATE,
  ard_held_date       DATE,

  status          TEXT DEFAULT 'open',
  notes           TEXT,
  frontline_id    TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── IEPs ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meridian_ieps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES meridian_students(id) ON DELETE CASCADE,
  campus_id       UUID REFERENCES campuses(id),

  ard_date        DATE,
  iep_start_date  DATE,
  iep_end_date    DATE,

  annual_review_due  DATE,
  annual_review_held DATE,

  triennial_due      DATE,
  triennial_completed DATE,

  status          TEXT DEFAULT 'active',
  case_manager_id UUID REFERENCES profiles(id),

  -- Folder readiness flags
  has_present_levels        BOOLEAN DEFAULT FALSE,
  has_annual_goals          BOOLEAN DEFAULT FALSE,
  has_services_section      BOOLEAN DEFAULT FALSE,
  has_accommodations        BOOLEAN DEFAULT FALSE,
  has_transition_plan       BOOLEAN DEFAULT FALSE,
  has_parent_signature      BOOLEAN DEFAULT FALSE,
  has_prior_written_notice  BOOLEAN DEFAULT FALSE,

  frontline_id    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian_iep_progress_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  iep_id          UUID REFERENCES meridian_ieps(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES meridian_students(id),

  grading_period  TEXT,
  due_date        DATE,
  submitted_date  DATE,
  submitted_by    UUID REFERENCES profiles(id),
  status          TEXT DEFAULT 'pending',

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 504 PLANS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meridian_plans_504 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES meridian_students(id) ON DELETE CASCADE,
  campus_id       UUID REFERENCES campuses(id),

  meeting_date        DATE,
  plan_start_date     DATE,
  plan_end_date       DATE,
  annual_review_due   DATE,
  annual_review_held  DATE,

  is_dyslexia_plan          BOOLEAN DEFAULT FALSE,
  hb3928_reviewed           BOOLEAN DEFAULT FALSE,
  hb3928_review_date        DATE,
  mdt_composition_verified  BOOLEAN DEFAULT FALSE,
  progress_report_required  BOOLEAN DEFAULT FALSE,

  status          TEXT DEFAULT 'active',
  case_manager_id UUID REFERENCES profiles(id),

  has_eligibility_determination BOOLEAN DEFAULT FALSE,
  has_accommodation_list        BOOLEAN DEFAULT FALSE,
  has_parent_signature          BOOLEAN DEFAULT FALSE,
  has_prior_written_notice      BOOLEAN DEFAULT FALSE,

  frontline_id    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian_plan_504_progress_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES meridian_plans_504(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES meridian_students(id),

  grading_period  TEXT,
  due_date        DATE,
  submitted_date  DATE,
  submitted_by    UUID REFERENCES profiles(id),
  status          TEXT DEFAULT 'pending',

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CORRECTIVE ACTION PLANS (TEA) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meridian_cap_findings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,

  finding_number  TEXT NOT NULL,
  finding_type    TEXT,
  legal_citation  TEXT,
  description     TEXT,

  issued_date             DATE,
  child_correction_due    DATE,
  systemic_correction_due DATE,

  status                  TEXT DEFAULT 'open',
  tea_acknowledgment_date DATE,
  tea_closure_date        DATE,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian_cap_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  finding_id      UUID REFERENCES meridian_cap_findings(id) ON DELETE CASCADE,

  task_label      TEXT NOT NULL,
  task_type       TEXT,
  due_date        DATE,
  completed_date  DATE,
  assigned_to     UUID REFERENCES profiles(id),
  status          TEXT DEFAULT 'pending',
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INTEGRATION SOURCES & IMPORT LOGS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS meridian_integration_sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,

  source_name     TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  status          TEXT DEFAULT 'active',

  sftp_host       TEXT,
  sftp_path       TEXT,
  sftp_schedule   TEXT,
  column_map      JSONB,

  last_sync_at                  TIMESTAMPTZ,
  last_sync_status              TEXT,
  last_sync_records_processed   INT,
  last_sync_errors              INT DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian_import_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id     UUID REFERENCES districts(id) ON DELETE CASCADE,
  source_id       UUID REFERENCES meridian_integration_sources(id),

  import_type     TEXT,
  filename        TEXT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,

  records_total   INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_skipped INT DEFAULT 0,
  records_errored INT DEFAULT 0,

  status          TEXT DEFAULT 'running',
  error_log       JSONB,
  imported_by     TEXT
);

-- ─── COMPUTED VIEW: Folder Readiness Score ───────────────────────────────────

CREATE OR REPLACE VIEW meridian_student_folder_readiness AS
SELECT
  s.id AS student_id,
  s.district_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.grade,
  c.name AS campus_name,
  c.id   AS campus_id,

  CASE WHEN i.id IS NOT NULL THEN
    (
      (CASE WHEN i.has_present_levels        THEN 1 ELSE 0 END) +
      (CASE WHEN i.has_annual_goals          THEN 1 ELSE 0 END) +
      (CASE WHEN i.has_services_section      THEN 1 ELSE 0 END) +
      (CASE WHEN i.has_accommodations        THEN 1 ELSE 0 END) +
      (CASE WHEN i.has_parent_signature      THEN 1 ELSE 0 END) +
      (CASE WHEN i.has_prior_written_notice  THEN 1 ELSE 0 END)
    )::FLOAT / 6.0 * 100
  ELSE NULL END AS iep_readiness_pct,

  CASE WHEN p.id IS NOT NULL THEN
    (
      (CASE WHEN p.has_eligibility_determination THEN 1 ELSE 0 END) +
      (CASE WHEN p.has_accommodation_list        THEN 1 ELSE 0 END) +
      (CASE WHEN p.has_parent_signature          THEN 1 ELSE 0 END) +
      (CASE WHEN p.has_prior_written_notice      THEN 1 ELSE 0 END)
    )::FLOAT / 4.0 * 100
  ELSE NULL END AS plan_504_readiness_pct,

  s.plan_type,
  s.hb3928_review_status,
  s.dyslexia_identified

FROM meridian_students s
LEFT JOIN campuses c ON s.campus_id = c.id
LEFT JOIN meridian_ieps i ON i.student_id = s.id AND i.status = 'active'
LEFT JOIN meridian_plans_504 p ON p.student_id = s.id AND p.status = 'active';

-- ─── COMPUTED VIEW: Compliance Deadlines ─────────────────────────────────────

CREATE OR REPLACE VIEW meridian_compliance_deadlines AS
-- 60-day evaluation windows
SELECT
  'eval_window'                         AS deadline_type,
  r.id                                  AS record_id,
  r.student_id,
  r.district_id,
  s.first_name || ' ' || s.last_name    AS student_name,
  s.grade,
  c.id                                  AS campus_id,
  c.name                                AS campus_name,
  r.eval_due_date                       AS deadline_date,
  (r.eval_due_date - CURRENT_DATE)      AS days_remaining,
  CASE
    WHEN r.eval_due_date < CURRENT_DATE            THEN 'overdue'
    WHEN r.eval_due_date <= CURRENT_DATE + 7       THEN 'critical'
    WHEN r.eval_due_date <= CURRENT_DATE + 14      THEN 'warning'
    ELSE 'ok'
  END                                   AS status,
  '60-day evaluation window'            AS window_label
FROM meridian_referrals r
JOIN meridian_students s ON r.student_id = s.id
JOIN campuses c ON r.campus_id = c.id
WHERE r.eval_completed_date IS NULL
  AND r.consent_refused = FALSE
  AND r.eval_due_date IS NOT NULL

UNION ALL

-- 30-day ARD windows (post eval)
SELECT
  'ard_window',
  r.id,
  r.student_id,
  r.district_id,
  s.first_name || ' ' || s.last_name,
  s.grade,
  c.id,
  c.name,
  r.ard_due_date,
  (r.ard_due_date - CURRENT_DATE),
  CASE
    WHEN r.ard_due_date < CURRENT_DATE         THEN 'overdue'
    WHEN r.ard_due_date <= CURRENT_DATE + 7    THEN 'critical'
    WHEN r.ard_due_date <= CURRENT_DATE + 14   THEN 'warning'
    ELSE 'ok'
  END,
  '30-day ARD window'
FROM meridian_referrals r
JOIN meridian_students s ON r.student_id = s.id
JOIN campuses c ON r.campus_id = c.id
WHERE r.eval_completed_date IS NOT NULL
  AND r.ard_held_date IS NULL
  AND r.ard_due_date IS NOT NULL

UNION ALL

-- Annual IEP reviews
SELECT
  'annual_review',
  i.id,
  i.student_id,
  i.district_id,
  s.first_name || ' ' || s.last_name,
  s.grade,
  c.id,
  c.name,
  i.annual_review_due,
  (i.annual_review_due - CURRENT_DATE),
  CASE
    WHEN i.annual_review_due < CURRENT_DATE        THEN 'overdue'
    WHEN i.annual_review_due <= CURRENT_DATE + 7   THEN 'critical'
    WHEN i.annual_review_due <= CURRENT_DATE + 14  THEN 'warning'
    ELSE 'ok'
  END,
  'Annual IEP review'
FROM meridian_ieps i
JOIN meridian_students s ON i.student_id = s.id
JOIN campuses c ON i.campus_id = c.id
WHERE i.annual_review_held IS NULL
  AND i.status = 'active'
  AND i.annual_review_due IS NOT NULL;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE meridian_students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_ieps                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_iep_progress_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_plans_504             ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_plan_504_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_cap_findings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_cap_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_integration_sources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian_import_logs           ENABLE ROW LEVEL SECURITY;

-- Drop policies first so this migration is safely re-runnable
DROP POLICY IF EXISTS "meridian_students_district"             ON meridian_students;
DROP POLICY IF EXISTS "meridian_referrals_district"            ON meridian_referrals;
DROP POLICY IF EXISTS "meridian_ieps_district"                 ON meridian_ieps;
DROP POLICY IF EXISTS "meridian_iep_progress_district"         ON meridian_iep_progress_reports;
DROP POLICY IF EXISTS "meridian_plans_504_district"            ON meridian_plans_504;
DROP POLICY IF EXISTS "meridian_plan_504_progress_district"    ON meridian_plan_504_progress_reports;
DROP POLICY IF EXISTS "meridian_cap_findings_district"         ON meridian_cap_findings;
DROP POLICY IF EXISTS "meridian_cap_tasks_district"            ON meridian_cap_tasks;
DROP POLICY IF EXISTS "meridian_integration_sources_district"  ON meridian_integration_sources;
DROP POLICY IF EXISTS "meridian_import_logs_district"          ON meridian_import_logs;

-- District staff can read/write their own district's data
CREATE POLICY "meridian_students_district"             ON meridian_students             FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_referrals_district"            ON meridian_referrals            FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_ieps_district"                 ON meridian_ieps                 FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_iep_progress_district"         ON meridian_iep_progress_reports FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_plans_504_district"            ON meridian_plans_504            FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_plan_504_progress_district"    ON meridian_plan_504_progress_reports FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_cap_findings_district"         ON meridian_cap_findings         FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_cap_tasks_district"            ON meridian_cap_tasks            FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_integration_sources_district"  ON meridian_integration_sources  FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());
CREATE POLICY "meridian_import_logs_district"          ON meridian_import_logs          FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_meridian_students_district   ON meridian_students(district_id);
CREATE INDEX IF NOT EXISTS idx_meridian_students_campus     ON meridian_students(campus_id);
CREATE INDEX IF NOT EXISTS idx_meridian_students_sped       ON meridian_students(sped_status);
CREATE INDEX IF NOT EXISTS idx_meridian_referrals_district  ON meridian_referrals(district_id);
CREATE INDEX IF NOT EXISTS idx_meridian_ieps_district       ON meridian_ieps(district_id);
CREATE INDEX IF NOT EXISTS idx_meridian_ieps_annual_review  ON meridian_ieps(annual_review_due) WHERE annual_review_held IS NULL;
CREATE INDEX IF NOT EXISTS idx_meridian_referrals_eval_due  ON meridian_referrals(eval_due_date) WHERE eval_completed_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_meridian_referrals_ard_due   ON meridian_referrals(ard_due_date) WHERE ard_held_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_meridian_cap_findings_dist   ON meridian_cap_findings(district_id);
CREATE INDEX IF NOT EXISTS idx_meridian_plans_504_district  ON meridian_plans_504(district_id);
