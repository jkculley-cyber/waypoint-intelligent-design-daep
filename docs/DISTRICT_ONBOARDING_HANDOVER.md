# Waypoint DAEP - District Onboarding Handover

> **Purpose:** This document covers the end-to-end process for onboarding a new school district onto Waypoint. Use it as a checklist and reference when working with Claude Chat, a Coworker agent, or district contacts to coordinate logistics.

---

## Phase 1: Pre-Onboarding (Sales → Ops Handoff)

### Information to Collect from the District

| Item | Example | Notes |
|------|---------|-------|
| District name | Lone Star ISD | Official name |
| TEA District ID | 123456 | 6-digit Texas identifier |
| Subscription tier | essential / professional / enterprise | Determines feature access |
| School year | 2025-2026 | Sets calendar context |
| Campuses to onboard | Lincoln HS, Adams MS, DAEP | Name, type, TEA campus ID |
| Admin contact | Jane Doe, jane@district.org | Will receive the initial admin account |
| IT contact | John Smith, john@district.org | For SSO/network questions |
| SIS platform | Skyward / PowerSchool / Infinite Campus | Affects import column mapping |
| Student count estimate | ~2,000 | For capacity planning |
| DAEP campus name | Crossroads DAEP | If they have one |
| Kiosk deployment plan | 2 tablets at DAEP | Hardware & location |

### Tier Feature Summary (for district communication)

| Tier | What They Get |
|------|---------------|
| **Essential** | Dashboard, Students, Incidents, Discipline Matrix (view) |
| **Professional** | + Transition Plans, Compliance Checklists, Alerts, Approval Chain, DAEP Dashboard, Phone Return, Reports, Parent Portal, Kiosk |
| **Enterprise** | + Matrix Editor, Data Import, AI Chat Support, Recidivism Analytics, Student Interventions |

---

## Phase 2: Environment Setup

### 2.1 Supabase Project

Each district gets provisioned within the shared Supabase project. Required environment variables:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_DB_PASSWORD=<db-password>
```

### 2.2 Run Migrations (if fresh project)

```bash
node supabase/run_migrations.mjs
```

This runs 15 migration files that create all tables, RLS policies, triggers, offense codes (40+ Texas Ed Code offenses), and the intervention catalog (42 MTSS interventions).

### 2.3 Create the District Record

```sql
INSERT INTO districts (id, name, tea_district_id, state, settings)
VALUES (
  gen_random_uuid(),
  '<District Name>',
  '<TEA ID>',
  'TX',
  '{
    "school_year": "2025-2026",
    "subscription_tier": "<essential|professional|enterprise>",
    "default_consequence_days": {"iss": 3, "oss": 3, "daep": 30}
  }'::jsonb
);
```

> **Important:** The `subscription_tier` setting in `districts.settings` controls which features are visible. If omitted, defaults to `enterprise` (full access).

### 2.4 Create Campuses

```sql
INSERT INTO campuses (district_id, name, tea_campus_id, campus_type)
VALUES
  ('<district-uuid>', 'Lincoln High School', '123456001', 'high'),
  ('<district-uuid>', 'Adams Middle School', '123456002', 'middle'),
  ('<district-uuid>', 'Washington Elementary', '123456003', 'elementary'),
  ('<district-uuid>', 'Crossroads DAEP', '123456004', 'daep');
