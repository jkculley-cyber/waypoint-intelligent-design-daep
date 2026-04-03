# Session Context — Waypoint
> Last updated: 2026-04-03 (Session BO — SIGNAL built + deployed, Reddit/Twitter/Quora/TpT/Trends scanning, SEO strategy)

---

## Active State

- **Development phase:** Pre-pilot — product feature-complete, ready for first district pitch
- **Waypoint app URL:** `https://waypoint.clearpathedgroup.com` (also `app.clearpathedgroup.com`)
- **Company website:** `https://clearpathedgroup.com` (marketing site, static HTML in `clearpath-site/`)
- **Marketing site features:** Company-level site for Clear Path Education Group. **Hero carousel** cycling Waypoint + Apex every 5 seconds. Technology Suite (Waypoint + Apex live, Navigator + Meridian coming 2026). **Apex pricing section** with Zelle QR + Buy Now CTA. **Interactive pricing calculator**. **Free Compliance Checklist** lead magnet. Google Slides embed + narrated video. SEO/sitemap/robots.txt. Cloudflare Web Analytics. Security page `/security.html`. Research page `/research.html`. **Store** (`/store.html`) with TpT + Zelle dual purchase options. **4 lead capture channels** all → Formspree `xpqjngpp`: demo form (`source=demo_request`), pilot application form at `#pilot` (`source=pilot_application`), floating widget (`source=chat_widget`), whitepaper email gate (`source=whitepaper_gate`). **Floating "Talk to Our Team" widget** with 7 personalised auto-replies by compliance challenge. **Dedicated pilot application form** at `#pilot` (district name, role, size, DAEP volume, urgency). **Nav has "Apply for Pilot Spot" button**. **clearpath-logo.svg** — SVG compass logo, transparent bg, sharp at all sizes. ⚠️ Site must remain company-level — not a Waypoint product page (see DECISIONS.md 2026-02-28).
- **whitepaper.html:** 20-point DAEP compliance self-audit checklist, 5 sections with TEC citation callout boxes, scorecard with scoring bands (18–20 compliant / 14–17 at risk / <14 urgent), print-optimized CSS, "Save as PDF" button. Lead magnet for district sales.
- **Hosting:** Cloudflare Pages — `waypoint` project (app, deployed via GitHub Actions on push to `main`), `cpeg-site` project (marketing site, deployed via GitHub Actions `deploy-clearpath-site.yml` on push to `main` — **do NOT use `node deploy-clearpath.mjs` Direct Upload**, it creates broken deployments)
- **Supabase project:** `kvxecksvkimcgwhxxyhw` (single project, all tenants)
- **Migrations applied:** 001–060 (production). Migration 060: `iss_daily_tracking` table for ISS Kiosk (applied 2026-03-22).
- **Demo seed data:** `supabase/seed_demo_video.mjs` — 12 active incidents, 6 transition plans, 57 days behavior tracking (Marcus/David/DeShawn), parent auth user `parent.marcus@gmail.com` / `Password123!` (Sandra Johnson, guardian of Marcus). `supabase/seed_navigator.mjs` — 13 referrals, 28 placements (6 completed + 2 active + 20 prior year), 6 supports, 3 campus goals seeded for Lone Star ISD (8 student risk scenarios: 3 HIGH, 3 MEDIUM, 2 LOW). 2 active placements (Marcus OSS, DeShawn ISS — no end_date) power the Active ISS/Active OSS tabs. `supabase/seed_meridian.mjs` — 9 SPED students, 4 IEPs, 2 504 plans, 3 ARD referrals, 1 CAP finding seeded for Lone Star ISD. Both Navigator and Meridian **enabled** for Lone Star ISD. Both seeders use Supabase REST API (no DB password needed).
- **Demo video script:** `docs/brand/demo-video-script.md` — full production package rewritten Session T. 10 HeyGen blocks (≤840 chars each), student-first framing, T.E.A./I.E.P./P.E.I.M.S. abbreviations with periods. B-roll shot guide (7 clips) at bottom of script.
- **Demo district:** Lone Star ISD (seeded), `admin@lonestar-isd.org` / `Password123!`
- **Waypoint admin:** `admin@waypoint.internal` / `Waypoint2025!` → `/waypoint-admin`
- **Email notifications:** Live via Resend — sandbox sender `onboarding@resend.dev` still active. Sender domain is `clearpathedgroup.com` (not waypointdaep.com). DKIM record (`resend._domainkey.clearpathedgroup.com`) already set in Cloudflare. SPF needs `include:spf.resend.com` added. Edge Function default updated to `noreply@clearpathedgroup.com`. Still needed: set `FROM_EMAIL` + `RESEND_API_KEY` Supabase secrets → redeploy `send-notification` Edge Function.
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
- Waypoint internal admin panel (`/waypoint-admin`) — provision districts; Manage drawer; **Business Dashboard** (ARR/MRR/pipeline metrics, charts, contracts CRUD); **Product Hub** tab (product cards, 8 demo site links, demo credentials with copy/show-password toggle); **header URL pill** (live URL `https://waypoint.clearpathedgroup.com/waypoint-admin` with copy + open buttons); **Partner Chat** floating bubble (bottom-right, polls ops Supabase `xbpuqaqpcbixxodblaes` messages table every 5s, sender=Kim); **Apex tab** — 6 metric cards (total/paid/trial/gated/new/pending), principals table with status + paid_through + activate/deactivate actions, **Edit modal** (name/school/district/status/paid_through)
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

