-- Migration 045: Fix SECURITY DEFINER functions missing SET search_path
-- Supabase Security Advisor flags functions with mutable search_path as a
-- security vulnerability (search_path injection attack vector).
-- This migration sets search_path = public on all affected SECURITY DEFINER
-- functions deployed in migrations 002, 003, 014–016, 020, 029.
--
-- Functions added in migrations 026, 032, 033, 037, 039 already have
-- SET search_path = public and are NOT affected.

-- ── Migration 002: RLS helper functions ──────────────────────────────────────
ALTER FUNCTION public.user_district_id()   SET search_path = public;
ALTER FUNCTION public.user_role()          SET search_path = public;
ALTER FUNCTION public.user_campus_ids()    SET search_path = public;

-- ── Migration 003: Trigger functions ─────────────────────────────────────────
ALTER FUNCTION public.handle_new_user()                    SET search_path = public;
ALTER FUNCTION public.check_sped_compliance()              SET search_path = public;
ALTER FUNCTION public.check_compliance_completion()        SET search_path = public;

-- ── Migration 015: check_repeat_offender (overrides 003 version) ─────────────
ALTER FUNCTION public.check_repeat_offender()              SET search_path = public;

-- ── Migration 016: DAEP approval + scheduling triggers ───────────────────────
ALTER FUNCTION public.fn_create_daep_approval_chain()      SET search_path = public;
ALTER FUNCTION public.fn_create_daep_scheduling()          SET search_path = public;

-- Migration 020: update_district_settings already has SET search_path = public
-- (search_path was on the line following SECURITY DEFINER — not a false negative)

-- ── Migration 029: Approval chain RPCs (overrides 014 versions) ──────────────
ALTER FUNCTION public.process_approval_step(UUID, TEXT, TEXT)  SET search_path = public;
ALTER FUNCTION public.resubmit_approval_chain(UUID)            SET search_path = public;
