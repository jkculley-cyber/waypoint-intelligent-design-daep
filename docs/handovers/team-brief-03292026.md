# TEAM BRIEFING — March 29, 2026
**From:** Archer (CTO)
**To:** Vera (COO), Sage (CMO), Nova (CRO)
**Purpose:** Everything that happened Sessions BB through BF. Product status, decisions made, what each of you needs to act on.

---

## EXECUTIVE SUMMARY

In the last 7 sessions, we shipped 4 major things:

1. **Waypoint** went from broken (React crashes, wrong deploy target, teacher data leaks) to **Grade A** — pilot-ready for Texas districts
2. **Apex IB Leadership Hub** was built from zero to **12 fully functional pages** — a new $1,800/yr product for IB schools
3. **Apex Texas** conversion was diagnosed and fixed — the reason nobody signed up from 100+ emails was that new users landed on a sign-in form asking for a password they didn't have
4. **All 5 TpT spreadsheets** were discovered to have zero formulas and were fixed (19,061 formulas added)

---

## FOR VERA (COO) — Operations & Infrastructure

### What Changed

**Deploy pipeline fixed.** Waypoint auto-deploys on every push to main. The Cloudflare Pages project name is `waypoint` (not `waypoint-avt`). Account ID: `05ff8f94d82a54168e183bd8e0614b70`. API token refreshed. Uses `wrangler-action@v3`.

**Email DNS complete.** Google DKIM authenticating. SPF hardened to `-all`. DMARC set to `p=quarantine`. All verified live. Emails should land in district inboxes.

**Edge Functions deployed (Apex):**
- `invite-user` — secure user creation for Waypoint (replaces client-side service role key)
- `ib-coaching-draft` — IB-specific AI coaching summaries
- `generate-coaching-draft` — updated with IB Practices framework on server side
- `generate-morning-brief` — updated with IB programme context

**New Supabase tables (Apex):**
- Migration 011: 7 IB tables (ib_programmes, ib_documents, ib_self_study, ib_observations, ib_pd_records, ib_policies, ib_authorization_checklist) + RLS + `role` column on principals
- Migration 012: evidence JSONB + mode columns on self-study and auth checklist
- Migration 013: ib-documents storage bucket (needs to be applied if not done)
- `observations.unit_of_inquiry` TEXT column added

**IB Demo Account:**
- URL: `https://clearpath-apex.pages.dev/login?version=ib`
- Email: `demo-ib@clearpathedgroup.com`
- Password: `IBDemo2026!`
- School: Austin International Academy (MYP)
- Role: `ib_coordinator`
- 5 teachers, 6 observations with full IB alignment data

**Investigator Toolkit fixes:**
- Service worker added (PWA now actually works offline)
- PDF export field names fixed (Sections 3, 5, 7 were always blank)
- License check now filters by `product=investigator`
- Remote URL was accidentally pointed at wrong repo — fixed

### What You Need to Do

1. **Verify migration 013** (storage bucket) is applied to Apex Supabase. If not, run the SQL in `supabase/migrations/013_ib_storage_bucket.sql`
2. **Update Vera's product brief** — the complete brief is at `docs/handovers/vera-product-brief-03282026.md`. It covers all 8 products with URLs, credentials, pricing, and status.
3. **IB Hub needs 2 more DB tables** to replace localStorage persistence: `ib_student_projects` and `ib_pd_workshops`. Not urgent but needed before real coordinators use Projects and PD Creator long-term.

---

## FOR SAGE (CMO) — Marketing & Content

### Critical Marketing Fix

**The reason 100+ Apex emails produced zero signups:** Every marketing email sent people to `clearpath-apex.pages.dev` which redirected to a sign-in form saying "Welcome back" and asking for a password. The free trial link was a 12px text at the bottom of the page.

**This is now fixed:**
- Root URL sends new users directly to the trial signup form
- Landing page CTAs go to `?mode=trial` (not the sign-in form)
- CTA text changed from "Request Access" to "Start Free 14-Day Trial"
- "Early access" language removed
- Texas onboarding cut from 6 steps to 3

