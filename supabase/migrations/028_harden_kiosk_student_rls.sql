-- Migration 028: Harden kiosk student RLS
-- Migration 013 added a permissive anonymous SELECT policy on the students table:
--   USING (is_active = true)
-- This allows any anonymous caller to enumerate ALL active students across ALL districts.
--
-- Migration 024 replaced the need for this policy by adding a SECURITY DEFINER RPC
-- (lookup_student_for_kiosk) that returns only the specific student by ID number.
--
-- This migration:
-- 1. Drops the permissive anonymous SELECT policy
-- 2. Revokes SELECT privilege on students from the anon role entirely
-- The lookup_student_for_kiosk RPC (SECURITY DEFINER) bypasses RLS and continues to work.

-- Drop the permissive anon SELECT policy added in migration 013
DROP POLICY IF EXISTS "Kiosk can look up active students" ON students;

-- Revoke direct table SELECT from anon role.
-- The SECURITY DEFINER RPC lookup_student_for_kiosk is the sole kiosk interface.
REVOKE SELECT ON students FROM anon;
