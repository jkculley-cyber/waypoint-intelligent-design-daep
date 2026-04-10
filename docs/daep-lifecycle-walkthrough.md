# DAEP Lifecycle — Campus → DAEP → Back to Campus

> End-to-end walkthrough of a single student's DAEP placement, identifying which screens/widgets belong on the **Home Campus view** (e.g. `hs-principal@lonestar-isd.org`) vs the **DAEP Program view** (e.g. `admin@lonestar-isd.org` or a dedicated DAEP admin).

## Roles used in this walkthrough

| Label | Example account | Scope | What they care about |
|---|---|---|---|
| **Teacher** | `el-teacher@lonestar-isd.org` | One campus | Report behavior, write referral |
| **Home Campus Admin** (Principal / AP) | `hs-principal@lonestar-isd.org` | One campus | *My kids*: who's referred, who's at DAEP, who's coming back |
| **Counselor** | `ms-counselor@lonestar-isd.org` | One campus | Plan supports, review reentry |
| **Director of Student Affairs** | district role | District-wide | Final approval step |
| **DAEP Staff** | `daep-staff@lonestar-isd.org` | All campuses (DAEP facility) | Seats, orientations, daily tracking, parent contact |

---

## Phase 1 — Referral at the Home Campus

**Actors:** Teacher → Home Campus Admin

1. **Teacher writes a Quick Report** (`/quick-report`) describing the incident. Status = `draft`.
2. **Home Campus Admin reviews drafts** (Dashboard → "Teacher Drafts Needing Consequence") and opens the incident.
3. Admin selects **consequence_type = `daep`**, enters assigned `consequence_days`, links the offense code, sets a `daep_campus_id` (which DAEP facility).
4. Admin submits → triggers the **approval chain** (`daep_approval_chains`): AP → Principal → Director of Student Affairs → DAEP intake.
5. If student is SPED/504, a **compliance_hold** fires automatically — blocks the placement until manifestation determination + checklist complete (`compliance_checklists`).

**Home Campus dashboard should show:**
- My action items (drafts awaiting consequence, returned referrals, pending approvals at my step)
- My compliance holds
- **Pending placements** tile in the new capacity widget — "how many of my kids are mid-approval right now"

**Home Campus dashboard does NOT need:**
- District-wide DAEP totals
- DAEP capacity tracker (facility-level)

---

## Phase 2 — Approval Chain

**Actors:** AP → Principal → Director → (compliance hold if SPED/504)

Status transitions: `draft` → `submitted` → `under_review` → (`compliance_hold` if flagged) → `approved`.

- Each role sees their step in the "Pending Your Approval" widget.
- Parent acknowledgment captured via Parent Portal link.
- If SPED: manifestation determination review must complete before `compliance_hold` lifts.

**Home Campus view:** all these statuses roll up into the **Pending** tile of the capacity widget. Admin clicks Pending → sees which of their students are in which approval step.

**DAEP view:** sees all district-wide pending so they can staff accordingly, but does not push approvals forward — that's campus + director work.

---

## Phase 3 — Orientation Scheduling

**Actors:** DAEP Staff + Home Campus Admin + Parent

1. Once approved, DAEP staff schedules an orientation (`daep_placement_scheduling.orientation_scheduled_date`).
2. Parent attends orientation at the DAEP campus.
3. Status: `orientation_status` → `scheduled` → `completed` (or `missed` → alert fires).
4. Incident remains `status = 'approved'` until student actually checks in on day 1.

**Home Campus view needs:**
- **Orientations page** (`/daep/orientations`) — campus staff can see their students' scheduled orientations and schedule new ones. This is visible in the sidebar for all staff.
- **Orientation date on the Incident Detail Page** — visible when viewing any of their campus's incidents.

**Home Campus view does NOT need:**
- The Orientation Kiosk — DAEP-only (physical device at the DAEP campus)
- Phone Return page — DAEP-only (parent contact log managed by DAEP staff)

---

## Phase 4 — Active DAEP Placement

**Actors:** DAEP Staff (daily), Home Campus Admin (monitoring)

1. Student checks in at DAEP kiosk → creates `daily_behavior_tracking` row for that date → first check-in flips `incidents.status = 'active'`.
2. Each subsequent day adds a tracking row. **Days served = COUNT of those rows.** Absences add no row — calendar `consequence_end` is informational only.
3. DAEP staff may adjust `consequence_days` down (incentive / earned reduction) via the Incident Detail Page.
4. No-show detection: if student attended orientation but has **zero check-ins**, they're flagged as a **No-Show** in the home campus widget. Seat is still held. An Admin/Principal/AP can click **Release Seat** to free the allocation.