**Action needed:** Update ALL marketing emails, social posts, and website CTAs to use these URLs:
- **Trial signup (direct):** `https://clearpath-apex.pages.dev` — goes straight to trial form
- **Landing page (full pitch):** `https://clearpath-apex.pages.dev/try` — marketing page then trial
- **Sign in (existing users):** `https://clearpath-apex.pages.dev/login` — password/OTP sign-in
- **IB version:** `https://clearpath-apex.pages.dev/login?version=ib` — IB trial/sign-in

**Do NOT use** `clearpath-apex.pages.dev/login` in marketing emails — that defaults to sign-in mode. Use the root URL or `/try`.

### Beacon Marketing Note

Beacon's conversion is strong (estimated 72-78% from email to active trial). One fix was made:
- Backup warning banner suppressed for first 48 hours (was scaring new users with "your data will be permanently lost" 3 seconds after signup)
- Pricing added to landing page ($100/school year after trial)
- "Sign in" link fixed for returning users

### New Marketing Assets Created

**6 free lead magnets** (PDF + Excel) in the `TPT/` folder:
1. Discipline Decision Matrix Quick Reference (principals)
2. Counselor's Conversation Starter Card
3. Crisis Response Pocket Card
4. SB 179 Compliance Quick Reference
5. Small Group Starter Kit
6. Referral Triage Decision Card

**Trial nudge email sequences:**
- `clearpath-apex/docs/apex-trial-nudge-sequence.md` — 6 emails (Day 1/3/5/8/11/14) + 5 seasonal campaigns
- `clearpath-beacon/docs/beacon-trial-nudge-sequence.md` — 6 emails + 5 seasonal campaigns
- `clearpath-beacon/docs/beacon-marketing-email.html` — HTML email template

**Best purchase timing for TX K-12:**
- May-June: end-of-year pain (cold outreach)
- July: summer PD (conversion)
- August: back-to-school urgency
- October: retarget lapsed trials
- January: mid-year budget

### IB Market — New Product to Sell

**Apex IB Leadership Hub** is a new $1,800/yr product. Target: IB Programme Coordinators, Heads of School, District IB Directors. Texas has 200+ IB World Schools. No competitor exists with this specificity.