## Next Session Priority

1. **SEO landing pages** — build pages targeting educator search terms (DAEP tracking, counselor caseload, T-TESS observation, student engagement) to rank on Google
2. **Store redesign** — clearpathedgroup.com/store visual product grid (model: brightfutures-counseling.com)
3. **SIGNAL custom domain** — add signal.clearpathedgroup.com in Cloudflare Pages
4. **Product images for remaining products** — wire images for DAEP Tracker, ISS, Navigator, Meridian into resources carousels
5. **Investigator Toolkit** — rebuild single-file HTML with new features
6. **Reach Chad Bronowski** — LinkedIn or phone (CSISD 979-764-5400)
7. **Re-send Apex marketing emails**
8. **Meridian deep audit** when ready

---

## Pending / Not Done

1. ~~**Apply migration 044**~~ — ✅ Applied 2026-03-01 via SQL Editor. Run `node supabase/seed_origins_scenarios.mjs` to seed global scenarios if not yet done.
10. **Re-entry Intelligence System** — live (migrations 054-055, hooks, ReentryHub, dashboard widget, seed data for demo + sandbox).
1. **Set up `privacy@clearpathedgroup.com`** — referenced in all compliance docs; must exist before sharing docs with districts.
2. **Google Search Console** — register clearpathedgroup.com (Sage owns this).
3. ~~**Resend sender domain**~~ — ✅ Done (Session Z). clearpathedgroup.com confirmed correct. DKIM already set. Edge Function updated + redeployed. Secrets set.
4. ~~**Supabase redirect URL**~~ — ✅ Done (Session Z). `https://waypoint.clearpathedgroup.com/reset-password` added to Supabase Auth → URL Configuration.
5. ~~**Supabase Pro upgrade**~~ — ✅ Done (Session Z). HaveIBeenPwned (Leaked Password Protection) enabled in Auth → Security.
6. ~~**www CNAME**~~ — ✅ Done (earlier session). `www.clearpathedgroup.com` → `cpeg-site.pages.dev`, Proxied ON.
7. ~~**Partner Chat messages table**~~ — ✅ Already existed. Partner Chat live.
8. ~~**Business Dashboard**~~ — ✅ Verified live on `admin@waypoint.internal`.
9. **Meridian escalations table** — Escalate button logs to console only. Needs future migration for `meridian_escalations`.
10. **First pilot district** — not yet contracted. Product is sales-ready. Nova owns the sales strategy.
11. **SPF record** — add `include:spf.resend.com` to `clearpathedgroup.com` TXT record in Cloudflare DNS (needs DNS:Edit token — current token is Pages-only).
12. **AI Agent team** — Archer (CTO), Vera (COO), Nova (CRO), Sage (CMO). Docs in `docs/agents/`.
13. **SMS booking alert** — user wants text when Google Calendar appointment booked. Options: (a) email-to-SMS via carrier gateway, (b) Zapier, (c) Twilio in capture-lead on form submit. Deferred.
14. **Parent Communication Hub** — #1 pain point: timestamped call log (attempts, voicemail, certified mail) for due process hearings. Not yet built.
15. **pg_cron nurture verification** — migration 056 includes cron setup; verify it fired in Supabase dashboard → Database → pg_cron.

---

## Apex — Summit Pathway (NEW PRODUCT, Session AA)

