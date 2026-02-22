-- Migration 039: RLS policies for waypoint_admin + safe district settings RPCs
--
-- Problems fixed:
-- 1. waypoint_admin cannot UPDATE/SELECT districts/campuses/profiles — district-scoped
--    RLS policies use user_district_id() which returns NULL for waypoint_admin
-- 2. Direct settings blob updates clobber each other (tier save wipes products, vice versa)
--    Fixed by using jsonb_set RPCs that surgically update only the target key
-- 3. list_districts_for_admin didn't return settings JSONB — now it does

-- ─── RLS policies ─────────────────────────────────────────────────────────────

CREATE POLICY "Waypoint admin can manage all districts"
  ON districts FOR ALL
  USING (is_waypoint_admin());

CREATE POLICY "Waypoint admin can manage all campuses"
  ON campuses FOR ALL
  USING (is_waypoint_admin());

CREATE POLICY "Waypoint admin can view all profiles"
  ON profiles FOR SELECT
  USING (is_waypoint_admin());

-- ─── Safe district update RPCs (jsonb_set — no clobber risk) ─────────────────

CREATE OR REPLACE FUNCTION set_district_tier(p_district_id UUID, p_tier TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied: waypoint_admin role required';
  END IF;
  UPDATE districts
  SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{subscription_tier}', to_jsonb(p_tier))
  WHERE id = p_district_id;
END;
$$;

CREATE OR REPLACE FUNCTION set_district_products(p_district_id UUID, p_products TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied: waypoint_admin role required';
  END IF;
  UPDATE districts
  SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{products}', to_jsonb(p_products))
  WHERE id = p_district_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_district_tier(UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION set_district_products(UUID, TEXT[]) TO authenticated;

-- ─── Update list_districts_for_admin to return settings ───────────────────────

DROP FUNCTION IF EXISTS list_districts_for_admin();

CREATE FUNCTION list_districts_for_admin()
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  tea_district_id TEXT,
  state           TEXT,
  tier            TEXT,
  settings        JSONB,
  campus_count    BIGINT,
  user_count      BIGINT,
  created_at      TIMESTAMPTZ
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
    d.settings,
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

GRANT EXECUTE ON FUNCTION list_districts_for_admin() TO authenticated;
