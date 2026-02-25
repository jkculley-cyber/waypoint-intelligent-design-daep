# FERPA Compliance Statement

**Clear Path Education Group, LLC — Waypoint Platform**
Last Updated: February 25, 2026

---

## Overview

Clear Path Education Group, LLC ("Clear Path") provides the Waypoint discipline and DAEP management platform to Texas public school districts. This statement describes how Waypoint is designed to comply with the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. § 1232g, and its implementing regulations at 34 C.F.R. Part 99.

---

## Our Role Under FERPA

When a school district ("Educational Agency") contracts with Clear Path to use Waypoint, Clear Path operates as a **"school official"** with a **"legitimate educational interest"** as permitted under FERPA (34 C.F.R. § 99.31(a)(1)). This classification allows districts to share Student Education Records with Clear Path without obtaining prior parental consent, provided the district has included Clear Path in its annual FERPA notice as a school official.

Clear Path does **not** act as a FERPA "data controller" — the district retains full ownership of all student education records. Clear Path processes records solely on the district's behalf, under the district's instructions, and in accordance with the signed Data Processing Agreement (DPA).

---

## FERPA-Compliant Design Principles

### 1. Legitimate Educational Purpose Only

All access to Student Education Records within Waypoint requires:
- A valid authenticated district staff account
- Assignment to the student's campus (campus-scoped staff) or district-wide authorization (admin users)
- An active district subscription

Student data is used solely to support district discipline administration, DAEP placement management, and required compliance workflows. Clear Path does not access student records for any commercial purpose.

### 2. Role-Based Access Control

Waypoint enforces granular role-based access with 12 distinct roles:

| Role | Access Level |
|---|---|
| `admin` | District-wide — all students, all campuses |
| `principal`, `ap`, `counselor` | Campus-scoped — students at assigned campuses |
| `sped_coordinator`, `director_student_affairs`, `cbc`, `sss`, `section_504_coordinator`, `teacher` | Campus-scoped |
| `parent` | Own children only — no access to other students |
| `student` | Own records only |

Access is enforced at the **database level** using PostgreSQL Row-Level Security (RLS) policies, not only at the application layer.

### 3. Parent Portal Access

The Waypoint parent portal (`/parent`) displays only records for the authenticated parent's own children. By design:
- Parents cannot view other students' records
- Sensitive staff-only data (separation orders, internal compliance notes, SPED manifestation details not yet shared with parent) is excluded from parent-facing queries
- All parent portal queries are written to explicitly exclude tables and columns not intended for parental disclosure

### 4. Separation Orders — Staff-Only FERPA Restriction

Waypoint's "Separation Orders" feature (used to track students who must be kept apart on the DAEP campus for safety reasons) is **never accessible** from the parent portal. This data is:
- Stored in the `incident_separations` table with district-scoped RLS
- Visible only to authenticated district staff
- Flagged in the UI with a "🔒 FERPA — Staff Only" indicator
- Never included in any parent-facing API query

### 5. No Unauthorized Disclosure

Clear Path does not share Student Education Records with any third party except:
- The subprocessors listed in our [Subprocessor List](./SUBPROCESSOR_LIST.md) (infrastructure providers bound by equivalent data protection agreements)
- As required by law (e.g., court order, lawful government request) — Clear Path will notify the district promptly unless prohibited by law

### 6. Data Minimization

Waypoint collects only the student data fields necessary for discipline administration:
- Name, student ID number, grade level, campus
- Disability status flags (SPED, 504) — required for compliance workflow triggers under TEC Chapter 37
- Date of birth (optional; used for age-based TEC determinations)

Clear Path does not collect Social Security Numbers, financial information, or health records beyond disability status required for TEC compliance.

### 7. Security Safeguards

To protect Student Education Records against unauthorized access:
- All data in transit is encrypted with TLS 1.2 or higher
- All data at rest is encrypted using AES-256 (AWS/Supabase default encryption)
- Authentication requires strong passwords with HaveIBeenPwned breach detection
- Database access requires Row-Level Security to pass at the PostgreSQL level — bypassing the application layer does not bypass data protections
- All production database access is logged

See our [IT Security FAQ](../IT_Security_FAQ.md) for full technical security details.

### 8. Data Retention and Deletion

Upon contract termination:
- District data remains available for 30 days for export
- After 30 days, Clear Path will delete or irreversibly anonymize all Student Education Records
- Deletion confirmation will be provided in writing upon request
- Backup deletion occurs within the backup retention window (maximum 30 days post-termination)

---

## District Responsibilities Under FERPA

For the school official exception to apply, the district must:
1. **Include Clear Path in its annual FERPA notification** to parents as a school official with legitimate educational interest
2. **Maintain a signed Data Processing Agreement** with Clear Path prior to entering student data
3. **Control user provisioning** — districts are responsible for creating, maintaining, and deactivating staff accounts in Waypoint
4. **Respond to parent rights requests** — if a parent requests to inspect, amend, or restrict their child's records, the district is responsible for executing that request in Waypoint and notifying Clear Path if deletion is required

---

## Texas State Law Compliance

In addition to FERPA, Waypoint is designed to comply with applicable Texas state law governing student data privacy:

- **Texas Education Code § 32.151–32.158** (Student Data Privacy): Waypoint's DPA template addresses all required elements including security measures, prohibited uses, data return/destruction, and subprocessor requirements.
- **Texas Education Code Chapter 37** (Student Discipline): Waypoint's workflows enforce TEC Chapter 37 timelines, SPED manifestation determination triggers, and DAEP placement documentation requirements.
- **Texas HB 3834 / SB 820** (Student Privacy): Clear Path agrees not to sell student data, use student data for targeted advertising, or build profiles of students for non-educational purposes.

---

## Annual Review

This FERPA Compliance Statement is reviewed at least annually and updated when material changes occur to Waypoint's data practices, subprocessors, or applicable law.

---

## Contact

For FERPA-related questions or to report a potential unauthorized disclosure:

**Clear Path Education Group, LLC**
FERPA Compliance Contact
Email: privacy@clearpathedgroup.com
Website: clearpathedgroup.com

For district-level FERPA inquiries, contact your district's FERPA Records Officer. Clear Path will cooperate fully with district-initiated FERPA investigations.
