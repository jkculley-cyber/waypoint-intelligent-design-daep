-- Migration 042: Add navigator import types to import_history CHECK constraint
-- Apply via Supabase SQL Editor before deploying code

-- First verify the current constraint name
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'import_history' AND constraint_type = 'CHECK';

ALTER TABLE import_history
  DROP CONSTRAINT IF EXISTS import_history_import_type_check;

ALTER TABLE import_history
  ADD CONSTRAINT import_history_import_type_check
  CHECK (import_type IN (
    'campuses','students','profiles','incidents','laserfiche_daep',
    'navigator_referrals','navigator_placements','navigator_supports'
  ));
