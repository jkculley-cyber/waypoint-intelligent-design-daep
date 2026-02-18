-- Migration 018: Anonymous RLS policies for orientation kiosk
-- Allows unauthenticated (anon) access to view and complete orientations

-- Allow kiosk to view scheduled/pending/completed orientations
CREATE POLICY "Kiosk can view scheduled orientations"
  ON daep_placement_scheduling FOR SELECT TO anon
  USING (orientation_status IN ('scheduled', 'completed', 'pending'));

-- Allow kiosk to mark scheduled orientations as completed
CREATE POLICY "Kiosk can complete orientations"
  ON daep_placement_scheduling FOR UPDATE TO anon
  USING (orientation_status = 'scheduled')
  WITH CHECK (orientation_status IN ('scheduled', 'completed'));
