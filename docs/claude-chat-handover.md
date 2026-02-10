# Waypoint DAEP - Claude Chat Handover Document

> **Purpose:** Paste this entire document into a new Claude Chat conversation, then ask it to produce the 1-page executive summary, tiered package breakdown, or any other sales/marketing material. Claude Chat will have full context to write from the perspective of superintendents, CTOs, principals, and board members.

---

## WHAT IS WAYPOINT DAEP?

Waypoint is a **Texas Education Code-compliant discipline management platform** for K-12 school districts. It replaces spreadsheets, paper forms, and disconnected SIS modules with a unified system that handles the full discipline lifecycle: incident reporting, SPED/504 compliance verification, consequence management, behavioral transition plans, progress monitoring, and state reporting (PEIMS).

The product name reflects its mission: providing a **compass point** (Waypoint) for students in **Disciplinary Alternative Education Programs** (DAEP) to navigate back to their home campus successfully.

---

## THE PROBLEM IT SOLVES

Texas school districts face a compliance minefield when placing students in DAEP or imposing expulsions:

1. **SPED/504 students require a multi-step compliance checklist** (ARD committee, manifestation determination, BIP review, FBA, FAPE plan, parent notification) before placement can proceed. Missing a step creates legal liability.
2. **Transition plans with mandatory 30/60/90-day reviews** are required but tracked on paper or in spreadsheets, leading to missed deadlines and audit findings.
3. **Repeat offender patterns** go unnoticed until a student is on their 2nd or 3rd DAEP placement in the same year.
4. **Disproportionality reporting** (are certain demographics over-represented in discipline?) is federally required but painful to produce manually.
5. **PEIMS reporting** (Texas state data submission) requires specific action codes tied to each offense - errors delay state funding.
6. **Parent communication** about discipline events is inconsistent and undocumented.

---

## CORE FEATURES

### 1. Incident Management (Full Lifecycle)
- Multi-step incident creation wizard: select student, offense code, consequence, details, review
- 9-state workflow: Draft -> Submitted -> Under Review -> Compliance Hold -> Approved -> Active -> Completed (or Appealed/Overturned)
- Consequence types: Warning, Detention, ISS, OSS, DAEP, Expulsion
- Automatic compliance hold triggered when DAEP/expulsion affects a SPED/504 student
- Discipline matrix auto-suggests consequences based on offense, occurrence count, and grade level
- Policy mismatch detection warns staff when selected consequence deviates from district policy

### 2. SPED/504 Compliance Engine (Key Differentiator)
- Auto-creates compliance checklist when DAEP/expulsion consequence assigned to SPED/504 student
- **Blocks placement** until all compliance items completed (or explicitly overridden with documented reason)
- Checklist items: ARD committee, manifestation determination, BIP review, FBA, FAPE plan, parent notification, educational services arrangement, IEP goals review, least restrictive environment consideration
- Manifestation determination tracking with 3 outcomes (is manifestation, not manifestation, pending)
- Full audit trail of who completed each item and when

### 3. Behavioral Transition Plans
- Plan types: DAEP Entry, DAEP Exit, ISS Re-Entry, Behavioral Support, Custom
- Structured components: behavioral supports, academic supports, parent engagement, success metrics, escalation protocol
- **Mandatory 30/60/90-day reviews** with tracked metrics: office referrals, CICO scores, grade average, attendance rate, behavioral scores
- Progress rating: Exceeding, On Track, At Risk, Failing
- Intervention tracking with MTSS tiers (1-3) and effectiveness ratings
- Plans linked to originating incident for full traceability

### 4. Repeat Offender Alert System (Early Warning)
- Automatic alerts with two severity levels (Red Flag / Yellow Flag)
- Four trigger types:
  - 2nd DAEP placement in same school year
  - 3+ ISS in 30 days
  - Same offense 3+ times
  - 5+ referrals in 30 days
