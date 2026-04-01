# Session BL Handover
**Date:** 2026-04-01
**Agent:** Archer (CTO)
**Focus:** Demo lead pipeline fixes — email notifications, status tracking, phone capture

---

## What Was Done

### Demo Lead Email Notification — Fixed
- DemoGatePage was saving leads to ops Supabase but **never emailing Kim**
- Added Formspree (`xpqjngpp`) submission in parallel with DB insert
- All future demo requests now trigger an email notification

### Demo Lead Status Dropdown — New
- 8-status pipeline in Waypoint Admin leads table: New → Contacted → Demo Scheduled → Demo Completed → Proposal Sent → Closed Won / Closed Lost / Not Qualified
- Color-coded dropdowns, saves instantly to ops Supabase
- Required: `status TEXT DEFAULT 'new'` column + UPDATE RLS policy on `demo_leads` (applied via SQL Editor)

### Phone Number on Demo Gate — New
- Phone field added to demo form (required) — between email and district
- Shown in Waypoint Admin leads table as clickable `tel:` link
- Included in Formspree notification email
- Required: `phone TEXT` column on `demo_leads` (applied via SQL Editor)

### SPF DNS Fix
- Identified duplicate SPF records on `clearpathedgroup.com` causing email delivery failures
- Kim deleted the `~all` duplicate, kept the `-all` record
- DNS now clean: single `v=spf1 include:_spf.google.com include:spf.resend.com -all`

### Chad Bronowski — College Station ISD
- First real external demo lead (AP at CSISD), submitted 2026-04-01
- Email to him blocked by CSISD Google Workspace policy (550 5.7.1) — even after SPF fix
- Enterprise K-12 districts may block unknown sender domains regardless of SPF/DKIM/DMARC
- Phone number field added to prevent this from being a dead end in the future
- Recommended LinkedIn or phone call to reach Chad

---

## Decisions Made

1. **Demo gate form requires phone number** — district email firewalls block cold outreach; phone is the reliable fallback
2. **All demo leads get Formspree email notification** — DB-only storage without notification was a silent failure
3. **Lead status tracked in ops Supabase `demo_leads.status`** — 8-stage pipeline visible in Waypoint Admin

---

## Ops Supabase Changes (applied via SQL Editor)
- `ALTER TABLE demo_leads ADD COLUMN status TEXT DEFAULT 'new' NOT NULL`
- `CREATE POLICY "Allow anon update on demo_leads" ON demo_leads FOR UPDATE USING (true) WITH CHECK (true)`
- `ALTER TABLE demo_leads ADD COLUMN phone TEXT`

---

## What's Next

1. **Reach Chad Bronowski** — LinkedIn or phone (CSISD front office: 979-764-5400)
2. **Excel product screenshots** — Kim screenshots key tabs → Archer wires into resource page carousels
3. **Re-send Apex marketing emails** — conversion fix is live
4. **IB DB tables** for Projects + PD Workshops
5. **IB route guard**
6. **Investigator Toolkit features**: student history, case locking, audit trail
7. **Meridian deep audit** when ready
8. **Parent Communication Hub** for Waypoint

---

## Product Grades (Current)

| Product | Grade | Sell? |
|---------|-------|-------|
| Waypoint | A | Yes |
| Navigator | A- | Yes |
| Apex Texas | A+ | Yes |
| Apex IB Hub | A- | Yes |
| Beacon | A- | Yes |
| Investigator Toolkit | A | Yes |
| Testing Command Center | Built | Shelved |
| Meridian | B+ | Hidden |
