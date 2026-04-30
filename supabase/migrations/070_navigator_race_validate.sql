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

-- Pre-step: reconcile column drift from migration 006.
-- Migration 006 renamed students.race_ethnicity → students.race, but every
-- subsequent migration (066+) and all application code (useNavigator.js,
-- seed scripts) reference race_ethnicity. The result: production has `race`,
-- the app reads `race_ethnicity`, PostgREST returns column-missing errors
-- that the hook silently swallows via `|| 'not_specified'` fallback. Every
-- student has been bucketed as not_specified in the Disproportionality
-- Radar since the feature shipped. This block restores alignment.
DO $$
DECLARE
  v_has_race BOOLEAN;
  v_has_race_ethnicity BOOLEAN;
BEGIN
  v_has_race := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND column_name='race'
  );
  v_has_race_ethnicity := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='students' AND column_name='race_ethnicity'
  );

  IF v_has_race AND NOT v_has_race_ethnicity THEN
    ALTER TABLE students RENAME COLUMN race TO race_ethnicity;
    RAISE NOTICE 'Renamed students.race → students.race_ethnicity (reversed migration 006 to match app code)';
  ELSIF NOT v_has_race AND NOT v_has_race_ethnicity THEN
    ALTER TABLE students ADD COLUMN race_ethnicity TEXT;
    RAISE NOTICE 'Added students.race_ethnicity column (was missing on both names)';
  ELSIF v_has_race AND v_has_race_ethnicity THEN
    -- Both exist — coalesce data into race_ethnicity, then drop race.
    UPDATE students SET race_ethnicity = race WHERE race_ethnicity IS NULL AND race IS NOT NULL;
    ALTER TABLE students DROP COLUMN race;
    RAISE NOTICE 'Both race + race_ethnicity columns existed; coalesced into race_ethnicity, dropped race';
  ELSE
    RAISE NOTICE 'students.race_ethnicity already canonical — no rename needed';
  END IF;
END $$;

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

-- Normalize legacy / variant race values into the canonical 8-value set.
-- Production data may include PEIMS codes ('H', 'B'), full natural-language
-- forms ('Hispanic/Latino', 'African American'), title-cased forms, or
-- legacy free-text. Any value not matched after normalization falls to
-- 'not_specified' so the VALIDATE step downstream succeeds.
DO $$
DECLARE
  v_normalized INT;
  v_coerced INT;
BEGIN
  UPDATE students SET race_ethnicity = CASE
    WHEN race_ethnicity IN (
      'american_indian', 'asian', 'black', 'hispanic',
      'pacific_islander', 'white', 'two_or_more', 'not_specified'
    ) THEN race_ethnicity
    -- PEIMS single-letter codes
    WHEN UPPER(race_ethnicity) = 'H' THEN 'hispanic'
    WHEN UPPER(race_ethnicity) = 'B' THEN 'black'
    WHEN UPPER(race_ethnicity) = 'W' THEN 'white'
    WHEN UPPER(race_ethnicity) = 'A' THEN 'asian'
    WHEN UPPER(race_ethnicity) = 'I' THEN 'american_indian'
    WHEN UPPER(race_ethnicity) = 'P' THEN 'pacific_islander'
    WHEN UPPER(race_ethnicity) = 'M' THEN 'two_or_more'
    -- PEIMS numeric codes (per TEA Data Standards)
    WHEN race_ethnicity = '1' THEN 'american_indian'
    WHEN race_ethnicity = '2' THEN 'asian'
    WHEN race_ethnicity = '3' THEN 'black'
    WHEN race_ethnicity = '4' THEN 'pacific_islander'
    WHEN race_ethnicity = '5' THEN 'white'
    -- Natural-language variants — case-insensitive substring matches
    WHEN LOWER(race_ethnicity) LIKE '%hispanic%' OR LOWER(race_ethnicity) LIKE '%latino%' OR LOWER(race_ethnicity) LIKE '%latina%' OR LOWER(race_ethnicity) LIKE '%latinx%' THEN 'hispanic'
    WHEN LOWER(race_ethnicity) LIKE '%black%' OR LOWER(race_ethnicity) LIKE '%african%' THEN 'black'
    WHEN LOWER(race_ethnicity) LIKE '%white%' OR LOWER(race_ethnicity) LIKE '%caucasian%' OR LOWER(race_ethnicity) LIKE '%anglo%' THEN 'white'
    WHEN LOWER(race_ethnicity) LIKE '%asian%' THEN 'asian'
    WHEN LOWER(race_ethnicity) LIKE '%american indian%' OR LOWER(race_ethnicity) LIKE '%native american%' OR LOWER(race_ethnicity) LIKE '%alaska native%' OR LOWER(race_ethnicity) LIKE '%amerind%' THEN 'american_indian'
    WHEN LOWER(race_ethnicity) LIKE '%pacific islander%' OR LOWER(race_ethnicity) LIKE '%hawaiian%' OR LOWER(race_ethnicity) LIKE '%native hawaii%' THEN 'pacific_islander'
    WHEN LOWER(race_ethnicity) LIKE '%two%' OR LOWER(race_ethnicity) LIKE '%multi%' OR LOWER(race_ethnicity) LIKE '%mixed%' OR LOWER(race_ethnicity) LIKE '%more than one%' THEN 'two_or_more'
    WHEN LOWER(race_ethnicity) LIKE '%decline%' OR LOWER(race_ethnicity) LIKE '%not specified%' OR LOWER(race_ethnicity) LIKE '%unknown%' OR LOWER(race_ethnicity) LIKE '%n/a%' OR LOWER(TRIM(race_ethnicity)) = '' THEN 'not_specified'
    ELSE 'COERCE_TO_NOT_SPECIFIED'  -- two-step so we can count coerced separately
  END
  WHERE race_ethnicity IS NOT NULL
    AND race_ethnicity NOT IN (
      'american_indian', 'asian', 'black', 'hispanic',
      'pacific_islander', 'white', 'two_or_more', 'not_specified'
    );

  GET DIAGNOSTICS v_normalized = ROW_COUNT;

  -- Anything still in the unmappable bucket → 'not_specified'.
  -- Logged separately so a follow-up audit can investigate what the
  -- original values were (peek at audit_log if any UPDATE triggers
  -- captured the prior values).
  UPDATE students
  SET race_ethnicity = 'not_specified'
  WHERE race_ethnicity = 'COERCE_TO_NOT_SPECIFIED';

  GET DIAGNOSTICS v_coerced = ROW_COUNT;

  RAISE NOTICE 'race_ethnicity normalize: % rows mapped to canonical, % rows coerced to not_specified (unmappable values).', v_normalized - v_coerced, v_coerced;
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
