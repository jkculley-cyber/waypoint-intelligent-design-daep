-- Migration 050: Navigator Intelligence — skill gap field + disproportionality helpers
-- Apply via Supabase SQL Editor: https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new

-- Add skill_gap to navigator_referrals
ALTER TABLE navigator_referrals
  ADD COLUMN IF NOT EXISTS skill_gap TEXT
    CHECK (skill_gap IN (
      'emotional_regulation',
      'executive_functioning',
      'peer_conflict_resolution',
      'academic_frustration_tolerance',
      'impulse_control',
      'adult_communication'
    )),
  ADD COLUMN IF NOT EXISTS skill_gap_notes TEXT;

-- Add outcome_notes to navigator_supports for effectiveness tracking
ALTER TABLE navigator_supports
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
  ADD COLUMN IF NOT EXISTS incidents_before INT,
  ADD COLUMN IF NOT EXISTS incidents_after INT;
