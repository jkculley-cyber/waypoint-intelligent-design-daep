-- Migration 041: Navigator campus goals for YOY tracking
-- Adds navigator_campus_goals table for per-campus ISS/OSS reduction targets

CREATE TABLE IF NOT EXISTS navigator_campus_goals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id       UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  campus_id         UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  school_year       TEXT NOT NULL,
  iss_baseline      INTEGER NOT NULL DEFAULT 0,
  oss_baseline      INTEGER NOT NULL DEFAULT 0,
  iss_reduction_pct NUMERIC(5,1) NOT NULL DEFAULT 10.0,
  oss_reduction_pct NUMERIC(5,1) NOT NULL DEFAULT 10.0,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campus_id, school_year)
);

ALTER TABLE navigator_campus_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "navigator_campus_goals_district" ON navigator_campus_goals
  FOR ALL USING (district_id = user_district_id() OR is_waypoint_admin());

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_navigator_campus_goals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_navigator_campus_goals_updated_at
  BEFORE UPDATE ON navigator_campus_goals
  FOR EACH ROW EXECUTE FUNCTION update_navigator_campus_goals_updated_at();
