-- Migration 020: SECURITY DEFINER function for updating district settings
-- Bypasses RLS (which silently blocks direct table updates) while enforcing
-- admin-only access in the function body.

CREATE OR REPLACE FUNCTION public.update_district_settings(p_settings JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_district_id UUID;
  v_role TEXT;
BEGIN
  SELECT district_id, role INTO v_district_id, v_role
  FROM profiles WHERE id = auth.uid();

  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update district settings';
  END IF;

  UPDATE districts SET settings = p_settings WHERE id = v_district_id;
END;
$$;
