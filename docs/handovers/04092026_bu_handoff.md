# Session BU Handover
**Date:** 2026-04-09
**Agent:** Archer (CTO)
**Focus:** DAEP → home campus transition plan handoff + per-campus seat capacity

---

## What Was Done

### 1. Migration 061 — Home campus handoff schema (APPLIED)
- `campuses.daep_seat_allocation INTEGER DEFAULT 0` — per-home-campus seat budget, set by waypoint_admin
- `incidents.seat_released_at` + `seat_released_by` — admin override to release a no-show's seat
- `transition_plans.handoff_status` (`pending_home_campus` | `accepted`), `handoff_initiated_at`, `home_campus_accepted_by`, `home_campus_accepted_at`, `post_return_adjustments`
- **Trigger `tg_incident_complete_handoff`** — when `incidents.status → 'completed'`, linked plan auto-flips to `pending_home_campus`
- 2 supporting indexes

### 2. Home Campus Capacity Widget (NEW)
`src/components/daep/HomeCampusCapacityWidget.jsx` — rendered on `/dashboard` for campus-scoped staff only (hidden for district-wide admins).

Per-campus tiles:
- **Allocation** (from `campuses.daep_seat_allocation`)
- **Active** (incident status='active', including oriented no-shows with seat not released)
- **Pending** (status in submitted/under_review/compliance_hold/approved)
- **Available** (allocation − active − pending; red if negative "Over Allocation")

Features:
- Click Active/Pending → drill-down student list
- No-Show detection: oriented + 0 `daily_behavior_tracking` rows + seat not released
- **Release Seat** button for admin/principal/ap on no-show rows
- Scoped via `useAccessScope` — hidden when `scope.isDistrictWide`

### 3. Returning from DAEP Soon card
On same widget — uses new `useNearingCompletion(threshold=5)` hook. Shows students where `days_served >= consequence_days − 5` (based on actual `daily_behavior_tracking` count, NOT calendar end_date). Sorted ascending by days remaining. Clicking a row opens the transition plan.

### 4. Transition Plan Handoff UI
`src/pages/TransitionPlanDetailPage.jsx`:
- Amber banner when `handoff_status = 'pending_home_campus'` with "Accept Handoff & Adjust Plan" button
- Modal with `post_return_adjustments` textarea (5 rows, prompts for what worked at DAEP / what to change)
- On accept: `useTransitionPlanActions().acceptHandoff(id, note)` sets status='accepted', records user + timestamp
- Green confirmation banner post-accept with who + when + the adjustment note

### 5. New hooks in `useDaepDashboard.js`
- `useHomeCampusCapacity()` — per-campus aggregation with no-show detection
- `useNearingCompletion(threshold=5)` — active DAEP home-campus-scoped, days_remaining ≤ threshold
- `useReleaseSeat()` — mutation to set `seat_released_at` + `seat_released_by`

### 6. Waypoint Admin campus allocation editor
`src/pages/WaypointAdminPage.jsx` → Districts → Manage drawer → Campuses section. Each campus row now has an inline numeric **DAEP Seats** input. Blur auto-saves. Extended the campus SELECT to include `daep_seat_allocation`.

### 7. DAEP Lifecycle Walkthrough Guide
`docs/daep-lifecycle-walkthrough.md` — 7-phase end-to-end walkthrough (referral → approval → orientation → active → nearing completion → handoff → post-return) with campus-view audit of every sidebar item and dashboard widget.

### 8. Sidebar scope fix — DAEP program tools
- New hook `src/hooks/useIsDaepStaff.js` — returns true for waypoint_admin / admin / director_student_affairs, or for any user assigned to a campus with `campus_type='daep'`
- New `daepProgramOnly: true` sidebar flag
- **DAEP Dashboard** and **Phone Return** now gated by `daepProgramOnly`
- **Orientations stays visible to all DAEP_ROLES** (user explicitly wanted campuses to see & schedule orientations for their students)
- Approval chain + notes already visible on `IncidentDetailPage` via `ApprovalChainTracker` — no change needed for campus visibility of approval flow

---

## What's Live Right Now

- ✅ Migration 061 applied to production Supabase (`kvxecksvkimcgwhxxyhw`)
- ⚠️ **Frontend code NOT yet deployed** — changes are committed locally but not pushed. User was viewing deployed site during testing, which is why sidebar changes didn't appear. Push to main will trigger Cloudflare Pages rebuild.

---

## Known Issue — Unrelated Bug Discovered

While testing, user saw a 400 error in console on this PostgREST query:
```
/rest/v1/transition_plans?...&reentry_checklist:reentry_checklists(is_ready,brief_sent_at,return_date)...
```
Likely an FK disambiguation issue on the `reentry_checklists` join in `useReentry.js` or similar hook. **Not investigated tonight.** Queue for next session.

---

## Next Session Priority

1. **Push to main** — deploy tonight's work to `waypoint.clearpathedgroup.com` (user had to stop before we could `git push`)
2. **Verify sidebar fix** — log in as `hs-principal@lonestar-isd.org` on deployed site after push, confirm DAEP Dashboard + Phone Return are hidden
3. **Fix 400 on reentry_checklists join** — FK disambiguation hint needed somewhere in the transition plans query
4. **SP4 scraper add-on** (carryover from BT) — Twitter/Quora/Trends/TpT via residential IP
5. **Tune Ollama analysis prompts** (carryover from BT)
6. **Re-upload VEP + PEIMS to TpT** (carryover from BR)

---

## To Test Tomorrow (Post-Deploy)

1. As `admin@waypoint.internal` → `/waypoint-admin` → Manage Lone Star → set DAEP Seats = 5 for High School
2. As `hs-principal@lonestar-isd.org` → `/dashboard`:
   - Should see "My Campus DAEP Seats" widget with HS row
   - Should NOT see DAEP Dashboard or Phone Return in sidebar
   - Should still see Orientations in sidebar
3. As `admin@lonestar-isd.org` → still sees everything including DAEP Dashboard (district-wide scope)
4. On an active DAEP incident in IncidentDetailPage, click Mark Complete → open linked plan → amber handoff banner appears → Accept with a note → green confirmation

---

## Files Touched

**Migrations**
- `supabase/migrations/061_home_campus_handoff.sql` (new, applied)

**New files**
- `src/components/daep/HomeCampusCapacityWidget.jsx`
- `src/hooks/useIsDaepStaff.js`
- `docs/daep-lifecycle-walkthrough.md`
- `docs/handovers/04092026_bu_handoff.md`

**Modified**
- `src/hooks/useDaepDashboard.js` — +3 hooks
- `src/hooks/useTransitionPlans.js` — +acceptHandoff
- `src/pages/DashboardPage.jsx` — widget import + placement
- `src/pages/TransitionPlanDetailPage.jsx` — handoff banners + modal
- `src/pages/WaypointAdminPage.jsx` — inline allocation editor
- `src/components/layout/Sidebar.jsx` — daepProgramOnly gate
