# Session BG Handover
**Date:** 2026-03-29
**Agent:** Archer (CTO)
**Focus:** Website fixes, custom SMTP, downloadable apps, Investigator Toolkit audit + employee investigations

---

## What Was Done

### Website (clearpathedgroup.com)
- Fixed 11 broken buttons/links: Apex "Buy Now" and Beacon "Pricing" pointed to non-existent anchor IDs, nav logo href="#" failed, 8 stale security.html cross-page anchors
- Store page updated: Beacon + Investigator Toolkit now offer "Download App" buttons instead of cloud trial links
- Beacon pricing corrected everywhere: $10/mo or $100/school year
- Downloadable HTML files hosted at /downloads/

### Custom SMTP — All 3 Projects
- Apex, Beacon, Waypoint all configured with Resend SMTP
- OTP codes, magic links, password resets now come from `support@clearpathedgroup.com`
- School district spam filters will trust the authenticated domain

### Downloadable Offline Apps
- Beacon single-file HTML (2MB) — opens in any browser, 100% on-device
- Investigator Toolkit single-file HTML (1MB) — same
- Both distributed via clearpathedgroup.com/store download buttons
- Zero student data exposure, zero IT approval needed, FERPA compliant by design

### Payment Flow
- Trial expired banners in both apps now link to clearpathedgroup.com/store
- Beacon: "Subscribe Now — $10/mo or $100/yr" button
- Toolkit: "Subscribe — $5/mo or $49/yr" button
- Flow: download → 14-day trial → expired → store → Zelle → license key

### Investigator Toolkit — Deep 3-Role Audit + Major Features
**Audit grades:** AP (B+), Principal (B-), HR Investigator (C+) → Overall B-

**4 critical bugs fixed:**
1. Free 14-day trial mode added (was license-key-only, zero conversion)
2. 504 students included in compliance tracker (was SPED only)
3. Offense category mismatch between intake and case detail fixed
4. TEC reference errors corrected (Harassment → §37.0052 David's Law, Misconduct → §37.001)

**Employee Investigation Support (NEW):**
- Investigation type toggle on intake (Student / Employee)
- 10 employee offense categories (Title IX, boundary violation, insubordination, etc.)
- Employee-specific sections throughout case detail (admin leave, HR notified, employment status, union rep, policy confirmed/not, recommended action)
- Type badges on cases, dashboard, pipeline
- Employee cases excluded from SPED/504 compliance
- Trends page: investigation type breakdown

**Revised grade: A-**

---

## Decisions Made

1. **Beacon + Investigator Toolkit distributed as downloadable HTML files** — not cloud-hosted. Districts with strict internet policies get zero data exposure.
2. **Beacon pricing: $100/school year ($10/month)** — corrected from $999/yr
3. **Payment via Zelle** — trial expired banners link to store page. Kim generates license key manually after payment.
4. **Custom SMTP via Resend** for all 3 Supabase projects — emails from clearpathedgroup.com
5. **Investigator Toolkit supports both student AND employee investigations**

---

## What's Next

1. **Re-send Apex marketing emails** (conversion fix live)
2. **IB outreach** to Kim's network
3. **IB DB tables** for Projects + PD Workshops (replace localStorage)
4. **IB route guard**
5. **Investigator Toolkit remaining features:** student history lookup, investigator filter, case locking, date range on trends, audit trail, file attachments, related cases
6. **Meridian deep audit** when ready
7. **Parent Communication Hub** for Waypoint

---

## Commits This Session

### waypoint-intelligent-design-daep-master (4 commits)
- fix: 11 broken buttons on clearpathedgroup.com
- feat: downloadable offline apps + payment flow
- update: Investigator Toolkit download with trial + employee investigations
- docs: session closing

### clearpath-beacon (2 commits)
- fix: trial/expired banners link to store for Zelle payment
- fix: Beacon pricing $100/school year on landing page

### investigator-toolkit (2 commits)
- feat: expired banner links to store for Zelle payment
- feat: free trial + employee investigations + 4 critical bug fixes
