-- Migration 059: DAEP campus assignment + per-campus seat capacity
-- Adds daep_campus_id to incidents so we know which DAEP campus a student is placed at
-- Capacity stored in campuses.settings.daep_seats (integer) via application code

-- Add daep_campus_id to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS daep_campus_id UUID REFERENCES campuses(id);

CREATE INDEX IF NOT EXISTS idx_incidents_daep_campus ON incidents(daep_campus_id);

COMMENT ON COLUMN incidents.daep_campus_id IS 'Which DAEP campus the student is assigned to. Only set when consequence_type = daep.';
