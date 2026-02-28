-- Migration 048: DAEP Seat Capacity RPC
-- Adds set_daep_capacity function to store capacity config in districts.settings.daep_capacity

CREATE OR REPLACE FUNCTION set_daep_capacity(
  p_district_id UUID,
  p_capacity    JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Verify caller belongs to this district (or is waypoint_admin)
  IF user_district_id() != p_district_id AND NOT is_waypoint_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Verify caller has admin, principal, or waypoint_admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'principal', 'waypoint_admin')
  ) THEN
    RAISE EXCEPTION 'Admin or principal role required';
  END IF;

  UPDATE districts
  SET settings = jsonb_set(COALESCE(settings, '{}'), '{daep_capacity}', p_capacity)
  WHERE id = p_district_id;
END;
$$;