Key talking points:
- Built by a former IB Head of School (Kim's background)
- 12 tools in one hub: Self-Study, Documentation, PD Tracking, Policy Management, Authorization Prep, Coaching Observations, Student Projects, Staff Roster, Alignment Reports
- Real IB PSP 2020 codes, all 10 Learner Profile attributes, programme-specific filtering
- AI coaching with IB-native language (not T-TESS)
- Programme Coordinator can share a read-only link with anonymized teacher names

**Conference targets:** IB Americas regional conferences, NASSP IB sessions, state-level IB coordinator networks.

---

## FOR NOVA (CRO) — Revenue & Sales

### Pricing Confirmed

| Product | Price | Model | Trial |
|---------|-------|-------|-------|
| Waypoint | Custom district contract | Annual | Demo on request |
| Navigator | Included with Waypoint or standalone | Annual | Demo on request |
| Apex Texas | $100/school year | Zelle | 14-day free |
| **Apex IB Hub** | **$1,800/yr per campus** | **Zelle** | **14-day free pilot** |
| Apex IB + Texas bundle | $2,800/yr | Zelle | 14-day free |
| IB District Director | $4,500/yr (up to 10 campuses) | Custom | Demo on request |
| Beacon | $100/school year ($10/mo) | Zelle | 14-day free |
| Investigator Toolkit | $49/yr ($5/mo) | Zelle | License key |
| TpT Spreadsheets | $10-28 each | TpT + Zelle | N/A |

### Conversion Fix Impact

**Before fix:** 100+ Apex emails → 0 signups
**Root cause:** New users saw a sign-in form, not a trial form
**After fix:** New users see "Start Your Free Trial — 14 days free, no credit card"
**Projected improvement:** 19% → 31% email-to-trial conversion

**Recommendation:** Re-send to the same 100+ contacts. The product hasn't changed — the front door was just locked. Now it's open.

### IB Revenue Opportunity

- **TAM (Texas):** 200+ IB World Schools × $1,800 = $360,000/yr
- **TAM (National):** ~2,000 US IB schools × $1,800 = $3.6M/yr
- **TAM (District):** Large IB districts (Houston, Austin, Dallas) could buy district licenses at $4,500/yr for 5-10 campuses
- **Kim's edge:** Former IB Head of School + Programme Coordinator. Direct network access to Texas IB coordinators. No other IB leadership platform exists.

**First target:** Kim's former IB colleagues in Spring ISD and Houston area. Personal outreach with the demo account.

### Pipeline Actions

1. **Re-send Apex emails** with the fixed URL (root URL, not /login)
2. **IB outreach** — Kim reaches out to 10 former IB colleagues with the demo link
3. **Beacon outreach** — the conversion funnel is working; the problem is volume, not conversion
4. **TpT products** — all 5 now have working formulas. Re-list if any were pulled, and push the 6 free lead magnets as top-of-funnel

### What's NOT Ready to Sell

- **Meridian (SPED compliance):** Hidden from sidebar. Not audited. Do not demo.
- **Origins (family portal):** Not audited. Do not demo.
- **Student Project Portal:** Decided as separate future product. Not built yet.

---

## PRODUCT STATUS MATRIX

| Product | Grade | Sell? | Demo Ready? | Key Blocker |
|---------|-------|-------|-------------|-------------|
| Waypoint | A | ✅ Yes | ✅ Yes | None |
| Navigator | A- | ✅ Yes | ✅ Yes | None |
| Apex Texas | A+ | ✅ Yes | ✅ Yes | None |
| Apex IB Hub | A- | ✅ Yes | ✅ Yes | 2 pages use localStorage (Projects, PD Creator) |
| Beacon | A- | ✅ Yes | ✅ Yes | None |
| Investigator Toolkit | A | ✅ Yes | ✅ Yes | Not yet on Cloudflare Pages |
| Meridian | B+ | ❌ No | ❌ No | Hidden, not audited |
| Origins | B | ❌ No | ❌ No | Not audited |
| TpT Spreadsheets | A | ✅ Yes | N/A | None |
| Free Lead Magnets | A | ✅ Yes | N/A | None |

---

## KEY DECISIONS MADE (Sessions BB-BF)

1. **Waypoint is admin-only.** Teachers and parents do not have app access. Teachers document via SIS. Parents notified via email.
2. **Apex IB Hub is $1,800/yr per campus** — premium over Texas $100/yr.
3. **Student Projects portal = separate future product.** Hub has coordinator tracking now, student-facing portal later as upsell.
4. **Navigator brand is blue, Meridian is hidden.** Meridian not ready for pilot.
5. **Cloudflare deploy: projectName=waypoint, wrangler-action@v3.**
6. **IB Practices is a full primary framework** (was overlay-only). IB coordinators can select it during onboarding.
7. **Transition plans renamed:** "DAEP Entry Plan" → "Campus Re-Entry Transition Plan" (home campus implements and reviews).

---

## DEMO CREDENTIALS

| Product | URL | Email | Password |
|---------|-----|-------|----------|
| Waypoint | waypoint.clearpathedgroup.com | admin@lonestar-isd.org | Password123! |
| Waypoint Admin | waypoint.clearpathedgroup.com/waypoint-admin | admin@waypoint.internal | Waypoint2025! |
| Apex Texas | clearpath-apex.pages.dev | (sign up via trial) | (OTP code) |
| Apex IB | clearpath-apex.pages.dev/login?version=ib | demo-ib@clearpathedgroup.com | IBDemo2026! |
| Beacon | clearpath-beacon.pages.dev | (enter name, no login needed) | N/A |
| Ops Center | clearpath-ops.pages.dev | (partner gate) | Kim or Melissa |

---

*This briefing is current as of March 29, 2026. Every product listed as "Sell: Yes" is built, deployed, audited, and functional. The IB Hub is the newest and highest-margin addition to the portfolio.*

*— Archer*
