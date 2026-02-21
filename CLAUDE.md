# Waypoint — Claude Code Master Context

> Read this file at the start of every session. It is the operational command center.
> When this file conflicts with other docs, this file wins — except DECISIONS.md, which wins over everything.

---

## CRITICAL: Decision Log

Before making ANY decision about pricing, architecture, compliance rules, feature prioritization, go-to-market, or database schema — read **DECISIONS.md** first. That file is the single source of truth. If something conflicts with DECISIONS.md, the decision log wins. Update the code to match, not the other way around.

After making a meaningful decision during a session, add it to DECISIONS.md with date and rationale.

---

## Session Processes

### Opening Checklist (say "run the opening process")
1. Read `docs/session-context.md` — current active state
2. Read the latest file in `docs/handovers/` — what happened last session
3. Scan DECISIONS.md for any entries newer than the last handover
4. Flag any conflicts or stale assumptions
5. Summarize what's ready to work on

### Closing Checklist (say "run the closing process")
1. Update `docs/session-context.md` — refresh active state and pending work
2. Write handover doc to `docs/handovers/MMDDYYYY_handoff.md`
3. Log any new decisions to DECISIONS.md
4. Commit all changes to git
5. Brief the user: what was done, what's next, any blockers

---

## Tech Stack (Non-Negotiable)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7, plain JavaScript (no TypeScript) |
| Styling | Tailwind CSS 4 (utility-first, no component library) |
| Backend | Supabase (auth, PostgreSQL, PostgREST, RLS) |
| Routing | React Router 7 |
| Charts | Recharts |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | SheetJS (xlsx) — also used for data import |
| Hosting | Netlify (frontend), Supabase cloud (backend) |

---

## Architecture

### Multi-Tenancy
- Every table has `district_id UUID` — this is the tenant boundary
- RLS enforces isolation at the database level, not just application level
- `waypoint_admin` role has `district_id = NULL` — no district scope
- Campus scoping: non-admin staff see only their assigned campuses via `profile_campus_assignments`

### File Organization
```
src/
├── pages/          # Full page components (one per route)
├── components/
│   ├── layout/     # AppShell, Topbar, Sidebar, etc.
│   ├── auth/       # RequireAuth, RequireRole, RequireTier
│   ├── ui/         # Shared primitives (Button, Card, Modal, etc.)
│   └── [domain]/   # Feature-specific components
├── hooks/          # Data hooks (one per domain: useIncidents, useStudents, etc.)
├── contexts/       # AuthContext (session, profile, district, tier, campusIds)
└── lib/            # Utilities: supabase.js, constants.js, tierConfig.js, exportUtils.js, importUtils.js
```

### Routing Pattern
- Staff app: wrapped in `<RequireAuth><AppShell /></RequireAuth>` — sidebar layout
- Standalone pages (kiosk, orientation kiosk, waypoint-admin): outside AppShell, no sidebar
- Route guards: `RequireAuth` → `RequireRole` → `RequireTier` (in that order)
- Redirect on login: `parent` role → `/parent`, everything else → `/dashboard`
- Waypoint admin → `/waypoint-admin` (requires `waypoint_admin` role)

### Auth Context Values
```js
{ session, user, profile, district, tier, campusIds, loading,
  signIn, signOut, hasRole, hasFeature, isAdmin, isStaff,
  districtId, sessionWarning, extendSession, refreshDistrict }
```
`tier` defaults to `'enterprise'` when district is null (waypoint_admin users).

### Supabase PostgREST — FK Disambiguation (CRITICAL)
When tables have bidirectional FK relationships, PostgREST fails silently with ambiguous joins. Always use explicit FK constraint name hints:
- `compliance_checklists!fk_incidents_compliance`
- `profiles!incidents_reported_by_fkey`
- `profiles!fk_tpr_reviewer`
See DECISIONS.md for full FK constraint name registry.

---

## Database — Key Facts

