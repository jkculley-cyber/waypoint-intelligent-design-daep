-- Migration 083: is_waypoint_admin() guard RPC
-- Used by the /api/apex/* Pages Function proxy to confirm the caller is a Waypoint admin
-- before any cross-project (Apex) request is forwarded server-side. Replaces the old pattern
-- of shipping the Apex service_role key to the browser in WaypointAdminPage.jsx.
--
-- Callable by any authenticated session; returns TRUE only when the caller's profile role is
-- 'waypoint_admin'. SECURITY DEFINER so it can read profiles regardless of the caller's RLS.

CREATE OR REPLACE FUNCTION public.is_waypoint_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'waypoint_admin'
  );
$$;

-- auth.uid() resolves to NULL for the anon role, so anon callers get FALSE.
REVOKE ALL ON FUNCTION public.is_waypoint_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_waypoint_admin() TO authenticated;

-- Verify (run in SQL Editor as an authed admin — expect true; as anon — expect false):
--   SELECT public.is_waypoint_admin();
