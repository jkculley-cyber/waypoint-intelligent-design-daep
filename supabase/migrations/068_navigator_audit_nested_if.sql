-- Migration 068: Fix free-text history capture in fn_navigator_audit_trigger.
--
-- Bug: the function uses `AND TG_TABLE_NAME = '...'` guards around field
-- references like `OLD.description` and `OLD.reason`, but PL/pgSQL does not
-- short-circuit AND inside IF conditions — the field lookup is performed
-- regardless of operand order, raising
--   record "old" has no field "description"
-- whenever the trigger fires on navigator_placements (which has `reason`,
-- not `description`) or navigator_supports / manifestation_determinations
-- (which have neither). UPDATEs were aborting with the audit-trigger raise.
--
-- Fix: nest the IF blocks so the field references are only parsed/evaluated
-- when the outer IF matches the relevant table. PL/pgSQL DOES short-circuit
-- at the statement level (an unreached IF body is never compiled).

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

    -- Free-text history capture — nest the IFs so field references are only
    -- parsed/executed when the relevant table is being mutated.
    IF TG_TABLE_NAME = 'navigator_referrals' THEN
      IF OLD.description IS DISTINCT FROM NEW.description THEN
        NEW.description_history := COALESCE(OLD.description_history, '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
              'description', OLD.description,
              'changed_at',  now(),
              'changed_by',  v_user_id
            ));
      END IF;
    ELSIF TG_TABLE_NAME = 'navigator_placements' THEN
      IF OLD.reason IS DISTINCT FROM NEW.reason THEN
        NEW.reason_history := COALESCE(OLD.reason_history, '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
              'reason',     OLD.reason,
              'changed_at', now(),
              'changed_by', v_user_id
            ));
      END IF;
    END IF;
  END IF;

  -- Sentinel for service-role / cron / system inserts where auth.uid() = NULL.
  -- Will fail audit_log.user_id FK if not pre-seeded; for real-user UI calls,
  -- v_user_id is the genuine auth.uid() and the FK is satisfied.
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO audit_log (
    district_id, user_id, action, entity_type, entity_id, changes
  ) VALUES (
    v_district_id, v_user_id, v_action, TG_TABLE_NAME, v_entity_id, v_changes
  );

  RETURN COALESCE(NEW, OLD);
END $$;
