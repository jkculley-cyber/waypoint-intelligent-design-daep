-- Migration 035: Audit log table
-- Tracks key mutations across incidents, students, and profiles.

CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id  UUID REFERENCES districts(id),
  actor_id     UUID REFERENCES auth.users(id),
  actor_role   TEXT,
  action       TEXT NOT NULL,         -- 'incident_approved', 'student_created', etc.
  entity_type  TEXT NOT NULL,         -- 'incident', 'student', 'profile', etc.
  entity_id    UUID,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for fast district-scoped reads
CREATE INDEX IF NOT EXISTS idx_audit_log_district ON audit_log(district_id, created_at DESC);
-- Index for entity lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- District staff (admin/principal) can read their own district's audit log
CREATE POLICY "district_read" ON audit_log
  FOR SELECT
  USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'principal')
  );

-- Waypoint admin can read all
CREATE POLICY "waypoint_admin_read_all" ON audit_log
  FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin');

-- Only the service role / SECURITY DEFINER functions write audit entries
-- (no direct INSERT policy for regular users — all writes go through the app server)
CREATE POLICY "service_insert" ON audit_log
  FOR INSERT
  WITH CHECK (true);
