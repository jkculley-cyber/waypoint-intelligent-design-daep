-- Migration 067: Fix Navigator audit trigger to match the production audit_log schema.
--
-- The audit_log table on production was created with columns
-- `user_id` (NOT NULL), `changes` (JSONB), `ip_address`, `user_agent` —
-- not the `actor_id` / `actor_role` / `old_values` / `new_values` shape that
-- migration 035 (in source) declares. Migration 066's trigger wrote to the
-- 035 columns and was rejected on insert, which (per the new fail-loud audit
-- design) blocked every Navigator mutation.
--
-- Fix: rewrite fn_navigator_audit_trigger to use the production column shape.
-- The free-text history capture (NEW.reason_history / NEW.description_history)
-- is unchanged and still works.

CREATE OR REPLACE FUNCTION fn_navigator_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id      UUID;
  v_district_id  UUID;
  v_entity_id    UUID;
  v_action       TEXT;
  v_changes      JSONB;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_district_id := OLD.district_id;
    v_entity_id   := OLD.id;
    v_action      := TG_TABLE_NAME || '_deleted';
    v_changes     := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_district_id := NEW.district_id;
    v_entity_id   := NEW.id;
    v_action      := TG_TABLE_NAME || '_created';
    v_changes     := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_district_id := NEW.district_id;
    v_entity_id   := NEW.id;
    v_action      := TG_TABLE_NAME || '_updated';
    v_changes     := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));

    -- Append old free-text values to *_history when they actually changed
    IF TG_TABLE_NAME = 'navigator_referrals'
       AND OLD.description IS DISTINCT FROM NEW.description THEN
      NEW.description_history := COALESCE(OLD.description_history, '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
            'description', OLD.description,
            'changed_at',  now(),
            'changed_by',  v_user_id
          ));
    END IF;
    IF TG_TABLE_NAME = 'navigator_placements'
       AND OLD.reason IS DISTINCT FROM NEW.reason THEN
      NEW.reason_history := COALESCE(OLD.reason_history, '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
            'reason',     OLD.reason,
            'changed_at', now(),
            'changed_by', v_user_id
          ));
    END IF;
  END IF;

  -- audit_log on production has user_id NOT NULL. Service-role calls from
  -- background jobs / cron pass auth.uid() = NULL — fall back to a sentinel
  -- "system" UUID so the NOT NULL constraint isn't violated.
  -- The sentinel '00000000-0000-0000-0000-000000000000' is reserved for
  -- automated/system actions; UI mutations always carry a real auth.uid().
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Audit insertion is REQUIRED. Failure aborts the transaction (Chen #1).
  INSERT INTO audit_log (
    district_id, user_id, action, entity_type, entity_id, changes
  ) VALUES (
    v_district_id, v_user_id, v_action, TG_TABLE_NAME, v_entity_id, v_changes
  );

  RETURN COALESCE(NEW, OLD);
END $$;
