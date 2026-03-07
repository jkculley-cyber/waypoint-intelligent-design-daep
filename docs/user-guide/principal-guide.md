# Waypoint Principal & AP Guide

**Roles covered:** Principal, Assistant Principal (AP)
**Access:** Incident review and approval, DAEP dashboard, transition plans, student management

---

## Table of Contents

1. [Your Daily Workflow](#1-your-daily-workflow)
2. [Reviewing Incidents](#2-reviewing-incidents)
3. [The Discipline Matrix](#3-the-discipline-matrix)
4. [Approving DAEP Placements](#4-approving-daep-placements)
5. [SPED & 504 Incidents](#5-sped--504-incidents)
6. [DAEP Dashboard](#6-daep-dashboard)
7. [Transition Plans](#7-transition-plans)
8. [Repeat Offender Alerts](#8-repeat-offender-alerts)

---

## 1. Your Daily Workflow

**Every morning — 5 minutes:**
1. Check **DAEP Dashboard → Live Operations** for any red banners (over capacity, missed orientations)
2. Check **Alerts** for new red flags (2nd DAEP placements, 10-day threshold warnings)
3. Review **Incidents** filtered to your campus — any new submissions waiting for your review?

**As incidents come in:**
- Teacher referrals arrive with status **Submitted**
- You review, may modify, and either approve or return
- DAEP referrals require additional approval steps

---

## 2. Reviewing Incidents

### Where to Find It
**Incidents** → filter by Campus = your campus, Status = Submitted

### Reviewing a Teacher Referral
1. Click the incident row to open it
2. Review the incident details:
   - Student record (check SPED/504 flags!)
   - Offense code and description
   - Consequence entered by teacher (teachers submit without selecting consequence — you assign it)
3. Review the **Approval Chain** section if this is a DAEP referral
4. If the description is insufficient, click **Return** and add a note explaining what information is needed

### Assigning a Consequence (AP Action)
For teacher referrals, the AP assigns the consequence:
1. Navigate to the incident
2. Click **Edit Consequence**
3. Select the consequence type (ISS, OSS, DAEP, etc.)
4. The discipline matrix auto-suggests the allowed range based on the offense code and student history
5. Enter consequence days within the allowed range
6. Set consequence start and end dates (start cannot be before incident date)
7. Save and Approve or submit to next approver in chain

### Incident Status Flow
```
Submitted → Under Review → [Compliance Hold if SPED/504] → Pending Approval → Approved → Active → Completed
```

---

## 3. The Discipline Matrix

The discipline matrix is your district's written policy translated into Waypoint's enforcement engine. When you select a consequence for an offense, the system:
- Shows only the consequence types your policy allows for that offense
- Shows the allowed day range in help text
- Blocks submission if days are outside the allowed range
- Requires written justification if you override the policy

**When you see an "Override Policy" selection:** The submitting staff member has chosen to deviate from the matrix. Review their justification carefully — this is your compliance exposure. If the justification isn't sufficient, return the incident.

---

## 4. Approving DAEP Placements

DAEP placements require an explicit approval chain. As principal or AP, you are typically a required step.

### When It's Your Turn to Approve
- The incident shows an orange **"Your Approval is Required"** banner at the top
- The incident appears in **DAEP Dashboard → Approval Queue**
- A count badge shows on your bell icon in the top navigation

### Before You Approve, Review:
1. **Incident description** — Is the behavior documented clearly and factually?
2. **Offense code** — Does it match the behavior described?
3. **Consequence** — Is it within the matrix range? If overridden, is the justification sufficient?
4. **SPED/504 compliance** — If student is SPED or 504, is the compliance checklist complete?
5. **Documents** — Transcript and schedule attached for DAEP?

### Approval Actions
| Button | When to Use |
|--------|------------|
| **Approve** | Everything is documented correctly and consequence is appropriate |
| **Return** | Something is missing or incorrect — add a note explaining what to fix |
| **Deny** | The referral should not result in a DAEP placement |

### After You Approve
The incident moves to the next approver in the chain (if any). If you're the final approver, status becomes **Approved** and the placement is ready to activate.

### Activating the Placement
Once approved, an admin (or you, depending on your district's setup) clicks **Activate Consequence** to start the placement. Before activation, Waypoint checks:
1. MDR is complete (if SPED student)
2. Orientation has been scheduled

If orientation hasn't been scheduled, activation is blocked with an error message.

---

## 5. SPED & 504 Incidents

When a SPED or 504 student is referred for DAEP, additional steps are required by law. As AP or principal, you need to know these requirements and ensure they're met before approving.

### What the System Does Automatically
- Sets incident status to **Compliance Hold**
- Creates a compliance checklist (SPED or 504 version)
- Shows a red banner: "DAEP Placement Blocked — IDEA/SPED Compliance Required"

### What You Need to Ensure
1. **SPED Coordinator is notified** — The checklist must be completed by the SPED Coordinator or 504 Coordinator, not just you
2. **ARD/504 team meeting is scheduled** — The manifestation determination must be conducted before the checklist can be completed
3. **Result is recorded** — Was the behavior a manifestation of the disability? This must be answered before you can approve

### If Behavior IS a Manifestation
- **DAEP placement cannot proceed**
- Student must remain at home campus
- BIP modifications must be implemented
- The system marks the incident accordingly and the approval chain is voided

### If Behavior is NOT a Manifestation
- DAEP placement may proceed once all checklist items are complete
- Continue through the normal approval chain

### 10-Day Cumulative Removal (IDEA §300.536)
The system tracks cumulative removal days for every SPED student across all consequence types (ISS, OSS, DAEP). When a student approaches the 10-day threshold:
- **Warning at 5 days** — amber callout on the incident form
- **Block at 10 days** — system prevents submission and requires MDR before proceeding

If you see this block, do NOT attempt to work around it. Contact your SPED Coordinator and complete the MDR process.

---

## 6. DAEP Dashboard

### Live Operations Tab
Your most important daily view:

- **Red Capacity Banner** — You're over your configured DAEP seat limit. Review before approving new placements.
- **Compliance Holds count** — Incidents stuck because SPED/504 checklist isn't complete. These are time-sensitive.
- **Active Enrollments** — Students currently in DAEP. Click any to see their incident.
- **Approval Queue** — Incidents waiting for your approval action right now.
- **Missed Orientations** — Red widget. Students who no-showed their orientation — needs follow-up today.
- **Awaiting Placement Start** — Amber widget. Approved placements where orientation hasn't been scheduled yet.

### Action on Alerts
| Widget | Action Needed |
|--------|--------------|
| Red capacity banner | Pause new approvals; talk to DAEP coordinator |
| Compliance Holds > 0 | Contact SPED/504 coordinator; these are time-sensitive |
| Missed Orientations | Reschedule or initiate alternative plan |
| Awaiting Placement Start | Schedule orientation |

---

## 7. Transition Plans

Every student placed in DAEP must have a transition plan. As principal/AP, you may not author these, but you should ensure they exist and are reviewed on schedule.

### Your Oversight Role
- Go to **Transition Plans** — check for any **"Overdue"** badges
- If you see overdue reviews, contact the counselor responsible for that student's plan
- The red banner at the top of the Transition Plans page shows the count of overdue reviews

### For SPED students specifically:
The transition plan must include:
- Academic goals aligned to IEP
- Services being provided at the DAEP campus
- Re-entry plan for return to home campus

---

## 8. Repeat Offender Alerts

Go to **Alerts** to see all active repeat-offender alerts for your campus.

### Red Alerts Require Immediate Action
- **Second DAEP** — This student has been placed in DAEP before. Review whether additional interventions are needed. Consider a referral to counseling or community-based services.
- **3+ ISS in 30 days** — Pattern of behavior that likely indicates an underlying issue. Consider requesting an evaluation.

### What to Do with a Red Alert
1. Click the alert → **Acknowledge** it within 24 hours
2. Assign it to a counselor or yourself: **Mark In Progress**
3. Document what action was taken: parent contact, referral to counselor, FBA request, etc.
4. **Resolve** when action is complete

> **Compliance note:** Unresolved red alerts — particularly for SPED students — can be a finding in a TEA or OCR audit. Document your response to every red alert.
