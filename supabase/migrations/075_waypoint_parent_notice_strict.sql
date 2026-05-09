-- Migration 075: Waypoint parent-notice trigger + method enum (T1-3)
--
-- CC22 R1 finding F5 — convergent 2-of-4 voices (Reyes ELEVATED + Patricia
-- THEATER): compliance_checklists.parent_notified is a TIMESTAMPTZ that's
-- client-set; parent_notification_method is free-text with no enum. In a
-- §37.009 same-day-notice challenge, the district has only the staff member's
-- testimony — no server-controlled record of when the call was made or how.
--
-- This migration:
--   1. Adds CHECK constraint on parent_notification_method (7-value enum).
--   2. Installs BEFORE INSERT/UPDATE trigger that makes parent_notified
--      server-controlled. Client can never set the timestamp; setting
--      parent_notification_method (the enum) records the notification AS-OF
--      the server's now(). Clearing the method clears both fields.
--
-- Mirrors Navigator migrations 066 + 069, adapted for Waypoint's schema where
-- parent_notified IS the timestamp (vs. Navigator's separate boolean +
-- parent_notified_at columns). Per migration 069's strict rule: never
-- silent-overwrite — RAISE so callers learn loudly.

-- ============================================================================
-- 1. Method enum CHECK
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE compliance_checklists
    DROP CONSTRAINT IF EXISTS compliance_checklists_parent_notification_method_check;
  ALTER TABLE compliance_checklists
    ADD CONSTRAINT compliance_checklists_parent_notification_method_check CHECK (
      parent_notification_method IS NULL OR parent_notification_method IN (
        'phone_call','voicemail','email','certified_letter',
        'in_person','text_message','other'
      )
    ) NOT VALID;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'parent_notification_method CHECK skipped: %', SQLERRM;
END $$;

-- Best-effort VALIDATE; legitimate existing free-text values that don't fit
-- the enum stay grandfathered (the seed harness may pre-date the enum).
DO $$
BEGIN
  ALTER TABLE compliance_checklists
    VALIDATE CONSTRAINT compliance_checklists_parent_notification_method_check;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'parent_notification_method VALIDATE skipped — review with: SELECT id, parent_notification_method FROM compliance_checklists WHERE parent_notification_method NOT IN (''phone_call'',''voicemail'',''email'',''certified_letter'',''in_person'',''text_message'',''other'');';
END $$;

-- ============================================================================
-- 2. Server-controlled parent_notified trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_waypoint_compliance_parent_notice_set()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_notification_method IS NULL OR length(trim(NEW.parent_notification_method)) = 0 THEN
      -- No method set: client must not have pre-set parent_notified.
      IF NEW.parent_notified IS NOT NULL THEN
        RAISE EXCEPTION
          'parent_notification_method is required when parent_notified is set. (TEC §37.009 same-day notice records the method of contact.)'
          USING ERRCODE = 'P0001',
                HINT = 'Set parent_notification_method to phone_call, voicemail, email, certified_letter, in_person, text_message, or other.';
      END IF;
      NEW.parent_notification_method := NULL;
    ELSE
      -- Method set: server controls the timestamp. Reject client-supplied value.
      IF NEW.parent_notified IS NOT NULL THEN
        RAISE EXCEPTION
          'compliance_checklists.parent_notified is server-controlled. Do not pass a timestamp on INSERT — the server records the actual notification time when parent_notification_method is set. (Provided: %)', NEW.parent_notified
          USING ERRCODE = 'P0001';
      END IF;
      NEW.parent_notified := now();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Method is the source of truth for whether parent was notified.
    IF OLD.parent_notification_method IS DISTINCT FROM NEW.parent_notification_method THEN
      IF NEW.parent_notification_method IS NULL OR length(trim(NEW.parent_notification_method)) = 0 THEN
        -- Method cleared → clear timestamp to match.
        NEW.parent_notified := NULL;
        NEW.parent_notification_method := NULL;
      ELSE
        -- Method set/changed → server stamps the new notification time.
        NEW.parent_notified := now();
      END IF;
    ELSE
      -- Method unchanged: client must not alter the timestamp.
      IF NEW.parent_notified IS DISTINCT FROM OLD.parent_notified THEN
        RAISE EXCEPTION
          'compliance_checklists.parent_notified is server-controlled. To re-record notification time, change parent_notification_method (set to NULL then back to a value). (Was: %, attempted: %)',
          OLD.parent_notified, NEW.parent_notified
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

-- '1_' prefix fires before sped-10day ('2_') and audit ('9_').
DROP TRIGGER IF EXISTS trg_1_compliance_checklists_parent_notice ON compliance_checklists;
CREATE TRIGGER trg_1_compliance_checklists_parent_notice
  BEFORE INSERT OR UPDATE ON compliance_checklists
  FOR EACH ROW EXECUTE FUNCTION fn_waypoint_compliance_parent_notice_set();
