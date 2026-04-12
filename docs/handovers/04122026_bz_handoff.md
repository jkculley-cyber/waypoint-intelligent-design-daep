# Session BZ Handover
**Date:** 2026-04-12
**Agent:** Archer (CTO)
**Focus:** Navigator standalone campus purchase model — strategy, demo district, DPA, marketing

---

## What Was Done

### 1. Navigator Campus Purchase Strategy
Pressure-tested whether campuses or individual districts would buy Navigator standalone. Concluded:
- **Campus-as-district** provisioning (zero schema changes) is the right Phase 1 approach
- Target market: small TX districts (<5 campuses) where principal has purchasing authority
- FERPA requires a one-page DPA signed by superintendent — Navigator stores student PII unlike Apex
- Phase 2 (if no campus traction): on-device mode with real data import (Beacon/IndexedDB model)

### 2. Lincoln High School Demo District (Navigator-Only)
Created `supabase/seed_navigator_campus_demo.mjs` — a complete campus-as-district demo:
- **District ID:** `22222222-2222-2222-2222-222222222222`
- **Logins:** `ap@lincoln-hs.demo` / `Password123!` (AP), `counselor@lincoln-hs.demo` / `Password123!`
- **Data:** 10 students (diverse demographics, SPED/504/ELL flags), 12 referrals, 21 placements (6 current + 15 prior year), 6 supports, 1 campus goal
- **Products:** `["navigator"]` only — sidebar shows only Navigator pages
- Risk levels: 2 HIGH (Marcus, Jaylen SPED), 4 MEDIUM, 2 LOW
- Intervention effectiveness: Valentina 4→0, Emma 2→0
- Disproportionality flag: 4/8 referred students are Black (50%)

### 3. DPA Template
`docs/brand/navigator-dpa-template.md` — one-page Data Processing Agreement covering FERPA + TEC 32.151-32.157. Plain English, fillable signature blocks for superintendent and Kim.

### 4. Navigator Demo Script
`docs/brand/navigator-demo-script.md` — 12-15 min walkthrough for Kim targeting AP/principal buyers. Covers dashboard, students list, escalation story, SPED compliance, intervention effectiveness, disproportionality, goals. Includes delivery tips.

### 5. Navigator Product Page Updated
`clearpath-site/navigator.html` changes:
- New hero: "95% of discipline never reaches DAEP. Navigator tracks the rest."
- Dual pricing: $499/yr single campus (introductory) + $2,500/yr district-wide
- "Start Free Campus Pilot" CTA
- Campus pilot form (Formspree `source=navigator_campus_pilot`) — name, email, phone, school, role, campus size

### 6. Decisions Logged
Two new DECISIONS.md entries:
- Navigator campus-level purchase model (campus-as-district, $499/$999/$2,500 pricing tiers, DPA requirement, Phase 2 fallback)
- Navigator standalone demo district (Lincoln HS, seed script, credentials)

---

## Land-and-Expand Revenue Model

| Step | Product | Revenue | Trigger |
|------|---------|---------|---------|
| Land | Navigator (1 campus) | $499/yr | AP needs ISS/OSS tracking |
| Spread | Navigator (2-3 campuses) | $499 × N | Other APs see it working |
| Convert | Navigator district | $2,500/yr | District formalizes |
| Upsell | + Waypoint | +$4,500/yr | DAEP placement triggers need |
| Full suite | + Meridian | +$3,500/yr | SPED coordinator sees flagged students |

---

## For Vera (COO) — Operational Next Steps

1. **Convert DPA template to fillable PDF** — the markdown version needs to become a professional PDF that Kim can email to prospects. Use the school/district letterhead style.
2. **Create pilot provisioning checklist** — when a campus pilot request comes through Formspree:
   - Kim contacts AP → schedules demo
   - Demo using Lincoln HS sample data
   - If interested: send DPA template → superintendent signs → Kim provisions campus-as-district
   - Set up their login credentials, assign campus
3. **Track campus pilots in contracts table** — add contract entries for campus pilots (status: pilot, product: navigator, annual_value: 499). This feeds the Business Dashboard.
4. **Prepare email templates** — pilot welcome email, DPA follow-up nudge (day 3 if unsigned), conversion email (after 30 days of pilot).
5. **Monitor Formspree** — `navigator_campus_pilot` submissions will start flowing once the marketing site is deployed.

---

## Commits Pushed
```
[pending push] feat: Navigator campus purchase model — demo district, DPA, demo script, marketing
```

---

## Next Session Priority

1. **Deploy marketing site** — push to main triggers Cloudflare Pages (navigator.html changes)
2. **Test Lincoln HS demo login** — verify Navigator-only experience in browser
3. **Google Custom Search API** — still 403 (carryover)
4. **Facebook Live recording** — script at `docs/brand/facebook-live-script.md`
5. **Store redesign** (carryover)
