-- 071_seed_audit_sentinel.sql
--
-- Round-3 audit, Chen blocker R2-1 (worsened to actively blocking in CC15):
-- the migration 068 audit trigger writes audit_log with
--     user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
-- when the mutating session has no auth.uid() (cron, batch import,
-- service-role seed/maintenance script). The sentinel UUID was never
-- seeded in auth.users, so audit_log_user_id_fkey violates and the
-- originating mutation aborts. CC15 hit this on the walkthrough seed
-- script and worked around it by signing in as a real admin user — fine
-- for ad-hoc scripts but not a substitute for the documented fallback.
--
-- This migration creates a single sentinel user once and idempotently:
--   1. INSERT into auth.users with the all-zeroes UUID + a non-functional
--      identity (no resolvable email/password — the row is purely an FK
--      anchor, not a sign-in identity).
--   2. INSERT a matching profiles row so any profile-touching trigger
--      (e.g., audit triggers that look up profiles.full_name as actor)
--      resolves cleanly.
--   3. Both are ON CONFLICT DO NOTHING for re-run safety.
--
-- Notes:
--   - The auth.users schema is owned by Supabase Auth; this migration uses
--     only the columns required for the row to exist as an FK target.
--     `email_confirmed_at` is set so a future hypothetical sign-in attempt
--     wouldn't trigger a confirmation email; `aud` and `role` follow
--     Supabase Auth defaults.
--   - The encrypted_password is set to a non-bcrypt sentinel string;
--     authentication against this user will always fail (which is correct —
--     the user is for FK references only).
--   - A future password-rotation or auth-schema change in Supabase could
--     require updating this row. Tracking it here means the dependency is
--     explicit, not buried in ad-hoc seed scripts.

DO $$
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'service_account',
    'system+sentinel@waypoint.internal',
    '$AUDIT_SENTINEL_NO_LOGIN$',
    now(),
    '{"provider": "system", "providers": ["system"]}'::jsonb,
    '{"name": "System (Audit Sentinel)"}'::jsonb,
    now(),
    now(),
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auth.users sentinel insert skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  INSERT INTO profiles (
    id,
    role,
    full_name,
    district_id,
    is_active,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'waypoint_admin',
    'System (Audit Sentinel)',
    NULL,
    true,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'profiles sentinel insert skipped: %', SQLERRM;
END $$;
