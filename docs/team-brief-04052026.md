# CLEAR PATH EDUCATION GROUP — Full Team Brief
**Date:** April 5, 2026
**Prepared by:** Archer (CTO)
**For:** Kim (Founder), Vera (COO), Nova (CRO), Sage (CMO)
**Purpose:** Full alignment on everything built, current state, pending work, and priorities

---

## COMPANY OVERVIEW

**Company:** Clear Path Education Group, LLC
**Founded by:** Kim Culley (sitting DAEP Principal, former Head of School, IB Programme Coordinator) & Melissa (IB Programme Coordinator)
**Market:** Texas K-12 school districts, campus administrators, counselors, teachers
**Stage:** Pre-revenue. Product suite complete. Sales pipeline building.
**Website:** clearpathedgroup.com
**Contact:** support@clearpathedgroup.com (NEVER personal email)

---

## PRODUCT SUITE — CURRENT STATE

### Tier 1: District SaaS Products (Contract Sales)

| Product | URL | Price | Status | Repo |
|---------|-----|-------|--------|------|
| **Waypoint** (DAEP/Discipline) | waypoint.clearpathedgroup.com | $4,500-18K/yr | Live, demo-ready | waypoint-intelligent-design-daep |
| **Navigator** (ISS/OSS) | Same app, product-gated | $2,500/yr | Live | Same repo |
| **Meridian** (SPED) | Same app, product-gated | $3,500/yr | Operationally complete | Same repo |
| **Origins** (Family Portal) | /family (public) | Included | Live | Same repo |

**Waypoint Admin Panel:** waypoint.clearpathedgroup.com/waypoint-admin
- Login: admin@waypoint.internal / Waypoint2025!
- Districts tab, Business Dashboard (contracts, ARR/MRR), Leads tab (demo leads with status dropdown + phone), Product Hub, Apex tab, Partner Chat
- Demo leads: Formspree email notification + ops Supabase `demo_leads` table

**Demo:** admin@lonestar-isd.org / Password123! (Lone Star ISD with seeded data)

### Tier 2: Individual SaaS Products (Self-Service)

| Product | URL | Price | Status | Repo |
|---------|-----|-------|--------|------|
| **Apex Texas** | clearpath-apex.pages.dev | $10/mo or $100/yr | Live, production-audited | clearpath-apex |
| **Apex IB Hub** | Same app, role-gated | Same | Live, DB-backed (migration 014) | Same repo |
| **Beacon** | clearpath-beacon (local) | $8/mo or $79/yr | Built, pending deploy | clearpath-beacon |
| **Investigator Toolkit** | clearpathedgroup.com/activate | $5/mo or $49/yr | Live, downloadable HTML | investigator-toolkit |

**Apex details:**
- Supabase: jvjsotlyvrzhsbgcsdfw
- Auth: OTP code entry, magic link fallback
- Edge Functions: transcribe-observation, generate-coaching-draft, send-observation-feedback, generate-morning-brief, send-marketing-blast, send-welcome-email, approve-access
- IB routes: RequireIBRole guard on all 10 /ib-* routes (migration 014: ib_workshops, ib_projects tables)
- Trial: 14-day free, soft gate after expiry

**Beacon details:**
- Dual-mode: IndexedDB (default for FERPA) / Supabase (requires district DPA)
- License enforcement via ops Supabase `product_licenses` table
- 8 modules: groups, scheduling, attendance, progress, referrals, parent comms, time tracker (SB 179), dashboard

**Investigator Toolkit details:**
- 100% on-device (IndexedDB). Zero cloud. Zero student data transmitted.
- 13 pages, 10-section investigation workflow, 5 offense types
- New features (Session BM): student history, case locking, audit trail
- Single-file HTML distribution via /activate page (license-gated download)
- **Needs:** single-file HTML rebuild with new features

### Tier 3: TpT / Spreadsheet Products

**TpT Store:** teacherspayteachers.com/store/kimberly-culley

**Existing products (10):**
1. Administrator's Command Toolkit — $18
2. BEACON Counselor Productivity Center — $18
3. BEACON Rotating Group Schedule Tracker — $10
4. BEACON Referral + Session Log Bundle — $8
5. Student Risk Summary — $10
6. TEC §37 Consequence Matrix — $10
7. Partner Activities Bundle — $7
8. Small Group Activities Bundle — $12
9. Whole Class Activities Bundle — $12.50
10. CFU Activities Bundle — $9.50

**New products built April 4 (9 total):**

FREE (PDF — posted to TpT):
11. Restorative Practice Quick-Reference Card — FREE ✅ POSTED
12. Parent Communication Log — FREE ✅ POSTED
13. CBC Decision Checklist (TEC §37.0012) — FREE ✅ POSTED
14. CBC Role & Responsibilities (HB 6) — FREE ✅ POSTED
15. Vape/E-Cigarette Decision Tree (HB 6) — FREE ✅ POSTED