**Home Campus view needs:**
- Active count tile (my kids currently at DAEP, including no-shows)
- No-show badge + Release Seat action
- Click-through to the student's incident/plan for context (NOT to daily scoring, NOT to phone log)

**Home Campus view does NOT need:**
- Daily behavior tracking kiosk UI — DAEP-only
- Phone Return log — DAEP-only
- Capacity facility-level rollup — DAEP-only
- Full DAEP Dashboard analytics tabs — DAEP-only

---

## Phase 5 — Nearing Completion

**Actors:** Home Campus Admin + Counselor + DAEP Staff

When `days_served >= consequence_days − 5` (based on actual check-in days, not calendar), the student appears in the **"Returning from DAEP Soon"** card on the home campus dashboard.

**Important:** `consequence_days` can be adjusted by DAEP staff based on earned incentives (good behavior, academic milestones). When DAEP reduces the assigned days, the student moves into the "nearing completion" window sooner. Campus staff see the current assigned days, not the original.

**Home Campus view needs:**
- Student name + home campus
- Days served / days assigned (current, reflecting any incentive adjustments)
- Days remaining (counts down: 5, 4, 3, 2, 1, 0)
- Link to the transition plan (not the incident)

**DAEP Staff responsibility:**
- Monitor behavior tracking and adjust `consequence_days` when incentives are earned (Incident Detail Page → DAEP Days section)
- When `days_served = consequence_days` (student served all assigned days), click **Mark Complete** on the incident
- This triggers the handoff to home campus (Phase 6)

This is the *pre-return prep* moment — home campus counselor should be opening the plan now to prep supports before the student walks back in.

---

## Phase 6 — Completion & Handoff

**Actors:** DAEP Staff (marks complete) → Home Campus Admin/Counselor (accepts)

### DAEP Staff — closing out the placement
1. Student serves their final assigned day (all `consequence_days` served, verified by `daily_behavior_tracking` count).
2. DAEP Staff opens the Incident Detail Page and clicks **Mark Complete**. Status = `completed`.
3. **Database trigger fires** (migration 061): the linked `transition_plans.handoff_status` auto-flips to `pending_home_campus`, with `handoff_initiated_at = NOW()`.
4. The student drops off the DAEP dashboard's active enrollment count. Seat is freed.
5. DAEP Staff is done — the student is no longer their responsibility.

### Home Campus — accepting the return
1. The student's plan appears with an amber **"Returning to Home Campus — Accept Handoff"** banner on the Transition Plan Detail Page (`/plans/{id}`).
2. Home Campus Admin or Counselor clicks **"Accept Handoff & Adjust Plan"**.
3. Modal prompts for **post-return adjustments** — what worked at DAEP, what supports to continue, what to change (e.g., "CICO card continues; add lunch buddy check-in; remove social studies modification — teacher reports no need").
4. On save: `handoff_status = 'accepted'`, records `home_campus_accepted_by` + timestamp. Green confirmation banner replaces the amber one.
5. The plan is now **owned by home campus**. Behavioral/academic supports, parent engagement, and review schedule are the home campus counselor's responsibility.

