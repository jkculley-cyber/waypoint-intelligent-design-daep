-- ============================================
-- Database Triggers and Functions
-- ============================================

-- ============================================
-- Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_districts_updated_at BEFORE UPDATE ON districts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campuses_updated_at BEFORE UPDATE ON campuses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_compliance_updated_at BEFORE UPDATE ON compliance_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_student_interventions_updated_at BEFORE UPDATE ON student_interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transition_plans_updated_at BEFORE UPDATE ON transition_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dbt_updated_at BEFORE UPDATE ON daily_behavior_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matrix_updated_at BEFORE UPDATE ON discipline_matrix FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Auto-create profile on user signup
-- NOTE: This trigger is on auth.users which requires
-- elevated permissions. On Supabase Cloud, run this
-- separately via the SQL Editor in the dashboard.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, district_id, email, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'district_id')::UUID,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger must be created via Supabase SQL Editor (superuser)
-- Uncomment and run in the dashboard SQL Editor:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SPED Compliance Checkpoint
-- Auto-detect when SPED/504 student is recommended for DAEP/expulsion
-- ============================================
CREATE OR REPLACE FUNCTION check_sped_compliance()
RETURNS TRIGGER AS $$
DECLARE
  student_record RECORD;
  is_removal_consequence BOOLEAN;
  new_checklist_id UUID;
BEGIN
  -- Only check on relevant consequence types
  is_removal_consequence := NEW.consequence_type IN ('daep', 'expulsion');

  IF NOT is_removal_consequence THEN
    RETURN NEW;
  END IF;

  -- Look up student record
  SELECT * INTO student_record FROM students WHERE id = NEW.student_id;

  -- If student is SPED or 504, require compliance
  IF student_record.is_sped OR student_record.is_504 THEN
    NEW.sped_compliance_required := true;
    NEW.status := 'compliance_hold';
    NEW.compliance_cleared := false;

    -- Create compliance checklist (only on INSERT, not update)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.compliance_checklist_id IS NULL) THEN
      INSERT INTO compliance_checklists (
        district_id, incident_id, student_id, status, placement_blocked
      ) VALUES (
        NEW.district_id, NEW.id, NEW.student_id, 'incomplete', true
      ) RETURNING id INTO new_checklist_id;

      NEW.compliance_checklist_id := new_checklist_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_sped_compliance
  BEFORE INSERT OR UPDATE OF consequence_type ON incidents
  FOR EACH ROW
  WHEN (NEW.consequence_type IN ('daep','expulsion'))
  EXECUTE FUNCTION check_sped_compliance();

-- ============================================
-- Compliance Checklist Completion Check
-- When all required items are completed, unblock placement
-- ============================================
CREATE OR REPLACE FUNCTION check_compliance_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all critical items are completed
  IF NEW.ard_committee_notified IS NOT NULL
    AND NEW.manifestation_determination IS NOT NULL
    AND NEW.manifestation_result IS NOT NULL
    AND NEW.parent_notified IS NOT NULL
    AND NEW.fape_plan_documented IS NOT NULL
  THEN
    -- If manifestation result says it IS a manifestation, keep blocked
    IF NEW.manifestation_result = 'is_manifestation' THEN
      NEW.status := 'completed';
      NEW.placement_blocked := true; -- Cannot place in DAEP if behavior is manifestation
      NEW.completed_at := now();
    ELSE
      -- Not a manifestation - can proceed with placement
      NEW.status := 'completed';
      NEW.placement_blocked := false;
      NEW.completed_at := now();

      -- Update the incident to clear compliance hold
      UPDATE incidents
      SET compliance_cleared = true,
          status = 'approved'
      WHERE id = NEW.incident_id
        AND status = 'compliance_hold';
    END IF;
  ELSIF NEW.ard_committee_notified IS NOT NULL
    OR NEW.manifestation_determination IS NOT NULL
    OR NEW.parent_notified IS NOT NULL
  THEN
    NEW.status := 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_compliance_completion
  BEFORE UPDATE ON compliance_checklists
  FOR EACH ROW
  EXECUTE FUNCTION check_compliance_completion();

-- ============================================
-- Repeat Offender Alert System
-- Auto-generate alerts based on incident patterns
-- ============================================
CREATE OR REPLACE FUNCTION check_repeat_offender()
RETURNS TRIGGER AS $$
DECLARE
  daep_count INTEGER;
  iss_30day_count INTEGER;
  same_offense_count INTEGER;
  referral_30day_count INTEGER;
  school_year_start DATE;
  suggested TEXT[];
BEGIN
  -- Calculate school year start (August 1)
  school_year_start := make_date(
    CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8
         THEN EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
         ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - 1 END,
    8, 1
  );

  -- RED: 2nd DAEP placement same school year
  IF NEW.consequence_type = 'daep' THEN
    SELECT COUNT(*) INTO daep_count FROM incidents
    WHERE student_id = NEW.student_id
      AND consequence_type = 'daep'
      AND incident_date >= school_year_start
      AND status NOT IN ('overturned','draft')
      AND id != NEW.id;

    IF daep_count >= 1 THEN
      -- Get suggested interventions based on offense category
      SELECT ARRAY_AGG(name) INTO suggested FROM interventions
      WHERE category = 'behavioral' AND tier >= 2 AND is_active = true
      LIMIT 4;

      INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description, suggested_interventions)
      VALUES (NEW.district_id, NEW.campus_id, NEW.student_id, 'red', 'daep_repeat',
              format('Student has %s DAEP placements this school year', daep_count + 1),
              COALESCE(suggested, '{}'));
    END IF;
  END IF;

  -- RED: 3+ ISS in 30 days
  IF NEW.consequence_type = 'iss' THEN
    SELECT COUNT(*) INTO iss_30day_count FROM incidents
    WHERE student_id = NEW.student_id
      AND consequence_type = 'iss'
      AND incident_date >= CURRENT_DATE - INTERVAL '30 days'
      AND status NOT IN ('overturned','draft')
      AND id != NEW.id;

    IF iss_30day_count >= 2 THEN
      INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description)
      VALUES (NEW.district_id, NEW.campus_id, NEW.student_id, 'red', 'iss_frequency',
              format('%s ISS placements in last 30 days', iss_30day_count + 1));
    END IF;
  END IF;

  -- YELLOW: Same offense 3+ times (all time)
  SELECT COUNT(*) INTO same_offense_count FROM incidents
  WHERE student_id = NEW.student_id
    AND offense_code_id = NEW.offense_code_id
    AND status NOT IN ('overturned','draft')
    AND id != NEW.id;

  IF same_offense_count >= 2 THEN
    INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description)
    VALUES (NEW.district_id, NEW.campus_id, NEW.student_id, 'yellow', 'offense_repeat',
            format('Same offense committed %s times', same_offense_count + 1));
  END IF;

  -- YELLOW: 5+ referrals in 30 days
  SELECT COUNT(*) INTO referral_30day_count FROM incidents
  WHERE student_id = NEW.student_id
    AND incident_date >= CURRENT_DATE - INTERVAL '30 days'
    AND status NOT IN ('overturned','draft')
    AND id != NEW.id;

  IF referral_30day_count >= 4 THEN
    INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description)
    VALUES (NEW.district_id, NEW.campus_id, NEW.student_id, 'yellow', 'referral_frequency',
            format('%s referrals in last 30 days', referral_30day_count + 1));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_repeat_offender
  AFTER INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('draft','overturned'))
  EXECUTE FUNCTION check_repeat_offender();
