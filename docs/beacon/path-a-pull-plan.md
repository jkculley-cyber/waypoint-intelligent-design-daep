# Beacon Path A — District Cloud-Mode Pull Plan

**Status:** PARKED — execute only when a district contract conversation surfaces specific requirements.
**Created:** 2026-05-07
**Strategic posture:** demand-pull, not push (per DECISIONS.md 2026-05-07).

---

## When to read this

When a district shows interest in Beacon and the conversation moves toward "what would it take to put this on every counselor in our district." Before that moment, do not start any of this work. After that moment, this document is the 4-week-to-pilot blueprint.

If the district demands **caseload sharing across counselors at the same campus** (Counselor A covers Counselor B's case while she's out), this plan is wrong — that's Path B (full district tenant), 6–8 weeks. Re-spike.

---

## Path A premise — "district-of-one"

Each counselor remains RLS-isolated. District admin is an overseer/billing contact who sees aggregate stats and counselor rosters, but cannot read individual student records. Existing single-counselor schema stays unchanged. New schema is layered on top.

This is what most "district readiness" actually means. Caseload sharing is a Path B feature districts ask for after they've adopted Path A.

---

## A. Schema additions (cloud only)

### Migration 006 — Missing v6 stores → cloud
**Why:** 8 local IndexedDB stores have no cloud table. Anyone in cloud mode today can't use Crisis Quick-Launch, parent contacts, follow-ups, SOAP templates, goals, needs assessments, or CREST artifacts.

| Cloud table to create | Maps to local store | Mirror schema from |
|---|---|---|
| `crisis_events` | `crisis_events` | `localDb.js:168-175` (counselor_id, student_id, event_date, trigger_type, status, payload JSONB) |
| `parent_contacts` | `parent_contacts` | `localDb.js:178-184` (counselor_id, student_id, contact_date, contact_type, outcome, tracking_id, notes) |
| `follow_ups` | `follow_ups` | `localDb.js:187-194` (counselor_id, student_id, due_at, source_type, source_id, status, notes) |
| `session_note_templates` | `session_note_templates` | `localDb.js:197-201` (counselor_id, category, name, prompts JSONB) |
| `student_goals` | `student_goals` | `localDb.js:143-149` (counselor_id, student_id, status, asca_domain, goal_text, target_date) |
| `needs_assessments` | `needs_assessments` | `localDb.js:152-157` (counselor_id, student_id, status, payload JSONB) |
| `crest_artifacts` | `crest_artifacts` | `localDb.js:160-165` (counselor_id, category, school_year, payload JSONB, file_url, file_size) |
| `referrals.harm_to_self`, `referrals.harm_to_others` columns | CC10 fields | ALTER TABLE referrals |

Each gets the standard 4-policy RLS pattern: `counselor_id = current_counselor_id()` (matches `001_foundation.sql` conventions).

### Migration 007 — District tenant layer
**Why:** Need to identify "this counselor belongs to district X" and "this person is the admin for district X" without rewriting existing RLS.

