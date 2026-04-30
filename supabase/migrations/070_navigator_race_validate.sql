-- 070_navigator_race_validate.sql
--
-- Round-3 audit, Reyes #2 + Sam C2 (convergent): students with
-- race_ethnicity = NULL silently aggregate into the disproportionality
-- "not_specified" bucket alongside students who explicitly chose / declined.
-- A district with 20% NULL race data effectively hides any disparity in
-- that 20% — and OCR investigators audit that bucket first.
--
-- This migration:
--   1. Backfills any NULL race_ethnicity rows to the explicit 'not_specified'
--      sentinel so the Disproportionality Radar reports a single coherent value.
--   2. Adds NOT NULL constraint so future Laserfiche/CSV imports cannot
--      reintroduce a silent gap.
--   3. Counts and logs the backfill volume so a follow-up audit can
--      cross-reference how many students moved from NULL → 'not_specified'
--      (the count itself is meaningful — it answers "how much of our 'not
--      specified' bucket was data-quality vs intentional").
--
-- Notes:
--   - The CHECK constraint from migration 066 already lists 'not_specified'
--     as a valid value, so the backfill data fits the existing constraint.
--   - We do NOT introduce a separate 'data_missing' sentinel here. The
--     simpler "not_specified ratio > 10% of enrollment" UI banner on the
--     Disproportionality page surfaces the data-quality concern without
--     forking the schema.

DO $$
DECLARE
  v_backfilled INT;
BEGIN
  UPDATE students
  SET race_ethnicity = 'not_specified'
  WHERE race_ethnicity IS NULL;

  GET DIAGNOSTICS v_backfilled = ROW_COUNT;
  RAISE NOTICE 'race_ethnicity backfill: % rows moved from NULL to ''not_specified''.', v_backfilled;
END $$;

-- Drop the existing CHECK + re-add it WITHOUT the "IS NULL" allowance,
-- then promote the column to NOT NULL.
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_race_ethnicity_check;

ALTER TABLE students ADD CONSTRAINT students_race_ethnicity_check CHECK (
  race_ethnicity IN (
    'american_indian',
    'asian',
    'black',
    'hispanic',
    'pacific_islander',
    'white',
    'two_or_more',
    'not_specified'
  )
) NOT VALID;

ALTER TABLE students VALIDATE CONSTRAINT students_race_ethnicity_check;

ALTER TABLE students ALTER COLUMN race_ethnicity SET NOT NULL;
ALTER TABLE students ALTER COLUMN race_ethnicity SET DEFAULT 'not_specified';
