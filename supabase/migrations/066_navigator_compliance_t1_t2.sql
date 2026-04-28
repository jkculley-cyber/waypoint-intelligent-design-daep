-- Migration 066: Navigator T1+T2 — round-1 adversarial-audit fixes
--
-- T1 — Legal-defensibility blockers (must ship before any district pilot):
--   T1.1 10-day SPED rule enforcement (IDEA 34 CFR §300.530)
--   T1.2 Server-set parent-notice timestamp + method + contact notes (TEC §37.009 + §32.153)
--   T1.3 Audit log on Navigator mutations (OWASP A09; SB 820; FERPA)
--
-- T2 — Procurement-ready (Marsha's table stakes):
--   T2.4 Race/ethnicity CHECK constraint (Title VI Disproportionality Radar)
--   T2.5 Free-text reason/description versioning (spoliation defense)
--
-- Apply via SQL Editor. Each major block is wrapped in DO with EXCEPTION
-- handling so a failure on one section doesn't roll back earlier sections.

-- ============================================================================
-- T2.4 — students.race_ethnicity CHECK constraint
-- ============================================================================
-- Column already exists (1_initial_schema.sql:73 — TEXT, no constraint).
-- Add canonical-categories CHECK as NOT VALID so existing rows are grandfathered.
DO $$
BEGIN
  ALTER TABLE students DROP CONSTRAINT IF EXISTS students_race_ethnicity_check;
  ALTER TABLE students ADD CONSTRAINT students_race_ethnicity_check CHECK (
    race_ethnicity IS NULL OR race_ethnicity IN (
      'asian',
      'black',
      'hispanic',
      'native_am',
      'pacific_islander',
      'white',
      'two_or_more',
      'not_specified'
    )
  ) NOT VALID;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'race_ethnicity CHECK skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- T1.1 — Manifestation Determination + 10-day SPED rule
-- ============================================================================

CREATE TABLE IF NOT EXISTS manifestation_determinations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id           UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  campus_id             UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meeting_date          DATE NOT NULL,
  attendees             TEXT,
  behavior_description  TEXT NOT NULL,
  is_manifestation      BOOLEAN NOT NULL,
  decision_rationale    TEXT NOT NULL,
  iep_modified          BOOLEAN NOT NULL DEFAULT false,
  fba_required          BOOLEAN NOT NULL DEFAULT false,
  bip_required          BOOLEAN NOT NULL DEFAULT false,
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE manifestation_determinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "district_isolation_mdr" ON manifestation_determinations;
CREATE POLICY "district_isolation_mdr" ON manifestation_determinations
  FOR ALL
  USING (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_mdr_student ON manifestation_determinations(student_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_mdr_district ON manifestation_determinations(district_id);

-- FK on placements to MDR (nullable; required only when 10-day threshold crossed)
DO $$
BEGIN
  ALTER TABLE navigator_placements
    ADD COLUMN IF NOT EXISTS manifestation_determination_id UUID
      REFERENCES manifestation_determinations(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'navigator_placements MDR FK skipped: %', SQLERRM;
END $$;

-- School-year start helper (Aug 1 of the relevant academic year)
CREATE OR REPLACE FUNCTION fn_school_year_start(p_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT make_date(
    CASE WHEN extract(month FROM p_date) >= 8
         THEN extract(year FROM p_date)::int
         ELSE extract(year FROM p_date)::int - 1 END,
    8, 1
  );
$$;

-- View: cumulative iss+oss days per student per current school year
CREATE OR REPLACE VIEW navigator_placements_cumulative WITH (security_invoker = on) AS
SELECT
  p.student_id,
  p.district_id,
  s.is_sped,
  s.is_504,
  s.first_name,
  s.last_name,
  fn_school_year_start(CURRENT_DATE) AS school_year_start,
  COALESCE(SUM(p.days), 0)::int AS cumulative_days,
  COUNT(*)::int AS placement_count,
  GREATEST(0, 10 - COALESCE(SUM(p.days), 0))::int AS days_until_mdr_threshold
FROM navigator_placements p
JOIN students s ON s.id = p.student_id
WHERE p.placement_type IN ('iss','oss')
  AND p.start_date >= fn_school_year_start(CURRENT_DATE)
GROUP BY p.student_id, p.district_id, s.is_sped, s.is_504, s.first_name, s.last_name;

GRANT SELECT ON navigator_placements_cumulative TO authenticated;

-- Trigger: block placement insert/update that would cross 10 cumulative SPED days
-- without a linked MDR record. IDEA 34 CFR §300.530(d).
CREATE OR REPLACE FUNCTION fn_navigator_check_sped_10day()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_sped BOOLEAN;
  v_cumulative INT;
  v_sy_start DATE;
  v_new_days INT;
BEGIN
  IF NEW.placement_type NOT IN ('iss','oss') THEN
    RETURN NEW;
  END IF;

  SELECT is_sped INTO v_is_sped FROM students WHERE id = NEW.student_id;
  IF NOT COALESCE(v_is_sped, false) THEN
    RETURN NEW;
  END IF;

  v_sy_start := fn_school_year_start(NEW.start_date);
  v_new_days := COALESCE(NEW.days, 0);

  -- Sum existing SY placements EXCLUDING this row (so updates work)
  SELECT COALESCE(SUM(days), 0) INTO v_cumulative
  FROM navigator_placements
  WHERE student_id = NEW.student_id
    AND placement_type IN ('iss','oss')
    AND start_date >= v_sy_start
    AND id IS DISTINCT FROM NEW.id;

  IF (v_cumulative + v_new_days) > 10
     AND NEW.manifestation_determination_id IS NULL THEN
    RAISE EXCEPTION
      'IDEA 34 CFR §300.530: SPED student would exceed 10 cumulative removal days this school year (% existing + % new = %). Manifestation Determination Review required before this placement. Link manifestation_determinations.id on this row to proceed.',
      v_cumulative, v_new_days, v_cumulative + v_new_days
      USING ERRCODE = 'P0001',
            HINT = 'Convene MDR via the Navigator placement form, then retry.';
  END IF;

  RETURN NEW;
END $$;

-- Trigger names use numeric prefixes so BEFORE-trigger firing order is:
--   1_parent_notice → 2_sped_10day → 9_audit (audit captures final NEW)
DROP TRIGGER IF EXISTS trg_navigator_sped_10day ON navigator_placements;
DROP TRIGGER IF EXISTS trg_2_placements_sped_10day ON navigator_placements;
CREATE TRIGGER trg_2_placements_sped_10day
  BEFORE INSERT OR UPDATE OF days, placement_type, manifestation_determination_id
  ON navigator_placements
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_check_sped_10day();

-- ============================================================================
-- T1.2 — Parent-notice: server-set timestamp + method + notes
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE navigator_placements
    ADD COLUMN IF NOT EXISTS parent_notified_method TEXT,
    ADD COLUMN IF NOT EXISTS parent_contact_notes TEXT;

  -- Drop+recreate the CHECK so re-running this migration is safe
  ALTER TABLE navigator_placements
    DROP CONSTRAINT IF EXISTS navigator_placements_notified_method_check;
  ALTER TABLE navigator_placements
    ADD CONSTRAINT navigator_placements_notified_method_check CHECK (
      parent_notified_method IS NULL OR parent_notified_method IN (
        'phone_call','voicemail','email','certified_letter',
        'in_person','text_message','other'
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'parent_notified_method columns skipped: %', SQLERRM;
END $$;

-- Trigger: server controls parent_notified_at; require method when notified=true.
CREATE OR REPLACE FUNCTION fn_navigator_parent_notice_set()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_notified IS TRUE THEN
      NEW.parent_notified_at := now();
      IF NEW.parent_notified_method IS NULL OR length(trim(NEW.parent_notified_method)) = 0 THEN
        RAISE EXCEPTION
          'parent_notified_method is required when parent_notified=true (TEC §37.009 same-day notice). Choose phone_call, voicemail, email, certified_letter, in_person, text_message, or other.'
          USING ERRCODE = 'P0001';
      END IF;
    ELSE
      NEW.parent_notified_at := NULL;
      NEW.parent_notified_method := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.parent_notified IS DISTINCT FROM NEW.parent_notified THEN
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
      -- Preserve server-set timestamp; ignore any client attempt to change it
      NEW.parent_notified_at := OLD.parent_notified_at;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_navigator_placements_parent_notice ON navigator_placements;
DROP TRIGGER IF EXISTS trg_1_placements_parent_notice ON navigator_placements;
CREATE TRIGGER trg_1_placements_parent_notice
  BEFORE INSERT OR UPDATE ON navigator_placements
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_parent_notice_set();

-- ============================================================================
-- T2.5 — Free-text reason/description versioning
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE navigator_placements
    ADD COLUMN IF NOT EXISTS reason_history JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE navigator_referrals
    ADD COLUMN IF NOT EXISTS description_history JSONB NOT NULL DEFAULT '[]'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'history columns skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- T1.3 — Audit log on Navigator mutations (with free-text history capture)
-- ============================================================================
-- BEFORE trigger so we can mutate NEW (append history) AND we can write the
-- audit row in the same statement. Failure to write audit aborts the operation.

CREATE OR REPLACE FUNCTION fn_navigator_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_values   JSONB;
  v_new_values   JSONB;
  v_user_id      UUID;
  v_actor_role   TEXT;
  v_district_id  UUID;
  v_entity_id    UUID;
  v_action       TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_actor_role FROM profiles WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_old_values  := to_jsonb(OLD);
    v_district_id := OLD.district_id;
    v_entity_id   := OLD.id;
    v_action      := TG_TABLE_NAME || '_deleted';
  ELSIF TG_OP = 'INSERT' THEN
    v_new_values  := to_jsonb(NEW);
    v_district_id := NEW.district_id;
    v_entity_id   := NEW.id;
    v_action      := TG_TABLE_NAME || '_created';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values  := to_jsonb(OLD);
    v_new_values  := to_jsonb(NEW);
    v_district_id := NEW.district_id;
    v_entity_id   := NEW.id;
    v_action      := TG_TABLE_NAME || '_updated';

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

  -- Audit insertion is REQUIRED. Fail the whole transaction if it fails.
  -- (No exception handler — propagates to caller.)
  INSERT INTO audit_log (
    district_id, actor_id, actor_role,
    action, entity_type, entity_id,
    old_values, new_values
  ) VALUES (
    v_district_id, v_user_id, v_actor_role,
    v_action, TG_TABLE_NAME, v_entity_id,
    v_old_values, v_new_values
  );

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_navigator_referrals_audit ON navigator_referrals;
DROP TRIGGER IF EXISTS trg_9_referrals_audit ON navigator_referrals;
CREATE TRIGGER trg_9_referrals_audit
  BEFORE INSERT OR UPDATE OR DELETE ON navigator_referrals
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_audit_trigger();

DROP TRIGGER IF EXISTS trg_navigator_placements_audit ON navigator_placements;
DROP TRIGGER IF EXISTS trg_9_placements_audit ON navigator_placements;
CREATE TRIGGER trg_9_placements_audit
  BEFORE INSERT OR UPDATE OR DELETE ON navigator_placements
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_audit_trigger();

DROP TRIGGER IF EXISTS trg_navigator_supports_audit ON navigator_supports;
DROP TRIGGER IF EXISTS trg_9_supports_audit ON navigator_supports;
CREATE TRIGGER trg_9_supports_audit
  BEFORE INSERT OR UPDATE OR DELETE ON navigator_supports
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_audit_trigger();

DROP TRIGGER IF EXISTS trg_manifestation_determinations_audit ON manifestation_determinations;
DROP TRIGGER IF EXISTS trg_9_mdr_audit ON manifestation_determinations;
CREATE TRIGGER trg_9_mdr_audit
  BEFORE INSERT OR UPDATE OR DELETE ON manifestation_determinations
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_audit_trigger();
