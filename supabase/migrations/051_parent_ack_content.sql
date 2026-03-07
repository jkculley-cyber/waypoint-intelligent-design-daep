-- Migration 051: Parent acknowledgement content columns
-- Stores who acknowledged (name as electronic signature) and what they acknowledged
-- (offense name) alongside the timestamp already captured in parent_acknowledged_at.

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS parent_acknowledged_by_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_acknowledged_offense  TEXT;
