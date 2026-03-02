# Session Context — Waypoint
> Last updated: 2026-03-03 (Session Y — Full Navigator audit + all page fixes + seed data with active placements)

---

## Active State

- **Development phase:** Pre-pilot — product feature-complete, ready for first district pitch
- **Waypoint app URL:** `https://waypoint.clearpathedgroup.com` (also `app.clearpathedgroup.com`)
- **Company website:** `https://clearpathedgroup.com` (marketing site, static HTML in `clearpath-site/`)
- **Marketing site features:** Company-level site for Clear Path Education Group — all 4 pathways (Compass active, 3 coming soon). All 3 Compass products (Waypoint, Navigator, Meridian) + Clear Path Suite bundle callout. **Interactive pricing calculator**. **Free Compliance Checklist** lead magnet. Google Slides embed + **narrated overview video** (`Waypoint__Safety_and_Growth.mp4`) tabbed in Waypoint card. SEO/sitemap/robots.txt. Cloudflare Web Analytics. **Security page** at `/security.html`. **Demo request form** at `/#contact` → Formspree `xpqjngpp`. Session T minor changes: nav CTA → "Request a Demo →" (#contact); Waypoint video tab label → "Watch Demo · 3 min". ⚠️ Site must remain company-level — not a Waypoint product page (see DECISIONS.md 2026-02-28).
- **whitepaper.html:** 20-point DAEP compliance self-audit checklist, 5 sections with TEC citation callout boxes, scorecard with scoring bands (18–20 compliant / 14–17 at risk / <14 urgent), print-optimized CSS, "Save as PDF" button. Lead magnet for district sales.
- **Hosting:** Cloudflare Pages — `waypoint` project (app, deployed via GitHub Actions on push to `main`), `cpeg-site` project (marketing site, deployed via GitHub Actions `deploy-clearpath-site.yml` on push to `main` — **do NOT use `node deploy-clearpath.mjs` Direct Upload**, it creates broken deployments)
- **Supabase project:** `kvxecksvkimcgwhxxyhw` (single project, all tenants)
- **Migrations applied:** 001–050 (production). All migrations applied. 044 (Origins schema), 049 (Meridian SPPI-13 + RDA tables), 050 (Navigator skill_gap + effectiveness) applied via SQL Editor 2026-03-01.
- **Demo seed data:** `supabase/seed_demo_video.mjs` — 12 active incidents, 6 transition plans, 57 days behavior tracking (Marcus/David/DeShawn), parent auth user `parent.marcus@gmail.com` / `Password123!` (Sandra Johnson, guardian of Marcus). `supabase/seed_navigator.mjs` — 13 referrals, 28 placements (6 completed + 2 active + 20 prior year), 6 supports, 3 campus goals seeded for Lone Star ISD (8 student risk scenarios: 3 HIGH, 3 MEDIUM, 2 LOW). 2 active placements (Marcus OSS, DeShawn ISS — no end_date) power the Active ISS/Active OSS tabs. `supabase/seed_meridian.mjs` — 9 SPED students, 4 IEPs, 2 504 plans, 3 ARD referrals, 1 CAP finding seeded for Lone Star ISD. Both Navigator and Meridian **enabled** for Lone Star ISD. Both seeders use Supabase REST API (no DB password needed).
- **Demo video script:** `docs/brand/demo-video-script.md` — full production package rewritten Session T. 10 HeyGen blocks (≤840 chars each), student-first framing, T.E.A./I.E.P./P.E.I.M.S. abbreviations with periods. B-roll shot guide (7 clips) at bottom of script.
- **Demo district:** Lone Star ISD (seeded), `admin@lonestar-isd.org` / `Password123!`
- **Waypoint admin:** `admin@waypoint.internal` / `Waypoint2025!` → `/waypoint-admin`
- **Email notifications:** Live via Resend — sandbox sender `onboarding@resend.dev` still active. Code updated to default `noreply@waypointdaep.com` but Supabase secret + function redeploy still needed.
- **All demo accounts:** See `docs/demo-accounts.md`

---

## Product Suite

| Product | Status | Gate |
|---------|--------|------|
| Waypoint (DAEP) | Live | Default, all districts |
| Navigator (ISS/OSS) | Live — migrations 037–042 applied | `hasProduct('navigator')` |
| Meridian (SPED) | Operationally complete — read + write — migration 040 applied | `hasProduct('meridian')` |
| Origins (Family Portal) | Live — migration 044 applied | `hasProduct('origins')` + `/family` public |

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
- Waypoint internal admin panel (`/waypoint-admin`) — provision districts; Manage drawer; **Business Dashboard** (ARR/MRR/pipeline metrics, charts, contracts CRUD); **Product Hub** tab (product cards, 8 demo site links, demo credentials with copy/show-password toggle); **header URL pill** (live URL `https://waypoint.clearpathedgroup.com/waypoint-admin` with copy + open buttons); **Partner Chat** floating bubble (bottom-right, polls ops Supabase `xbpuqaqpcbixxodblaes` messages table every 5s, sender=Kim)
- Password reset flow (`/reset-password`)
- Error boundary — crash recovery screen
- **PWA** — `manifest.json` + service worker + Apple meta tags; installable on iOS/Android/Chrome desktop
- **Mobile responsive layout** — hamburger drawer (mobile), always-visible sidebar (desktop). `SidebarContext` at `src/contexts/SidebarContext.jsx`. No page files changed.
- Teacher referral page (`/referral`), DAEP scoring page (`/daep/scoring`)
- Bulk incident export (select checkboxes → Export PDF/Excel)
- **Navigator module** — referrals, placements, supports, student detail, reports, goals & progress, data import, **Escalation Engine**, **Skill Gap Map**, **Effectiveness**, **Disproportionality Radar**, **Pilot Summary** (gated by `hasProduct('navigator')`). Full audit done Session Y — all pages functional. Campus filter, risk score (0-100), Active ISS/OSS tabs, Goals Edit button, dashboard active supports card all fixed.
- **Meridian module (operationally complete)** — Dashboard, Timelines, Student Detail (Schedule ARD modal, Escalate modal, Link Waypoint modal, Generate Compliance PDF), Dyslexia/HB3928 (Mark Reviewed modal), CAP Tracker (task toggle, Log New Finding modal, Generate TEA Docs PDF), Folder Readiness, Waypoint Sync, Integration, **Transition SPPI-13** (compliance table + TransitionPlanModal 5 accordion elements + jsPDF report), **RDA Dashboard** (DL banner, 3 domain sections, indicator cards Live/Manual, RDADataModal 3-step, IndicatorEditModal). All hooks have `refetch()`. Mutations in `useMeridian.js`.
- **DAEP Analytics** — Analytics tab on DAEP Dashboard: CapacityTrackerWidget (occupied/reserved/remaining), EnrollmentByGradeTable (sub-pop breakdown). Reports → Enrollment tab. IncidentDetailPage capacity banner. `set_daep_capacity` RPC applied to DB (migration 048).
- **Origins module (live)** — 8 staff pages + full family portal: student 7-step scenario player (choose → outcome → reflect → commit → complete), parent view with conversation starters, 18 TEC-aligned global scenarios. Migration 044 applied — DB-backed sessions active.
- **Cloudflare Web Analytics** — auto-injected via Cloudflare Pages dashboard (no code token needed)

---

## Origins Family Portal
- Public portal at `/family` — no auth required
- Student view: `/family/student` → assigned scenarios → `/family/student/scenario/:id` (7-step player)
- Parent view: `/family/parent` → reads completed sessions from localStorage, shows conversation starters
- Scenario library: `src/lib/originsScenarios.js` (18 global scenarios, 8 TEC offense categories)
- Sessions stored in `localStorage` key `origins_sessions` until migration 044 is applied
- Staff pages at `/origins/*` gated by `hasProduct('origins')`

---

## Security Hardening (Done — Migrations 028–039, 045–046)

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

1. ~~**Apply migration 044**~~ — ✅ Applied 2026-03-01 via SQL Editor. Run `node supabase/seed_origins_scenarios.mjs` to seed global scenarios if not yet done.
2. **Set up `privacy@clearpathedgroup.com`** — referenced in all compliance docs; must exist before sharing docs with districts.
3. **Verify Business Dashboard loads on live site** — log in as `admin@waypoint.internal` → Business Dashboard. Confirm no errors.
4. ~~**Enable Meridian + Origins for Lone Star ISD**~~ — ✅ Done (Session V). Meridian + Navigator enabled via seed scripts. Origins still pending migration 044.
5. ~~**Seed Meridian demo data**~~ — ✅ Done (Session V). 9 students, 4 IEPs, 2 504 plans seeded via `seed_meridian.mjs`.
6. **Resend sender domain** — verify `waypointdaep.com` in Resend → Domains. Then set Supabase secret `FROM_EMAIL="Waypoint <noreply@waypointdaep.com>"` and redeploy Edge Function. Code fallback already updated.
7. **Supabase redirect URLs** — add `https://waypoint.clearpathedgroup.com/reset-password` to Supabase Auth → URL Configuration → Redirect URLs.
8. **Google Search Console** — register clearpathedgroup.com to accelerate search indexing.
9. **Supabase Pro upgrade** — required to permanently enable HaveIBeenPwned password protection ($25/month).
10. ~~**Apply migration 049**~~ — ✅ Applied 2026-03-01 via SQL Editor. `meridian_secondary_transitions`, `meridian_rda_determination`, `meridian_rda_indicators` tables now live.
13. ~~**Apply migration 050**~~ — ✅ Applied 2026-03-01 via SQL Editor. `skill_gap`, `skill_gap_notes` on `navigator_referrals`; `outcome_notes`, `incidents_before`, `incidents_after` on `navigator_supports` now live.
14. ~~**Wire skill_gap field into Referral form**~~ — ✅ Done. `skill_gap` select + `skill_gap_notes` textarea in review form. Skill Gap Map now populates.
15. ~~**Wire effectiveness fields into Support form**~~ — ✅ Done. `EditSupportDrawer` in NavigatorSupportsPage with `incidents_before`, `incidents_after`, `outcome_notes` (shown when status=completed).
16. **Create `messages` table in ops Supabase** — Run SQL in https://supabase.com/dashboard/project/xbpuqaqpcbixxodblaes/sql/new to activate Partner Chat (see Session X handover). Table: `id BIGSERIAL, sender TEXT, message TEXT, created_at TIMESTAMPTZ DEFAULT now()` + anon RLS policy. ⚠️ Also in action tracker as task 15.
17. **Verify Business Dashboard loads on live site** — Log in as `admin@waypoint.internal` → Business Dashboard tab. Confirm charts load. (Action tracker task 16.)
11. **Meridian escalations table** — Escalate button shows modal but logs to console only. Needs a future migration for `meridian_escalations` — separate from 049.
12. **First pilot district** — not yet contracted. Product is sales-ready.
12. **clearpathedgroup.com custom domain** — `www.clearpathedgroup.com` CNAME record needs to be added manually in Cloudflare DNS: Type=CNAME, Name=`www`, Target=`cpeg-site.pages.dev`, Proxied=ON. Root domain (`clearpathedgroup.com`) DNS is verified; TLS cert may still be provisioning. Check Cloudflare Pages → cpeg-site → Custom Domains if either domain shows errors.

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
- Meridian mutations: async functions (not hooks) exported from `useMeridian.js`; all hooks now expose `refetch()`
- Escalate button (Student Detail): logs to console only until migration 049 applied — `alerts.student_id` FK points to `students` not `meridian_students`

---

## Don't Touch Right Now

- `supabase/migrations/` — migrations 001–050 all applied to production; don't re-run earlier ones
- `.env.local` — credentials live here; do not commit
- Demo seed data (Lone Star ISD) — keep intact for demos
