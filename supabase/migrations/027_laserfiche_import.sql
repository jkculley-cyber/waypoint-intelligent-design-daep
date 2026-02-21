-- ============================================
-- Migration 027: Laserfiche Import Support
-- Adds columns to incidents for idempotent
-- daily import from Laserfiche DAEP reports
-- ============================================

-- 1. Laserfiche workflow identifier (deduplication key)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS laserfiche_instance_id TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS laserfiche_step TEXT;

-- Unique index so upsert-by-instance-id works reliably
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_laserfiche_instance
  ON incidents(laserfiche_instance_id)
  WHERE laserfiche_instance_id IS NOT NULL;

-- 2. Make date_of_birth nullable — Laserfiche reports don't include it
--    and districts may import students from Laserfiche before SIS sync
ALTER TABLE students ALTER COLUMN date_of_birth DROP NOT NULL;