### What triggers the handoff
The handoff is NOT based on calendar `consequence_end` date. It fires when DAEP staff manually marks the incident as `completed` — which only happens after the student has served all assigned instructional days (absences don't count, incentive adjustments are reflected in `consequence_days`).

**Home Campus view is the protagonist here.** The plan detail page is the single surface.

**DAEP view is done.** Once marked complete, the student no longer consumes DAEP seats.

---

## Phase 7 — Post-Return Monitoring

**Actors:** Home Campus Counselor + Home Campus Admin

Once the handoff is accepted, the home campus owns the student's ongoing support:

1. **Transition plan reviews** — 30-day, 60-day, and 90-day reviews are scheduled from the plan start date. The Review Schedule card on the plan detail page shows status (Pending / Due Soon / Overdue / Complete) for each. Overdue reviews trigger a red alert banner.
2. **Reentry Hub** — the `ReentryHub` component on the plan detail page tracks the 4-party sign-off checklist (student, parent, counselor, admin) and post-return counselor check-ins.
3. **Post-return check-ins** — Counselor logs touchpoints during the first 30 days after return. Each check-in has a status (positive / neutral / concerning) and notes. Students with no check-in in 5+ days are surfaced on the DAEP dashboard's "Returned" widget.
4. **Post-return adjustments** — the notes entered during handoff acceptance are visible on the plan detail page. The home campus counselor uses these to tailor supports: continuing what worked at DAEP, modifying what didn't, and adding campus-specific interventions.
5. **Re-referral monitoring** — if the student gets a new incident within 90 days, the repeat offender alert system fires automatically.

**Home campus admin monitors** the plan status card on the dashboard (Active Plans count) and can review the counselor's check-in timeline at any time.

---

# Campus View Audit — Keep / Remove / Add

Here is an audit of what `hs-principal@lonestar-isd.org` currently sees and my recommendation for each item.

## Sidebar items — as shipped (Session BU)

Sidebar uses `useIsDaepStaff` hook: returns true for waypoint_admin / district admin / director_student_affairs, or any user assigned to a `campus_type='daep'` campus. Items tagged `daepProgramOnly: true` are hidden from regular campus staff.

| Item | Campus staff sees? | Gate | Reason |
|---|---|---|---|
| Dashboard | ✅ Yes | — | Primary landing |
| Students | ✅ Yes | — | Campus student roster |
| Quick Report | ✅ Yes | — | Incident creation |
| Incidents | ✅ Yes | — | Their campus's incidents |
| Compliance | ✅ Yes | COMPLIANCE_ROLES | SPED/504 blocking is campus concern |
| Alerts | ✅ Yes | ALERT_ROLES | Repeat offender alerts are campus concern |
| Transition Plans | ✅ Yes | — | They own post-return plans |
| **DAEP Dashboard** | ❌ No | `daepProgramOnly` | Facility operations — DAEP staff only |
| **Orientations** | ✅ Yes | DAEP_ROLES (no daepProgramOnly) | Campus needs to see/schedule their students' orientations |
| **Phone Return** | ❌ No | `daepProgramOnly` | Parent contact log — DAEP staff only |
| Discipline Matrix | ✅ Yes | — | Reference tool |
| Calendar | ✅ Yes | — | Plan review dates |
| Reports | ✅ Yes | admin/principal | Reporting |
| Data Import | ✅ Yes | admin/principal | Bulk import |
| Student Kiosk | ✅ (admin only) | admin | Kiosk device link |
| Orientation Kiosk | ✅ (admin only) | admin | Kiosk device link |
| Settings | ✅ (admin only) | admin | District settings |

## Dashboard widgets (currently shown on `/dashboard`)

| Widget | Current | Recommendation | Reason |
|---|---|---|---|
| Stat cards (Open Incidents / Holds / DAEP Approved / Alerts / Plans) | ✅ | **Keep** | Scoped to their campus already |
| Home Campus Capacity Widget | ✅ (new) | **Keep** | Built tonight |
| Returning from DAEP Soon | ✅ (new) | **Keep** | Built tonight |
| Compliance Protection ROI | ✅ | **Keep** | Reinforces product value |
| District Impact Report PDF | admin-only | **Keep as-is** | Not shown to hs-principal |
| Referrals Needing Attention (denied/returned) | ✅ | **Keep** | Direct action required |
| Pending Your Approval | ✅ | **Keep** | Principal is in approval chain |
| Teacher Drafts Needing Consequence | ✅ (admin/principal/ap) | **Keep** | Direct action |
| My Returned Referrals | ✅ | **Keep** | Direct action |

**Nothing to remove on the dashboard itself** — it's already well-scoped. The problem is entirely in the sidebar exposing DAEP facility tools.

## Incident Detail Page

Everything on this page is campus-relevant (referral data, approval status, compliance checklist, parent ack). **Keep as-is.** The "Mark Complete" button is what DAEP staff uses; for a home campus admin viewing an active DAEP placement, it's read-only context.

## Transition Plan Detail Page

Already home-campus-oriented (goals, supports, reviews, reentry hub, now: handoff banner). **Keep as-is.**

---

# Summary — What Was Shipped (Session BU/BV)

**Sidebar scope fix shipped.** `useIsDaepStaff` hook gates DAEP Dashboard and Phone Return behind a "user assigned to DAEP campus" check. Orientations stays visible per campus request. Regular campus principals (e.g., `hs-principal@lonestar-isd.org`) get a clean sidebar focused on their job: referrals, compliance, approvals, plans, and orientation visibility.

**Home campus capacity widget shipped.** Per-campus tiles (Allocation / Active / Pending / Available) with no-show detection and Release Seat action. Only visible to campus-scoped staff (hidden for district-wide admins who have the full DAEP dashboard).

**Nearing completion widget shipped.** Students within 5 instructional days of completion, based on actual `daily_behavior_tracking` count (not calendar date), with countdown display and link to transition plan.

**Transition plan handoff shipped.** Trigger on incident completion auto-flips linked plan to `pending_home_campus`. Amber banner → Accept Handoff modal → post-return adjustments textarea → green confirmation. Home campus owns the plan post-acceptance.

**Reentry_checklists 400 fix shipped.** `is_ready` column never existed — derived from four `*_completed_at` timestamps instead.
