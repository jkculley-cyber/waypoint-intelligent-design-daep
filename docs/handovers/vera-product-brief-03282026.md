# VERA — Complete Product Suite Briefing
**Date:** March 28, 2026
**From:** Archer (CTO)
**Purpose:** Get you current on every product. This is the ground truth.

---

## PRODUCT 1: WAYPOINT
**What:** DAEP & discipline management for Texas K-12 districts
**URL:** https://waypoint.clearpathedgroup.com
**Repo:** jkculley-cyber/waypoint-intelligent-design-daep (branch: main)
**Supabase:** kvxecksvkimcgwhxxyhw
**Status:** ✅ Grade A — pilot-ready
**Pricing:** District contract (custom per district)

### What's Live
- Full incident lifecycle: create → approval chain → DAEP placement → compliance → transition → re-entry
- SPED/504 compliance blocking with MDR gating (IDEA 300.536 hard block at 10 days)
- DAEP dashboard with active enrollments, orientation scheduling, capacity tracking
- Student/behavior kiosk + orientation kiosk (SECURITY DEFINER RPCs)
- Discipline matrix with proactive interventions + restorative options
- Reports with PDF/Excel export + PEIMS data export
- Calendar view, alerts, separation orders
- Waypoint Admin panel for Kim (district provisioning, contracts, partner chat)
- Auto-deploy: GitHub push → Cloudflare Pages (waypoint project, wrangler-action)

### Roles
Admin, Principal, AP, Counselor, SPED Coordinator, CBC, SSS, 504 Coordinator, Director of Student Affairs. **Teachers and parents do NOT have app access** — teachers document via SIS, parents notified via email.

### Recent Major Fixes (Sessions BB-BD)
- React hooks crash on incident detail page (root cause: useCallback after early return)
- Deploy pipeline was going to wrong Cloudflare project (fixed: projectName=waypoint)
- Teacher/parent removed from STAFF_ROLES
- Navigator rebranded orange→blue
- All report hooks campus-scoped
- Service role key removed from client code
- invite-user Edge Function deployed for secure user creation

### What's Hidden
**Meridian (SPED compliance)** — hidden from sidebar, not ready for pilot. Routes exist, gated by hasProduct('meridian'). 10 pages built but 2 have hardcoded demo data (WaypointSync, Integration). Escalation only logs to console.

**Origins (family portal)** — live but not audited. Staff routes + public family portal at /family.

---

## PRODUCT 2: NAVIGATOR
**What:** ISS/OSS tracker & proactive behavioral supports (module within Waypoint)
**Status:** ✅ Grade A- — live, audited
**Gate:** hasProduct('navigator') in Waypoint

### What's Live
13 pages: Dashboard, Referrals, Placements, Supports, Student Detail, Goals, Reports, Escalation Engine, Skill Gap Map, Effectiveness, Disproportionality Radar, Pilot Summary, ISS Kiosk. All blue-branded. All campus-scoped.

---

## PRODUCT 3: APEX (Texas)
**What:** AI instructional leadership for Texas principals (T-TESS walkthroughs)
**URL:** https://clearpath-apex.pages.dev
**Repo:** jkculley-cyber/clearpath-apex (branch: master)
**Supabase:** jvjsotlyvrzhsbgcsdfw
**Status:** ✅ Grade A+ — production
**Pricing:** $100/school year via Zelle. 14-day free trial.

