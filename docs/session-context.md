# Session Context — Waypoint
> Last updated: 2026-04-29 (Session CC15 — Navigator round-2 adversarial multi-voice audit + T2.5/T2.6/T2.7 + B1–B4 patches + audit.js entity_id fix + migration 069 staged. **Round-2 verdicts:** Sam Ortega (Panorama poacher) 65/35 → 58/42 (Navigator gain); **Marsha Wilkerson 42% → 72%**; Reyes IDEA exposure SEVERE → ELEVATED, Title VI SEVERE → COLORABLE; Chen still conditional pass. Six round-1 convergent findings closed: F1 (10-day SPED rule) ✓, F2 (parent notice) ✓, F3 (audit log) ✓, F4 (disproportionality disagg + small-cell + longitudinal trend) ✓, F5 (escalation block-with-override + suggested alternative) ✓, F6 (reason-history with as-of-placement timeline + edit-history disclosure) ✓. Round-2 audit surfaced six NEW convergent findings; four shipped this session as B1–B4: (B1) "edited Nx" amber chip on placement list view actions cell so APs can see at a glance which records have been touched (Sam #3); (B2) per-student risk triggers + risk score now shown inline in escalation bulk-create modal pre-flight panel (Sam #4); (B3) migration 069 — `fn_navigator_parent_notice_set()` now RAISES `P0001` on client-set `parent_notified_at` instead of silent-overwrite, smoke-test 3 split into 3a (reject loud) + 3b (omit→server-set) (Marsha A); (B4) "Parent Notified" cell now shows `Yes · Nd after` lag chip with color escalation (same-day emerald → 4+d red) + tooltip with full server timestamp + interpretation, makes the entry-vs-call-time lag visible from the list (Sam #2). **B3 migration 069 NOT YET APPLIED to production** — staged at `supabase/migrations/069_navigator_parent_notice_strict.sql` + `supabase/run_069.mjs`; user needs Waypoint-scoped `SB_PAT` (Apex PAT returned 401) or SQL Editor paste. Audit.js entity_id required-guard fix: discovered `audit_log.entity_id` is NOT NULL in production but `audit.js` was falling back to `null`; fixed to skip + console.error before reaching DB. Verified `audit()` has zero callers in `src/`, so the issue was latent — Chen's CC14 round-1 claim "Waypoint app-layer audit() still broken" turns out to be misdiagnosed: the function is dormant, not actively failing. Real T3 gap surfaced: Waypoint mutations outside incidents (profiles, students, transitions, interventions, alerts, orientations) have no audit coverage at app layer. Five new decisions logged. Two round-2 items deferred to future bundles: B5 "at-risk returning" view (~1.5h, Marsha B), B6 Hearing Packet snapshot toggle (would weaken Reyes-praised edit-history disclosure; counter-productive). Repo housekeeping: deleted stale `scripts/probe-audit-log.mjs` (one-shot diagnostic) + stray `nul` artifact at repo root.)
>
> 2026-04-28 (Session CC14 — adversarial multi-voice audit on Navigator + T1+T2 round-1 patches shipped + smoke-tested 7/7 against production. Three voices in parallel: Sam Ortega (Panorama sales engineer poaching Lincoln HS), Marsha Wilkerson (12-yr AP at Title-I middle school), Alana Reyes (IDEA + Title VI plaintiff's attorney) + Vikram Chen (district CIO). **Marsha 42% — "Not Ready"** baseline; Beacon comparable was 40% before round 1. Six convergent findings caught by 2+ voices. **T1 shipped (migration 066):** `manifestation_determinations` table + 10-day SPED rule trigger blocking placement #N when SPED + cumulative ≥10 without MDR link (RAISE EXCEPTION P0001 with IDEA 34 CFR §300.530 message); `parent_notified_method` enum + `parent_contact_notes` + server-side trigger that sets `parent_notified_at` and rejects client clock; fail-loud audit triggers on referrals/placements/supports/MDR with old+new JSONB capture and free-text history append. **T2 shipped:** `useDisproportionalityByRace()` hook with OCR risk-index + severity buckets (within_range / elevated / high / severe) + small-cell suppression at n<10 + Section 504 + SPED disability rows; reason-history viewer modal with "Edited Nx" chip; Hearing Packet single-click PDF (`src/lib/navigatorPdf.js`, FERPA-watermarked, 8 sections including post-hoc edit disclosure); Escalation Engine pre-flight panel showing each student's active+recent supports with DUPLICATE / PRIOR FAILURE chips + skip-duplicates toggle. **Migration 067:** corrective audit-trigger fix — discovered production `audit_log` has `(user_id, changes JSONB)` shape, NOT the `(actor_id, actor_role, old_values, new_values)` shape declared in migration 035 source; `audit.js` has been silently rejecting every Waypoint audit write since 035 landed; fixed audit.js + useEntityAuditTrail + Navigator triggers to use production shape. **Migration 068:** PL/pgSQL nested-IF fix — `AND` doesn't short-circuit inside IF conditions; rewrote shared audit trigger with nested IFs per table. **Smoke test 7/7 PASS** via `scripts/smoke-test-066.mjs` (authenticated as admin@lonestar-isd.org for real auth.uid). Three new decisions: fail-loud audit triggers; PL/pgSQL trigger gotcha + workarounds; production audit_log shape divergence + general rule on probing prod schema. T3 backlog (Navigator): SIS integration, mobile-first, RLS function-based policies, CSV import limits, effectiveness reframe, SOC 2.)
>
> 2026-04-28 (Session CC13 — round-4 adversarial audit + ~20 fixes shipped + Cloudflare Pages routing blocker discovered. **Round-4 audit results:** Marcia 82%→**84%** "buy. Confidently. Ship and call it 1.0." SCUTA priority list collapsed — "self-witnessing" attack DEAD as primary, audit-log gap dropped from fear list, cloud-mode + SSO promoted to #1. Adversary lawyer on the record: **"the record is admissible. Its weight is for the jury."** Daubert framing withdrawn as wrong question — Rule 803(6) trustworthiness is the actual standard and Beacon now passes admissibility. CIO concerns #7 (consumer-cloud guardrail) and #8 (verify URL 404) moved to **GREEN-RESOLVED**; #9 (auto-backup encryption) green-leaning. NEW district-adoption posture: defensible as **"secondary tool alongside primary SIS under written carve-out"** with four conditions. **Tier 1 (5 fixes shipped d6daedc):** sync-status copy honest about local-vs-cloud confirm; PDF footer dual-timestamp clarity (client-recorded receipt + verify URL pointer); SQL CHECK constraint on `pdf_attestations.generated_at` ±5 min from now() blocks fabricated past timestamps even from service-role-key holder (NOT VALID; verified blocking via curl — 23514); Crisis picker fuzzy-match Levenshtein "Did you mean DeShawn Williams?" callout before "+ Add new student"; Safari/Firefox banner explaining backup-folder feature is Chromium-only (UA detection). **Tier 2 (Beacon-side shipped e7da177):** PWA cache-bust banner via `vite.config.js` build-stamp + `version.json` poll + "New version available" toast + service-worker SKIP_WAITING + `caches.delete()`; lost-license recovery flow with "Forgot your key?" link → modal → POST to `/api/recover-license` → ops Supabase lookup → Resend email with anti-enumeration. **Tier 2 (Cloudflare-side BLOCKED):** verify subdomain + `/api/recover-license` Pages Function won't route — cpeg-site Pages project has stuck function manifest where only the original `welcome.js` registers; new function files upload but get 200-marketing-HTML fallback. Migrated workflow legacy `cloudflare/pages-action@v1` → `cloudflare/wrangler-action@v3`; didn't unblock. Likely platform-side issue requiring Pages project recreation (Option A). **Earlier in session:** real returning-customer signin flow with `?signin=1` reframing + restore-from-backup `.bcnbkp`; Crisis picker walk-in fix (add-new-student inline); redundant suicide question removed + new disposition step; parent + admin notification draft no longer prints form-fill time as if it were incident time; $79/school year → $79/year copy. **Attestation chain works end-to-end now**: pdfAttestation.js uses `Prefer: return=minimal` + client-generated UUID; server's DEFAULT now() is authoritative timestamp; CHECK constraint blocks tampering; verify URL surfaces server time. Five new decisions logged. Three follow-ups deferred: Cloudflare Pages project recreation tomorrow + check overnight whether routing stuck manifest cleared, RESEND_API_KEY env var, mobile crisis-log experience (Marcia: "I'm in the cafeteria, on the playground, in the bus loop").)
>
> 2026-04-27 (Session CC12 — Beacon dashboard polish + three-round adversarial audit + T1 legal-defensibility + T1.5/T1.6 wound-closure. **Dashboard polish:** Quick Time Tracker restored to a 2-up action card row + per-stat drill-downs on every dashboard data point + sidebar logo block tightened (no more 56px black void on desktop). **Three-round adversarial audit** (competitor SCUTA / naysayer Marcia / adversary lawyer+CIO) ran twice with patch rounds in between. **Round 1:** found 5 structural wounds. **T1 patch (`947f780`):** crisis retroactive_minutes + amber RETROACTIVE PDF banner; SHA-256 content-hash on Crisis/Due-Process/SB-179 PDFs (new `pdfIntegrity.js`); license check fail-closed; CREST attachment MIME whitelist; referral form length caps + per-browser rate limit; service worker BEACON_PURGE_CACHE on signOut; dashboard 2-click quick-log (sticky domain pill + 15/30/45/60 duration); 3:30 PM time-log nudge; Friday auto-backup-to-disk. **Round 2 audit:** Marcia 40%→58%, three convergent findings — Friday auto-backup is plaintext FERPA exposure (CIO Concern #9 WORSENED), SHA-256 hash has no third-party witness (lawyer's Q15 attack), localStorage rate limit is honor system (CIO Concern #4). **T1.5/T1.6 patch (`e93bfce`):** AES-GCM-256 encrypted backups with PBKDF2(license+email, 210k iters) magic-byte format + backward-compat with legacy plaintext (new `backupCrypto.js`); File System Access API folder picker for sync-folder backups (new `backupFolder.js`); ops Supabase `pdf_attestations` table with anon-INSERT-only RLS as third-party witness (new `pdfAttestation.js` + `docs/ops-pdf-attestations-schema.sql`); Crisis "Now / Earlier" toggle replaces freeform datetime; Cloudflare Turnstile on public referral form. **`b9804a3`:** Turnstile site key hardcoded as fallback when env var unset (site keys are public by design). **`pdf_attestations` SQL applied to ops Supabase by user.** **Round 3 audit results:** Marcia 58%→**82%** "buy. no caveats." SCUTA: priority list reshuffled — cloud-mode + SSO promoted to #1, audit-log "60% closed" downgraded to #2, new #3 "RFC-3161 / bonded TSA integration would kill our self-witnessing attack." Adversary: Daubert posture "summarily fails" → "colorable but rebuttable" → **"closer. Not yet."** New blocker found: the verify-attestation URL stamped on every PDF currently 404s on the marketing site (CIO Concern #8 WORSENED, lawyer's Q26). Adversary's PMF verdict: *"encrypted local-first PWA with a third-party timestamp witness is a real value proposition for a solo LPC who is not a school district."* Three follow-ups deferred to next session: verify-attestation page on clearpathedgroup.com (4-hour blocker per CIO); backup sync-status display in Settings (Marcia's polish ask); consumer-cloud-guardrail confirm on folder picker (adversary Q28). Five new decisions logged.)
>
> 2026-04-27 (Session CC11 — Beacon CREST Phase 2 + 5-feature transformative release. **CREST Phase 2** shipped: auto-derive virtual artifacts from existing Beacon data (Time Tracker → Cat-2 SB 179, Sessions/Referrals → Cat-4, Lessons → Cat-5, Communications → Cat-4 system support, Schedule → Cat-1) with "Promote to Portfolio" snapshot button; Portfolio PDF export with cover + per-category page breaks; file attachments on artifacts (5 MB cap, base64 in IndexedDB); District Preview CREST Readiness rollup widget with district avg / on-track / at-risk / auto-derived stats + per-counselor click-drillable table. **5-feature transformative release** (IndexedDB schema bumped v4 → v5 with 4 new stores in one migration): (1) Native PWA browser notifications + ICS calendar export with anonymized titles by default, (5) Local-mode session-note SOAP templates (10 categories: regulation/grief/academic/family/bullying/friendship/trauma/mood/goal/closure) with prompted-fields → live preview → stitched output, (4) Daily Morning Brief dismissible Dashboard card aggregating today + this-week + deadlines + signals, (3) Parent Communication Hub enrichment with outcome enum + USPS tracking + auto-3-business-day follow-up on unanswered + escalation banner + Due-Process Documentation PDF, (2) Crisis Quick-Launch + CPS workflow — floating red 🚨 button on every authed page → 4-trigger structured workflows (suicide / threat / abuse / distress) with auto-scheduled 24h/72h/1wk follow-ups + drafted parent + admin notifications + defensible timestamped PDF. Crisis-button overlap with Dashboard FAB fixed (stacked at bottom: 96). 38/38 logic tests passing. Five new decisions logged: Beacon transformative-features path, voice-must-be-local-Whisper-WASM, crisis-screens-original-wording, follow-up-auto-scheduling-non-negotiable, native-notifications-via-service-worker.)
>
> 2026-04-26 (Session CC10 — major Beacon expansion. **Teacher referral feature** shipped: mailto: relay (zero Clear Path infrastructure), QR code, TinyURL auto-shortening, "Email to Teacher" button, paste-from-email import, Schedule-1:1-Session option in Accept modal, per-counselor routing verification badge. **Safety alert system** shipped: harm-to-self / harm-to-others checkboxes on the teacher form, `[SAFETY ALERT]` mailto subject prefix, prominent red Active Safety Alerts section at top of queue, global red banner in AppShell visible on every page. **District Demo Preview** shipped at /district-preview: 3 tabs (KPI dashboard / counselor roster / 6 sample reports incl. Board Slide Deck), every district KPI + Crisis stat + Alert is now click-drillable with breakdown chart + interpretation. **CREST Award Tracker** shipped at /crest: year-long portfolio mapped to TSCA's 5 Texas Model categories, deadline countdown, per-category progress, IndexedDB-backed. **TEC citation sweep** complete — 19 fixes across 14 files (3 repos): §32.158 doesn't exist (corrected to §32.157), §37.0052 doesn't exist (David's Law is §37.0832), §37.0041 doesn't exist (MDR is §37.004(b)), §37.0151 was wrong subject for RSO (corrected to §§37.301-37.314), §37.005 mislabeled as "Removal by teacher" in 2 files, §37.007 cited as Discretionary DAEP (it's expulsion), SB 179 conflation between 2017 cyberbullying and 2019 counselor-80/20 disambiguated. **Beacon district pricing**: $79/counselor/year for individuals AND districts, "Bringing Beacon to Your District" section + calculator added to beacon-product.html. PDF gibberish fixed in District Preview reports (Unicode chars replaced with ASCII for jsPDF reliability). Investigator Toolkit fix shipped — the §37.0052 typo had been live in shipped code. **TX-NDPA prep package** drafted (docs/legal/TX-NDPA-vendor-prep.md + clearpath-site/dpa.html) but **held uncommitted** awaiting vendor info from user.)
>
> 2026-04-26 (Session CC9 — Beacon defense-in-depth: shipped `ConfirmDestructive` modal with "download backup first" checkbox wired to Clear Sample Data + Restore from Backup; hidden the broken Cloud-mode toggle in Settings; deleted the dead AI-Generate code in CommunicationsPage. Queued a district expansion readiness audit for when a district is ready to sign a DPA.)
>
> 2026-04-23 (Session CC8 — critical Beacon bug fix: `clearSampleData` was wiping every counselor's real data, not just seeded demo rows; tag-and-filter fix + legacy name fallback shipped (Beacon ff5161f). Nicole's data was unrecoverable (IndexedDB no backup). Modal form-reset sweep across suite: 5 more Beacon modals fixed, 3 Waypoint Meridian modals fixed (c49d177) — including `LinkWaypointModal` which carried a wrong-student-link risk. Apex and Toolkit clean. Two new DECISIONS entries: (1) clear-demo actions must filter by tag, never tenant-wide; (2) modals with `open` prop must reset state in `useEffect([open])`.)

---

## Active State

- **Development phase:** Pre-pilot — product feature-complete, ready for first district pitch
- **Waypoint app URL:** `https://waypoint.clearpathedgroup.com` (also `app.clearpathedgroup.com`)
- **Company website:** `https://clearpathedgroup.com` (marketing site, static HTML in `clearpath-site/`)
- **Marketing site features:** Company-level site for Clear Path Education Group. **Hero carousel** cycling Waypoint + Apex every 5 seconds. Technology Suite (Waypoint + Apex live, Navigator + Meridian coming 2026). **Apex pricing section** with Zelle QR + Buy Now CTA. **Interactive pricing calculator**. **Free Compliance Checklist** lead magnet. Google Slides embed + narrated video. SEO/sitemap/robots.txt. Cloudflare Web Analytics. Security page `/security.html`. Research page `/research.html`. **Store** (`/store.html`) with TpT + Zelle dual purchase options. **4 lead capture channels** all → Formspree `xpqjngpp`: demo form (`source=demo_request`), pilot application form at `#pilot` (`source=pilot_application`), floating widget (`source=chat_widget`), whitepaper email gate (`source=whitepaper_gate`). **Floating "Talk to Our Team" widget** with 7 personalised auto-replies by compliance challenge. **Dedicated pilot application form** at `#pilot` (district name, role, size, DAEP volume, urgency). **Nav has "Apply for Pilot Spot" button**. **clearpath-logo.svg** — SVG compass logo, transparent bg, sharp at all sizes. ⚠️ Site must remain company-level — not a Waypoint product page (see DECISIONS.md 2026-02-28).
- **whitepaper.html:** 20-point DAEP compliance self-audit checklist, 5 sections with TEC citation callout boxes, scorecard with scoring bands (18–20 compliant / 14–17 at risk / <14 urgent), print-optimized CSS, "Save as PDF" button. Lead magnet for district sales.
- **Hosting:** Cloudflare Pages — `waypoint` project (app, deployed via GitHub Actions on push to `main`), `cpeg-site` project (marketing site, deployed via GitHub Actions `deploy-clearpath-site.yml` on push to `main` — **do NOT use `node deploy-clearpath.mjs` Direct Upload**, it creates broken deployments)
- **Supabase project:** `kvxecksvkimcgwhxxyhw` (single project, all tenants)
- **Migrations applied:** 001–068 (production). Migration 061: home campus DAEP handoff schema + trigger. Migration 062: `students.is_mtss`. Migration 063: students INSERT RLS for principal/ap/counselor. Migration 064: `navigator_student_monitors` (per-student configurable alerts). Migrations 066/067/068 (CC14): Navigator T1+T2 — `manifestation_determinations` + 10-day SPED trigger + parent-notice trigger + reason/description history + audit-log fail-loud triggers, with shape-fix corrections in 067 + nested-IF fix in 068. **Migration 069 staged but NOT applied (CC15):** parent-notice trigger upgraded to RAISE on client-set timestamps instead of silent-overwrite. Apply via `SB_PAT=sbp_... node supabase/run_069.mjs` or paste SQL Editor.
- **Demo seed data:** `supabase/seed_demo_video.mjs` — 12 active incidents, 6 transition plans, 57 days behavior tracking (Marcus/David/DeShawn), parent auth user `parent.marcus@gmail.com` / `Password123!` (Sandra Johnson, guardian of Marcus). `supabase/seed_navigator.mjs` — 13 referrals, 28 placements (6 completed + 2 active + 20 prior year), 6 supports, 3 campus goals seeded for Lone Star ISD (8 student risk scenarios: 3 HIGH, 3 MEDIUM, 2 LOW). 2 active placements (Marcus OSS, DeShawn ISS — no end_date) power the Active ISS/Active OSS tabs. `supabase/seed_meridian.mjs` — 9 SPED students, 4 IEPs, 2 504 plans, 3 ARD referrals, 1 CAP finding seeded for Lone Star ISD. Both Navigator and Meridian **enabled** for Lone Star ISD. Both seeders use Supabase REST API (no DB password needed).
- **Demo video script:** `docs/brand/demo-video-script.md` — full production package rewritten Session T. 10 HeyGen blocks (≤840 chars each), student-first framing, T.E.A./I.E.P./P.E.I.M.S. abbreviations with periods. B-roll shot guide (7 clips) at bottom of script.
- **Demo district:** Lone Star ISD (seeded), `admin@lonestar-isd.org` / `Password123!`
- **Waypoint admin:** `admin@waypoint.internal` / `Waypoint2025!` → `/waypoint-admin`
- **Purchase-to-license loop (rebuilt 2026-04-20 as 2-step):** On `store.html` the buyer clicks Buy Now → **Step 1** form captures name/email/plan/school BEFORE the QR code is revealed → on submit, both ops `demo_leads` (REGISTER: prefix) and Formspree fire in parallel → **Step 2** reveals the Zelle QR, memo, and personalized confirmation showing her name + email. If both notification channels fail, the UI blocks progression. **Server-side backstop:** ops Supabase trigger `trg_notify_purchase_registration` on `demo_leads` INSERT fires Formspree again via pg_net — browser failure alone can't lose a buyer now. Kim then verifies Zelle deposit → clicks "Generate License" in Waypoint Admin → Leads → dialog produces key + mailto email using template at `clearpath-beacon/docs/beacon-welcome-email.md` (monthly/annual variants, no auto-renewal language)
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

1. **Apply migration 069 to production** (CC15 carryover) — `supabase/migrations/069_navigator_parent_notice_strict.sql` upgrades parent-notice trigger to RAISE instead of silent-overwrite. The Apex PAT in CLAUDE.md memory returned 401 against the Waypoint project. Either: (a) provide a Waypoint-scoped `SB_PAT` env var and run `SB_PAT=sbp_... node supabase/run_069.mjs`, or (b) paste the SQL into the Supabase SQL Editor at https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new. After apply, re-run `node scripts/smoke-test-066.mjs` — test 3 has been split into 3a (expects rejection) + 3b (server timestamp on omit); both should pass.
2. **Round-3 adversarial audit on Navigator** — re-run the 3-voice cadence (Sam Ortega / Marsha Wilkerson / Reyes+Chen) against the post-CC15 Navigator. Beacon went 40 → 58 → 82 → 84 across 4 rounds; Navigator at 72% after round 2 (Marsha) is on track for "ship and call it 1.0" after round 3 if convergent findings come back at <3.
3. **5-minute UI walkthrough of CC14+CC15 Navigator changes** — Disproportionality by-race section + new Trend column (may need `students.race_ethnicity` populated in demo data first), Hearing Packet PDF on a student page (slate button), Escalation Engine pre-flight panel + new risk-trigger chips + skip-prior-failures + Switch-to-alternative button, Placements list "Parent Notified · Nd after" lag chips, "edited Nx" badges on placement list rows.
3. **Cloudflare Pages routing recheck (CC13 carryover)** — first thing in the morning, before doing any other Cloudflare work. Test `curl -s 'https://clearpathedgroup.com/api/ping'` — if it returns `{"ok":true,"source":"ping"}`, the stuck manifest cleared overnight on its own and T2.6 + T2.8 are unblocked. If it still returns marketing HTML, **execute Option A** from the CC13 handover: delete the cpeg-site Pages project + recreate from same GitHub repo + re-add custom domains (`clearpathedgroup.com`, `www.clearpathedgroup.com`, `verify.clearpathedgroup.com`) + re-add env vars (`OPS_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `VITE_TURNSTILE_SITE_KEY`). ~10 min focused ops work.
2. **Set `RESEND_API_KEY` Cloudflare Pages env var** (CC13 carryover) — needed for `/api/recover-license` to send recovery emails. Get from https://resend.com/api-keys. Set as encrypted secret on `cpeg-site` Production env. Clearpathedgroup.com sender domain is already verified per CC11.
3. **Verify-attestation page on clearpathedgroup.com** (CC12 — page deployed, but `/api/verify-attestation` lookup blocked on #1 above) — 4-hour fix the adversarial audit named the single highest-leverage change on the board. Every Crisis / Due-Process / SB-179 PDF Beacon generates currently stamps `Verify: clearpathedgroup.com/verify-attestation` in the footer, but that URL 404s. Build the page on `clearpath-site/verify-attestation.html`: takes a hash query param, queries ops Supabase `pdf_attestations` (service-role read via Cloudflare Worker, since anon has no SELECT), shows `(counselor_id_anonymized, document_kind, generated_at, attestation_id)` if found or "no attestation row found" if not. Reviewer types in the hash from the PDF footer and gets yes/no within 5 seconds. Until shipped, every PDF generated this week points at a missing page on the vendor's own website — adversary's Q26 attack.
2. **Backup sync verification in Beacon Settings** (NEW from CC12 — Marcia's only remaining polish ask) — after every silent write to the picked folder, read the file back via the same `FileSystemDirectoryHandle` and surface `Last successful off-device sync: 2026-04-26 14:32` in Settings. Closes the "OneDrive paused and I'd never know" gap. ~30 min.
3. **Consumer-cloud guardrail on folder picker** (NEW from CC12 — adversary Q28) — one-time confirm dialog on first folder pick: *"Confirm this folder is on a district-managed cloud (Google Workspace for Education, Microsoft 365 for Education) — not a personal OneDrive or iCloud account. Personal cloud accounts do not include the FERPA-addendum agreements your district has."* ~20 min.
4. **Manual smoke walkthrough on `beacon.clearpathedgroup.com`** (carryover from CC11) — once Cloudflare deploy lands. Hard-refresh required (PWA service-worker cache). Test paths: Settings → Reminders & Calendar Export (enable browser reminders, send test, download .ics, import to Google Calendar); Sessions → Quick Log → Use template → fill 4-5 fields → save with the SOAP note populated; Dashboard first-load → Morning Brief card with stats + dismiss; Communications → log voicemail outcome → see follow-up appear, log 2 more → see escalation banner → Due-Process PDF; floating red 🚨 Crisis Now → walk through suicide workflow → confirm follow-ups + PDF.
2. **Voice capture build** (DEFERRED from CC11) — 2-3 weeks. Whisper-WASM via `@xenova/transformers` in a Web Worker + `MediaRecorder` capture + transcription pipeline + parser. Should ship after the 5 features above bake for ≥1 week. Per CC11 decision: local-only, audio discarded by default, model file the only network call.
3. **TX-NDPA finalization** (CC10 carryover) — vendor-prep package still drafted but uncommitted at `docs/legal/TX-NDPA-vendor-prep.md` + `clearpath-site/dpa.html`. Needs from user: (a) Clear Path full registered legal address + state of formation, (b) authorized signatory name + title, (c) decision on `privacy@clearpathedgroup.com` mailbox vs `support@` for the privacy contact.
4. **Vera Beacon user guide rewrite** — **OVERDUE since 2026-04-25**. Now must cover: Teacher Referrals, Safety Alerts, District Preview, CREST tracker (CC10), CREST Phase 2 auto-derive + portfolio PDF, PWA Reminders + ICS export, Session-Note Templates, Morning Brief, Parent Communication Hub due-process flow, Crisis Quick-Launch (CC11). Brief at `docs/handovers/vera-beacon-userguide-brief-04202026.md` is now well out of date.
5. **AI session-note expansion (cloud mode)** (NEW from CC11) — now that local templates ship, the cloud version is one Edge Function away. Claude API takes the same shorthand input + counselor style profile and produces a real expansion (not template-stitched). Gated behind district DPA listing Anthropic. Same architecture pattern as Apex's coaching draft edge function.
6. **Cloud-mode Supabase migration** (CC10 + CC11) — needs to cover the v5 schema additions (`crisis_events`, `parent_contacts`, `follow_ups`, `session_note_templates`) PLUS the CC10 columns (`harm_to_self`, `harm_to_others`) on `referrals`. Required before any cloud-mode district ships.
7. **CREST Phase 3** (NEW from CC11) — Phase 2 auto-derive shipped. Phase 3 candidates: per-category narrative-prose generation (Claude API, cloud-only) that takes the auto-derived data and writes the application narrative; multi-year portfolio rollup (Year 1 / Year 2 / Year 3 → CREST Leadership Level path); cohort-comparison view for districts (counselor 1 vs counselor 2 portfolios side-by-side).
8. **Confirm first post-CC6 store purchase** — once the next real buyer comes through `store.html`, verify both browser-side notification + DB trigger fired, AND the Beacon/Apex welcome email link reaches them through a school firewall.
9. **District expansion readiness audit (Beacon)** — CC9 entry; expanded by CC11. When a district shows up ready to sign a DPA, what's missing? Confirm: (a) Cloud auth + LoginPage flow wired end-to-end, (b) DPA template (TX-NDPA above), (c) local→cloud migration tooling for individual counselors converted to district seats, (d) multi-counselor district admin UI, (e) seat-based license model in `product_licenses`, (f) cloud-mode schema migrations covering v5 stores. Inventory each gap with effort estimate.
10. **Test PDF templates visually** — generate sample PDFs from each product, verify page breaks. CC10 fixed Unicode gibberish in District Preview; CC11 added Crisis Documentation PDF + Due-Process PDF + CREST Portfolio PDF. Walk through all PDF outputs in a real viewer.
11. **Toolkit B- → B+** — completeness indicator, contextual help, email case PDF.
12. **Consider publishing Waypoint pricing** with seat counts + term length — biggest remaining conversion lever.
13. **Social proof** — get one named testimonial.
14. **Send demo emails** to 10 Formspree leads (carryover).
15. **Campus-scoped dashboard filter** — principals need campus dropdown.

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
- **Permission slip tracker (CC7 — 2026-04-21):** `students.permission_slip_on_file` + `permission_slip_signed_date` (migration 003 applied). One-click checkbox in StudentDetailPage header, full controls in EditStudentModal, Permission column + filter + 3-chip summary stat row on StudentsPage, CSV import/export round-trip.
- **Teacher referral relay (CC10 — 2026-04-26):** mailto:-based zero-Clear-Path-storage architecture. Per-counselor share URL (`?to=email&n=name`) shortened via TinyURL, encoded into a QR code, printable as a poster. Teacher submission opens their email client with a pre-filled body (structured `--- BEACON REFERRAL ---` block); counselor pastes the email body into Beacon's "Import from Email" modal which detects all blocks and batch-inserts. Accept modal now offers Individual Services / Schedule 1:1 Session / Existing Group. Verification badge in Share modal proves the link routes only to the counselor's email.
- **Safety alert system (CC10 — 2026-04-26):** harm-to-self / harm-to-others checkboxes on the teacher form, `[SAFETY ALERT]` mailto subject prefix, prominent red Active Safety Alerts section at top of Referrals queue, **global red banner in AppShell visible on every page** (polls every 30s + on focus). Trigger: `urgency === 'Urgent' || concern_type === 'Crisis' || harm_to_self || harm_to_others`. Helper: `src/lib/referralAlerts.js`.
- **District Demo Preview (CC10 — 2026-04-26):** at `/district-preview`, accessible from Settings → "Pitch Your District". Three tabs (KPI dashboard / counselor roster / 6 sample reports). Every district KPI + Crisis stat + Alert is **click-drillable** with breakdown chart + interpretation. Six exportable sample reports incl. Board Slide Deck (5-slide landscape PDF). Mock data tuned for coherent demo story (1 noncompliant counselor, 2 borderline, 1 over-ratio campus). PDF text uses ASCII-only chars for jsPDF reliability.
- **CREST Award Tracker (CC10 — 2026-04-26):** at `/crest`, sidebar nav. Year-long portfolio collection mapped to TSCA's 5 Texas Model categories. IndexedDB-backed (`crest_artifacts` store, DB version 4). Deadline countdown to next November 1, per-category progress bars, suggested artifact types per category with one-line hints, drill-down view with add/edit modal. Sources: TSCA PSCC CREST page + Lewisville ISD + Irving ISD references.
- **License ops guide:** `docs/license-operations-guide.md`
- **Pending:** Cloudflare Pages deployment (custom domain), store listing on clearpathedgroup.com, customer email templates (Vera/Nova), Cloud-mode Supabase migration for `harm_to_self` / `harm_to_others` columns, CREST Phase 2 (auto-populate + portfolio PDF export).

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
