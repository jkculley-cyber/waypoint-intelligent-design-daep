-- Migration 023: Enforce 1x daily check-in at the database level
--
-- Adds a UNIQUE constraint on (student_id, tracking_date) so that no
-- student can have more than one check-in record per day, even if
-- multiple requests arrive simultaneously (race condition protection).
--
-- Orientation kiosk (daep_placement_scheduling) is a completely separate
-- table and flow — it does NOT create daily_behavior_tracking records,
-- so orientation completion never counts toward a DAEP day assignment.

ALTER TABLE daily_behavior_tracking
  ADD CONSTRAINT uq_student_daily_checkin
  UNIQUE (student_id, tracking_date);
