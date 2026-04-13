-- Navigator Student Monitors — per-student configurable alerts (dashboard only)
-- AP/counselor opts in to monitor specific students with specific alert types

CREATE TABLE IF NOT EXISTS navigator_student_monitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id   UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  campus_id     UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  monitor_type  TEXT NOT NULL CHECK (monitor_type IN (
    'new_referral',      -- alert when student gets any new referral
    'review_due',        -- alert on a specific date (contract/agreement review)
    'support_ending',    -- alert when a support end_date is approaching
    'reentry_check',     -- alert X days after placement ends
    'weekly_check',      -- recurring weekly reminder
    'custom'             -- custom date-based reminder
  )),
  alert_date    DATE,                    -- when to show the alert (NULL = trigger-based like new_referral)
  notes         TEXT,                    -- what to check / reminder text
  is_active     BOOLEAN DEFAULT true,
  dismissed_at  TIMESTAMPTZ,             -- when the alert was dismissed (still shows in history)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE navigator_student_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_isolation_monitors" ON navigator_student_monitors
  FOR ALL
  USING (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_monitors_district ON navigator_student_monitors(district_id);
CREATE INDEX idx_monitors_student ON navigator_student_monitors(student_id);
CREATE INDEX idx_monitors_active ON navigator_student_monitors(district_id, is_active, alert_date);