- Structured response protocol: root cause analysis, previous plan review, SPED referral consideration, threat assessment, mental health referral
- Alert lifecycle: Active -> Acknowledged -> In Progress -> Resolved

### 5. Daily Behavior Tracking Kiosk
- Standalone full-screen mode for DAEP classroom use
- Student self-check-in/check-out by ID
- Period-by-period behavior scoring
- Daily goal tracking (met/not met)
- Instructional calendar integration (auto-calculates days remaining in placement, excluding weekends, holidays, staff development days)

### 6. Reports & Analytics
- **Incident Trends:** Line/bar charts of incident volume over time
- **Disproportionality Analysis:** Risk ratios by race/ethnicity, gender, SPED status, ELL status (federally required)
- **Recidivism Report:** Repeat offender rates and incident frequency distribution
- **Intervention Effectiveness:** Usage counts, completion rates, effectiveness ratings
- **PEIMS Export:** Texas-formatted data export with correct action codes
- All reports exportable as PDF or Excel

### 7. Discipline Matrix Configuration
- Map each offense code to recommended consequences by occurrence (1st, 2nd, 3rd+) and grade group (PK-2, 3-5, 6-8, 9-12)
- Configure required supports (parent conference, counselor referral, BIP, etc.)
- Configure required notifications (parent, SPED coordinator, principal)
- Flag whether transition plan auto-creates

### 8. Parent Portal
- Parents log in to see their children's incidents, consequences, and transition plans
- Read-only access to discipline information
- View days remaining in DAEP placement
- See transition plan progress and review results

### 9. Data Import System
- Bulk CSV/Excel upload for campuses, students, staff, incidents
- Auto-detects column mappings for common SIS export formats (Skyward, PowerSchool, Infinite Campus)
- 4-step wizard: Upload -> Map Columns -> Validate -> Import
- Per-row error reporting with downloadable error CSV
- Duplicate handling: skip or upsert
- 3-tier permission system (Admin Only / Admin+Principal / Extended)
- Import history with full audit trail

### 10. Offense Code Management
- Pre-loaded Texas Education Code offense definitions
- District-specific custom codes
- Severity levels: Minor, Moderate, Serious, Severe
- TEC reference linking
- Mandatory vs. discretionary DAEP/expulsion flags
- PEIMS action code association

---

## TECHNOLOGY SPECIFICATIONS

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 19 + Vite 7 | Modern SPA with client-side routing (React Router 7) |
| Styling | Tailwind CSS 4 | Utility-first CSS, responsive design, mobile-friendly |
| Database | PostgreSQL via Supabase | Managed cloud database with automatic backups |
| Authentication | Supabase Auth | Email/password authentication, session management |
| API | PostgREST (Supabase) | Auto-generated REST API from database schema |
| Data Visualization | Recharts | Interactive charts for dashboards and reports |
| PDF Export | jsPDF + jspdf-autotable | Client-side PDF generation |
| Excel Export | SheetJS (XLSX) | Client-side Excel workbook generation |
| Data Security | Row-Level Security (RLS) | PostgreSQL-native row-level access control |
| Hosting | Supabase Cloud (backend), static hosting for frontend (Vercel/Netlify/etc.) | |

### Data Storage & Security
- **Database:** PostgreSQL hosted on Supabase (AWS infrastructure, SOC 2 Type II compliant)
- **Multi-tenant isolation:** Every table uses `district_id` column; Row-Level Security (RLS) policies enforce that users can ONLY access their own district's data at the database level - not application level
- **Campus scoping:** Staff members are assigned to specific campuses; non-admin roles can only see data for their assigned campuses (enforced via RLS)
- **Encryption:** Data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- **Authentication:** Supabase Auth with bcrypt password hashing, session tokens
- **Audit trail:** All significant actions logged with user ID, timestamp, IP address, and change details
- **No student data in frontend code:** All data fetched at runtime via authenticated API calls
- **Backup:** Automatic daily database backups with point-in-time recovery
- **17 database tables** with foreign keys, check constraints, unique constraints, and indexes

