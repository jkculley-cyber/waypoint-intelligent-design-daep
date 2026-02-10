-- Migration 011: Add phone bag/locker number to daily behavior tracking
-- Students record their phone storage bag/locker number at kiosk check-in
-- Campus admins can view these at end of day for phone return

ALTER TABLE daily_behavior_tracking
  ADD COLUMN phone_bag_number TEXT;

-- Index for quick lookups by campus + date (admin end-of-day view)
CREATE INDEX idx_dbt_campus_date ON daily_behavior_tracking(campus_id, tracking_date);
