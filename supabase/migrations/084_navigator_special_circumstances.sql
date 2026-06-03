-- Migration 084: Navigator §300.530(g) special-circumstances basis on placements
-- ---------------------------------------------------------------------------
-- CC30 naysayer-audit N5 follow-up.
--
-- When a manifestation-positive MDR is linked to a placement that crosses the
-- 10 cumulative removal-day threshold, the removal is ONLY lawful under the IDEA
-- 34 CFR §300.530(g) special-circumstances exception (weapons, illegal drugs, or
-- serious bodily injury). This column records which basis the campus is asserting
-- so the justification is queryable and auditable, not buried in free text.
-- NULL = no special-circumstances basis claimed (the normal case).
-- ---------------------------------------------------------------------------

ALTER TABLE navigator_placements
  ADD COLUMN IF NOT EXISTS special_circumstances_basis TEXT;

-- Idempotent CHECK: only the three §300.530(g) bases are valid (or NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'navigator_placements_special_circ_chk'
      AND conrelid = 'navigator_placements'::regclass
  ) THEN
    ALTER TABLE navigator_placements
      ADD CONSTRAINT navigator_placements_special_circ_chk
      CHECK (
        special_circumstances_basis IS NULL
        OR special_circumstances_basis IN ('weapons', 'illegal_drugs', 'serious_bodily_injury')
      );
  END IF;
END $$;

COMMENT ON COLUMN navigator_placements.special_circumstances_basis IS
  'IDEA 34 CFR §300.530(g) basis when a manifestation-positive removal exceeds 10 cumulative days: weapons | illegal_drugs | serious_bodily_injury. NULL otherwise.';

-- ---------------------------------------------------------------------------
-- VERIFICATION (paste into Supabase SQL Editor; this project has no migration
-- tracking table, so confirm the column + constraint are actually live):
--
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'navigator_placements'
--     AND column_name = 'special_circumstances_basis';   -- expect 1 row, text
--
--   SELECT conname FROM pg_constraint
--   WHERE conname = 'navigator_placements_special_circ_chk';  -- expect 1 row
-- ---------------------------------------------------------------------------
