# Waypoint — Claude Chat Presentation Handover
### Complete context for generating district presentations, pitch decks, IT security briefings, and procurement materials

**Product:** Waypoint DAEP Management Platform
**Company:** Clear Path Education Group, LLC
**Document version:** February 2026

---

## HOW TO USE THIS DOCUMENT

Paste this entire document into a Claude Chat conversation, then use one of the suggested prompts below — or write your own. Claude Chat will have full context to produce polished, accurate materials.

---

## SUGGESTED PROMPTS

**District IT / Procurement Presentation (most relevant to recent work):**
> "Using the Waypoint information below, create a 12-slide presentation for a district IT director and procurement team. The audience wants to know about data security, FERPA compliance, hosting infrastructure, breach response, and vendor legal agreements. Format each slide as: Slide title, 4–5 bullet points, speaker notes. Tone: precise, professional, reassuring."

**District Administrator Sales Pitch (10 slides):**
> "Using the Waypoint information below, create a 10-slide pitch deck for a Texas school district administrator. Lead with the compliance risk problem, then walk through the solution. Format each slide as: Slide number, Title, 3–5 bullets, speaker notes. Tone: urgent, compliance-focused, credible."

**One-Page Executive Summary:**
> "Using the Waypoint information below, write a one-page executive summary for a Texas superintendent. Include: the problem, the solution, top 5 differentiators, security and compliance posture, and a call to action. Format for print."

**IT Security Briefing One-Pager:**
> "Using the Waypoint information below, write a one-page IT security briefing for a district CTO or IT director. Cover: infrastructure, encryption, FERPA/TEC compliance, uptime SLA, backups, and data breach response. Tone: technical, precise, audit-ready."

**SPED Director Briefing:**
> "Using the Waypoint information below, create a briefing document specifically for a Special Education Director. Focus entirely on SPED/504 compliance features, manifestation determination workflow, and how Waypoint prevents OCR complaints. Tone: precise and technically credible — this audience knows IDEA."

**Board Presentation Talking Points:**
> "Using the Waypoint information below, write 5-minute board presentation talking points covering: why the district needs this platform, equity in discipline data, compliance risk, and what the district is getting. Tone: accessible to board members who are not educators."

**Demo Script (15 minutes):**
> "Using the Waypoint information below, write a 15-minute live demo script for a school district walkthrough. Include what to show, what to say, and transitions. Audience: principal and district admin."

**Investor Brief (2 pages):**
> "Using the Waypoint information below, write a 2-page investor brief covering: market opportunity, product overview, competitive differentiation, business model, and ask. Tone: confident, data-oriented."

---

## COMPANY & PRODUCT IDENTITY

