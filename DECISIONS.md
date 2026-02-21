# Waypoint — Decision Log

> **Rules:**
> 1. Check this file before making any architectural, product, compliance, or go-to-market decision.
> 2. This file wins over all other docs (including CLAUDE.md) on decisions.
> 3. New decisions go at the TOP of the relevant section with date.
> 4. Never remove old decisions — mark as `[SUPERSEDED by YYYY-MM-DD entry]` if they change.

---

## Architecture & Technology

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-21 | **PWA implemented manually (no vite-plugin-pwa).** `public/manifest.json` + `public/sw.js` + index.html meta tags. Service worker uses network-first for navigation, cache-first for static assets, skips all `supabase.co` requests. | vite-plugin-pwa had peer dependency conflicts with Vite 7. Manual implementation is simpler and sufficient for pre-pilot stage. |
| 2026-02-21 | **`vite.config.js` includes `optimizeDeps: { include: ['react-is'] }`.** | recharts v3 requires `react-is` but Rollup 4 can't resolve it from recharts' internal ESM path without pre-bundling. |
| 2026-02-21 | **Email sender uses `onboarding@resend.dev` (Resend sandbox) until `waypointdaep.com` domain is verified.** Edge Function `send-notification` deployed to project `kvxecksvkimcgwhxxyhw`. | Domain verification requires DNS access. Sandbox sender fully functional for testing. |
| 2026-02-21 | **Supabase PAT (`sbp_...`) is the correct format for CLI auth.** `sb_secret_...` format is not a valid PAT. DB password is separate from both and must come from Project Settings → Database. When DB password unavailable, use SQL Editor. | Learned during migration deployment. |
| 2026-02-19 | **`waypoint_admin` role has `district_id = NULL`.** Profile exists but is not scoped to any district. AuthContext skips district fetch when `district_id` is null. Tier defaults to `'enterprise'`. | Internal Waypoint staff need cross-district access without being tied to a tenant. |
| 2026-02-19 | **Internal admin panel lives at `/waypoint-admin`, standalone (no AppShell), guarded by `RequireAuth` + `RequireRole([ROLES.WAYPOINT_ADMIN])`.** | Mirrors kiosk pattern — standalone full-screen page outside district context. |
| 2026-02-19 | **`VITE_SUPABASE_SERVICE_ROLE_KEY` is acceptable in the frontend for `/waypoint-admin`.** | This page is only accessible to authenticated `waypoint_admin` users — it is an internal tool, not a public endpoint. Not acceptable for any district-facing page. |
| 2026-02-19 | **Laserfiche import uses `laserfiche_instance_id` as the upsert key on incidents.** Students matched by `first_name + last_name` (case-insensitive). Created with synthetic student ID `LF-LASTNAME-FIRSTNAME-G{grade}` if not found. | C_no is empty in Laserfiche exports. Instance ID is always populated and unique. |
| 2026-02-19 | **`students.date_of_birth` is nullable** (migration 027). Laserfiche reports don't include DOB. Districts may import students from Laserfiche before SIS sync. | Students created from Laserfiche won't have DOB until a SIS import fills it in. |
| 2026-02-19 | **`import_history.import_type` CHECK constraint includes `'laserfiche_daep'`** alongside the four original types. | Added by patch in same session as migration 027. |
| 2026-02-19 | **Error boundary wraps the entire app in `main.jsx`.** Class component (`ErrorBoundary.jsx`) catches unhandled React errors and shows a "Refresh Page" recovery screen. | Blank screen on crash is unacceptable for district staff mid-workflow. |
| 2026-02-19 | **Password reset flow at `/reset-password`.** Supabase `resetPasswordForEmail` with `redirectTo` pointing to this route. Page handles both modes: send-email and set-new-password (via `PASSWORD_RECOVERY` auth event). | Pilot districts need self-service password reset. Supabase SMTP must be configured before go-live. |
| 2026-02-19 | **PostgREST FK disambiguation uses explicit constraint name hints.** Format: `table!constraint_name`. | Bidirectional FK relationships cause silent ambiguous join errors without this. |

---

