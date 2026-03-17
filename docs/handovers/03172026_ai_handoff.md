# Session AI Handover — 2026-03-17
## Prepared for: Vera

---

## Context: What Apex Is

**Apex** (`clearpath-apex.pages.dev`) is a standalone principal tool — separate from Waypoint/DAEP.
- Tenant unit = **principals** (not districts). One principal = one account.
- Stack: React 19 + Vite, Supabase (`jvjsotlyvrzhsbgcsdfw`), Cloudflare Pages
- GitHub repo: `jkculley-cyber/clearpath-apex` (branch: master → auto-deploys to Cloudflare Pages)
- DB password: `ApexClearPath2025!` · PAT: `sbp_34e3b7ef1d4e7b49995850e9e51d2550e8a78f05`
- Auth: magic link only. RLS uses `current_principal_id()` helper function.
- Migrations applied: 001–006 (006 = coaching focus history, applied this session)

---

## What Was Done This Session

### 1. PWA Phase 3 — Offline Recording (completed from prior session)
- `ObservePage.jsx`: offline banner on capture step, `'queued'` step after offline submit
- `DashboardPage.jsx`: pending upload count banner
- `public/manifest.json`: fixed Lighthouse failure — split `"purpose": "any maskable"` into 4 separate icon entries

### 2. T-TESS Calibration Hardening
- Ran 5-scenario simulation against T-TESS certification standards — pre-fix alignment was ~44%
- Complete rewrite of `supabase/functions/generate-coaching-draft` system prompt:
  - Evidence quality score (1–5) + input_quality_warning
  - "Not Observable" exit ramp (returns `score: null` when evidence absent)
  - 4/5 Distinguished boundary anchors
  - 2.4 Differentiation non-examples (teacher moves ≠ differentiation)
  - Halo effect countermeasure
- `ObservationReviewPage.jsx`: hard quality gate — send button disabled when `input_quality_score ≤ 2` on formal eval. Server-side guard also added. "Before You Send" checklist with ✗ indicators.
- Simulation report saved at `docs/ttess-simulation-report.md`

### 3. Go-to-Market Decision
- **Phase 1**: Individual principal purchase (personal card, not district budget). No Stripe yet — bank account needed first.
- **Phase 2**: Campus/district purchase (later, after traction).
- Positioning: walkthrough-first. The 10-walkthroughs/week Texas district requirement is the pain point. Formal T-TESS is secondary.

### 4. LandingPage.jsx — New Public Front Door
- `src/pages/LandingPage.jsx` — public-facing at `/` for unauthenticated visitors
- Hero: `"10 walkthroughs a week. Zero Sunday nights writing coaching emails."`
- Pain vs. Solution two-column, How It Works 3 steps, feature grid, "No credit card. No district approval needed." CTA
- `src/App.jsx` updated: `/` shows LandingPage (unauth) or redirects to `/dashboard` (auth). Protected routes changed to pathless layout route.

### 5. OnboardingPage.jsx — Full 4-Step Flow
- Replaced single-form onboarding with a 4-step flow (profile → weekly goal → add teachers → ready)
- Step 2 pre-selects 10 walkthroughs/week with "district req." label + live time math showing savings vs old process
- Step 3: inline teacher add (up to 5), skip button
- Step 4: ready screen with quick-start checklist
- `saveProfile()` + teacher insert runs as a single transaction on step 3 completion

### 6. Teacher Coaching Focus History
- **Migration 006** applied: `teacher_coaching_focuses` table
  - Columns: `id, principal_id, teacher_id, focus_area, notes, created_at, closed_at, growth_notes`
  - Active focus = `closed_at IS NULL`. Closing a focus preserves growth notes.
  - RLS: principal owns their own rows via `current_principal_id()`
- `TeacherDetailPage.jsx` updated:
  - Coaching Focus card on left sidebar is now interactive
  - "Change" flow prompts "How did they grow?" before setting new focus (optional)
  - Collapsible focus history timeline shows all past focuses with date range, duration, and growth notes in green
  - `teachers.current_focus` kept in sync for PDF export backward compatibility
  - Edit Profile form no longer has coaching focus / growth arc fields (they live in their own system now)

