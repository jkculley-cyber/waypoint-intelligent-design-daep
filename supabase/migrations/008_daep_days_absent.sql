-- ============================================
-- Migration 008: Add days_absent column to incidents
-- Tracks absences during DAEP placements.
-- days_remaining = daysTotal - daysElapsed (calendar-based)
-- days_absent is an administrative/informational field.
-- ============================================
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS days_absent INTEGER DEFAULT 0;
