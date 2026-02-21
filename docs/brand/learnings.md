# Waypoint — Learnings Log

> Append-only. Never delete entries. Add new learnings at the top of the relevant section.

---

## Technical

**2026-02-19** — PostgREST silently fails on ambiguous joins when tables have bidirectional FK relationships. The fix is to use explicit FK constraint name hints: `table!constraint_name`. This applies to `compliance_checklists`, `profiles` (reported_by), and transition plan reviews. Added to DECISIONS.md.

**2026-02-19** — Supabase's `import_type` CHECK constraint on `import_history` must be explicitly updated when adding new import types. The migration that creates the table hardcodes the allowed values. A patch query is needed for any new type (e.g., `laserfiche_daep`).

**2026-02-19** — Migration 010 (import_history table) was never applied to the production database despite being in the migrations folder. Always verify which migrations have actually been applied vs. which exist in the folder. Consider a `migrations_applied` tracking table in a future session.

**2026-02-19** — React Error Boundaries must be class components. Functional components cannot use `getDerivedStateFromError` / `componentDidCatch`. Wrap at the `main.jsx` level for maximum coverage.

**2026-02-19** — Supabase personal access tokens (PATs) start with `sbp_` and are much longer than a password. When a user provides a short alphanumeric string, it's likely the DB password, not a PAT. Test with a pg connection before assuming format.

---

## Product

**2026-02-19** — The Laserfiche daily report uses `Instance ID` as the reliable unique key. `C_no` (student ID) is empty in most rows. Student matching must fall back to `first_name + last_name` (case-insensitive). Build synthetic student IDs deterministically from name + grade to avoid duplicates on re-import.

**2026-02-19** — Laserfiche `Current step` values observed in production: `"DAEP"`, `"Back to CBC for Correction"`, `""` (empty = waiting or completed). `Current stage` holds `"DAEP Location"` and `"CBC"`. Status values: `"In progress"`, `"Completed"`, `"Completed via terminate end event"`.

---

## Business

*(No entries yet — add after first pilot conversations, demos, or prospect feedback)*

---

## Process

**2026-02-19** — Starting a session without reading the handover document leads to re-doing research that was already done. The opening process (read session-context.md + latest handover) should be the first thing in every session, not an afterthought.
