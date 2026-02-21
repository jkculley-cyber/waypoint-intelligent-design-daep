-- ============================================
-- Migration 026: Waypoint Internal Admin
-- Adds waypoint_admin role and provisioning RPCs
-- for Waypoint staff to provision new districts
-- ============================================

-- 1. Make district_id nullable so waypoint_admin can have no district
ALTER TABLE profiles ALTER COLUMN district_id DROP NOT NULL;

-- 2. Relax the role CHECK constraint to include waypoint_admin and all current roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin','principal','ap','counselor','sped_coordinator','teacher',
    'cbc','sss','section_504_coordinator','director_student_affairs',
    'parent','student','waypoint_admin'
  ));

-- 3. Helper: check if calling user is a waypoint_admin
CREATE OR REPLACE FUNCTION is_waypoint_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role = 'waypoint_admin' FROM profiles WHERE id = auth.uid()),
    false
  )
$$;

-- 4. Provision a new district
CREATE OR REPLACE FUNCTION provision_new_district(
  p_name   TEXT,
  p_tea_id TEXT,
  p_state  TEXT,
  p_tier   TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied: waypoint_admin role required';
  END IF;

  INSERT INTO districts(name, tea_district_id, state, settings)
  VALUES (
    p_name,
    p_tea_id,
    p_state,
    jsonb_build_object('subscription_tier', p_tier)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. Provision a campus within a district
CREATE OR REPLACE FUNCTION provision_campus(
  p_district_id UUID,
  p_name        TEXT,
  p_tea_id      TEXT,
  p_type        TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied: waypoint_admin role required';
  END IF;

  INSERT INTO campuses(district_id, name, tea_campus_id, campus_type)
  VALUES (p_district_id, p_name, p_tea_id, p_type)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6. Provision an admin profile + campus assignment for a new auth user
CREATE OR REPLACE FUNCTION provision_admin_profile(
  p_user_id     UUID,
  p_district_id UUID,
  p_email       TEXT,
  p_full_name   TEXT,
  p_campus_id   UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied: waypoint_admin role required';
  END IF;

  INSERT INTO profiles(id, district_id, email, full_name, role, is_active)
  VALUES (p_user_id, p_district_id, p_email, p_full_name, 'admin', true);

  INSERT INTO profile_campus_assignments(profile_id, campus_id, is_primary)
  VALUES (p_user_id, p_campus_id, true);
END;
$$;

-- 7. List all districts with summary counts (waypoint_admin only)
CREATE OR REPLACE FUNCTION list_districts_for_admin()
RETURNS TABLE (
  id             UUID,
  name           TEXT,
  tea_district_id TEXT,
  state          TEXT,
  tier           TEXT,
  campus_count   BIGINT,
  user_count     BIGINT,
  created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied: waypoint_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.tea_district_id,
    d.state,
    COALESCE(d.settings->>'subscription_tier', 'essential') AS tier,
    COUNT(DISTINCT c.id)                                     AS campus_count,
    COUNT(DISTINCT p.id)                                     AS user_count,
    d.created_at
  FROM districts d
  LEFT JOIN campuses c  ON c.district_id = d.id
  LEFT JOIN profiles p  ON p.district_id = d.id AND p.is_active = true
  GROUP BY d.id, d.name, d.tea_district_id, d.state, d.settings, d.created_at
  ORDER BY d.created_at DESC;
END;
$$;

-- 8. Grant execute to authenticated users (is_waypoint_admin() enforces the actual check)
GRANT EXECUTE ON FUNCTION is_waypoint_admin()                               TO authenticated;
GRANT EXECUTE ON FUNCTION provision_new_district(TEXT,TEXT,TEXT,TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION provision_campus(UUID,TEXT,TEXT,TEXT)             TO authenticated;
GRANT EXECUTE ON FUNCTION provision_admin_profile(UUID,UUID,TEXT,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION list_districts_for_admin()                        TO authenticated;
