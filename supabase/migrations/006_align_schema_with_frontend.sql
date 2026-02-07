-- ============================================
-- Migration 006: Align Schema with Frontend
-- Fixes column name mismatches between the
-- database schema and React frontend hooks
-- ============================================

-- ============================================
-- 1. STUDENTS: race_ethnicity → race
--    Frontend uses `students.race` everywhere
-- ============================================
ALTER TABLE students RENAME COLUMN race_ethnicity TO race;

-- Add parent_user_id column
-- ParentDashboardPage queries .eq('parent_user_id', user.id)
-- (the auth user ID, not a profile reference)
ALTER TABLE students ADD COLUMN parent_user_id UUID;
CREATE INDEX idx_students_parent_user ON students(parent_user_id);

-- Keep parent_profile_id for backwards compatibility but also
-- add a comment explaining the dual columns
COMMENT ON COLUMN students.parent_user_id IS 'Auth user ID of the parent (used by parent portal login)';
COMMENT ON COLUMN students.parent_profile_id IS 'Profile ID of the parent (used for staff-facing views)';

-- ============================================
-- 2. OFFENSE_CODES: Add `name` column
--    Frontend references both `name` and `title`
--    - useIncidents selects offense_codes(id, code, title, category, severity)
--    - useAlerts, ParentDashboard reference offense_codes.name
--    We add `name` as a generated column mirroring `title`
-- ============================================
ALTER TABLE offense_codes ADD COLUMN name TEXT;

-- Backfill name from title
UPDATE offense_codes SET name = title WHERE name IS NULL;

-- Make name NOT NULL and default to title on new inserts
-- (We'll handle this via a trigger since generated columns
--  can't reference the same table in Postgres)
CREATE OR REPLACE FUNCTION sync_offense_code_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL THEN
    NEW.name := NEW.title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_offense_code_name_sync
  BEFORE INSERT OR UPDATE ON offense_codes
  FOR EACH ROW
  EXECUTE FUNCTION sync_offense_code_name();

-- ============================================
-- 3. DAILY_BEHAVIOR_TRACKING: Restructure
--    Frontend expects: status, period_scores, daily_notes
--    Schema has: checked_in, checked_out, behavior_scores
-- ============================================
ALTER TABLE daily_behavior_tracking
  ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending','checked_in','checked_out')),
  ADD COLUMN period_scores JSONB DEFAULT '{}',
  ADD COLUMN daily_notes TEXT;

-- Migrate existing boolean data to status column
UPDATE daily_behavior_tracking
SET status = CASE
  WHEN checked_out = true THEN 'checked_out'
  WHEN checked_in = true THEN 'checked_in'
  ELSE 'pending'
END;

-- Copy behavior_scores → period_scores
UPDATE daily_behavior_tracking
SET period_scores = behavior_scores
WHERE behavior_scores IS NOT NULL AND behavior_scores != '[]'::jsonb;

-- We keep the old columns for now (don't drop to avoid data loss)

-- ============================================
-- 4. STUDENT_INTERVENTIONS: Column renames
--    Frontend uses: effectiveness_rating, plan_id, end_date
--    Schema has: effectiveness, transition_plan_id, target_end_date
-- ============================================
ALTER TABLE student_interventions
  RENAME COLUMN effectiveness TO effectiveness_rating;

ALTER TABLE student_interventions
  RENAME COLUMN transition_plan_id TO plan_id;

-- Add end_date as an alias view or just add a column
-- Frontend uses `end_date` — map from target_end_date
ALTER TABLE student_interventions
  ADD COLUMN end_date DATE;

-- Backfill
UPDATE student_interventions SET end_date = target_end_date WHERE end_date IS NULL;

-- ============================================
-- 5. TRANSITION_PLANS: Add frontend-expected columns
--    Frontend wizard writes: goals, metrics, escalation_protocol (text)
--    Frontend also uses: activated_at, completed_at
-- ============================================
ALTER TABLE transition_plans
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS metrics TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- The existing JSONB columns (behavioral_supports, academic_supports, etc.)
-- are kept — the frontend wizard also sets them via the goals/metrics text fields

-- ============================================
-- 6. TRANSITION_PLAN_REVIEWS: Column renames
--    Frontend uses: plan_id, reviewer_id
--    Schema has: transition_plan_id, reviewed_by
-- ============================================
ALTER TABLE transition_plan_reviews
  RENAME COLUMN transition_plan_id TO plan_id;

ALTER TABLE transition_plan_reviews
  RENAME COLUMN reviewed_by TO reviewer_id;

-- Update the index name reference
DROP INDEX IF EXISTS idx_tpr_plan;
CREATE INDEX idx_tpr_plan ON transition_plan_reviews(plan_id);

-- ============================================
-- 7. Fix FK references that were renamed
-- ============================================

-- Update student_interventions FK constraint name
-- (The old FK referenced transition_plan_id, now plan_id)
ALTER TABLE student_interventions DROP CONSTRAINT IF EXISTS fk_si_transition_plan;
ALTER TABLE student_interventions ADD CONSTRAINT fk_si_plan
  FOREIGN KEY (plan_id) REFERENCES transition_plans(id);

-- ============================================
-- 8. INCIDENTS: Add `description` column if missing
--    and reviewed_at column
-- ============================================
-- description already exists in schema
-- reviewed_at already exists in schema
-- Just confirming no action needed

-- ============================================
-- 9. RLS POLICY UPDATES
--    The kiosk needs to query students and behavior
--    tracking without a logged-in Supabase user.
--    We add anon-accessible policies for kiosk tables.
-- ============================================

-- Allow anon access to students table for kiosk lookup
-- (In production, this should be replaced with an Edge Function)
CREATE POLICY "Kiosk can lookup students by ID"
  ON students FOR SELECT
  USING (true);
  -- NOTE: This is intentionally permissive for the demo.
  -- In production, use a secure Edge Function instead.

-- Allow anon read/write to daily_behavior_tracking for kiosk
CREATE POLICY "Kiosk can manage behavior tracking"
  ON daily_behavior_tracking FOR ALL
  USING (true);
  -- NOTE: Same as above — demo only. Lock down in production.

-- ============================================
-- 10. Update the updated_at trigger for renamed tables
-- ============================================
-- The trigger on student_interventions references the original column names
-- No change needed — triggers work on the table, not column names

-- ============================================
-- 11. Transition plans - update FK constraint for renamed column
-- ============================================
-- The transition_plan_reviews FK was on transition_plan_id, now plan_id
-- Drop old FK and recreate
DO $$
BEGIN
  -- Check if the old constraint exists before dropping
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transition_plan_reviews_transition_plan_id_fkey'
  ) THEN
    ALTER TABLE transition_plan_reviews
      DROP CONSTRAINT transition_plan_reviews_transition_plan_id_fkey;
  END IF;
END $$;

ALTER TABLE transition_plan_reviews ADD CONSTRAINT fk_tpr_plan
  FOREIGN KEY (plan_id) REFERENCES transition_plans(id);

-- Rename reviewer_id FK too
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transition_plan_reviews_reviewed_by_fkey'
  ) THEN
    ALTER TABLE transition_plan_reviews
      DROP CONSTRAINT transition_plan_reviews_reviewed_by_fkey;
  END IF;
END $$;

ALTER TABLE transition_plan_reviews ADD CONSTRAINT fk_tpr_reviewer
  FOREIGN KEY (reviewer_id) REFERENCES profiles(id);

-- ============================================
-- Done! Schema now matches frontend expectations.
-- ============================================