### User Roles (8 types)
| Role | Scope | Key Capabilities |
|------|-------|-----------------|
| Administrator | District-wide | Full access to all features, settings, reports, imports |
| Principal | District-wide | Incidents, compliance, alerts, reports, limited settings |
| Assistant Principal | Campus-scoped | Incidents, compliance, alerts for assigned campuses |
| Counselor | Campus-scoped | Incidents, alerts, transition plans for assigned campuses |
| SPED Coordinator | Campus-scoped | Incidents, compliance, alerts for assigned campuses |
| Teacher | Campus-scoped | Incident reporting, transition plans for assigned campuses |
| Parent | Own children | View incidents, consequences, transition plan progress |
| Student | Kiosk only | Daily check-in/check-out behavior tracking |

---

## TIERED PACKAGE STRUCTURE

> **Note to Claude Chat:** The tiers below are a suggested commercial structure. Adjust pricing, naming, and feature bundling as needed for the target market.

### Tier 1: WAYPOINT CORE
**Target:** Small districts (< 5 campuses), charter schools
**Features included:**
- Incident management (full lifecycle)
- Student roster management
- Offense code management (TEC + custom)
- Basic discipline matrix
- Consequence tracking with start/end dates
- Staff role-based access (Admin, Principal, Teacher)
- CSV/Excel data import (Admin only)
- Basic incident reports (list view, filter, search)

**Not included:** SPED compliance engine, transition plans, alerts, analytics, parent portal, kiosk, PEIMS export

---

### Tier 2: WAYPOINT PROFESSIONAL
**Target:** Mid-size districts (5-20 campuses)
**Everything in Core, plus:**
- **SPED/504 Compliance Engine** (auto-hold, checklist, manifestation determination)
- **Transition Plans** with 30/60/90-day reviews
- **Repeat Offender Alerts** (Red/Yellow flags, 4 trigger types)
- **Discipline Matrix** with occurrence-based and grade-group rules
- Full 8-role access control (Admin, Principal, AP, Counselor, SPED Coordinator, Teacher, Parent, Student)
- Campus-scoped access for non-admin staff
- **Parent Portal** (view incidents, plans, progress)
- **Data Import** with auto-column mapping (Tier 2 permissions: Admin + Principal)
- **Standard Reports:** Incident trends, consequence distribution, status breakdown

**Not included:** Disproportionality analytics, recidivism analysis, intervention tracking, kiosk, PEIMS export, advanced reporting

---

### Tier 3: WAYPOINT ENTERPRISE
**Target:** Large districts (20+ campuses), ESCs, state-level deployments
**Everything in Professional, plus:**
- **Disproportionality Analytics** with risk ratios by race, gender, SPED, ELL (federal compliance)
- **Recidivism Analysis** with repeat offender rates and frequency distribution
- **Intervention Tracking** with MTSS tiers, effectiveness ratings, implementation fidelity
- **Daily Behavior Tracking Kiosk** for DAEP classrooms (student check-in/check-out, period scoring)
- **PEIMS Export** (Texas state reporting with correct action codes)
- **Advanced Reports** with PDF and Excel export for all report types
- **Instructional Calendar** integration (auto-calculates DAEP days remaining)
- **Extended Data Import** permissions (Tier 3: all staff can import for their campuses)
- **Custom district settings** (calendar, notification rules, import tiers)
- **Notification system** with audit trail
- **Dedicated support and onboarding**

---

## KEY DIFFERENTIATORS vs. COMPETITORS

1. **SPED Compliance Blocking:** Waypoint is the only platform that physically blocks DAEP/expulsion placement for SPED/504 students until the compliance checklist is complete. Others just send reminders.