## FK Constraint Name Registry

| Constraint | Relationship |
|-----------|-------------|
| `fk_incidents_compliance` | incidents → compliance_checklists |
| `fk_incidents_transition_plan` | incidents → transition_plans |
| `fk_tpr_plan` | transition_plan_reviews → transition_plans |
| `fk_tpr_reviewer` | transition_plan_reviews → profiles |
| `fk_si_plan` | student_interventions → transition_plans |
| `incidents_reported_by_fkey` | incidents → profiles (reported_by) |

---

## Database Schema

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-19 | **Single Supabase project, multi-tenant via `district_id`.** All districts share one database. RLS enforces row-level isolation. | Simplest operational model for early stage. Re-evaluate at 50+ districts or if a district requires data residency. |
| 2026-02-19 | **Migrations numbered sequentially (001–027).** Each migration is idempotent where possible (`IF NOT EXISTS`, `IF EXISTS`, `DROP CONSTRAINT IF EXISTS`). | Allows re-running migrations safely in development. |

---

## Compliance & Regulations

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-19 | **All TEC section numbers must be verified.** Never generate plausible-sounding TEC references. If the exact section is unknown, say so and mark it for verification. | Districts will cross-reference. A wrong citation destroys credibility. |
| 2026-02-19 | **SPED compliance triggers are non-negotiable.** `trg_check_sped_compliance` must fire on every incident involving DAEP/expulsion for a SPED/504 student. Blocking placement is a feature, not a bug. | Federal IDEA compliance. Missing a manifestation determination is a legal liability for the district. |
| 2026-02-19 | **MDR countdown starts from the discipline decision date, not the incident date.** Must be completed within 10 school days per TEC 37.004. | This distinction matters for compliance checklist date calculations. |
| 2026-02-19 | **Kiosk RLS uses `USING (true)` — permissive for demo only.** Must be tightened before any district goes live. | Current policy allows any anon user to query student data if they know the endpoint. Fine for demo; not for production. |

---

## Product & Features

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-19 | **Laserfiche status mapping:** `In progress + "DAEP" step → active`, `+ "Back to CBC" → returned`, `+ empty step → under_review`. `Completed → completed`. `Completed via terminate → overturned`. | Based on real Laserfiche export data from pilot district. Update if new step values are discovered. |
| 2026-02-19 | **Laserfiche import is a dedicated tab in Import Data page (admin only).** Does not use the standard 4-step wizard — find-or-create logic is too different from insert-only importers. | The standard wizard (mapping → validation → insert) doesn't support upsert-by-external-key logic. |

---

## Pricing & Go-to-Market

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-21 | **Recommended pricing tiers (pending approval): $6K/yr (<1K students), $10K/yr (1K–5K), $18K/yr (5K–15K), custom (15K+).** Comparable to Panorama Education ($18–26K/yr). ROI story: one avoided OCR complaint pays for 3+ years. | Market analysis of 12 competitors. All hide pricing; ranges derived from review sites and analyst data. |
| 2026-02-19 | **Three tiers: Essential, Professional, Enterprise.** See `docs/claude-chat-handover.md` for current feature breakdown per tier. Pricing not yet set. | Feature breakdown defined; pricing to be established before first paid pilot. |
| 2026-02-19 | **Initial go-to-market: Texas K-12 districts, starting with DAEP-heavy mid-size districts (5–20 campuses).** | Largest compliance pain point is SPED/504 placement workflow. Mid-size districts have the budget and the problem. |

---

## Branding & Language

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-19 | **Product name: Waypoint. Tagline: Behavioral Solutions. Company: Clear Path Education Group, LLC.** | Reflects mission: providing a compass point for students navigating back from DAEP. |
| 2026-02-19 | **Brand colors: Orange (#f97316 / Tailwind orange-500) primary, purple/violet accent. Dark sidebar (gray-900), white content area.** | Established in UI. Do not change without explicit approval. |
| 2026-02-19 | **Language: "placement" not "sentencing." "Intervention" not "punishment." "Compliance-driven, student-centered."** | See `docs/brand/terminology.md` for full language guide. |
