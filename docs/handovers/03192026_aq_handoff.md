# Session AQ Handover — 2026-03-19

## What Was Done

### Waypoint — DAEP Campus Picker + Clickable Cards
- **DAEP campus picker on IncidentDetailPage** — When consequence_type is DAEP, a "DAEP Campus" dropdown appears in the Consequence card. Admin/principal/AP can assign which DAEP campus a student goes to (`incidents.daep_campus_id`). Other roles see read-only label. Uses `useCampuses()` hook filtered to `campus_type === 'daep'`.
- **Clickable stat cards platform-wide:**
  - AlertsPage: 4 stat cards now clickable buttons that toggle level/status filters with active ring indicators
  - OriginsDashboardPage: 4 stat cards now navigate to relevant subpages (Progress, Response Moments, Replay Tool, Family Workspace)
  - DaepDashboardPage, CompliancePage, DashboardPage, ReportsPage, NavigatorDashboard, MeridianDashboard were already clickable
  - DisciplineMatrixPage left as-is (config counts on same page)
- **Migration 059 NOT YET APPLIED** — `daep_campus_id UUID` column on incidents. Must apply via SQL Editor before campus picker works.

### Apex — Critical Auth Fix (OTP Code Entry)
- **Root cause:** `shouldCreateUser: false` in `signInWithOtp` silently blocked ALL new users. Approved principals had no Supabase auth account, so no OTP email was ever sent. No error shown.
- **Fix 1:** Removed `shouldCreateUser: false` — new users now get auth accounts created on first sign-in attempt.
- **Fix 2:** Switched login flow from magic link to **6-digit OTP code entry**. User enters email → gets code → types it on screen. Immune to Outlook Safe Links consuming magic links.
- **Fix 3:** AuthCallbackPage now shows recovery screen after 8 seconds instead of spinning forever.
- **Fix 4:** Welcome email (approve-access edge function) rewritten — no longer sends magic link. Instead shows 3-step instructions: go to site → sign in with email → enter 6-digit code. Edge function redeployed.
- **Supabase config change needed:** Email rate limit was 2/hour — user bumped it up. OTP expiry at 3600s (1 hour).
- **Email template updated:** User updated Supabase Auth magic link template to include `{{ .Token }}` (the 6-digit code).

### Email Templates Created
- `admin_previews/new-principal-apex-trial.html` — Personalized email for newly named campus principals. Purple gradient header, empathetic opening ("I remember that feeling"), 3-stat problem box, 4-feature breakdown, hot orange CTA button linking to trial.
- `admin_previews/admin-apex-trial.html` — Generic version for all administrators (BCC-friendly). No `[FirstName]` placeholder — uses warm greeting instead.

## Commits Pushed
- `b875b32` — feat: DAEP campus picker on incident detail + clickable stat cards platform-wide (waypoint)
- `5ed1f8e` — fix: remove shouldCreateUser:false — was silently blocking new user OTP (apex)
- `ac688f6` — fix: switch login from magic link to OTP code entry (apex)
- `3327308` — fix: replace magic link with code-based sign-in in approval email (apex)

## What's Next
1. **Apply migration 059** to Waypoint Supabase (SQL Editor) — enables DAEP campus picker
2. **Add DAEP-type campuses** in district settings if none exist
3. **Verify Apex sign-in flow** — confirm client (Bobby McClain at Knox JH, Conroe ISD) can sign in with 6-digit code
4. **Supabase PAT expired** — `sbp_34e3b7ef...` returns 401. Run `npx supabase login` to get a fresh token for future edge function deploys.
5. **SPF record** still pending for clearpathedgroup.com
6. **Apex email rate limit** — user bumped from 2/hour; verify new value is sufficient

## Blockers
- Supabase PAT (`sbp_34e3b7ef...`) is expired — cannot deploy edge functions via CLI until refreshed
- Migration 059 not applied — campus picker will show but saves will fail until column exists