2. **Transition Plan Reviews Built In:** 30/60/90-day reviews with structured metrics (not just a text box). Tracks office referrals, CICO scores, grades, attendance, and behavioral scores over time.

3. **Repeat Offender Early Warning:** Automatic red/yellow flag alerts for dangerous patterns (2nd DAEP, 3+ ISS in 30 days, etc.) with structured response protocols.

4. **Disproportionality Analytics:** Built-in risk ratio calculations by demographic group - districts need this for federal compliance and don't want to export to Excel to calculate it.

5. **Daily Behavior Kiosk:** DAEP campuses can deploy a student-facing check-in/check-out system that feeds directly into transition plan reviews.

6. **Texas-Native:** Built specifically for Texas Education Code, not a generic discipline system with TEC bolted on. PEIMS action codes, TEC offense references, Texas SPED procedures.

7. **Modern Tech Stack:** React SPA with Supabase - fast, responsive, mobile-friendly. Not a legacy ASP.NET or Java app.

---

## DATABASE TABLE INVENTORY (17 tables)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| districts | Multi-tenant district records | name, tea_district_id, settings (JSONB) |
| campuses | Schools/facilities | name, tea_campus_id, campus_type, district_id |
| profiles | Staff/user accounts | email, full_name, role, district_id |
| students | Student roster + demographics | student_id_number, name, DOB, grade, campus_id, SPED/504/ELL flags |
| incidents | Discipline events | student_id, offense_code_id, consequence_type/days, status (9 states) |
| offense_codes | TEC offense definitions | code, category, severity, tec_reference, peims_action_code |
| discipline_matrix | Offense-to-consequence policy | offense_code_id, occurrence, grade_group, consequence min/max/default |
| compliance_checklists | SPED/504 compliance tracking | All checklist items, manifestation_result, placement_blocked |
| transition_plans | Behavioral support plans | plan_type, supports, metrics, review dates, status |
| transition_plan_reviews | 30/60/90-day reviews | referrals, CICO, grades, attendance, progress_rating |
| alerts | Repeat offender warnings | level (red/yellow), trigger_type, response tracking |
| interventions | Intervention catalog (MTSS) | name, category, tier, effectiveness tracking |
| student_interventions | Intervention assignments | student_id, intervention_id, dates, effectiveness_rating |
| daily_behavior_tracking | Kiosk check-in/check-out | student_id, date, behavior_scores, daily_total, goal_met |
| notification_log | Notification audit trail | recipient, type, status, sent_at |
| import_history | Bulk import records | import_type, file_name, status, counts, column_mapping |
| import_errors | Import error details | row_number, error_type, error_message, row_data |

---

## SAMPLE PROMPTS FOR CLAUDE CHAT

After pasting this document, try these prompts:

1. **"Write a 1-page executive summary of Waypoint for a superintendent audience. Include tech specs, data security, and how the three tiers differ. Use professional but accessible language."**

2. **"Create a board presentation talking points document (5 minutes) explaining why the district should adopt Waypoint. Focus on liability reduction, compliance automation, and cost savings vs. current paper/spreadsheet processes."**

3. **"Write a technical specification document for a district CTO evaluating Waypoint. Cover architecture, data storage, security, integrations, and infrastructure requirements."**

4. **"Draft a principal-facing quick start guide explaining what Waypoint does for their campus day-to-day."**

5. **"Create a comparison table of Waypoint Core vs Professional vs Enterprise tiers suitable for a district budget proposal."**

6. **"Write a parent communication letter explaining the new Waypoint parent portal and how to access their child's discipline information."**

---

## BRAND IDENTITY

- **Product Name:** Waypoint
- **Tagline:** Behavioral Solutions
- **Logo:** Compass rose in orange (#f97316) and purple/violet on dark background
- **Primary Brand Color:** Orange (#f97316 / Tailwind orange-500)
- **Secondary Accent:** Purple/violet
- **UI Theme:** Dark sidebar (gray-900), white content area, orange accents for primary actions
