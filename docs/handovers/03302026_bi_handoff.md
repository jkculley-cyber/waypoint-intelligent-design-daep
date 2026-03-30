# Session BI Handover
**Date:** 2026-03-30
**Agent:** Archer (CTO)
**Focus:** Fix Waypoint demo crash, add demo lead capture gate, fix chat FAQ matching

---

## What Was Done

### Waypoint Demo Crash — Root Cause Found & Fixed (3 issues)
1. **Sidebar crash (PRIMARY):** Demo district has `meridian` in licensed products, but `PRODUCTS.meridian` was commented out in Sidebar.jsx (hidden until audit). `ProductRail` tried `PRODUCTS['meridian'].label` → `undefined.label` → crash. **Fix:** `activeProducts` now filters to only products with a `PRODUCTS` config entry.
2. **ChatBubble hooks violation:** `useEffect` was called after an early `return null`, violating React Rules of Hooks. Fixed by moving `useEffect` before the conditional return.
3. **DashboardPage FK hints:** Bidirectional FKs between `incidents` ↔ `daep_approval_chains` and `incidents` ↔ `compliance_checklists` require explicit constraint name hints for PostgREST. Without them, PostgREST returns HTTP 300 (Multiple Choices). Hints were accidentally removed then restored.

### Demo Lead Capture Gate — NEW
- New `/demo` route (`DemoGatePage.jsx`) — form collects name, email, district, role before redirecting to demo login
- Leads saved to ops Supabase `demo_leads` table (write-only via anon RLS)
- UTM params + referrer captured automatically for attribution
- Repeat visitors skip form via `localStorage` key `waypoint_demo_submitted`
- "Explore Demo" buttons on LandingPage now point to `/demo` instead of `/login?demo=1`
- Separate ops Supabase client at `src/lib/opsSupabase.js`

### Chat FAQ Matching — Fixed
- FAQ matching was broken: scoring algorithm required 40% of entry keywords to match, but common queries fell below threshold
- Rewrote matching with stop-word filtering (`what`, `how`, `do`, etc. excluded from scoring) and weighted scoring (meaningful keywords count double)
- Added `alerts` and `principals` keyword variants for better coverage
- Fallback message now suggests specific topic areas instead of "AI not configured"
- All 12 test queries now match correctly

### Landing Page — Larger Logo
- Added large centered Waypoint logo (h-28→h-44 responsive) in hero section
- Header logo slightly enlarged (h-10→h-12)

### Deploy Pipeline Fix
- GitHub Actions `wrangler-action@v3` was failing silently (npx refused to install wrangler without --yes)
- Changed to explicit `npm install -g wrangler` + direct `wrangler pages deploy` command

### ErrorBoundary Improvements
- Now shows component stack trace (not just error message)
- "Copy Error" button for easy debugging

---

## Decisions Made

1. **Demo lead capture is at `/demo`, not a modal on landing page.** Own URL for direct linking and analytics. LandingPage stays simple.
2. **Demo leads stored in ops Supabase `demo_leads` table** (same project as command center). Write-only from frontend, Kim reads via Table Editor or future admin panel.
3. **Bidirectional FK hint rule confirmed:** `incidents` ↔ `daep_approval_chains` requires `!fk_incidents_approval_chain`; `incidents` ↔ `compliance_checklists` requires `!fk_incidents_compliance`. Removing these causes HTTP 300. This applies anywhere these tables are joined.

---

## What's Next

1. **Re-send Apex marketing emails** — conversion fix is live
2. **IB outreach** — Kim contacts former IB colleagues
3. **IB DB tables** for Projects + PD Workshops (replace localStorage)
4. **IB route guard** (non-IB users can URL-navigate to IB pages)
5. **Investigator Toolkit features**: student history, case locking, audit trail
6. **Meridian deep audit** when ready to launch
7. **Parent Communication Hub** for Waypoint
8. **Demo leads viewer** in WaypointAdminPage (nice-to-have)

---

## Product Grades (Current)

| Product | Grade | Sell? |
|---------|-------|-------|
| Waypoint | A | ✅ |
| Navigator | A- | ✅ |
| Apex Texas | A+ | ✅ |
| Apex IB Hub | A- | ✅ |
| Beacon | A- | ✅ |
| Investigator Toolkit | A- | ✅ |
| Testing Command Center | Built | ❌ Shelved |
| Meridian | B+ | ❌ Hidden |