- **Live URL:** `https://clearpath-apex.pages.dev`
- **Repo:** `jkculley-cyber/clearpath-apex` (branch: master)
- **Supabase ref:** `jvjsotlyvrzhsbgcsdfw` (separate project — different auth pool from Waypoint)
- **DB password:** `ApexClearPath2025!`
- **Auth:** OTP code entry (6-digit) — magic link kept as fallback. Resend SMTP configured. `shouldCreateUser` removed so new users get auth accounts on first sign-in.
- **Migrations applied:** 001 (core schema), 002 (pg_cron morning brief scheduler), 009 (framework + IB columns), 010 (subscription_status/paid_through/trial_started_at), `marketing_sends` table (SQL Editor)
- **Edge Functions deployed:** `transcribe-observation`, `generate-coaching-draft`, `send-observation-feedback`, `generate-morning-brief`, `send-marketing-blast`, `send-welcome-email`, `approve-access` (redeployed Session AR — OTP code instructions)
- **Secrets set:** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`
- **Supabase PAT:** Refreshed via `npx supabase login` (Session AR) — CLI authenticated locally

**Built this session:** Dashboard command center · Observation Loop (voice→Whisper→Claude→email) · Teachers Page (recency/growth arc) · Observation Review Page · Morning Brief (daily/weekly/monthly/long-range, pg_cron auto-delivers 5:50 AM CST)

**Built Session AJ:**
- Sent observation PDF fix — removed `setSent(true)` page-load bug, navigate to dashboard after send
- Morning brief root cause fix — `run_morning_briefs()` helper function (key embedded), cron calls that
- `reply_to` added to coaching emails — teachers can reply directly to principal
- 14-day trial — `trial_started_at` + `trial_path` columns on principals; migration 007 applied
- Trial banner in AppShell — last 4 days warning + expiry state with two paths
- Drip email sequence — `send-drip-email` edge function (day 3/7/14), `drip_emails_sent` dedup table
- Summer path automation — `handle-trial-extension` edge function (no JWT), records choice, schedules July 15 Resend email, notifies Kim, confirms principal
- clearpathedgroup.com updated — "Start Free 14-Day Trial" CTA, tagline copy
- `/try` route added to App.jsx
- Simplify fixes: removed `sent` state (derived from `obs.status`), parallelized Resend calls in both edge functions

**Built Session AM:**
- Dashboard walkthroughs fix — filter was `=== 'walkthrough'` but type is stored as `'informal'`; now correctly counts walkthroughs this week
- SettingsPage district fix — `principal.district` → `principal.district_name`; update payload `district` → `district_name`
- All Apex pages verified functional: TeacherDetailPage, CommunicatePage, ObservationReviewPage, SettingsPage

**Built Session AL:**
- Trial lead capture — `notify-new-trial` edge function deployed: sets `trial_started_at`, notifies Kim instantly (name/school/district/city/trial dates), sends principal a welcome email from Kim with first-obs CTA
- `saveProfile()` now returns inserted ID via `.select('id').single()` — eliminates separate SELECT query
- `notify-new-trial` accepts only `principal_id`, fetches its own data from DB — removed 6-param sprawl
- DB update + emails run in parallel via `Promise.all`

**Built Session AK:**
- pg_cron verified: morning brief firing daily (last run 2026-03-17, 3 principals, succeeded). Duplicate cron (jobid 2) removed. Drip email cron (jobid 3 → 4) confirmed active, fires 6 AM CST daily.
- Sent walkthrough access: pushed ObservationReviewPage fix (removed `sent` state, navigate on send, no success screen). Previously-sent obs now load in read-only mode.
- Recent Observations panel added to dashboard — last 5 obs (all statuses) as clickable rows. Was fetched but never rendered.
- Trial banner suppressed for demo accounts — removed `created_at` fallback; only shows when `trial_started_at` explicitly set.
- Simplify: eliminated redundant 6th DB query on dashboard (derive `recentActivity` from `allObs.slice(0,5)`), extracted `OBS_TYPE_LABEL` const.

**Built Session AN:**
- Marketing blast system — `send-marketing-blast` edge function + `marketing_sends` dedup table. 3-email visually captivating sequence. Tested live.
- Welcome email on approval — `send-welcome-email` edge function: 5-step getting started guide auto-sent when principal approved.
- Apex tab in WaypointAdminPage — violet tab with metrics, approval queue, principals table.
- Magic link speed fix — `getSession()` on mount + parallel `loadPrincipal` queries.
- Social ad copy — `docs/apex-social-ads.md`: 3 LinkedIn + 3 Facebook/Instagram ads.
- Partner briefing doc — `docs/partner-briefing-03182026.md` for Melissa.
- Clearpath website resources feature — dropdown nav + `resources.html` page.

**Built Session AW:**
- Full production audit of all 11 routes + every component
- Fixed React hooks violation (crash bug) in ObservePage + CommunicatePage — soft-gate return was before hooks
- Fixed CommunicatePage mobile layout — added responsive grid with isMobile state
- Fixed SettingsPage password form — replaced broken "Change Password" (required current pw OTP users don't have) with "Set Password" flow
- Wrapped Dashboard Notification constructor in try/catch
- Dashboard Watch List "Visit" button now passes teacherId to Observe page
- All fixes committed + pushed to master → Cloudflare auto-deploy

**Apex Pending:** ~~Build Kim admin panel for Zelle payment activation~~ ✅ Done (Session AT) · ~~Deploy edge functions (CORS+auth)~~ ✅ Deployed · ~~CSV roster import~~ ✅ · ~~Mobile optimization~~ ✅ · ~~Navigator enhancements~~ ✅ · ~~SPF record~~ ✅ · ~~Production audit~~ ✅ Done (Session AW) · Quick capture

---

## Beacon — Elementary Counselor Command Center (NEW PRODUCT, Session AU)

- **Repo:** `clearpath-beacon` (C:\Users\jkcul\clearpath-beacon)
- **Supabase ref:** Separate project (see project_beacon.md memory)
- **Data mode:** Defaults to **local mode** (IndexedDB on-device) for FERPA compliance. Cloud mode requires district DPA.
- **License enforcement:** License keys checked against ops Supabase `product_licenses` table. 5-min cache, 7-day offline grace. Soft gate: view data but can't create new records.
- **Pricing:** $8/mo or $79/yr via Zelle on clearpathedgroup.com
- **Built:** Dual-mode data layer (IndexedDB/Supabase), local setup wizard, license check system, CSV referral import, Google Form integration, 35 bundled lessons, 14 communication templates
- **License ops guide:** `docs/license-operations-guide.md`
- **Pending:** Cloudflare Pages deployment, store listing on clearpathedgroup.com, customer email templates (Vera/Nova)

## Investigator Toolkit — Campus Investigation PWA (NEW PRODUCT, Session AU)

- **Repo:** `investigator-toolkit` (C:\Users\jkcul\investigator-toolkit)
- **Data mode:** 100% on-device (IndexedDB). No cloud. No student data touches any server.
- **License enforcement:** Same system as Beacon (ops Supabase `product_licenses`). License entry screen required before first use.
- **Pricing:** $5/mo or $49/yr via Zelle on clearpathedgroup.com
- **Key generator:** `scripts/generate-license-key.mjs`
- **Distribution:** License-gated download via `/activate` page on clearpathedgroup.com (validates against ops Supabase `product_licenses`). Works from `file://` protocol (base64 JS encoding). Audio/file upload for witness statements added.
- **Pending:** Connect to Cloudflare Pages at `investigatortoolkit.clearpathedgroup.com`; student history, case locking, audit trail features

## Documentation Suite (Session AV)

- **Master credentials:** `clearpath-beacon/docs/master-credentials.md` — all usernames, passwords, URLs for Kim + Melissa
- **User guides:** 5 product user guides (Waypoint, Navigator, Apex, Beacon, Investigator Toolkit) in each repo's `docs/`
- **Terms of Service:** 5 TOS documents in each repo's `docs/legal/`
- **Ops Command Center:** Product Hub tab added — credentials, license management, infrastructure reference. Live at `clearpath-ops.pages.dev`

## Shared License Infrastructure

- **Ops Supabase:** `xbpuqaqpcbixxodblaes` — `product_licenses` table (shared authority for Beacon + Toolkit)
- **RLS:** Anon can only SELECT. Kim manages via SQL Editor or Table Editor.
- **Key format:** `BCN-XXXXXX-XXXX` (Beacon), `INV-XXXXXX-XXXX` (Toolkit)
- **Kim's test keys:** `BCN-YNJRVF-KRC3`, `INV-E5KZ2X-RNCP` (active until 2027-06-01)

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

- `supabase/migrations/` — migrations 001–052 all applied to production; don't re-run earlier ones
- `.env.local` — credentials live here; do not commit
- Demo seed data (Lone Star ISD) — keep intact for demos
