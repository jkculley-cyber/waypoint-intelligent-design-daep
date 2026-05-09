-- Migration 073: Waypoint audit-log triggers + free-text history columns (T1-2)
--
-- Round-1 adversarial-audit (CC22) finding F3, convergent 3-of-4 voices:
-- audit_log silently swallowing Waypoint mutations. Migration 067 fixed this
-- on the Navigator side by adding fail-loud DB-level triggers; the Waypoint
-- side never received the equivalent. Field-level edits to incidents.description,
-- incidents.notes, compliance_checklists.placement_justification produce no
-- audit_log row + no edit history.
--
-- This migration installs:
--   1. JSONB *_history columns on the audited tables (DEFAULT '[]'::jsonb)
--   2. fn_waypoint_audit_trigger using the production audit_log shape:
--      { district_id, user_id (NOT NULL FK→auth.users), action, entity_type,
--        entity_id (NOT NULL), changes JSONB, created_at }
--   3. BEFORE INSERT/UPDATE/DELETE triggers on incidents,
--      compliance_checklists, transition_plans, transition_plan_reviews
--
-- PL/pgSQL rules applied (per migrations 067/068 lessons):
--   - Field references inside IF must be guarded by an outer table-name IF
--     (AND-conditions don't short-circuit at expression level inside IF).
--   - Sentinel UUID fallback for service-role / cron writes when auth.uid() IS NULL.
--     Per migration 071, the sentinel is seeded as a real auth.users row.

-- ============================================================================
-- 1. JSONB history columns (must exist before the trigger references them)
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS description_history JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS notes_history       JSONB NOT NULL DEFAULT '[]'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'incidents history columns skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE compliance_checklists
    ADD COLUMN IF NOT EXISTS placement_justification_history JSONB NOT NULL DEFAULT '[]'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'compliance_checklists history column skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. Shared audit trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_waypoint_audit_trigger()
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

    -- Free-text history capture — nested IFs per migration 068 rule.
    IF TG_TABLE_NAME = 'incidents' THEN
      IF OLD.description IS DISTINCT FROM NEW.description THEN
        NEW.description_history := COALESCE(OLD.description_history, '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
              'description', OLD.description,
              'changed_at',  now(),
              'changed_by',  v_user_id
            ));
      END IF;
      IF OLD.notes IS DISTINCT FROM NEW.notes THEN
        NEW.notes_history := COALESCE(OLD.notes_history, '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
              'notes',      OLD.notes,
              'changed_at', now(),
              'changed_by', v_user_id
            ));
      END IF;
    ELSIF TG_TABLE_NAME = 'compliance_checklists' THEN
      IF OLD.placement_justification IS DISTINCT FROM NEW.placement_justification THEN
        NEW.placement_justification_history := COALESCE(OLD.placement_justification_history, '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object(
              'placement_justification', OLD.placement_justification,
              'changed_at',              now(),
              'changed_by',              v_user_id
            ));
      END IF;
    END IF;
  END IF;

  -- Sentinel fallback for service-role / cron / batch-import writes.
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Audit insertion is REQUIRED. A failure aborts the originating mutation.
  INSERT INTO audit_log (
    district_id, user_id, action, entity_type, entity_id, changes
  ) VALUES (
    v_district_id, v_user_id, v_action, TG_TABLE_NAME, v_entity_id, v_changes
  );

  RETURN COALESCE(NEW, OLD);
END $$;

-- ============================================================================
-- 3. Bind triggers — '9_' prefix fires AFTER '1_' (parent-notice) and
--    '2_' (sped-10day) BEFORE triggers so audit captures the final NEW.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_9_incidents_audit ON incidents;
CREATE TRIGGER trg_9_incidents_audit
  BEFORE INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION fn_waypoint_audit_trigger();

DROP TRIGGER IF EXISTS trg_9_compliance_checklists_audit ON compliance_checklists;
CREATE TRIGGER trg_9_compliance_checklists_audit
  BEFORE INSERT OR UPDATE OR DELETE ON compliance_checklists
  FOR EACH ROW EXECUTE FUNCTION fn_waypoint_audit_trigger();

-- transition_plans / transition_plan_reviews — bind only if tables exist.
-- These were added in later migrations (006+), but we're defensive against
-- environments that may have skipped one of them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'transition_plans') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_9_transition_plans_audit ON transition_plans';
    EXECUTE 'CREATE TRIGGER trg_9_transition_plans_audit
             BEFORE INSERT OR UPDATE OR DELETE ON transition_plans
             FOR EACH ROW EXECUTE FUNCTION fn_waypoint_audit_trigger()';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'transition_plans audit trigger skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'transition_plan_reviews') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_9_transition_plan_reviews_audit ON transition_plan_reviews';
    EXECUTE 'CREATE TRIGGER trg_9_transition_plan_reviews_audit
             BEFORE INSERT OR UPDATE OR DELETE ON transition_plan_reviews
             FOR EACH ROW EXECUTE FUNCTION fn_waypoint_audit_trigger()';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'transition_plan_reviews audit trigger skipped: %', SQLERRM;
END $$;
