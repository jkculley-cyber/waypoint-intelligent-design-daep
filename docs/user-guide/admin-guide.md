# Waypoint Admin Guide

**Roles covered:** Admin, Director of Student Services, District Coordinator

The Admin role has full access to every Waypoint feature across all campuses. This guide is the complete reference for district-level administrators.

---

## Table of Contents

1. [First-Time Setup](#1-first-time-setup)
2. [Data Import](#2-data-import)
3. [Creating a Discipline Incident](#3-creating-a-discipline-incident)
4. [The Discipline Matrix](#4-the-discipline-matrix)
5. [SPED & 504 Compliance](#5-sped--504-compliance)
6. [Approval Chains (DAEP)](#6-approval-chains-daep)
7. [DAEP Dashboard](#7-daep-dashboard)
8. [Transition Plans](#8-transition-plans)
9. [Repeat Offender Alerts](#9-repeat-offender-alerts)
10. [Reports & PEIMS Export](#10-reports--peims-export)
11. [Settings & Configuration](#11-settings--configuration)

---

## 1. First-Time Setup

### Step 1 — Configure Your District
Navigate to **Settings → District Settings**. Review:
- District name and TEA district ID
- School year start date (used for cumulative day calculations)
- Subscription tier and active products

### Step 2 — Set DAEP Capacity
Go to **DAEP Dashboard → Analytics tab → Edit Capacity**.
- Choose mode: **Total seats** (one number) or **By level** (middle school / high school separately)
- Enter your licensed seat count
- This populates the capacity bar and triggers over-capacity warnings in the Live Operations tab

> **Why this matters:** When you're over capacity, a red banner appears in Live Operations. New placements should be paused and reviewed with your DAEP program director before proceeding.

### Step 3 — Import Students (see [Data Import](#2-data-import))

### Step 4 — Import Staff / Profiles
Import staff before assigning incidents, so names appear in the approval chain and reports.

### Step 5 — Configure Offense Codes
Go to **Settings → Offense Codes**. Add or import your district's TEC-aligned offense codes. Each code should have:
- Code number (e.g., `A1`, `B2`)
- Title
- Category (Class A Misdemeanor, etc.)
- Suggested severity (minor / moderate / major / severe)

### Step 6 — Build the Discipline Matrix
Go to **Settings → Discipline Matrix**. For each offense code, set:
- Minimum and maximum consequence days
- Allowed consequence types for each offense tier (1st offense, 2nd offense, 3rd+)

> **Why this matters:** The matrix drives consequence suggestions during incident entry. An incomplete matrix means staff see all consequence options with no guidance — a compliance and consistency risk.

---

## 2. Data Import

### Where to Find It
**Settings → Import Data**

### Import Types Available
| Type | What It Does | Required Fields |
|------|-------------|-----------------|
| Students | Creates/updates student records | first_name, last_name, student_id_number |
| Staff / Profiles | Creates/updates staff accounts | first_name, last_name, email, role |
| Offense Codes | Bulk-loads offense code library | code, title, category |
| Discipline History | Imports prior-year incidents | student_id, offense_code, incident_date |
| Laserfiche DAEP | Syncs existing DAEP records from Laserfiche | laserfiche_instance_id, student_id |

### Step-by-Step Import Process

**Step 1 — Upload File**
- Accepted formats: `.csv`, `.xlsx`
- Click **Upload** and select your file
- Waypoint auto-detects column headers from 25+ Texas SIS platforms (Skyward, PowerSchool, Infinite Campus, etc.)

**Step 2 — Map Columns**
- Review the auto-detected column mapping
- Manually correct any columns that didn't auto-match (drag to assign)
- Select **Duplicate strategy:** Skip (default) or Upsert (update existing records)

**Step 3 — Validate**
- Waypoint validates every row before import
- The **Errors** tab shows rows with problems and why they failed
- The **Valid** tab shows rows ready to import
- **If there are error rows:** You must check the acknowledgement box ("I understand N rows with errors will be skipped") before the Import button enables
- **Fix your file** and re-upload if errors are unexpected or numerous

> **Critical:** Rows with campus names that don't match your district's configured campuses will fail validation. Check campus name spelling exactly matches what's in Waypoint Settings.

**Step 4 — Confirm & Import**
- Click **Import N Rows**
- A progress bar shows batch processing
- Import history is logged in **Import History** tab

**Step 5 — Review Results**
- Green: successfully imported
- Gray: skipped (duplicates, if using Skip strategy)
- Red: errors (rows that failed even during processing)
- Download the error report to fix and re-import problem rows

### Common Import Issues

| Error | Cause | Fix |
|-------|-------|-----|
| "Campus not found" | Campus name doesn't match | Check exact spelling in Settings → Campuses |
| "Student ID already exists" | Duplicate with Skip strategy | Switch to Upsert, or delete the existing record first |
| "Invalid date format" | Date column not recognized | Format as MM/DD/YYYY or YYYY-MM-DD |
| "Missing required field" | Required column is blank | Fill in all required fields before re-uploading |

---

## 3. Creating a Discipline Incident

### Where to Find It
**Incidents → + New Incident** (or top-right button on Incidents page)

### The 5-Step Wizard

#### Step 1 — Select Student
- Search by name or student ID number
- Student flags appear automatically: SPED (purple), 504 (blue), ELL (teal), Homeless (orange), Foster Care (red)
- **If student is SPED or 504:** A compliance warning banner appears. Read it. The compliance checklist will be required.
- The system shows cumulative removal days for SPED/504 students and warns at 5 days, blocks at 10 days

> **10-Day Rule (IDEA §300.536):** If a SPED student will hit 10 or more cumulative removal days this school year, the system will BLOCK submission until you complete the MDR. This is non-negotiable federal law.

#### Step 2 — Select Offense
- Search or scroll through your district's offense codes
- Codes are grouped by category
- Selecting an offense auto-populates the suggested consequence range from your discipline matrix

#### Step 3 — Select Consequence
- The system displays only the consequence types allowed by your matrix for this offense
- **Days range** is shown in help text (e.g., "Matrix range: 3–10 days")
- If you enter days outside the matrix range, the system warns you and blocks you from proceeding
- **Override Policy:** If you need to deviate from the matrix, click "Other (Override Policy)"
  - Select the actual consequence type you're applying
  - You MUST enter a written justification explaining why
  - The override is logged in the incident record and audit trail
  - Override justifications are visible to TEA auditors — write them carefully

**DAEP Consequence — Required Documents:**
If consequence_type = DAEP, you must upload:
- Student transcript (current grades)
- Modified schedule for DAEP campus
- MDR documentation (if student is SPED) — required before activation

> **Note:** Consequence start date cannot be before the incident date. End date cannot be before start date. Both are validated before you can proceed.

#### Step 4 — Incident Details
- **Incident Date:** Date the incident occurred. Cannot be a future date.
- **Incident Time:** Optional but recommended for documentation
- **Location:** Select from your district's configured locations
- **Description:** Describe what happened. This is the official record — write clearly and factually. Avoid opinion language.

> **Documentation standard:** Write descriptions as you would testify in a hearing. Stick to observable facts: what you saw, what was said, what was found. Avoid "student was being defiant" — instead: "Student refused three direct instructions to sit down and used profane language."

#### Step 5 — Review & Submit
- Review all entered data before submitting
- The **Review screen** shows every field in a read-only summary
- Click **Submit Incident** to create the record
- Incident is created with status: **Draft** (if saved without submitting) or **Submitted** (if submitted for review)

### After Submission
- If consequence = DAEP: Incident moves through the approval chain
- If SPED/504: Incident status becomes **Compliance Hold** and the compliance checklist is created
- You'll see the incident in **Incidents** list with its current status

---

## 4. The Discipline Matrix

### Where to Find It
**Settings → Discipline Matrix**

The discipline matrix is your district's written discipline policy translated into Waypoint's enforcement engine. It defines what consequences are allowed for each offense, and what the valid day range is.

### How It Works During Incident Entry
When an admin selects an offense code in Step 2, Waypoint queries the matrix to find:
1. What consequence types are allowed (ISS, OSS, DAEP, etc.)
2. What the minimum and maximum days are
3. Whether this is a first, second, or third-plus offense for this student

The system restricts the consequence dropdown to only show allowed types and blocks submission outside the day range.

### What Happens When There's No Matrix Entry
If an offense code has no matrix entry configured, the incident entry form shows **all consequence types** with no restriction. The user must manually select appropriately.

> **Best practice:** Before going live with any pilot, ensure every active offense code has a complete matrix entry. Sparse matrices create consistency risk and compliance exposure.

### Override Policy
When an admin clicks "Override Policy," they're documenting that they're deviating from the matrix. The override justification must explain:
- Why the standard consequence is insufficient
- What TEC section or district policy supports this alternative
- Who reviewed and approved the override

---

## 5. SPED & 504 Compliance

### Who Needs This
Any incident involving a student flagged as **SPED** (Special Education under IDEA) or **504** (Section 504 of the Rehabilitation Act). The compliance checklist is created automatically when a SPED/504 student is referred for DAEP.

### The Compliance Hold
When a SPED or 504 student is recommended for DAEP, the incident status becomes **Compliance Hold**. The banner at the top of the incident shows:
- Which law applies (IDEA for SPED, Section 504 for 504)
- Who needs to complete the checklist (SPED Coordinator / 504 Coordinator / Admin)
- How many of the required items are complete
- A "Go to checklist ↓" link

**The incident cannot proceed to approval while in Compliance Hold.** This is the enforcement mechanism Waypoint sells.

### The Compliance Checklist (SPED — IDEA)
Navigate to the compliance checklist section on the incident detail page.

**Required items (must all be completed):**
1. **ARD Committee Notified** — ARD members have been notified of the pending DAEP recommendation
2. **Manifestation Determination Conducted** — MDR meeting has occurred → *must also record result (IS or NOT manifestation)*
3. **Parents Notified of Procedural Safeguards** — Written notice provided
4. **FAPE Plan for DAEP Documented** — Special education services plan for DAEP campus

**Required for SPED (strongly recommended):**
5. **Current BIP Reviewed** — BIP reviewed for implementation fidelity
6. **FBA Conducted** — FBA within the past 12 months

**Optional (complete if applicable):**
7. **IEP Goals Reviewed** — IEP aligned to DAEP service plan
8. **Educational Services Arranged** — SPED services arranged at DAEP campus

**Recording the Manifestation Determination Result:**
After checking "Manifestation Determination Conducted," an amber reminder appears. Click the result dropdown:
- **IS a manifestation** → Red box appears. DAEP placement **CANNOT proceed**. Student must remain at home campus with BIP modifications. The IDEA Special Circumstances section shows allowed exceptions (weapons, drugs, etc.)
- **NOT a manifestation** → Green box appears. DAEP placement may proceed once all remaining items are complete.

### The Compliance Checklist (Section 504)
The 504 checklist has different language reflecting Section 504 requirements:
1. **Section 504 Team Notified** (not "ARD Committee")
2. **Manifestation Determination Conducted** → result required
3. **Parents Notified of Procedural Safeguards**
4. **FAPE Plan Documented** (via 504 plan, not IEP)

> **Key difference:** SPED placements are governed by IDEA (federal special education law). 504 placements are governed by Section 504 of the Rehabilitation Act. Penalties and procedures differ. Waypoint enforces both but tracks them separately.

### Completing the Checklist
- Each item is checked (click to mark complete) — timestamped immediately
- A green progress bar shows completion percentage
- When all required items are checked AND manifestation result is recorded, the incident is **automatically unblocked** from Compliance Hold
- The incident status changes to the next appropriate step

### Override Block
If circumstances require proceeding before all items are complete:
- Click **Override Block** (visible to Admin roles only)
- Enter a detailed reason (minimum substantive explanation)
- The override is logged permanently in the audit trail
- **Use sparingly** — overrides are visible to TEA and OCR in any audit

---

## 6. Approval Chains (DAEP)

DAEP placements require a formal approval chain before activation. The chain is configured per district and may include: Campus Principal → Director of Student Services → Superintendent.

### How the Chain Works
1. Incident is submitted with DAEP consequence
2. The approval chain is automatically created
3. **Step 1 approver** receives an in-system notification (and email if configured)
4. Step 1 approver reviews and can: **Approve**, **Deny**, or **Return**
5. If approved, Step 2 approver is notified, and so on
6. When all steps are approved, incident status becomes **Approved** — ready to activate

### Approval Actions
| Action | What Happens |
|--------|-------------|
| **Approve** | Step is completed, next approver is notified |
| **Deny** | Incident status becomes Denied. Submitter is notified. No further action. |
| **Return** | Sent back to submitter for modification. Submitter must update and resubmit. |

### For Approvers
When it's your turn to approve:
- An orange **"Your Approval is Required"** banner appears on the incident
- The incident will also appear in your **DAEP Dashboard → Approval Queue**
- Review all incident details, documents, and compliance status before acting
- You can view the full approval chain status in the **Approval Chain** section

### After Approval
Once all approvers have approved:
- Status = **Approved**
- Admin can click **Activate Consequence** to start the placement
- **DAEP only:** If orientation has not been scheduled, activation will be blocked with an error message. Schedule orientation first (DAEP Dashboard → Orientations).

---

## 7. DAEP Dashboard

### Where to Find It
**Main menu → DAEP**

The DAEP Dashboard has two tabs:

### Live Operations Tab
Real-time view of your DAEP program:

| Widget | What It Shows |
|--------|--------------|
| **Capacity Warning** | Red banner if committed seats exceed configured capacity |
| **Summary Cards** | Active enrolled, Pending placements, Completed YTD, Compliance holds |
| **Active Enrollments** | All students currently in DAEP — click any row to see their incident |
| **Approval Queue** | Incidents pending approval action from you |
| **Missed Orientations** | Red widget — students who missed scheduled orientation |
| **Awaiting Placement Start** | Amber widget — approved but orientation not yet scheduled |
| **Scheduled Orientations** | Upcoming orientation appointments |
| **Approved Placements** | Placements approved but not yet active |
| **Pending Placements** | Submitted and awaiting approval |

### Analytics Tab
Trend analysis and capacity details:

| Section | What It Shows |
|---------|--------------|
| **DAEP Seat Capacity** | Bar chart of occupied / reserved / available seats |
| **Enrollment by Grade** | Breakdown of current placements by grade level |

### Capacity Warning
If your district has configured DAEP seat capacity (Settings → District → DAEP Capacity), the Live Operations tab shows a red banner when over capacity:

```
⚠ DAEP Over Capacity — 23 committed of 20 total seats
  New placements should be paused. Review the Analytics tab for a full capacity breakdown.
```

### Orientations
Students approved for DAEP must complete an orientation before placement is activated.

**Scheduling an orientation:**
1. DAEP Dashboard → Orientations tab
2. Find the student in the "Awaiting Placement Start" section
3. Click the student row → Schedule Orientation
4. Set date, time, location, and confirm staff present

**After orientation is scheduled:**
The `Activate Consequence` button becomes enabled on the incident.

**Missed orientation:**
If a student doesn't show for scheduled orientation, the system creates a **Missed Orientation** alert. A red widget appears on the dashboard. This alert must be resolved (reschedule) before the system considers the student "in" the program.

---

## 8. Transition Plans

### Where to Find It
**Main menu → Transition Plans**

Transition plans document the student's re-entry path and are required for any student placed in DAEP.

### Creating a Plan
1. Navigate to **Transition Plans → + New Plan**
2. Select the student (must have an active or recent DAEP incident)
3. Select plan type: **Initial**, **30-Day Review**, **60-Day Review**, **90-Day Review**, or **Discharge**
4. Enter start and end dates
5. Add behavioral goals, academic goals, and service supports
6. Click **Save as Draft** or **Activate Plan**

### Plan Status Flow
```
Draft → Active → Under Review → Completed
```
- **Draft:** Being built, not yet shared with student/family
- **Active:** The current working plan for this student
- **Under Review:** In a scheduled 30/60/90-day review meeting
- **Completed:** Discharge or successful completion

### 30/60/90-Day Review Tracking
When a plan is created with a start date, the system auto-calculates review due dates:
- **30 days** from start → first check-in
- **60 days** from start → mid-point review
- **90 days** from start → discharge review

**Overdue reviews** are flagged with:
- A red **"Overdue"** badge in the table
- A red banner at the top of the Transition Plans page ("X reviews overdue")
- An orange "Due Soon" badge when review is within 7 days

**Completing a review:**
1. Click the plan → click **Add Review**
2. Record meeting date, who attended, and outcomes
3. Update the plan goals based on review findings
4. Click **Save Review**

> **Compliance note:** Overdue transition plan reviews are a common finding in TEA audits of DAEP programs. Waypoint flags them prominently, but completion requires intentional action by staff.

### Behavioral Tracking
When a student checks in daily at the kiosk, behavior data is logged. The **Daily Behavior Visualization** on the plan detail page shows:
- Attendance streak (consecutive days checked in)
- Behavior score trend
- Goal completion rate

---

## 9. Repeat Offender Alerts

### Where to Find It
**Main menu → Alerts**

Waypoint automatically generates alerts when students meet repeat-offense criteria:

| Alert | Trigger | Level |
|-------|---------|-------|
| Second DAEP | Student placed in DAEP a 2nd time | 🔴 Red |
| 3+ ISS in 30 days | Three or more ISS placements in any 30-day window | 🔴 Red |
| Same Offense 3x | Same offense code used 3+ times | 🟡 Yellow |
| 5+ Referrals | Five or more total referrals this year | 🟡 Yellow |
| Orientation Missed | Student missed a scheduled orientation | 🟡 Yellow |
| Awaiting Placement Start | Approved but orientation not scheduled | 🟡 Yellow |

### Reading an Alert
Each alert card shows:
- Student name, grade, campus
- Alert level and trigger description
- Current status (Active / Acknowledged / In Progress / Resolved)
- Days since alert was created

### Taking Action
Click an alert to open the detail view:
1. **Acknowledge** — Log that you've seen it (first step)
2. **Mark In Progress** — You're taking action
3. **Resolve** — Document what was done
4. **Dismiss** — False alarm or already handled by other means

### Filters
Use the 4 filter dropdowns to narrow by:
- Alert Level (Red / Yellow)
- Status (Active / Acknowledged / In Progress / Resolved / Dismissed)
- Campus
- Trigger Type

> **Best practice:** Every red alert should be acknowledged within 24 hours and resolved within 5 business days. Consider assigning a designated person (counselor or AP) to review alerts weekly.

---

## 10. Reports & PEIMS Export

### Where to Find It
**Main menu → Reports**

### Report Types
| Report | What It Shows |
|--------|--------------|
| **Overview** | Incident count by month, consequence type breakdown, campus comparison |
| **Enrollment** | Active DAEP placements, days remaining by student |
| **Disproportionality** | Discipline rates by race/ethnicity, SPED status, campus |
| **Recidivism** | Students with 2+ DAEP placements, repeat offenders |
| **Interventions** | What interventions are being used and completion rates |
| **PEIMS Export** | Discipline data formatted for TEA PEIMS submission |

### Exporting Reports
Each report tab has **PDF** and **Excel** export buttons in the top-right.
- **PDF:** Formatted report with district name, date, and generated-by user
- **Excel:** Raw data for further manipulation

### PEIMS Export
The PEIMS Export tab generates your discipline data in the format required for TEA submission.

**Before exporting:**
1. Verify all incidents have complete data (no null offense codes, no missing student IDs)
2. Check the date range covers your submission window
3. Review the **Disproportionality** report for any anomalies that might raise questions

**Export process:**
1. Set the school year / date range
2. Click **Generate PEIMS Export**
3. Review the preview (student count, incident count)
4. Download as CSV

> **Important:** Waypoint generates a CSV formatted to PEIMS specifications. Before uploading to TEA's TSDS, validate the file using TEA's PEIMS data standards documentation. Any validation errors from TEA should be corrected in Waypoint (fix the underlying data), not in the exported file.

### The Compliance Report (for TEA Visits)
If TEA arrives for a monitoring visit:
1. Go to any SPED student's incident
2. Scroll to the Compliance Checklist section
3. Click **Print / Export** (PDF)
4. The printed report shows every checklist item, timestamp, and the name of the completing user

This is the document you hand a TEA auditor. It shows the full chain of compliance documentation in a single page.

---

## 11. Settings & Configuration

### District Settings (`/settings`)
- **School year:** Start date used for all cumulative calculations
- **DAEP capacity:** Total seats (or by level) — displays in dashboard
- **Subscription tier:** Controls which features are enabled

### Campuses (`/settings/campuses`)
- Add or edit campus names
- Configure campus type (elementary, middle, high, DAEP campus)
- Assign staff to campuses

### Offense Codes (`/settings/offense-codes`)
- Import or manually add codes
- Set active/inactive status
- Link to TEC category

### Discipline Matrix (`/settings/matrix`)
- Configure consequence ranges per offense code
- Set escalation tiers (1st / 2nd / 3rd+)
- View matrix completeness warnings (offense codes with no matrix entry)

### User Management
- **Add user:** Create a profile with a role and campus assignment
- **Edit user:** Change role, campus assignment, or deactivate
- **Roles available:** Admin, Principal, AP, Counselor, SPED Coordinator, Teacher, CBC, SSS, Section 504 Coordinator, Director of Student Affairs, Parent, Student

> **Role security:** Each role sees only the pages and data appropriate to their function. Teachers see only students on their campus. Counselors see only students they're assigned to. Parents see only their own children's data.

---

*For Waypoint support, contact your implementation specialist or visit `clearpathedgroup.com`.*
