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

**Home Campus view needs to see:**
- **That their student has a scheduled orientation date** (simple line item on the incident, or a small "Pending Placement Start" list showing their kids who finished orientation but haven't started DAEP)

**Home Campus view does NOT need:**
- The full Orientation Schedule page (`/daep/orientations`) — that's a DAEP scheduling tool
- The Orientation Kiosk — DAEP-only
- Phone Return page — DAEP-only

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

**Actors:** Home Campus Admin + Counselor

When `days_served >= consequence_days − 5` (configurable), the student appears in the **"Returning from DAEP Soon"** card on the home campus dashboard.

**Home Campus view needs:**
- Student name + current campus
- Days served / days assigned
- Days remaining (counts down)
- Link to the transition plan (not the incident)

This is the *pre-return prep* moment — home campus counselor should be opening the plan now to prep supports before the student walks back in.

---

## Phase 6 — Completion & Handoff

**Actors:** DAEP Staff (marks complete) → Home Campus Admin/Counselor (accepts)

1. Student serves their final day. DAEP staff clicks **Mark Complete** on the incident. Status = `completed`.
2. **Trigger fires** (migration 061): linked `transition_plans.handoff_status` → `pending_home_campus`, `handoff_initiated_at = NOW()`.
3. Home Campus Admin/Counselor opens the plan and sees the amber **"Accept Handoff & Adjust Plan"** banner.
4. They click Accept → modal asks for `post_return_adjustments` (what worked at DAEP, what to change on return).
5. On save: `handoff_status = 'accepted'`, records `home_campus_accepted_by` + `_at`. Plan is now owned by home campus. Green confirmation banner replaces the amber one.

**Home Campus view is the protagonist here.** The plan detail page is the single surface.

**DAEP view is done.** Once marked complete, the student no longer consumes DAEP seats.

---

## Phase 7 — Post-Return Monitoring

**Actors:** Home Campus Counselor

- Plan is active on the home campus. 30 / 60 / 90-day reviews scheduled.
- `ReentryHub` component tracks checklists and check-ins.
- Home Campus Counselor runs the reviews; home campus admins monitor the plan status card.

---

# Campus View Audit — Keep / Remove / Add

Here is an audit of what `hs-principal@lonestar-isd.org` currently sees and my recommendation for each item.

## Sidebar items (currently visible to DAEP_ROLES, which includes Principal)

| Item | Current | Recommendation | Reason |
|---|---|---|---|
| Dashboard | ✅ | **Keep** | Primary landing |
| Students | ✅ | **Keep** | Campus student roster |
| Quick Report | ✅ | **Keep** | Incident creation |
| Incidents | ✅ | **Keep** | Their campus's incidents |
| Compliance | ✅ | **Keep** | SPED/504 blocking is campus concern |
| Alerts | ✅ | **Keep** | Repeat offender alerts are campus concern |
| Transition Plans | ✅ | **Keep** | They own post-return plan |
| **DAEP Dashboard** | ✅ | **Remove from campus view** | Facility operations tool — not their job |
| **Orientations** | ✅ | **Remove from campus view** | DAEP scheduling tool |
| **Phone Return** | ✅ | **Remove from campus view** | Parent contact log, DAEP-only workflow |
| Discipline Matrix | ✅ | **Keep** | Reference tool |
| Calendar | ✅ | **Keep** | Plan review dates |
| Reports | ✅ | **Keep** | Admin-only anyway |
| Data Import | ✅ | **Keep** | Admin-only anyway |
| Student Kiosk / Orientation Kiosk | Admin-only | **Keep as-is** | Kiosk devices |
| Settings | Admin-only | **Keep as-is** | |

**Proposed fix:** Change the `DAEP_ROLES` gate on DAEP Dashboard / Orientations / Phone Return to a narrower `DAEP_PROGRAM_ROLES` (new constant = [admin, ap, director_student_affairs]), or add an explicit "is this user assigned to a DAEP campus" check via `profile_campus_assignments → campuses.campus_type = 'daep'`.

The cleanest rule: **"only users whose campus assignments include a DAEP-type campus see the DAEP program sidebar group."** Home campus principal/AP/counselor are assigned to regular campuses → they don't see that group. District admin is district-wide → they do see it.

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

# Summary — Tonight's Recommendation

**Ship the sidebar scope fix.** Add a `DAEP_PROGRAM_ROLES` concept or a "user's campus is a DAEP campus" check so the DAEP Dashboard / Orientations / Phone Return group is hidden from regular campus principals. That gives `hs-principal@lonestar-isd.org` a clean, campus-focused sidebar and eliminates the "why is Phone Return in my menu?" noise.

Everything else (dashboard widgets, incident detail, plan detail) is already correctly scoped by campus — we just need to stop leaking DAEP-facility tools into the campus sidebar.