PAID (Excel — with Vera for aesthetics):
16. HB 6 Compliance Audit Toolkit — $8
17. Parent Behavior Agreement Template — $6
18. VEP 45-Day Review Tracker — $5
19. PEIMS Discipline Data Audit Worksheet — $5

**All files at:** C:\Users\jkcul\TPT\
**TpT SEO:** Optimized titles + descriptions written for all 19 products. Tags provided.

**Products still to build (from Vera's gap analysis):**
- CBC Referral Monitoring Log ($5)
- HB 6 Parent Notification Templates ($6)
- VEP Student Agreement Template ($4)
- Return to Class Conference Documentation ($4)
- Teacher Removal & Return to Class Protocol ($6)
- Behavior Agreement Monitoring Log ($4)

### Tier 4: Classroom Engagement Resources (Melissa's)

Sold on clearpathedgroup.com/store and TpT:
- Partner Activities Bundle ($7) — 5 activities, grades 4-12
- Small Group Activities Bundle ($12) — 8 activities
- Whole Class Activities Bundle ($12.50) — 9 activities
- CFU Bundle ($9.50) — 6 formative assessment activities

---

## INTERNAL TOOLS

### SIGNAL — Market Intelligence
- **URL:** clearpath-signal.pages.dev
- **Repo:** jkculley-cyber/clearpath-signal
- **What it does:** Searches Reddit API (7 subreddits) + Twitter/Quora/TpT (Claude web search) + Google Trends for real educator conversations. Returns real URLs + ready-to-paste talking points.
- **Status:** Functional. Reddit proxy via Cloudflare Pages Function. Needs Anthropic API credits to scan ($0.02-0.05/scan).
- **Agents names:** SIGNAL

### SCOUT — Contact Research Agent
- **URL:** clearpath-contacts.pages.dev
- **Repo:** jkculley-cyber/clearpath-contacts
- **What it does:** Searches for DAEP admins (Waypoint), principals/APs (Apex), counselors (Beacon) by Texas ESC region. Shows source URLs. Manual verification via status dropdown. Drafts personalized outreach emails. Sends via Resend with 12/day cap.
- **Status:** Functional but fragile. Error boundary catches crashes. localStorage persists contacts. No auto-verification (removed — too expensive/unreliable). Needs Anthropic API credits.
- **Spring ISD excluded** from all searches (Kim's home district).
- **Agent name:** SCOUT

### Ops Command Center
- **URL:** clearpath-ops.pages.dev
- **Repo:** jkculley-cyber/clearpath-ops
- **Supabase:** xbpuqaqpcbixxodblaes (separate from Waypoint)
- **What it has:** Decision log, handoff history, SIGNAL + SCOUT tool links, product hub, partner chat (Kim ↔ Melissa)
- **Tables:** command_center (JSON state), demo_leads, messages, product_licenses, resources

---

## WEBSITE — clearpathedgroup.com

**Hosting:** Cloudflare Pages project `cpeg-site`, auto-deploys from GitHub on push to main
**Repo:** waypoint-intelligent-design-daep (clearpath-site/ directory)

### Pages
| Page | Purpose |
|------|---------|
| index.html | Company homepage — hero carousel, product suite, pricing calculator, pilot form |
| store.html | All products for purchase — Zelle + TpT dual options |
| resources.html | Product previews with image carousels + lightbox (PREVIEW watermark) + Buy Now |
| activate.html | License-gated download for Beacon + Investigator Toolkit |
| waypoint.html | Waypoint product page |
| navigator.html | Navigator product page |
| apex.html | Apex product page |
| beacon-product.html | Beacon product page |
| investigator.html | Investigator Toolkit product page |
| whitepaper.html | Free DAEP compliance checklist (lead magnet) |
| research.html | Research page |
| security.html | Security page |
| **daep-tracking.html** | SEO: "DAEP discipline tracking Texas" |
| **counselor-caseload-tracker.html** | SEO: "school counselor caseload tracker" |
| **ttess-observation-tracker.html** | SEO: "T-TESS observation tracking tool" |
| **student-engagement-activities.html** | SEO: "student engagement activities" |

### Recent additions (Sessions BM-BQ):
- Product image carousels now work for ALL paid products (was broken — only teacher bundles had them)
- Click-to-enlarge lightbox with "PREVIEW" watermark on all product images
- Command Toolkit + TEC Matrix images updated with professional marketing images
- 4 SEO landing pages targeting top educator search terms
- Demo gate requires phone number (email firewalls block cold outreach)
- Formspree email notification on demo form submissions
- Status dropdown on demo leads in Waypoint Admin

### Lead capture channels:
1. Demo form → Formspree xpqjngpp + ops Supabase demo_leads
2. Pilot application form (#pilot) → Formspree
3. Floating chat widget → Formspree
4. Whitepaper email gate → Formspree

---

## INFRASTRUCTURE

| Service | Project | Purpose |
|---------|---------|---------|
| Supabase | kvxecksvkimcgwhxxyhw | Waypoint/Navigator/Meridian/Origins (all tenants) |
| Supabase | jvjsotlyvrzhsbgcsdfw | Apex Texas + IB Hub |
| Supabase | xbpuqaqpcbixxodblaes | Ops command center, demo_leads, licenses, messages |
| Cloudflare Pages | waypoint | Waypoint app |
| Cloudflare Pages | cpeg-site | clearpathedgroup.com |
| Cloudflare Pages | clearpath-apex | Apex app |
| Cloudflare Pages | clearpath-signal | SIGNAL |
| Cloudflare Pages | clearpath-contacts | SCOUT |
| Cloudflare Pages | clearpath-ops | Ops command center |
| Resend | clearpathedgroup.com | Email sending (DKIM configured, SPF set) |
| GitHub Actions | All repos | Auto-deploy on push to main/master |

**Cloudflare API Token:** Rolled 2026-04-03 (cfut_Haz722...) — set on all repos
**Anthropic API Key:** sk-ant-api03-q4UySh... — set on SIGNAL + SCOUT (both GitHub secrets + Cloudflare env vars)
**Resend API Key:** re_bqtwh4gX... — set on SCOUT (Cloudflare env var)

---

## FINANCIALS

**Revenue to date:** $0
**API credits spent:** ~$16 (Anthropic — SIGNAL + SCOUT testing)
**Monthly costs:** ~$0 (all free tiers)

**Pricing:**
- Waypoint: $4,500-18K/yr (by enrollment)
- Navigator: $2,500/yr
- Meridian: $3,500/yr
- Apex: $10/mo or $100/yr
- Beacon: $8/mo or $79/yr
- Investigator Toolkit: $5/mo or $49/yr
- TpT products: $5-18 each
- Engagement bundles: $7-12.50 each

---

## LEADS & PIPELINE

| Lead | District | Role | Source | Status |
|------|----------|------|--------|--------|
| Chad Bronowski | College Station ISD | AP | Demo gate | Email blocked by CSISD firewall. Need LinkedIn/phone (979-764-5400). |
| Kim Culley (test) | Test | Principal | Demo gate | Test entry |

**SCOUT contacts:** ~22 Waypoint contacts from Region 4 (Houston) in localStorage. Need manual verification + outreach.

---

## IMMEDIATE PRIORITIES (Week of April 5)

1. **Revenue:** Upload 4 paid TpT products (Vera finishing aesthetics) + build remaining 6 gap products
2. **Outreach:** Kim posts in 5 Facebook Groups as peer educator + 2 LinkedIn posts
3. **SEO:** Register Google Search Console, submit sitemap + 4 SEO pages for indexing
4. **Leads:** Run SCOUT for Beacon (counselors) — fastest buyer segment. Send 5 emails/day from verified contacts.
5. **Reach Chad Bronowski** — LinkedIn or phone call
6. **Store redesign** — visual product grid like Bright Futures Counseling

---

## PENDING TECHNICAL WORK

| Task | Owner | Priority |
|------|-------|----------|
| Build 6 remaining TpT gap products | Archer | High |
| Store page redesign (Bright Futures model) | Archer | High |
| Investigator Toolkit single-file HTML rebuild | Archer | Medium |
| Product images for DAEP Tracker, ISS, Navigator, Meridian | Archer + Vera | Medium |
| Google Search Console registration | Kim | High |
| SCOUT: add more ESC regions | Archer | Low |
| SIGNAL custom domain (signal.clearpathedgroup.com) | Archer | Low |
| Meridian deep audit | Archer | Deferred |
| Parent Communication Hub for Waypoint | Archer | Deferred |

---

## DECISIONS LOG (Recent)

| Date | Decision |
|------|----------|
| 2026-04-04 | Free TpT products = PDF. Paid $5+ = Excel. |
| 2026-04-04 | HB 6 / CBC is #1 TpT market gap — zero competition |
| 2026-04-03 | SIGNAL uses real data only — no fabrication |
| 2026-04-03 | SEO landing pages are free customer acquisition strategy |
| 2026-04-03 | SCOUT auto-verification removed — manual via source URL |
| 2026-04-02 | Resources page carousel for all paid products |
| 2026-04-02 | IB routes require IB role (RequireIBRole guard) |
| 2026-04-01 | Demo gate requires phone number |
| 2026-04-01 | All demo leads get Formspree email notification |
| 2026-04-01 | License-gated downloads via /activate page |

---

## AGENT ROLES

| Agent | Role | Owns |
|-------|------|------|
| **Archer** (CTO) | All code, infrastructure, deployments | Repos, Supabase, Cloudflare, GitHub Actions, product builds |
| **Vera** (COO) | Operations, command center, process, product aesthetics | Ops site, handoff process, product polish, TpT market analysis |
| **Nova** (CRO) | Revenue, sales, pipeline | District outreach, pricing, contracts, demo strategy |
| **Sage** (CMO) | Brand, marketing, content | Website copy, social media, SEO content, brand guidelines |

---

*This brief is the single source of truth as of April 5, 2026. All agents should read this before starting work.*