```

Campus types: `elementary`, `middle`, `high`, `daep`, `jjaep`, `other`

---

## Phase 3: User Account Provisioning

### 3.1 Create the District Admin

The admin account is the district's first user and has full access.

**Script:** `supabase/create_admin.mjs`

Customize the script with the district admin's email, then run:
```bash
node supabase/create_admin.mjs
```

**Provide to the district admin:**
- Login URL
- Email and temporary password
- Instructions to change password on first login

### 3.2 Create Staff Accounts

Two options:

**Option A: Script (small teams)**
Customize and run `supabase/create_campus_staff.mjs` with each staff member's email, role, and campus assignment.

**Option B: Data Import (larger teams, Enterprise tier)**
The district admin can bulk-import staff via Settings > Data Import > Staff. CSV fields:
- `email`, `full_name`, `role`, `campus_names` (semicolon-separated), `phone`

### 3.3 Staff Roles to Assign

| Role | Who | Access Scope |
|------|-----|-------------|
| admin | District admin / IT director | District-wide, all features |
| principal | Campus principal | District-wide, incidents + reports |
| ap | Assistant principal | Campus-scoped, incidents + compliance |
| counselor | School counselor | Campus-scoped, incidents + plans |
| sped_coordinator | SPED coordinator | Campus-scoped, compliance checklists |
| section_504_coordinator | 504 coordinator | Campus-scoped, 504 compliance |
| teacher | Classroom teacher | Campus-scoped, incident reporting |
| cbc | Campus Behavior Coordinator | Campus-scoped, approval workflow |
| sss | Student Support Specialist | District-wide, approval workflow |

### 3.4 Create Parent Accounts (Professional+ tier)

**Script:** `supabase/create_parent.mjs`

Parents see a separate portal with read-only access to their children's incidents, transition plans, and progress.

---

## Phase 4: Data Population

### 4.1 Import Student Roster

**Method:** Settings > Data Import > Students (Enterprise tier), or direct SQL/CSV for lower tiers.

**Required fields:** `student_id_number`, `first_name`, `last_name`, `date_of_birth`, `grade_level`, `campus_name`

**Optional but recommended:** `gender`, `race`, `is_sped`, `sped_eligibility`, `is_504`, `is_ell`, `is_homeless`, `is_foster`, `is_migrant`

> Import templates with sample data are downloadable from the import page.

**SIS column auto-detection:** The import wizard recognizes column names from Skyward, PowerSchool, and Infinite Campus formats.

**Duplicate handling:** Choose "Skip Duplicates" (leave existing) or "Update Duplicates" (upsert).

### 4.2 Configure the Discipline Matrix

**Who:** District admin (Enterprise tier can use the Matrix Editor UI; other tiers need SQL)

**What:** Map each offense code to recommended consequences by occurrence (1st, 2nd, 3rd+) and grade group (pk-2, 3-5, 6-8, 9-12).

**Fields per rule:**
- Min/max/default consequence
- Consequence day range
- Required supports (parent_conference, counseling, etc.)
- Required notifications
- Whether a transition plan is required

> 40+ Texas Education Code offense codes are pre-loaded. Districts can add custom codes.

### 4.3 Import Historical Incidents (optional, Enterprise tier)

If the district wants prior-year data for trend analysis, use Data Import > Incidents with CSV fields:
- `student_id_number`, `incident_date`, `offense_code`, `description`, `consequence_type`, `consequence_days`, `location`, `reported_by_email`

---

## Phase 5: Feature Configuration

### 5.1 DAEP Approval Chain (Professional+ tier)

The approval workflow auto-activates when a DAEP-level incident is submitted. The chain follows this sequence:

1. Campus Behavior Coordinator (CBC) - always
2. Counselor - always
3. SPED Coordinator - only if student `is_sped = true`
4. 504 Coordinator - only if student `is_504 = true`
5. Student Support Specialist (SSS) - always

**District action required:** Ensure staff with roles `cbc`, `counselor`, `sped_coordinator`, `section_504_coordinator`, and `sss` are assigned to the appropriate campuses.

### 5.2 SPED/504 Compliance Automation

Automatic triggers fire when a DAEP placement or expulsion is assigned to a SPED/504 student:
- Creates a compliance checklist
- Sets incident status to `compliance_hold`
- Blocks placement until checklist is completed

**Alert thresholds:**
- Yellow flag at 5+ cumulative removal days (approaching MDR)
- Red flag at 10+ cumulative removal days (MDR required)

### 5.3 Kiosk Setup (Professional+ tier)

**URL format:** `https://<app-url>/kiosk?campus=<campus-uuid>`

**Setup steps:**
1. Get the DAEP campus UUID from the database
2. Bookmark the kiosk URL on the tablet/device
3. Set browser to full-screen / kiosk mode
4. Position device at the DAEP check-in desk

**Features:**
- Student checks in with ID number
- Phone bag number assignment
- Shows days remaining in placement
- FERPA-compliant (60-second idle timeout, auto-clear)

