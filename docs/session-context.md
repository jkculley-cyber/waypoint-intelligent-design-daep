# Session Context — Waypoint
> Last updated: 2026-02-22 (Session H — Business Dashboard + Analytics + Demo Accounts)

---

## Active State

- **Development phase:** Pre-pilot — product feature-complete, ready for first district pitch
- **Waypoint app URL:** `https://waypoint.clearpathedgroup.com` (also `app.clearpathedgroup.com`)
- **Company website:** `https://clearpathedgroup.com` (marketing site, static HTML in `clearpath-site/`)
- **Marketing site features:** All 3 products (Waypoint, Navigator, Meridian) + Clear Path Suite bundle callout. Pricing tags visible. Google Slides embed (DAEP deck) in Waypoint card. SEO meta/sitemap/robots.txt. Cloudflare Web Analytics auto-injected via Pages dashboard.
- **Hosting:** Cloudflare Pages — `waypoint` project (app), `clearpath-site` project (marketing site)
- **Supabase project:** `kvxecksvkimcgwhxxyhw` (single project, all tenants)
- **Migrations applied:** 001–043 (production). All migrations applied.
- **Demo district:** Lone Star ISD (seeded), `admin@lonestar-isd.org` / `Password123!`
- **Waypoint admin:** `admin@waypoint.internal` / `Waypoint2025!` → `/waypoint-admin`
- **Email notifications:** Live via Resend (`onboarding@resend.dev` sandbox sender) — Edge Function deployed
- **All demo accounts:** See `docs/demo-accounts.md`

---

## Product Suite

| Product | Status | Gate |
|---------|--------|------|
| Waypoint (DAEP) | Live | Default, all districts |
| Navigator (ISS/OSS) | Live — migrations 037–042 applied | `hasProduct('navigator')` |
| Meridian (SPED) | Built — migration 040 applied | `hasProduct('meridian')` |

- Product provisioning: WaypointAdminPage Step 1 has product checkboxes; Manage drawer has product toggle
- `districts.settings.products` stores the array (JSONB)
- Navigator sidebar: **blue** active state; Meridian sidebar: **purple** active state; Waypoint: **orange**
- `RequireProduct` component at `src/components/auth/RequireProduct.jsx`
- `activeProductCount > 1` triggers product section headers in sidebar

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
- Waypoint internal admin panel (`/waypoint-admin`) — provision districts; Manage drawer; **Business Dashboard** (ARR/MRR/pipeline metrics, charts, contracts CRUD)
- Password reset flow (`/reset-password`)
- Error boundary — crash recovery screen
- **PWA** — `manifest.json` + service worker + Apple meta tags; installable on iOS/Android/Chrome desktop
- Teacher referral page (`/referral`), DAEP scoring page (`/daep/scoring`)
- Bulk incident export (select checkboxes → Export PDF/Excel)
- **Navigator module** — referrals, placements, supports, student detail, reports, goals & progress, data import (gated by `hasProduct('navigator')`)
- **Meridian module (code complete)** — SPED overview dashboard, ARD timelines, student detail, dyslexia/HB3928 tracker, folder readiness, CAP tracker, Waypoint sync, data integration (gated by `hasProduct('meridian')`)
- **Cloudflare Web Analytics** — auto-injected via Cloudflare Pages dashboard (no code token needed)

---

## Security Hardening (Done — Migrations 028–039)

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
| 037 | `navigator_referrals`, `navigator_placements`, `navigator_supports`; updated `provision_new_district` RPC |
| 038 | waypoint_admin RLS self-read policy on profiles |
| 039 | waypoint_admin RLS on districts/campuses/profiles; `set_district_tier` + `set_district_products` RPCs |

---

## GitHub Actions — CRITICAL NOTE
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were blank in GitHub secrets since the Cloudflare migration (2026-02-21), causing blank app screens. Fixed by setting them via `gh secret set`. **Always verify both secrets are set after any repo migration.**

## Pending / Not Done

1. **Verify Business Dashboard loads on live site** — log in as `admin@waypoint.internal` → Business Dashboard. If red error shows, paste the message. (Deployed end of last session — may just need verification.)
2. **Enable Meridian for Lone Star ISD** — `/waypoint-admin` → Manage Lone Star ISD → Licensed Products → check Meridian → Save Products
3. **Seed Meridian demo data** — No test SPED students in `meridian_students` yet
4. **Build pricing page / district proposal** — Pricing model defined (enrollment bands, 3 tiers per product, bundle discounts). Needs implementation as website component or PDF template.
5. **Resend sender domain** — currently using `onboarding@resend.dev` sandbox. Verify `waypointdaep.com` in Resend → Domains, then update `FROM_EMAIL` in `supabase/functions/send-notification/index.ts` and redeploy.
6. **Supabase auth SMTP** — default has 3/hr rate limit. Configure custom SMTP before pilot go-live.
7. **Supabase redirect URLs** — add `https://waypoint.clearpathedgroup.com/reset-password` to Supabase Auth → URL Configuration → Redirect URLs.
8. **Google Search Console** — register clearpathedgroup.com to accelerate search indexing.
9. **First pilot district** — not yet contracted. Product is sales-ready.

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
- Meridian tables: all prefixed `meridian_` to avoid collision with Waypoint tables
- Sidebar active state colors: Waypoint=orange, Navigator=blue, Meridian=purple

---

## Don't Touch Right Now

- `supabase/migrations/` — migrations 001–043 all applied to production; don't re-run earlier ones
- `.env.local` — credentials live here; do not commit
- Demo seed data (Lone Star ISD) — keep intact for demos
