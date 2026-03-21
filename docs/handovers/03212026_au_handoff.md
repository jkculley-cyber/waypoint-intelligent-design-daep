# Session AU Handoff — 2026-03-21

**Agent:** Archer
**Focus:** License enforcement system for Beacon + Investigator Toolkit, FERPA compliance, Google Form referral workflow

---

## What Was Done

### Beacon — FERPA Dual-Mode Data Layer
1. **IndexedDB local mode** — full on-device data layer (`src/lib/localDb.js`, `src/lib/db.js`) with 15 object stores mirroring Supabase schema. `isLocalMode()` flag routes all CRUD to IndexedDB or Supabase.
2. **AuthContext rewritten** — dual-mode bootstrap: local mode loads counselor from IndexedDB with synthetic session; cloud mode uses Supabase auth. `setupLocalProfile()` for first-run setup.
3. **LocalSetupPage** — setup wizard for local mode (name, campus, district, license key). Privacy-first messaging.
4. **SettingsPage updated** — data storage section (mode indicator, export/import backup, switch modes), license management section (status display, activate key).
5. **Bundled seed data** — `seedLessonData.js` (35 lessons) and `seedTemplateData.js` (14 templates) code-split as separate chunks, loaded on demand during local setup.
6. **DECISIONS.md updated** — FERPA compliance model: Beacon defaults on-device, cloud only with DPA. Apex exempt (teacher data, not student PII).

### Beacon — Teacher Referral Pipeline
7. **ReferralsPage upgraded** — CSV import modal with column mapping, manual "Add Referral" modal, Google Form integration tip. All modals work in both local and cloud mode.
8. **Google Form script** — `tools/create-referral-form.gs` generates branded 8-question referral form with linked Google Sheet. `tools/beacon-form-header.html` for form header image.

### License Enforcement System (Both Products)
9. **`product_licenses` table** — SQL applied to ops Supabase (`xbpuqaqpcbixxodblaes`). Shared license authority for Beacon + Investigator Toolkit. Anon can only SELECT.
10. **Beacon `src/lib/license.js`** — license check module: fetch from ops Supabase, 5-min cache (skip network if checked recently), 7-day offline grace, localStorage cache. Soft gate returns `{ valid, softGated, reason }`.
11. **Investigator Toolkit `src/license.js`** — same module adapted for toolkit (storage key `inv_license`).
12. **Beacon AuthContext wired** — license check on boot, `licenseState` in context, `saveLicenseKey`/`removeLicense` callbacks, `isSoftGated` merged with license state.
13. **Beacon `db.js` soft gate** — `insert()` checks license for non-exempt tables in local mode. Exempt: lesson_library, communication_templates, settings, counselor.
14. **Toolkit `main.js` wired** — license entry screen before setup wizard, soft gate banner in app shell, `showLicenseScreen()` (non-recursive).
15. **Toolkit `intake.js` wired** — `checkLicense()` call before case creation (uses 5-min cache, no stale state).
16. **Toolkit `settings.js`** — license status display + activate key UI.
17. **Key generator script** — `investigator-toolkit/scripts/generate-license-key.mjs` (--product, --customer, --email, --dry-run).
18. **License operations guide** — `clearpath-beacon/docs/license-operations-guide.md` (internal ops + customer getting started).

### Beacon Bug Fixes (from earlier in session)
19. **LessonsPage fixed** — wrong table name (`lessons` → `lesson_library`), wrong column names (`url` → `link_url`, `text_content` → `content_text`), removed invalid `session_lessons` join.
20. **Seed scripts fixed** — `seed_lessons.mjs` and `seed_templates.mjs` updated with correct field names + service role key support. 35 lessons + 14 templates seeded.

### Code Quality (Simplify Review)
21. **5-min cache** added to both `license.js` files — prevents network fetch on every `db.insert()`
22. **XSS fix** in toolkit `settings.js` — replaced `innerHTML` with `textContent` + `createElement` for license key display
23. **Recursive boot() eliminated** — extracted `showLicenseScreen()` in toolkit `main.js`
24. **Circular dependency removed** — toolkit `intake.js` imports `checkLicense` directly from `license.js` instead of stale `isLicenseValid()` from `main.js`
25. **Missing `softGated` field** — added to default `licenseState` in Beacon AuthContext
26. **Variable shadowing** — renamed `licenseKey` state to `licenseKeyInput` in LocalSetupPage
27. **Unused imports removed** — `checkLicense` from SettingsPage, `getCachedLicense`/`removeLicense` from destructure

### DECISIONS.md — New Entries
- Beacon pricing: $8/mo or $79/yr. Toolkit pricing: $5/mo or $49/yr. Zelle on clearpathedgroup.com.
- License enforcement via ops Supabase `product_licenses` table. Soft gate on create only. 7-day offline grace.
- FERPA compliance model for all products.

### License Keys Provisioned
- Kim's test keys generated and SQL provided for ops Supabase:
  - Beacon: `BCN-YNJRVF-KRC3`
  - Toolkit: `INV-E5KZ2X-RNCP`

---

## What's Next

1. **Vera + Nova: Format customer getting started guide** — from `clearpath-beacon/docs/license-operations-guide.md` (customer section) for store/email templates
2. **Cloudflare Pages: Connect investigator-toolkit repo** — custom domain `investigatortoolkit.clearpathedgroup.com`
3. **Add Beacon + Toolkit product listings** to clearpathedgroup.com store with Zelle purchase options
4. **Beacon cloud mode testing** — district DPA flow, Supabase auth, cloud sync
5. **Parent Communication Hub** — #1 pain point for Waypoint
6. **Quick capture** for Apex — fast informal walkthrough mode

## Blockers

- None
