-- Migration 021: Add orientation_form_data JSONB column to daep_placement_scheduling
-- Stores student reflection and behavior plan completed during DAEP orientation

ALTER TABLE daep_placement_scheduling
  ADD COLUMN IF NOT EXISTS orientation_form_data JSONB;

-- Form data shape:
-- {
--   "reflection": "Student's written reflection...",
--   "behavior_plan": [
--     { "behavior": "...", "supports": "...", "interventions": "..." },
--     { "behavior": "...", "supports": "...", "interventions": "..." },
--     { "behavior": "...", "supports": "...", "interventions": "..." }
--   ],
--   "completed_at": "2026-02-17"
-- }