### 5.4 Changing a District's Tier

To upgrade/downgrade a district's feature access:

```sql
UPDATE districts
SET settings = jsonb_set(settings, '{subscription_tier}', '"professional"')
WHERE id = '<district-uuid>';
```

Changes take effect on next page load (no restart needed).

---

## Phase 6: Training & Go-Live

### Recommended Training Sessions

| Session | Audience | Topics |
|---------|----------|--------|
| Admin Training | District admin, IT | Settings, import, matrix config, user management |
| Staff Training | AP, counselors, teachers | Incident creation, compliance workflow, transition plans |
| DAEP Staff Training | DAEP campus staff | Kiosk, daily behavior tracking, phone return |
| Parent Orientation | Parents | Portal login, viewing incidents & plans |

### Key Workflows to Demo

1. **Incident lifecycle:** Create draft > submit > review > approve > active > complete
2. **SPED compliance hold:** Show how a SPED student's DAEP incident triggers a compliance checklist
3. **Approval chain:** Walk through the multi-step approval for DAEP placements
4. **Transition plans:** Create an exit plan with 30/60/90-day reviews
5. **Alerts:** Show how repeat offenses and SPED cumulative days trigger flags
6. **Reports:** Generate incident trends and disproportionality analysis
7. **Kiosk check-in:** Student arrival workflow with phone bag assignment

---

## Phase 7: Post-Launch Support

### Ongoing Maintenance

- **Student roster sync:** Re-import updated roster at semester breaks or as needed
- **Staff changes:** Add/remove users as staff rotate
- **Matrix updates:** Adjust consequence recommendations based on district policy changes
- **Tier upgrades:** Update `subscription_tier` when district upgrades

### Common Support Requests

| Request | Resolution |
|---------|-----------|
| "Can't see Compliance/Plans/etc." | Check district tier in `districts.settings.subscription_tier` |
| "Staff can't see certain students" | Check campus assignments in `profile_campus_assignments` |
| "Parent can't see their child" | Run `fix_parent_access.mjs` or check `students.parent_user_id` |
| "Compliance checklist didn't trigger" | Verify student's `is_sped` or `is_504` is `true` |
| "Import failed" | Check `import_errors` table for row-level details |

---

## Quick Reference: Scripts

| Script | Purpose | Required Env Vars |
|--------|---------|-------------------|
| `supabase/run_migrations.mjs` | Create/update database schema | `SUPABASE_DB_PASSWORD` |
| `supabase/run_seed.mjs` | Load demo data (dev/testing only) | `SUPABASE_DB_PASSWORD` |
| `supabase/create_admin.mjs` | Create district admin account | `SUPABASE_SERVICE_ROLE_KEY` |
| `supabase/create_campus_staff.mjs` | Create staff accounts | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` |
| `supabase/create_parent.mjs` | Create parent account | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` |
| `supabase/fix_parent_access.mjs` | Repair parent-student links | `SUPABASE_DB_PASSWORD` |

---

## Appendix: Communication Templates

### Welcome Email to District Admin

> Subject: Your Waypoint Account is Ready
>
> Welcome to Waypoint Behavioral Solutions!
>
> Your district account has been provisioned on the **[Tier]** plan. Here are your login credentials:
>
> - **URL:** [app URL]
> - **Email:** [admin email]
> - **Temporary Password:** [password]
>
> Please change your password after your first login.
>
> **Next steps:**
> 1. Log in and review your dashboard
> 2. We'll schedule a 30-minute admin training session
> 3. Share staff account details with your team
>
> Questions? Contact [support email/phone].

### Staff Account Notification

> Subject: Your Waypoint Login
>
> You've been added to Waypoint, your district's behavioral management system.
>
> - **URL:** [app URL]
> - **Email:** [staff email]
> - **Temporary Password:** [password]
> - **Role:** [role label]
> - **Campus:** [campus name]
>
> Please change your password after your first login. Training materials are available at [link].

---

*Document version: 1.0 | Last updated: 2026-02-14*
*A product of Clear Path Education Group, LLC. All rights reserved.*
