-- Migration 060: ISS Daily Tracking table for Navigator ISS Kiosk
-- Tracks per-student, per-day behavior ratings, work completion, attendance,
-- breaks, and notes during In-School Suspension.

CREATE TABLE IF NOT EXISTS iss_daily_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES campuses(id),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  placement_id UUID REFERENCES navigator_placements(id) ON DELETE SET NULL,
  tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance TEXT DEFAULT 'present' CHECK (attendance IN ('present', 'absent', 'late', 'early_release')),
  period_data JSONB DEFAULT '{}',  -- { "1st": { "behavior": "on_task", "work": "completed" }, ... }
  notes TEXT,
  breaks JSONB DEFAULT '[]',  -- [{ "time": "10:15 AM", "type": "restroom", "returned": true, "returnTime": "10:20 AM" }]
  reflection_complete BOOLEAN DEFAULT FALSE,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, tracking_date)
);

-- RLS
ALTER TABLE iss_daily_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_isolation_iss_tracking" ON iss_daily_tracking
  FOR ALL USING (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()));

-- Index for daily lookups
CREATE INDEX idx_iss_tracking_date ON iss_daily_tracking (tracking_date, district_id);
CREATE INDEX idx_iss_tracking_student ON iss_daily_tracking (student_id, tracking_date);
