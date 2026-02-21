# Session Context — Waypoint
> Last updated: 2026-02-21

---

## Active State

- **Development phase:** Pre-pilot — product feature-complete, ready for first district pitch
- **Waypoint app URL:** `https://waypoint.clearpathedgroup.com` (also `app.clearpathedgroup.com`)
- **Company website:** `https://clearpathedgroup.com` (marketing site, static HTML in `clearpath-site/`)
- **Marketing site features:** Waypoint links → waypoint.clearpathedgroup.com, Google Slides embed (DAEP deck) inside Waypoint product card, SEO meta/sitemap/robots.txt
- **Hosting:** Cloudflare Pages — `waypoint` project (app), `clearpath-site` project (marketing site)
- **Supabase project:** `kvxecksvkimcgwhxxyhw` (single project, all tenants)
- **Migrations applied:** 001–036
- **Demo district:** Lone Star ISD (seeded), `admin@lonestar-isd.org` / `Password123!`
- **Waypoint admin:** `admin@waypoint.internal` / `Waypoint2025!` → `/waypoint-admin`
- **Email notifications:** Live via Resend (`onboarding@resend.dev` sandbox sender) — Edge Function deployed

---

## What's Working

- Full discipline lifecycle: incident creation → approval chain → DAEP placement → compliance checklist → transition plan → 30/60/90 reviews
- SPED/504 compliance blocking (triggers fire automatically)
- Repeat offender alerts (4 trigger types, red/yellow severity)
- Daily behavior kiosk + orientation kiosk (campus-scoped, SECURITY DEFINER RPCs)
- Kiosk PIN/DOB second-factor support (migration 033; activate with `?require_pin=1` URL param)
- Parent portal — read-only incident/plan access, DAEP days-remaining countdown, acknowledgment button
- Guardian management on StudentDetailPage — list, add, remove guardians per student
- Email notifications via Resend Edge Function — approval/denial triggers notify reporter
- Notification preferences per user (Settings → Notifications)
- User Management UI (Settings → Users) — invite, role-edit, activate/deactivate
- Reports with PDF + Excel export + PEIMS discipline data export (CSV)
- Recharts visualizations across all report tabs
- Calendar view (`/calendar`) — DAEP placements + review due dates
- Audit log table (migration 035) + `src/lib/audit.js` helper
- Data import wizard (campuses, students, staff, incidents)
- Laserfiche DAEP report import — daily Excel sync, upserts by Instance ID
- Waypoint internal admin panel (`/waypoint-admin`) — provision districts, campuses, admin accounts; Manage drawer for editing districts
- Password reset flow (`/reset-password`)
- Error boundary — crash recovery screen
- **PWA** — `manifest.json` + service worker + Apple meta tags; installable on iOS/Android/Chrome desktop
- Teacher referral page (`/referral`), DAEP scoring page (`/daep/scoring`)
- Bulk incident export (select checkboxes → Export PDF/Excel)

---

## Security Hardening (Done — Migrations 028–036)

| Migration | What It Fixed |
|-----------|--------------|
| 028 | Revoked anon `SELECT` on `students` — kiosk uses RPCs only |
| 029 | Removed spoofable `p_user_id` from approval RPCs |
| 030 | Kiosk RLS overhaul — 3 SECURITY DEFINER RPCs |
| 031 | Storage scoped by `district_id` path prefix |
| 032 | Kiosk RPCs scoped by campus, validated DB-side |
| 033 | `students.kiosk_pin`, `incidents.parent_acknowledged_at`, updated `lookup_student_for_kiosk` RPC |
| 034 | `student_guardians` table with RLS |
| 035 | `audit_log` table with RLS |
| 036 | `notification_preferences` table with RLS |

---

## GitHub Actions — CRITICAL NOTE
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were blank in GitHub secrets since the Cloudflare migration (2026-02-21), causing blank app screens. Fixed by setting them via `gh secret set`. **Always verify both secrets are set after any repo migration.**
- Current bundle: `index-CYWzYBgf.js` (built with correct Supabase URL confirmed)

## Pending / Not Done

1. **Resend sender domain** — currently using `onboarding@resend.dev` sandbox. Verify `waypointdaep.com` in Resend → Domains, then update `FROM_EMAIL` in `supabase/functions/send-notification/index.ts` and redeploy.
2. **Supabase auth SMTP** — default has 3/hr rate limit. Configure custom SMTP before pilot go-live.
3. **Supabase redirect URLs** — add `https://waypoint.clearpathedgroup.com/reset-password` to Supabase Auth → URL Configuration → Redirect URLs.
4. **Google Search Console** — register clearpathedgroup.com to accelerate search indexing.
5. **SSO** — requested but not implemented.
6. **Pricing** — tiers defined, dollar amounts not set. See market analysis: $6K / $10K / $18K / custom tiers recommended.
7. **First pilot district** — not yet contracted. Product is sales-ready.
8. **Compass** — companion product discussed but not yet scoped.

---

## Key Rules (Compressed)

- React 19 + Vite 7 + Tailwind CSS 4 — no TypeScript
- Supabase for everything — no Express server
- PostgREST FK disambiguation: use `table!constraint_name` syntax for bidirectional relationships
- SPED compliance triggers: never bypass
- Laserfiche import: always upsert by `laserfiche_instance_id`, never duplicate
- `waypoint_admin` role: `district_id = NULL`, skips district fetch, tier defaults to `'enterprise'`
- TEC references: never fabricate section numbers
- Kiosk anon access: ALL data access through SECURITY DEFINER RPCs — all require `p_campus_id`, validated DB-side
- Storage paths: always `{district_id}/incidents/{incident_id}/...`
- PWA: service worker lives at `public/sw.js`, skips all `supabase.co` fetch requests
- `vite.config.js` includes `optimizeDeps.include: ['react-is']` — required for recharts to build

---

## Don't Touch Right Now

- `supabase/migrations/` — migrations 001–036 applied to production; don't re-run earlier ones
- `.env.local` — credentials live here; do not commit
- Demo seed data (Lone Star ISD) — keep intact for demos
