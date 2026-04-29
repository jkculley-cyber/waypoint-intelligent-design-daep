-- 069_navigator_parent_notice_strict.sql
--
-- Round-2 audit, Marsha A: silent-overwrite of client-set parent_notified_at
-- creates a misleading paper trail. A developer testing or an API caller passing
-- a value sees their value disappear without any signal. Worse, an integration
-- script could send the wrong field once, never realize it, and assume the
-- system is recording its provided timestamps.
--
-- This migration upgrades fn_navigator_parent_notice_set() so it RAISES instead
-- of silently overwriting when a client tries to set parent_notified_at on
-- INSERT, or change it on UPDATE without toggling parent_notified itself. The
-- server is still the only authority on the timestamp; the difference is the
-- caller learns about it loudly.
--
-- Companion smoke-test update lives in scripts/smoke-test-066.mjs (test 3
-- flipped to expect P0001 instead of silent drift-correction).

CREATE OR REPLACE FUNCTION fn_navigator_parent_notice_set()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_notified IS TRUE THEN
      -- Reject any client-supplied timestamp; server is the sole authority.
      IF NEW.parent_notified_at IS NOT NULL THEN
        RAISE EXCEPTION
          'parent_notified_at is server-controlled. Do not pass a value on INSERT — the server records the actual notification time. (Provided: %)', NEW.parent_notified_at
          USING ERRCODE = 'P0001';
      END IF;
      NEW.parent_notified_at := now();
      IF NEW.parent_notified_method IS NULL OR length(trim(NEW.parent_notified_method)) = 0 THEN
        RAISE EXCEPTION
          'parent_notified_method is required when parent_notified=true (TEC §37.009 same-day notice). Choose phone_call, voicemail, email, certified_letter, in_person, text_message, or other.'
          USING ERRCODE = 'P0001';
      END IF;
    ELSE
      -- parent_notified=false on INSERT: timestamp + method must be null.
      IF NEW.parent_notified_at IS NOT NULL THEN
        RAISE EXCEPTION
          'parent_notified_at must be null when parent_notified=false.'
          USING ERRCODE = 'P0001';
      END IF;
      NEW.parent_notified_method := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.parent_notified IS DISTINCT FROM NEW.parent_notified THEN
      -- Toggle: re-stamp on the parent_notified=true side.
      IF NEW.parent_notified IS TRUE THEN
        NEW.parent_notified_at := now();
        IF NEW.parent_notified_method IS NULL OR length(trim(NEW.parent_notified_method)) = 0 THEN
          RAISE EXCEPTION
            'parent_notified_method is required when parent_notified=true (TEC §37.009 same-day notice).'
            USING ERRCODE = 'P0001';
        END IF;
      ELSE
        NEW.parent_notified_at := NULL;
        NEW.parent_notified_method := NULL;
      END IF;
    ELSE
      -- parent_notified flag unchanged: reject any attempt to alter the timestamp.
      IF NEW.parent_notified_at IS DISTINCT FROM OLD.parent_notified_at THEN
        RAISE EXCEPTION
          'parent_notified_at is server-controlled. To re-record notification time, toggle parent_notified=false then back to true in separate UPDATEs. (Was: %, attempted: %)', OLD.parent_notified_at, NEW.parent_notified_at
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

-- Trigger binding unchanged from migration 066 (trg_1_ name preserves fire order).