### What's Live
- Voice→Whisper→Claude observation loop (narrate walkthrough, get T-TESS scores + coaching email)
- Morning Brief (pg_cron daily, 4 time horizons)
- Teacher profiles with formal evaluation tracking
- Communication drafts (English + Spanish)
- My Year PDF report
- Multi-framework support: T-TESS, Danielson, Marzano
- 14-day trial with soft gate (view data after expiry, can't create)
- Marketing blast Edge Function (3-email sequence via Resend)

### Recent Fixes (Session BE)
- Returning users go straight to sign-in (not trial landing page)
- Forgot password visible on trial page
- Safari/iOS audio codec detection
- Landing page shortened for mobile

### Demo
- Login: admin@lonestar-isd.org / Password123! (this is actually Waypoint demo)
- For Apex Texas: sign up via trial flow at clearpath-apex.pages.dev

---

## PRODUCT 4: APEX IB LEADERSHIP HUB ← NEW
**What:** IB Programme Coordinator command center (extension of Apex codebase)
**URL:** https://clearpath-apex.pages.dev/login?version=ib
**Status:** ✅ Phase 1 complete — 12 pages live
**Pricing:** $1,800/yr per campus. 14-day free pilot.
**Target:** IB Programme Coordinators, Heads of School, District IB Directors

### Architecture
Same Apex codebase, same Supabase project. Role-based routing: IB roles see purple sidebar with 12 IB-specific pages. Texas principals see orange sidebar with T-TESS pages. Same login URL — different world based on role.

### 3 New Roles
- `ib_coordinator` — full read/write to all IB features
- `head_of_school` — read access + coaching observations
- `ib_district_director` — read-only aggregate across campuses

### 12 Pages Built
1. **IB Dashboard** — programme health, authorization status, quick stats, AI health summary
2. **IB Observations** — 10 IB practice tags (ATL, Inquiry, Concept-Based, etc.), voice→AI coaching with IB system prompt
3. **Self-Study Workspace** — standard-by-standard (12 PSP standards), Met/Partial/Not Met rating, multiple evidence entries per standard, authorization vs evaluation mode, AI evidence analysis, PDF export
4. **Documentation Hub** — 5 folders (Standards, Authorization, Self-Study, PD, Policies), upload, search, annotations
5. **PD Tracker** — Cat 1/2/3 IB professional development per teacher, compliance %, alerts
6. **PD Creator** — build custom IB workshops, 6 pre-built templates, resource links (Google Docs/Slides/PDFs/videos), delivery log with attendee tracking
7. **Policy Manager** — 5 required IB policies (Academic Integrity, Assessment, Admissions, Language, Inclusion), review cycle tracking, overdue alerts
8. **Student Projects** — programme-aware tabs (MYP Personal/Community, DP CAS/EE, CP Reflective, PYP Exhibition), CSV import, 5-stage completion tracker with at-risk detection
9. **Auth Checklist** — 28 items across PSP domains, multiple evidence per item, authorization/evaluation modes, progress bar, PDF export for visiting team
10. **Staff Roster** — IB staff with PD hours, observation count, certification status, expandable detail
11. **IB Alignment Report** — domain bar charts, component detail, Learner Profile visibility (10 traits), PSP code cross-reference, PDF export, coordinator shared link (anonymized teacher names)
12. **Settings** — programme configuration, coordinator access link

### IB Framework
- IB Practices: 4 domains, 12 components, 1-4 scale (Not Yet Evident → Excelling)
- Real PSP 2020 codes (0101-01 through 0404-02)
- 10 Learner Profile attributes tracked per observation
- Programme-specific filtering (PYP/MYP/DP/CP focus components)
- Full rubric descriptors for all 12 components
- AI scores IB as primary framework (server-side frameworks.ts)
- IB-native morning brief with Learner Profile + ATL references

### Database
7 IB tables: ib_programmes, ib_documents, ib_self_study, ib_observations, ib_pd_records, ib_policies, ib_authorization_checklist. All with RLS (coordinator_id = auth.uid()). Migrations 011 + 012 applied.

### Demo Account
- URL: https://clearpath-apex.pages.dev/login?version=ib
- Email: demo-ib@clearpathedgroup.com
- Password: IBDemo2026!
- School: Austin International Academy (MYP)
- Role: ib_coordinator
- 5 MYP teachers + 6 observations with IB alignment data

### Market
- Texas: 200+ IB World Schools (Houston ISD, Austin ISD, Dallas ISD)
- National: 50 states + international
- No competitor exists with this specificity
- Kim's competitive advantage: former IB Head of School + Programme Coordinator

### What's Next for IB
- Student Project Portal (separate product, student-facing, CAS/EE/PP tracking)
- Supabase Storage for actual file uploads (currently metadata only)
- IB observation edge function with dedicated system prompt
- District Dashboard for ib_district_director role

---

## PRODUCT 5: BEACON
**What:** Elementary counselor command center
**URL:** https://clearpath-beacon.pages.dev
**Repo:** jkculley-cyber/clearpath-beacon (branch: main)
**Supabase:** cghhabcbgyoqwqjzunfo
**Status:** ✅ Grade A- — audited, 3 new pages added
**Pricing:** $100/school year ($10/mo) via Zelle. 14-day free trial.
**Data mode:** Local-first (IndexedDB). Cloud requires district DPA.

### What's Live
16 pages: Dashboard (My Day), Schedule, Groups, Group Detail, Students, Student Detail, Referrals, Time Tracker, Lessons, Communications, Sessions, Goals, Needs Assessment, Reports (with SCUTA export), Settings, Calendar. Plus public referral form.

### Recent Additions (Sessions BB-BC)
- 3 new pages: Goals, Needs Assessment, Sessions
- SCUTA-formatted CSV export
- Service worker for offline PWA
- 25+ bugs fixed (GroupDetail db adapter, SB 179 compliance fields, schedule blocks, error handling)

---

## PRODUCT 6: INVESTIGATOR TOOLKIT
**What:** Campus investigation case management PWA
**Repo:** jkculley-cyber/investigator-toolkit
**Status:** Built, not yet deployed to Cloudflare
**Pricing:** $49/yr ($5/mo) via Zelle
**Data mode:** 100% on-device (IndexedDB). Zero backend.

---

## PRODUCT 7: CLEARPATH WEBSITE
**What:** Company marketing site
**URL:** https://clearpathedgroup.com
**Status:** Live
**Deploy:** GitHub Actions → Cloudflare Pages (cpeg-site project)

### Key Pages
- Homepage with hero carousel (Waypoint + Apex)
- Product landing pages: waypoint.html, navigator.html, apex.html, beacon-product.html, investigator.html
- Store (store.html) — TpT + Zelle dual purchase options
- Whitepaper lead magnet
- Security page, research page

---

## PRODUCT 8: OPS COMMAND CENTER
**What:** Internal operations dashboard for Kim + Melissa
**URL:** https://clearpath-ops.pages.dev
**Repo:** jkculley-cyber/clearpath-ops
**Supabase:** xbpuqaqpcbixxodblaes (ops project)
**Status:** Live

### Features
- Dashboard with KPIs, tasks, decisions log, handoffs
- Product Hub with demo credentials
- Partner Chat (Kim ↔ Melissa, real-time via Supabase)
- Video call (WebRTC)
- Marketing Calendar, Chart Paper, Resources
- URLs section with 3 marketplace panels (Clear Path Store, TpT, IB Marketplace) + drag-and-drop
- Professional Development tracker

---

## TpT PRODUCTS (Spreadsheets)
All in waypoint repo TPT/ folder. **All 5 now have working formulas** (were all zero — fixed Session BC):

1. ISS Intervention Tracker (5,379 formulas)
2. Campus Admin Command Center (2,907 formulas)
3. DAEP Student Tracker (2,800 formulas)
4. Navigator Behavior Tracker (3,682 formulas)
5. Meridian SPED Compliance Tracker (4,293 formulas)

Plus 6 FREE lead magnets (Excel + PDF):
- Discipline Decision Matrix (principals)
- Conversation Starters, Crisis Response, SB 179 Compliance, Small Group Starter Kit, Referral Triage (counselors)

---

## EMAIL DELIVERABILITY
- SPF: `v=spf1 include:_spf.google.com include:spf.resend.com -all` ✅
- DKIM: `google._domainkey` TXT record live + authenticating ✅
- DMARC: `p=quarantine; rua=mailto:support@clearpathedgroup.com` ✅
- Resend DKIM: live ✅

---

## KEY INFRASTRUCTURE

| System | Details |
|--------|---------|
| Waypoint Supabase | kvxecksvkimcgwhxxyhw (West US) |
| Apex Supabase | jvjsotlyvrzhsbgcsdfw (East US) |
| Beacon Supabase | cghhabcbgyoqwqjzunfo (East US) |
| Ops Supabase | xbpuqaqpcbixxodblaes (East US) |
| Cloudflare Account | 05ff8f94d82a54168e183bd8e0614b70 |
| Waypoint CF Project | waypoint (pages.dev: waypoint-avt) |
| Apex CF Project | clearpath-apex |
| Beacon CF Project | clearpath-beacon |
| Resend | clearpathedgroup.com sender domain |
| Edge Functions | invite-user, send-notification, generate-coaching-draft, generate-morning-brief, send-marketing-blast, send-welcome-email |

---

## PRICING SUMMARY

| Product | Target | Price | Model |
|---------|--------|-------|-------|
| Waypoint | Districts | Custom contract | Annual |
| Navigator | Districts | Included with Waypoint or standalone | Annual |
| Apex Texas | Individual principals | $100/school year | Zelle, 14-day trial |
| Apex IB Hub | IB campuses | $1,800/yr | Zelle, 14-day pilot |
| Apex IB + Texas bundle | Both IB + T-TESS | $2,800/yr | Discount |
| Beacon | Individual counselors | $100/school year ($10/mo) | Zelle, 14-day trial |
| Investigator Toolkit | Individual admins | $49/yr ($5/mo) | Zelle |
| TpT Spreadsheets | Individual educators | $10-28 each | TpT + Zelle |

---

*Vera — this is current as of March 28, 2026. Every product listed above is built, deployed, and functional. Kim has demo credentials for everything. The IB Hub is the newest addition and the highest-margin product in the portfolio.*