**Company:** Clear Path Education Group, LLC (Texas LLC)
**Product name:** Waypoint
**Tagline:** Behavioral Solutions
**One-sentence position:** Waypoint is the only end-to-end DAEP compliance and operations platform built for Texas schools.
**Brand colors:** Orange (#f97316) and dark charcoal — professional, modern, not corporate
**Logo style:** Compass rose — reflects navigation metaphor (waypoint = compass bearing)

---

## THE PROBLEM

Texas school districts operating DAEPs face a complex, high-stakes compliance and coordination burden that paper and email systems cannot handle:

- **SPED/504 compliance** requires manifestation determinations, ARD meetings, and strict timelines *before* placement — missing a step triggers OCR complaints and due process hearings
- **Multi-role approval chains** must be completed and documented by up to 6 staff roles before a student can be placed — missed steps create legal liability
- **Student orientations** must be scheduled, completed, and documented before the placement day count starts — undocumented orientations can invalidate placements
- **Daily attendance and behavior** at the DAEP campus must be tracked separately from the home campus
- **Transition plans** must be created and reviewed at 30/60/90-day intervals — missed reviews create audit findings
- **Sub-population reporting** (race, gender, SPED, 504, ELL, homeless, foster care) is required for federal equity reporting — districts often discover gaps too late
- **Incident documentation** must meet PEIMS and TEA reporting requirements — errors result in federal funding risk
- **Recidivism risk** must be proactively identified so interventions can be assigned before a second or third incident

**The core risk:** Paper and email systems cannot enforce timelines, create defensible audit trails, or surface compliance gaps before they become violations. When TEA or OCR audits, districts need documentation — and they usually don't have it.

---

## THE SOLUTION — FEATURE SET

### Feature 1 — Incident Management
- Staff create a discipline incident with offense code (mapped to TEA PEIMS codes), consequence type (warning, detention, ISS, OSS, DAEP, expulsion), and supporting details
- System enforces the **discipline matrix** — minimum/maximum consequences by offense and grade group, preventing inconsistent disciplinary decisions
- SPED and 504 flags automatically route compliance requirements
- Full audit trail with timestamps and reported-by attribution
- Document attachments stored securely in district-scoped cloud storage
- **Headline:** "Every incident documented, every decision defended"

### Feature 2 — Six-Step Approval Chain
- When a DAEP consequence is assigned, the system creates a sequential approval chain automatically
- Steps: Campus Behavior Coordinator → Counselor → SPED Coordinator (if applicable) → 504 Coordinator (if applicable) → Student Support Specialist → Director of Student Affairs
- Each step captures approval date, approver identity, and notes
- A student cannot be placed until the full chain is approved — the system enforces it
- **Headline:** "No placement without a complete paper trail"

### Feature 3 — SPED/504 Compliance Blocking
- Automatic detection of SPED-eligible students on DAEP/expulsion incidents
- Compliance checklist enforces manifestation determination review (within 10 school days) before placement
- Checklist items: ARD committee meeting, manifestation determination, BIP review, FBA, FAPE plan, parent notification, educational services arrangement, IEP goals review, least restrictive environment consideration
- **Compliance hold blocks placement** until all 9 items are completed or explicitly overridden with documented justification
- SPED coordinator dashboard — only their cases, clearly flagged
- **Headline:** "Manifestation determinations documented before day one"

### Feature 4 — Orientation Kiosk + Reflection Form
- Students check in at the Orientation Kiosk on their scheduled orientation day
- Students complete a Student Reflection (what happened, what they'd do differently)
- Students build a My Behavior Plan — 3 behavioral goals with supports and interventions
- Form saved digitally; printable with signature lines for the student's file
- Orientation check-in does NOT count as a DAEP attendance day
- **Headline:** "Students arrive with a plan, not just a placement"

### Feature 5 — Daily Student Kiosk
- Students enter their Student ID each morning — no login, no password required
- Records check-in; displays DAEP Placement Tracker (visual progress with milestones at 25%, 50%, 75%, 100% of days served)
- Displays My Daily Goals — the student's 3 behavior plan goals as a daily reminder
- Phone bag/locker number recorded for device policy compliance
- One check-in per day enforced at both application and database level
- **Headline:** "Students see their progress every single day"

### Feature 6 — DAEP Dashboard
- Summary cards: Active enrollments, pending placements, compliance holds, completed YTD
- Active Enrollments Table: Days served, days remaining, sub-population flags per student
- Approval Flow Table: In-progress approval chains with step-by-step status indicators
- Scheduled Orientations widget: Upcoming orientations in the next 7 days
- Sub-Population Charts: Race/ethnicity, gender, SPED/504/Gen Ed, grade level, homeless and foster care breakdowns
- **Headline:** "Every administrator sees the full picture in one view"

### Feature 7 — Transition Plans
- Created per incident; typed as Behavioral Plan or DAEP Exit Plan
- Structured goals and success metrics
- 30/60/90-day review dates tracked; overdue reviews flagged in red
- Linked interventions from the district's intervention library
- **Headline:** "Structured support from day one through DAEP exit"

### Feature 8 — Recidivism Risk Engine
- Scores students 0–100 based on incident frequency, recency, severity, SPED status, age of first offense, and behavior types
- Classifies students as Low / Medium / High risk
- Surfaces contributing factors with point breakdowns
- Suggests tiered interventions based on risk profile
- **Headline:** "Stop the next incident before it happens"

### Feature 9 — Compliance Reporting & Export
- Sub-population breakdowns for PEIMS-required categories
- SPED cumulative day tracking across all incidents in a school year
- Repeat offender alerts and cross-offense patterns
- Export to PDF and Excel across all major data tables
- **Headline:** "Audit-ready reports in seconds, not days"

### Feature 10 — Parent Portal
- Parents log in to view their child's incident history, status, and transition plans
- Read-only access — no ability to modify records
- Plain-language display of placement details and progress
- **Headline:** "Families stay informed without burdening staff"

### Feature 11 — Data Import System
- Bulk CSV/Excel upload for campuses, students, staff, and incidents
- 4-step wizard: Upload → Map Columns → Validate → Import
- Auto-detects column mappings for Skyward, PowerSchool, Infinite Campus exports
- Laserfiche DAEP report sync — daily Excel import creates/updates students and incidents automatically
- Cancel button at every step
- Per-row error reporting with downloadable error CSV
- **Headline:** "Bring your existing data in hours, not weeks"

---

## USER ROLES

| Role | What They Do in Waypoint |
|------|--------------------------|
| Administrator | Full access: settings, reporting, all features |
| Principal / AP | Review and approve incidents for their campus |
| Campus Behavior Coordinator (CBC) | Create incidents, start approval chains |
| Counselor | Approve in chain, create transition plans |
| SPED Coordinator | Approve SPED placements, sign off on compliance checklists |
| Section 504 Coordinator | Approve 504-flagged placements |
| Student Support Specialist (SSS) | Late-chain approval, assign interventions |
| Director of Student Affairs | Final approval authority |
| Parent | Read-only view of their child's record |
| Student (Kiosk) | Daily check-in and daily goal reminder — no account needed |

---

## KEY DIFFERENTIATORS

1. **End-to-end** — incident creation to DAEP exit in one system; no jumping between tools
2. **SPED compliance is core** — manifestation determinations and ARD tracking built in from day one, not bolted on
3. **Student-facing** — students own their check-in and see their own progress daily
4. **Behavior goals travel** — set at orientation, displayed at every check-in
5. **No placement without approval** — the system physically blocks it at the database level
6. **Real-time visibility** — administrators see the live picture, not a weekly email summary
7. **Texas-specific** — TEA PEIMS codes, TEC Chapter 37, SPED compliance timelines baked in
8. **FERPA-compliant by design** — row-level security enforced at database layer, not just application layer
9. **Laserfiche integration** — the only DAEP platform with native Laserfiche daily sync

---

## SECURITY & COMPLIANCE POSTURE (NEW — For IT/Procurement Presentations)

This section covers the technical and legal security posture of Waypoint for use in IT director briefings, procurement conversations, and board presentations.

### Infrastructure

| Layer | Detail |
|-------|--------|
| Cloud provider | Amazon Web Services (AWS) via Supabase |
| Hosting region | US East — N. Virginia (us-east-1) — all data stays in the United States |
| Frontend hosting | Netlify (serves application code only; no student data stored here) |
| DDoS protection | Cloudflare (Supabase-managed) |
| Database | PostgreSQL with Row-Level Security (RLS) — district isolation enforced at DB layer |

### Encryption

| Layer | Standard |
|-------|----------|
| Data at rest | AES-256 (enforced at AWS infrastructure level) |
| Data in transit | TLS 1.2 or higher (all API calls, file uploads, authentication) |
| Passwords | bcrypt hashing — never stored in plaintext |
| Session tokens | Short-lived JWTs — automatically expire |

### Multi-Tenant Isolation
Every database table includes a `district_id` column. PostgreSQL Row-Level Security policies enforce that users can only query their own district's rows — at the database level, not just the application. This is architecturally different from application-layer filtering: even if an attacker had valid credentials, the database would reject cross-district queries.

### Compliance Certifications

| Certification | Status |
|--------------|--------|
| SOC 2 Type II | ✅ Supabase (infrastructure provider) — reports available under NDA |
| FERPA | ✅ Compliant by design — district executes a Data Processing Agreement (DPA) with Clear Path Education Group, LLC designating Waypoint as a school official under 34 C.F.R. § 99.31(a)(1)(i)(B) |
| Texas Education Code § 32.151-32.158 (Student Privacy Protection Act) | ✅ Compliant — Waypoint is a designated "Operator" under TEC § 32.152; prohibited uses (targeted advertising, profile building, sale of data) are contractually barred |
| HIPAA | ✅ Supabase infrastructure is HIPAA-eligible; Waypoint handles education records (FERPA), not medical records (HIPAA) |
| COPPA | ✅ No personal information collected directly from students; kiosk requires only a student ID number |

### Uptime & Availability
- **99.9% monthly uptime target** — consistent with Supabase SLA for Team/Enterprise customers
- Less than 45 minutes of unplanned downtime per month
- Real-time status: [status.supabase.com](https://status.supabase.com)
- Planned maintenance scheduled after 10 PM Central Time with advance notice to district administrators

### Backup & Disaster Recovery

| Metric | Value |
|--------|-------|
| Backup frequency | Daily (automated) |
| Backup retention | 7–14 days depending on plan tier |
| Recovery Point Objective (RPO) | 24 hours standard; near-zero with Point-in-Time Recovery |
| Recovery Time Objective (RTO) | Under 4 hours for full database restore |
| Backup encryption | AES-256, stored separately from production |

### Data Breach Response
In the event of a confirmed breach:
1. Clear Path Education Group, LLC notifies the district within **72 hours** of discovery
2. Written incident report delivered within **5 business days**
3. If 250+ Texas residents affected: Texas Attorney General notified within **30 days** (Texas B&C Code § 521.053, as amended by SB 768, eff. Sept. 1, 2023)
4. Individual notification to affected students/parents within **60 days** (Texas statutory requirement)
5. Post-incident remediation report provided to district

### Data Retention & Exit Rights
- District data retained for the active contract term plus a 90-day grace period for export
- Full data export (CSV/JSON for records; ZIP for uploaded documents) available on request, delivered within 30 days
- Production data deletion within **60 days** of district request (consistent with TEC § 32.154)
- Written deletion certification provided upon completion
- Data is never transferred outside the United States

### Legal Framework
Each district executes a **Data Processing Agreement (DPA)** with Clear Path Education Group, LLC before going live. The DPA:
- Designates Clear Path as a FERPA "school official"
- Designates Clear Path as a TEC § 32.151 "Operator"
- Prohibits all non-educational use of student data
- Lists all data subprocessors (Supabase/AWS, Netlify)
- Requires 72-hour breach notification to the district
- Requires deletion within 60 days of district request
- Governs under Texas law
- Includes audit rights

---

## AUDIENCE PLAYBOOKS

### District IT Director
**Their question:** "What happens to our student data if this vendor gets breached or goes under?"
**Lead with:** Infrastructure (AWS/Supabase SOC 2), encryption specs, multi-tenant RLS isolation, breach notification process, data return on exit
**Show them:** The IT Security FAQ; the DPA summary

### District Administrator / Superintendent
**Their question:** "Can this protect us from a compliance complaint or audit finding?"
**Lead with:** SPED compliance blocking, audit trail, approval chain enforcement, PEIMS export
**Show them:** The compliance hold feature, approval chain status view, sub-population dashboard

### Principal / Assistant Principal
**Their question:** "How many clicks does it take? Will this slow me down?"
**Lead with:** Incident creation wizard, approval chain visibility, mobile-friendly interface
**Show them:** Create a test incident in under 3 minutes during the demo

### SPED Coordinator
**Their question:** "Does this correctly implement the 10-school-day MDR requirement? Does it block placement?"
**Lead with:** The compliance checklist — all 9 items, the placement block, the SPED-only dashboard
**Show them:** Every checklist item. Go slow. They will ask hard questions. That is good.

### School Board Member
**Their question:** "Are we disciplining sub-populations equitably? What's our liability exposure?"
**Lead with:** Sub-population charts, recidivism risk engine, compliance audit trail
**Show them:** The dashboard's demographic breakdown and the repeat offender alert system

### Investor / Strategic Partner
**Their question:** "What's the market and why are you the right team to win it?"
**Lead with:** 1,200+ Texas districts, no dominant purpose-built competitor, recurring SaaS, high switching costs, Laserfiche integration as moat
**Tone:** Confident, data-oriented

---

## PRICING TIERS

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| Incident Management | ✓ | ✓ | ✓ |
| Approval Chain | ✓ | ✓ | ✓ |
| SPED Compliance | ✓ | ✓ | ✓ |
| DAEP Dashboard | — | ✓ | ✓ |
| Transition Plans | — | ✓ | ✓ |
| Student Kiosk | — | ✓ | ✓ |
| Orientation Kiosk | — | ✓ | ✓ |
| Parent Portal | — | ✓ | ✓ |
| Laserfiche Sync | — | — | ✓ |
| Recidivism Engine | — | — | ✓ |
| Interventions Library | — | — | ✓ |
| Advanced Analytics | — | — | ✓ |

*Pricing is per district, per year. Contact Clear Path Education Group, LLC for a quote.*

---

## MARKET CONTEXT

- Texas has **1,200+ school districts**, the majority operating DAEPs under TEC Chapter 37
- Federal and state compliance requirements are **increasing** — IDEA, Section 504, ESSA, TEA accountability all touch DAEP operations
- Most districts today manage DAEP with spreadsheets, email, and paper forms
- There is **no dominant purpose-built DAEP management platform** in Texas — the market is open
- Recurring SaaS model with high switching costs once embedded in district operations
- Adjacent expansion: alternative schools, in-school suspension management, multi-campus programs; geographic expansion to CA, FL, GA, NC (all have analogous alternative placement requirements)

---

## DEMO ENVIRONMENT

**Live demo district:** Lone Star Independent School District

**Demo campuses:** Lone Star High School, Lone Star Middle School, Bluebonnet Elementary, Lone Star DAEP

**Demo student IDs for kiosk:**

| Student ID | Name | What to Show |
|-----------|------|-------------|
| LS-10001 | Marcus Johnson | Full check-in with DAEP tracker + behavior goals |
| LS-10004 | Aaliyah Brown | Full check-in with DAEP tracker + behavior goals |
| LS-10003 | Tyler Williams | Compliance hold — shows blocked status |
| LS-10002 | Sofia Garcia | Orientation scheduled — not yet checked in |

**Suggested demo flow (15 minutes):**
1. Log in as CBC → show Incidents page → open an active incident (3 min)
2. Show the approval chain progress on the incident detail (2 min)
3. Show DAEP Dashboard — summary cards, enrollment table, sub-population charts (3 min)
4. Switch to Orientation Schedule page (2 min)
5. Navigate to `/kiosk` → enter LS-10001 → show tracker + daily goals (3 min)
6. Show Student Detail page — recidivism score, incident history (2 min)

---

## BRAND VOICE RULES (Apply to All Generated Materials)

**Do say:**
- "Compliance platform" or "behavioral management platform" — not "discipline software"
- "Placement" — not "sentencing" or "sending to DAEP"
- "Automates the paperwork" — not "automates discipline" (humans make discipline decisions)
- "School official" — when referring to Waypoint's FERPA designation
- "District-scoped" — when referring to data isolation

**Never say:**
- "Zero tolerance"
- "Surveillance" (especially for parent portal or kiosk)
- "Punishment tracking"
- Any TEC section number not confirmed above in this document

**Tone by audience:**
- District admin: Urgent, compliance-focused, liability-aware
- IT director: Technical, precise, audit-ready
- Principal: Fast, clear, practical
- SPED coordinator: Technically precise — this audience distrusts vague assurances
- Board member: Accessible, equity-framed, governance-oriented
- Investor: Confident, market-aware, data-oriented

---

## KEY ACRONYMS (Spell Out on First Use in Any Customer Document)

| Acronym | Full Term |
|---------|-----------|
| DAEP | Disciplinary Alternative Education Program |
| SPED | Special Education |
| ARD | Admission, Review, and Dismissal committee |
| MDR | Manifestation Determination Review |
| BIP | Behavioral Intervention Plan |
| FBA | Functional Behavioral Assessment |
| FAPE | Free Appropriate Public Education |
| IEP | Individualized Education Program |
| IDEA | Individuals with Disabilities Education Act |
| PEIMS | Public Education Information Management System |
| TEC | Texas Education Code |
| TEA | Texas Education Agency |
| CBC | Campus Behavior Coordinator |
| SSS | Student Support Specialist |
| FERPA | Family Educational Rights and Privacy Act |
| RLS | Row-Level Security (database-layer access control) |
| DPA | Data Processing Agreement |
| SOC 2 | Service Organization Control 2 (security audit framework) |

---

*Clear Path Education Group, LLC | Waypoint Behavioral Solutions | February 2026*
