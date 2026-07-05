-- ============================================================================
-- OPS PROJECT (xbpuqaqpcbixxodblaes) — lock down demo_leads
-- Run this in the OPS Supabase SQL Editor (NOT the main Waypoint project).
-- ============================================================================
--
-- WHY: the public anon key is embedded in clearpath-site/navigator.html and
-- waypoint.html (necessarily — it does the lead INSERT). Anon SELECT on
-- demo_leads is currently ALLOWED, so anyone who views page source can read
-- every prospect's name, school email, phone, district, and status. Verified
-- 2026-07-05 (CC39): an anonymous GET returned all rows.
--
-- FIX: enable RLS and allow anon INSERT only — no SELECT/UPDATE/DELETE for anon.
-- The marketing forms (INSERT) keep working. service_role (used by Cloudflare
-- Pages Functions and any admin read path) bypasses RLS, so it is unaffected.
--
-- SIDE EFFECT: the Waypoint /waypoint-admin "demo leads" panel currently reads
-- this table with the ANON key (src/lib/opsSupabase.js), so that panel will go
-- empty after this runs. Leads are NOT lost — every submission also POSTs to
-- Formspree (emails Kim) and is still stored here. To restore the in-app panel,
-- move that read behind service_role (see the follow-up note in the CC39
-- handover: route it through a Cloudflare Pages Function on cpeg-site using the
-- existing OPS_SUPABASE_SERVICE_ROLE_KEY, or consolidate lead capture into the
-- main project's `leads` table via the capture-lead Edge Function).
-- ============================================================================

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Remove any pre-existing permissive policies so nothing silently keeps SELECT open.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'demo_leads'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.demo_leads', p.policyname);
  END LOOP;
END $$;

-- Anonymous visitors may only INSERT a lead. No read-back, no edit, no delete.
CREATE POLICY demo_leads_anon_insert_only
  ON public.demo_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- (Optional, if the marketing site is ever authenticated) allow authenticated
-- users to insert too, but still not read.
CREATE POLICY demo_leads_authed_insert_only
  ON public.demo_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- VERIFY (run after applying):
--
--   -- RLS on?
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'demo_leads';  -- expect t
--
--   -- Only INSERT policies exist?
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename = 'demo_leads';   -- expect only the two INSERT policies
--
-- Then, from a terminal, confirm anon SELECT is now blocked (should return []
-- or a permission error, NOT lead rows):
--
--   curl "https://xbpuqaqpcbixxodblaes.supabase.co/rest/v1/demo_leads?select=id" \
--     -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--
-- And confirm INSERT still works (a new test row should appear via service_role):
--
--   curl -X POST "https://xbpuqaqpcbixxodblaes.supabase.co/rest/v1/demo_leads" \
--     -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
--     -H "Content-Type: application/json" -H "Prefer: return=minimal" \
--     -d '{"name":"RLS test","email":"rls-test@example.com","district_name":"Test ISD"}'
-- ============================================================================
