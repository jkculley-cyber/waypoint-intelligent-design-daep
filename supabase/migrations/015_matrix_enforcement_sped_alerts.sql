-- Migration 015: Matrix dedup cleanup + SPED cumulative day alerts
-- Cleans duplicate discipline_matrix rows and adds SPED/504 cumulative removal day
-- tracking to the repeat offender trigger (IDEA compliance).

-- ============================================
-- A. Deduplicate discipline_matrix entries
-- Keep newest row per (district_id, offense_code_id, occurrence, grade_group)
-- ============================================
DELETE FROM discipline_matrix
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY district_id, offense_code_id, occurrence, grade_group
             ORDER BY created_at DESC
           ) AS rn
    FROM discipline_matrix
  ) ranked
  WHERE rn > 1
);

-- ============================================
-- B. Update check_repeat_offender() to include
--    SPED/504 cumulative removal day alerts
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
  student_is_sped BOOLEAN;
  student_is_504 BOOLEAN;
  cumulative_days INTEGER;
  projected_total INTEGER;
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

  -- ============================================
  -- SPED/504 Cumulative Removal Day Tracking
  -- IDEA requires MDR when cumulative removals >= 10 days
  -- ============================================
  IF NEW.consequence_type IN ('iss', 'oss', 'daep') THEN
    -- Look up student SPED/504 status
    SELECT s.is_sped, s.is_504
    INTO student_is_sped, student_is_504
    FROM students s
    WHERE s.id = NEW.student_id;

    IF student_is_sped OR student_is_504 THEN
      -- Sum existing removal days this school year
      SELECT COALESCE(SUM(COALESCE(consequence_days, 0)), 0)
      INTO cumulative_days
      FROM incidents
      WHERE student_id = NEW.student_id
        AND consequence_type IN ('iss', 'oss', 'daep')
        AND incident_date >= school_year_start
        AND status NOT IN ('overturned', 'draft')
        AND id != NEW.id;

      projected_total := cumulative_days + COALESCE(NEW.consequence_days, 0);

      IF projected_total >= 10 THEN
        -- RED: MDR required
        INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description)
        VALUES (NEW.district_id, NEW.campus_id, NEW.student_id, 'red', 'sped_cumulative_mdr',
                format('SPED/504 student has %s cumulative removal days this school year. A Manifestation Determination Review (MDR) is required under IDEA before proceeding.', projected_total));
      ELSIF projected_total >= 5 THEN
        -- YELLOW: Approaching threshold
        INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description)
        VALUES (NEW.district_id, NEW.campus_id, NEW.student_id, 'yellow', 'sped_cumulative_warning',
                format('SPED/504 student has %s cumulative removal days this school year. An MDR is required at 10 cumulative days.', projected_total));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