**Supabase project:** `kvxecksvkimcgwhxxyhw`
**Migrations applied:** 001 through 027

### Tables (27 migrations)
districts, campuses, profiles, students, incidents, offense_codes,
discipline_matrix, compliance_checklists, transition_plans,
transition_plan_reviews, alerts, interventions, student_interventions,
daily_behavior_tracking, notification_log, import_history, import_errors,
profile_campus_assignments, orientation_config, orientation_checkins,
orientation_form_data, [+ others from migrations 008–027]

### Critical Columns Added by Migrations
- `incidents.laserfiche_instance_id TEXT` (027) — Laserfiche dedup key
- `incidents.laserfiche_step TEXT` (027) — current Laserfiche workflow step
- `students.date_of_birth` — nullable (027, Laserfiche imports don't have DOB)
- `profiles.role` — includes `waypoint_admin` (026)
- `profiles.district_id` — nullable (026, waypoint_admin has null)

### Roles (12 total)
admin, principal, ap, counselor, sped_coordinator, teacher, cbc, sss,
section_504_coordinator, director_student_affairs, parent, student, waypoint_admin

---

## User Roles & Tier Gating

- `STAFF_ROLES` — the 10 non-parent/student roles; access the main AppShell
- `DAEP_ROLES` — same as staff; access the DAEP dashboard
- `COMPLIANCE_ROLES` — admin, principal, ap, sped_coordinator
- `ALERT_ROLES` — admin, principal, ap, counselor, sped_coordinator
- Tier features gated by `district.settings.subscription_tier` via `tierConfig.js`

---

## Working Principles

### Data Integrity
- Never use simulated or fabricated Texas Education Code section numbers. If unsure, say so.
- Compliance triggers (SPED/504 manifestation, repeat offender alerts) are non-negotiable — never bypass them.
- Laserfiche data imported with `laserfiche_instance_id` as dedup key — always upsert, never duplicate.

### When Things Go Wrong
- If a fix attempt spirals past 2 tries, stop. Re-assess and propose a fresh approach.
- Say "this is spiraling — let me re-plan" rather than trying a 4th variation of the same thing.

### Self-Improvement
- After any correction or repeated mistake, propose a specific addition to this file or DECISIONS.md that prevents the same mistake in future sessions.

### Content Quality Gate
Before finalizing any customer-facing content (district proposals, demo scripts, marketing materials, compliance docs), use the Expert Panel Scoring framework from `docs/brand/scoring.md`. Minimum average: 7.0.

---

## Environment & Credentials Reference

- **Supabase URL:** `https://kvxecksvkimcgwhxxyhw.supabase.co`
- **DB host:** `db.kvxecksvkimcgwhxxyhw.supabase.co`
- **DB password:** stored in `.env.local` as `SUPABASE_DB_PASSWORD` — check there, don't ask
- **Service role key:** in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_SERVICE_ROLE_KEY`
- **Demo login:** `admin@lonestar-isd.org` / `Password123!`
- **Waypoint admin:** `admin@waypoint.internal` / `Waypoint2025!`
- **Migration runner:** `SUPABASE_DB_PASSWORD=xxx node supabase/run_026.mjs` (or equivalent run_NNN.mjs)

---

## Key Scripts

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Apply a migration (postgres direct)
SUPABASE_DB_PASSWORD=xxx node -e "/* inline pg query */"

# Create district admin
SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/create_admin.mjs

# Create waypoint internal admin
SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/create_waypoint_admin.mjs [email] [password] [name]
```

---

## Business Context

**Product:** Waypoint — Texas Education Code-compliant DAEP/discipline management SaaS
**Company:** Clear Path Education Group, LLC
**Stage:** Pre-pilot (as of Feb 2026)
**Target market:** Texas K-12 school districts
**Wedge:** DAEP-specialized workflow + SPED compliance blocking (unique differentiator)
**Full business context:** `docs/brand/positioning.md`, `docs/claude-chat-handover.md`
