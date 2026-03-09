-- Migration 054: Re-entry Intelligence System
-- Return Ready Checklists + Post-Return Check-ins
-- Apply via Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new

-- ── Return Ready Checklist ─────────────────────────────────────────────────
-- One per transition plan. Tracks sign-off from all 4 parties before return.

CREATE TABLE IF NOT EXISTS reentry_checklists (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id                   UUID NOT NULL REFERENCES transition_plans(id) ON DELETE CASCADE,
  district_id               UUID NOT NULL REFERENCES districts(id),

  -- Student sign-off
  student_goals_met         BOOLEAN NOT NULL DEFAULT false,
  student_commitment_signed BOOLEAN NOT NULL DEFAULT false,
  student_completed_at      TIMESTAMPTZ,

  -- Parent sign-off
  parent_plan_acknowledged  BOOLEAN NOT NULL DEFAULT false,
  parent_contact_confirmed  BOOLEAN NOT NULL DEFAULT false,
  parent_completed_at       TIMESTAMPTZ,

  -- Counselor sign-off
  counselor_schedule_set    BOOLEAN NOT NULL DEFAULT false,
  counselor_teachers_briefed BOOLEAN NOT NULL DEFAULT false,
  counselor_completed_at    TIMESTAMPTZ,

  -- Admin sign-off
  admin_schedule_confirmed  BOOLEAN NOT NULL DEFAULT false,
  admin_completed_at        TIMESTAMPTZ,

  -- Return Campus Brief tracking
  brief_sent_at             TIMESTAMPTZ,
  brief_sent_by             UUID REFERENCES profiles(id),
  return_date               DATE,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(plan_id)
);

-- ── Post-Return Check-ins ─────────────────────────────────────────────────
-- Counselor logs touchpoints during the 30 days after a student returns.

CREATE TABLE IF NOT EXISTS reentry_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES transition_plans(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id),
  district_id   UUID NOT NULL REFERENCES districts(id),
  counselor_id  UUID NOT NULL REFERENCES profiles(id),
  checkin_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL CHECK (status IN ('positive', 'neutral', 'concerning')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE reentry_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reentry_checklists_district_select" ON reentry_checklists
  FOR SELECT USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin'
  );

CREATE POLICY "reentry_checklists_district_insert" ON reentry_checklists
  FOR INSERT WITH CHECK (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin'
  );

CREATE POLICY "reentry_checklists_district_update" ON reentry_checklists
  FOR UPDATE USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin'
  );

ALTER TABLE reentry_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reentry_checkins_district_select" ON reentry_checkins
  FOR SELECT USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin'
  );

CREATE POLICY "reentry_checkins_district_insert" ON reentry_checkins
  FOR INSERT WITH CHECK (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin'
  );

-- ── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_reentry_checklists_plan ON reentry_checklists(plan_id);
CREATE INDEX IF NOT EXISTS idx_reentry_checklists_district ON reentry_checklists(district_id);
CREATE INDEX IF NOT EXISTS idx_reentry_checkins_plan ON reentry_checkins(plan_id);
CREATE INDEX IF NOT EXISTS idx_reentry_checkins_student ON reentry_checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_reentry_checkins_district ON reentry_checkins(district_id);