### 7. clearpathedgroup.com — Apex Added
- Apex added under the **Cornerstone Pathway** (Instructional Support)
- Changes: Nav link → `#cornerstone`, path card badge `Apex · Live`, Cornerstone pathway card chip, new Cornerstone spotlight section with Apex stats/features/CTA linking to `clearpath-apex.pages.dev`
- Footer: 2026 copyright, removed "Approval Pending"
- Fixed `deploy-clearpath-nomp4.mjs` walker bug (EISDIR — directory was being pushed as file)
- **Deployed via git push to `jkculley-cyber/waypoint-intelligent-design-daep` → GitHub Actions → Cloudflare Pages** (direct upload API does NOT work for production — creates preview-only deploys with 500 errors)

---

## Files Changed (Apex repo — `clearpath-apex`)

| File | Change |
|------|--------|
| `src/pages/LandingPage.jsx` | New — public landing page |
| `src/pages/OnboardingPage.jsx` | Full rewrite — 4-step flow |
| `src/pages/ObservePage.jsx` | Offline banner, queued step |
| `src/pages/DashboardPage.jsx` | Pending upload count banner |
| `src/pages/ObservationReviewPage.jsx` | Quality gate, N/O badges, Before You Send checklist |
| `src/pages/TeacherDetailPage.jsx` | Coaching focus history UI |
| `src/App.jsx` | LandingPage route, pathless layout fix |
| `public/manifest.json` | 4 separate icon entries (Lighthouse fix) |
| `supabase/functions/generate-coaching-draft/index.ts` | System prompt rewrite — calibration hardening |
| `supabase/migrations/006_coaching_focuses.sql` | New table |

## Files Changed (Waypoint/clearpathedgroup repo)

| File | Change |
|------|--------|
| `clearpath-site/index.html` | Apex added to Cornerstone Pathway |
| `deploy-clearpath-nomp4.mjs` | Bug fix — EISDIR walker |

---

## Pending / Not Built Yet

| Item | Notes |
|------|-------|
| **Stripe billing** | Blocked on bank account. When ready: individual principal subscription, ~$29–49/month. |
| **Teacher-facing experience** | When teacher receives coaching email — no landing page, no acknowledge loop. |
| **Morning brief cron** | Principals set time in Settings but nothing fires it. Migration 002 exists but cron not wired up. |
| `district` vs `district_name` column | Principals table has both; should consolidate. |
| `send-feedback` edge function | Possibly unused — confirm and delete. |
| **clearpathedgroup.com SPF record** | Add `include:spf.resend.com` to Cloudflare DNS TXT record. |

---

## Credentials Quick Reference

| Resource | Value |
|----------|-------|
| Apex live URL | `clearpath-apex.pages.dev` |
| Supabase ref | `jvjsotlyvrzhsbgcsdfw` |
| Supabase URL | `https://jvjsotlyvrzhsbgcsdfw.supabase.co` |
| DB password | `ApexClearPath2025!` |
| PAT | `sbp_34e3b7ef1d4e7b49995850e9e51d2550e8a78f05` |
| GitHub repo | `jkculley-cyber/clearpath-apex` (branch: master) |
| Demo login | magic link to any email registered as principal |

---

## Key Architecture Reminders

- **RLS**: every query scoped by `current_principal_id()` — never query without principal context
- **Offline queue**: IndexedDB `apex-offline` DB, `audio-queue` store, Background Sync tag `apex-audio-upload`
- **Edge function deploy**: `SUPABASE_ACCESS_TOKEN=sbp_... npx supabase functions deploy generate-coaching-draft --project-ref jvjsotlyvrzhsbgcsdfw` then patch verify_jwt to false
- **clearpathedgroup.com deploy**: `git push` to `waypoint-intelligent-design-daep` repo — NOT direct Cloudflare upload
