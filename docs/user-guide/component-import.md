# Waypoint Data Import Guide

**Who uses this:** District Admins, Data Managers
**Location:** Settings → Import Data

---

## Overview

Waypoint's Import tool lets you bulk-load student records, staff profiles, offense codes, and historical discipline data from your existing SIS (Student Information System). The import wizard validates every row before processing and gives you full visibility into what will and won't be imported.

---

## Import Types

| Type | What It Creates | Primary Use |
|------|----------------|-------------|
| **Students** | Student records in Waypoint | Initial setup, start of school year |
| **Staff / Profiles** | Staff accounts (without auth login) | Initial setup; pair with account creation |
| **Offense Codes** | Offense library | One-time setup |
| **Discipline History** | Prior incidents | Migrating from paper or previous system |
| **Laserfiche DAEP** | Syncs Laserfiche records | Districts using Laserfiche |

---

## Supported File Formats

- `.csv` (UTF-8 encoding recommended)
- `.xlsx` (Excel)

---

## Step-by-Step Import Guide

### Step 1 — Prepare Your File

**Student import required fields:**
- `first_name`
- `last_name`
- `student_id_number` (must be unique within your district)

**Student import optional but recommended:**
- `date_of_birth`
- `grade_level`
- `campus_name` (must exactly match a campus name in Waypoint Settings)
- `is_sped` (true/false)
- `is_504` (true/false)
- `is_ell` (true/false)
- `is_homeless` (true/false)
- `is_foster_care` (true/false)
- `gender`
- `ethnicity`

**Staff import required fields:**
- `first_name`
- `last_name`
- `email` (must be unique; this becomes their login)
- `role` (must match a Waypoint role name exactly — see Role Name Reference below)

**Column naming is flexible.** Waypoint's auto-mapping recognizes common column names from Skyward, PowerSchool, Infinite Campus, and others. If your file uses "STDNT_FRST_NM" instead of "first_name," the mapper will likely recognize it. Review the mapping step anyway.

### Column Name Reference (Auto-Detected)
| Waypoint Field | Common aliases recognized |
|----------------|--------------------------|
| first_name | First Name, STDNT_FRST_NM, F_Name, fname |
| last_name | Last Name, STDNT_LST_NM, L_Name, lname |
| student_id_number | Student ID, Local ID, STDNT_ID, stu_num |
| campus_name | Campus, School, School Name, campus_name |
| grade_level | Grade, Grade Level, Gr, GR_LEVEL |
| date_of_birth | DOB, Birth Date, BIRTH_DT |

### Step 2 — Upload

1. Go to **Settings → Import Data**
2. Click **New Import** tab
3. Select the import type from the dropdown
4. Click **Upload File** and select your prepared file
5. The system reads the file and proceeds to column mapping

### Step 3 — Map Columns

The system shows a two-column view:
- Left: Your file's column headers
- Right: The Waypoint field each column maps to

**Review the auto-mapping.** If a column is unrecognized, it shows as "Unmapped." Drag it to the correct Waypoint field.

You can also set the **Duplicate Strategy:**
- **Skip** (default) — if a student/staff record already exists with the same ID or email, skip it
- **Upsert** — update the existing record with data from the file

> **Choose Upsert carefully.** It will overwrite existing data. Use Skip for initial loads; use Upsert for annual updates.

### Step 4 — Validate

Waypoint validates every row before import:

**Summary tab:** Total rows, valid count, error count, warning count

**Errors tab:** Rows that will be skipped
- Each row shows the specific error (e.g., "Campus 'Highland Park Elem' not found")
- Click **Download Error Report** to get a CSV of all error rows with their reasons
- Fix the errors in your source file and re-upload if needed

**Valid tab:** Rows ready to import
- Preview of up to 20 rows

**If there are error rows:** Before you can import, you must check the acknowledgement box:
```
☐ I understand [N] rows with errors will be skipped and not imported
```
This ensures you've consciously reviewed that some records won't be imported.

### Step 5 — Import

1. Click **Import N Rows**
2. A progress bar shows batch processing
3. Imports run in batches of 500 rows — large files may take 30–60 seconds

### Step 6 — Review Results

| Metric | Meaning |
|--------|---------|
| **Imported** | Successfully created/updated |
| **Skipped** | Duplicates skipped (if using Skip strategy) |
| **Errors** | Failed even during processing (rare) |

Check **Import History** tab for a log of all past imports.

---

## Common Errors and Fixes

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "Campus '[name]' not found" | Campus name in your file doesn't match Waypoint | Check exact spelling in Settings → Campuses |
| "Duplicate student_id_number" | Two rows with same ID | Find and merge duplicates in your source file |
| "Invalid date format" | Date column not in a recognized format | Use MM/DD/YYYY or YYYY-MM-DD |
| "Role '[role]' is not valid" | Staff role name doesn't match | See Role Name Reference below |
| "Email already exists" | Staff email already in Waypoint | Switch to Upsert strategy to update the record |

---

## Role Name Reference for Staff Import

When importing staff, the `role` column must use one of these exact values (case-insensitive):

| Role Name to Use | Who It's For |
|-----------------|-------------|
| `admin` | District admin, student services director |
| `principal` | Campus principal |
| `ap` | Assistant principal |
| `counselor` | School counselor |
| `sped_coordinator` | Special education coordinator |
| `section_504_coordinator` | 504 coordinator |
| `teacher` | Classroom teacher |
| `cbc` | Community-based coordinator |
| `sss` | SSS counselor |
| `director_student_affairs` | Director of student affairs |

---

## Laserfiche DAEP Sync

If your district uses Laserfiche to store DAEP records:

1. Go to **Import Data → Laserfiche Sync** tab
2. Connect to your Laserfiche repository (credentials stored in Settings)
3. Select the date range of records to sync
4. The system uses `laserfiche_instance_id` as a dedup key — existing records are updated, not duplicated

**Note:** The Laserfiche sync is Admin-only and logs to Import History the same way as standard imports.

---

## Best Practices

1. **Import students before staff** — Student records must exist before incidents can be created
2. **Import staff before incidents** — The `reported_by` field on incidents references staff IDs
3. **Test with a small file first** — Upload 10 rows, verify they appear correctly, then run the full file
4. **Always download the error report** — Don't assume "0 errors" without checking. Scroll to the Errors tab.
5. **Keep your import files** — Store a copy with the date in the filename (e.g., `students_20260305.csv`). Useful for troubleshooting later.
6. **Campus names must match exactly** — "Main High School" ≠ "Main HS" ≠ "Main High"