```sql
CREATE TABLE districts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  dpa_signed_at TIMESTAMPTZ,
  dpa_signed_by TEXT,
  seat_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE counselors ADD COLUMN district_id UUID REFERENCES districts(id);

CREATE TABLE district_admins (
  id UUID PRIMARY KEY,
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  supabase_auth_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Helper functions:
- `current_district_admin_id() RETURNS UUID`
- `is_district_admin_for(p_district_id UUID) RETURNS BOOLEAN`

RLS on existing counselor-scoped tables stays unchanged. District admins access aggregate data via SECURITY DEFINER RPCs (next migration).

### Migration 008 — District admin read RPCs
**Why:** District admin needs aggregate views across all counselors in their district without bypassing RLS for everyone else.

SECURITY DEFINER RPCs (validated server-side via `is_district_admin_for`):
- `district_counselors(p_district_id)` — counselor list with last-login, caseload size, time-tracking 80/20 status
- `district_caseload_summary(p_district_id)` — students/groups/sessions counts by counselor
- `district_crisis_events_summary(p_district_id, p_date_from)` — anonymized crisis trigger counts (no student names)
- `district_referral_volume(p_district_id, p_date_from)` — referrals by school + urgency + safety-alert flag
- `district_crest_status(p_district_id, p_school_year)` — counselor portfolio readiness rollup
- `district_time_compliance(p_district_id, p_date_from)` — SB 179 80/20 compliance per counselor

**No raw student PII returned in v1.** Hold the line on aggregate-only.

### Migration 009 — Audit log (Tier 3 #2 — pair with cloud rollout)
**Why:** Lawyer Q5–Q7 from CC11+1 audit. Once districts use cloud, missing audit log is a settled-litigation risk.

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  counselor_id UUID NOT NULL REFERENCES counselors(id),
  district_id UUID REFERENCES districts(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT CHECK (action IN ('insert','update','delete')),
  old_values JSONB,
  new_values JSONB,
  actor_auth_id UUID NOT NULL,
  actor_role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

BEFORE INSERT/UPDATE/DELETE triggers on `crisis_events`, `parent_contacts`, `referrals`, `communications`, `students` (legally-sensitive tables only — skip session/group/lesson, too noisy).

Read RLS: counselor sees own; district admin sees own district.

### Migration 010 — Cloud signup access_requests notification
**Why:** Existing `access_requests` table (`001_foundation.sql:183`) has anon INSERT but no signal to admin.

Edge Function trigger or pg_net call to Resend on INSERT. ~30 min.

---

## B. Cloud signup/onboarding flow fix

The Settings toggle is hidden (`SettingsPage.jsx:1187` — `{false && (`) per CC9 (2026-04-26): *"Cloud auth is aspirational — flipping the toggle drops a counselor into a broken state with no working signup."*

| File | Change |
|---|---|
| `src/pages/LoginPage.jsx` | Add "New to Beacon? Request access" link → RequestAccessPage. Add Google/Microsoft SSO buttons. |
| `src/pages/RequestAccessPage.jsx` | Already submits to `access_requests`. Add district-vs-individual radio + DPA acknowledgment checkbox. |
| `src/pages/SignupCompletePage.jsx` (NEW) | Landing after admin approves. Completes onboarding (counselor row INSERT, license activation, lesson/template seeding). |
| `src/contexts/AuthContext.jsx` | Add cloud-mode onboarding step (currently only `setupLocalProfile` exists). |
| `src/lib/supabase.js` | Verify env vars + redirect URL config for SSO callbacks. |
| `src/pages/SettingsPage.jsx:1187` | Flip `{false && (` → `{true && (`. Add district-code field for joining existing district. |

Approval-side: admin sees access_requests, approves → creates `counselors` row + sends magic-link email. Or autocreate counselor row on `auth.users` insert via Supabase auth hook.

---

## C. District admin layer (`/admin/*` routes)

| New file | Purpose |
|---|---|
| `src/pages/admin/AdminDashboardPage.jsx` | KPI cards (counselor count, caseload total, crisis events 30d, referral volume, 80/20 compliance %). Uses `district_caseload_summary` + `district_time_compliance` RPCs. |
| `src/pages/admin/AdminCounselorsPage.jsx` | Roster table: last-login, caseload size, time-tracking compliance, CREST status. Activate/deactivate seat. |
| `src/pages/admin/AdminLicensingPage.jsx` | Seats purchased, seats used, billing contact, DPA status, renewal date. |
| `src/pages/admin/AdminCrestRollupPage.jsx` | District-wide CREST readiness — same widget as DistrictPreviewPage but with real data. |
| `src/pages/admin/AdminAuditLogPage.jsx` | Filterable audit log view — required for legal-defensibility story. |
| `src/components/auth/RequireDistrictAdmin.jsx` | Route guard. |
| `src/contexts/AuthContext.jsx` | Add `isDistrictAdmin` + `districtId` to context. |
| `src/App.jsx` | Add `/admin/*` route tree wrapped in RequireDistrictAdmin. |
| `src/lib/db.js` | Add `db.rpc(name, args)` helper for district-admin RPCs (cloud-only). |

**District admin does NOT see individual student names by default** — only aggregate counts + counselor-level rollups. Counselors hate when admins read their notes; this isolation is FERPA-friendly and adoption-friendly. Admin-can-impersonate is a Path B feature.

---

## D. SSO providers (Google + Microsoft)

**Supabase config (no code):**
- Project Settings → Authentication → Providers → enable Google + Microsoft
- Redirect URL: `https://beacon.clearpathedgroup.com/auth/callback`
- Add OAuth client IDs from Google Cloud Console + Microsoft Entra

**Code changes:**
| File | Change |
|---|---|
| `src/pages/LoginPage.jsx` | Two new buttons calling `supabase.auth.signInWithOAuth({ provider: 'google' / 'azure' })`. |
| `src/pages/AuthCallbackPage.jsx` (NEW) | Handle OAuth redirect — Supabase parses URL fragment, sets session. Route to onboarding (no counselor row) or dashboard. |
| `src/App.jsx` | Add `/auth/callback` public route. |

**Defer Clever / ClassLink / OneRoster** — they require district-level provisioning agreements, 2–4 weeks each. Don't ship until first district demands rostering.

---

## E. License model changes (ops Supabase)

Currently: `product_licenses` row per counselor. District buying 12 seats = 12 individual keys.

For Path A v1, **skip this work.** Issue 12 individual keys at sale, district admin distributes manually. Saves ~2 days. Defer the district-license model until pilot 2.

---

## F. Local→cloud migration tooling (Tier 3 #8)

When a counselor on local mode joins a district, their existing IndexedDB data needs to migrate.

| New file | Purpose |
|---|---|
| `src/lib/migrateToCloud.js` | Read every local store, transform `counselor_id` to new cloud counselor UUID, post via `supabase.from(table).insert()`. Returns progress + per-table count + errors. |
| `src/components/MigrateModal.jsx` | UI — preview counts ("47 students, 312 sessions, 89 referrals"), Confirm/Cancel, progress bar, errors. |
| `src/pages/SettingsPage.jsx` | "Migrate to district cloud" button — visible only when `counselor.district_id` is set + local data exists. |

**Edge cases:**
- UUIDs already exist locally — pass through, dedupe on `id` conflict
- File attachments (CREST, lesson_library) — base64 in IndexedDB; upload to Supabase storage `beacon-lessons` bucket, update file_url
- Trial subscription state — discard, district seat overrides

~2–3 days build.

---

## G. QA matrix (every page that switches behavior)

| Page | New cloud table dependency |
|---|---|
| `DashboardPage.jsx` | crisis_events count, follow_ups due-today count |
| `StudentDetailPage.jsx` | crisis_events, parent_contacts, follow_ups, student_goals, needs_assessments, counselor_notes |
| `CommunicationsPage.jsx` | parent_contacts (replaces communications for due-process) |
| `SessionsPage.jsx` | session_note_templates dropdown |
| `CrestPage.jsx` | crest_artifacts |
| `GoalsPage.jsx` | student_goals |
| `NeedsAssessmentPage.jsx` | needs_assessments |
| Crisis Quick-Launch button (in AppShell) | crisis_events |
| `ReferralsPage.jsx` | safety alert (harm_to_self/harm_to_others) |

The `db.js` adapter handles polymorphism, so most pages work without changes. QA pass is verification that cloud-mode reads/writes match local-mode behavior. ~3 days for 9 surfaces.

---

## Recommended sequencing (4-week plan)

| Week | Work | Critical-path output |
|---|---|---|
| **1** | Migrations 006 + 007 + 008 + 010 — applied to dev project first, then prod. | Cloud schema parity with local. District tenancy in place. |
| **2** | Cloud signup flow fix (B). Google + Microsoft SSO (D). Unhide Settings toggle. End-to-end test: new counselor signs up via Google, lands on dashboard, can create student, sign out, sign in, data persists. | A new counselor can actually use cloud mode for the first time. |
| **3** | District admin pages (C) — Dashboard + Counselors + CREST rollup. Skip Audit Log + Licensing pages for now. End-to-end test: provision a fake district + 3 fake counselors, admin sees aggregate data. | District admin experience demoable. |
| **4** | Migration 009 (audit log + triggers). Local→cloud migration tool (F). QA pass (G). | Full Path A ready for first pilot. Audit log unlocks legal-defensibility story. |

**Parallel:** hand a draft DPA to first pilot district during Week 1 so legal review runs alongside engineering.

---

## What is deliberately NOT in Path A

- **No caseload sharing** between counselors at the same campus (Path B)
- **No district admin write access** to counselor data (Path B)
- **No Clever/ClassLink/OneRoster rostering** — defer until first district asks
- **No SOC 2** — 12-month engagement, parallel track
- **No AES-GCM at rest** — local-mode hardening, parallel track
- **No native push** — quick add but not gating district adoption
- **No RFC 3161 PDF timestamping** — district-DPA-only ask, defer
- **No Whisper-WASM voice capture** — Tier 0 ask, parallel track if at all

---

## Risk register

1. **Cloud signup flow has hidden brokenness.** CC9 hid the toggle for a reason. Until you walk a fresh counselor through SSO → onboarding → counselor row insertion → first action, there will be bugs. Allocate 1.5× the Week 2 estimate.
2. **OAuth callback URL mismatches** — common Supabase OAuth gotcha. Cloudflare Pages preview deploys have different URLs; set explicit redirect URLs per env.
3. **Migration tool dedup** — if a counselor accidentally imports twice, need ID-conflict handling. Hard fail on duplicate, force counselor to clean up first.
4. **District admin RPC scope creep** — they will ask to see student names "just for emergencies." Hold the line: aggregate only in v1. Path B is the answer if they really need it.
5. **Free trial doesn't apply in cloud mode** — district seats are pre-paid, no trial logic. Update `db.js:142` license-gate code to skip soft gate for `counselor.district_id IS NOT NULL`.

---

## When to re-evaluate

If Nicole's Magnolia ISD conversation (or any other district inquiry) surfaces ANY of the following, this plan is wrong and needs re-spike:

- Counselors at the same campus need to share students or cover for each other (→ Path B)
- District wants student rosters synced from a SIS automatically (→ Clever/ClassLink first)
- District legal demands SOC 2 Type II as a hard precondition (→ 12-month parallel track must start immediately)
- District wants Beacon as part of an existing identity stack (Workday, etc.) not Google/Microsoft (→ different SSO scope)

If none of those, this plan executes as-is.
