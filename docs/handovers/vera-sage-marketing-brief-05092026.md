# VERA + SAGE — Marketing Brief: Waypoint, Navigator, Beacon, Investigator's Toolkit

**Date:** May 9, 2026
**From:** Archer (CTO)
**Audience:** Vera + Sage
**Purpose:** Build a marketing campaign for each of the four named products. This brief is your ground truth on positioning, buyer, pricing, differentiation, and what's defensible to claim. Apex (paused for new sign-ups), Meridian, and Origins are out of scope here. Coordinate between yourselves on division of labor — long-form web copy, email sequences, social, district outreach decks, sales one-pagers.

---

## CROSS-PRODUCT CONTEXT (read first)

**Brand parent:** Clear Path Education Group, LLC — `clearpathedgroup.com`. Every product page lives at a subdomain of this apex.

**Contact:** All inbound flows to `support@clearpathedgroup.com`. Never `kim@…`, never any personal address. Never expose `*.pages.dev` URLs in customer-facing copy — Lightspeed / Securly / iBoss / Cisco Umbrella K-12 content filters categorize `pages.dev` as "file sharing" and silently block it. Real incident on the record (DECISIONS.md 2026-04-20).

**Voice:** Practitioner-credible, not SaaS-glossy. Kim is a sitting Texas DAEP principal. Every product was built by educators for educators. We win by sounding like we've actually been in the cafeteria, not by sounding like a Series-A deck.

**Compliance discipline (CRITICAL):** Every Texas Education Code citation in customer-facing copy must be verified against current statutory text before shipping. CC10 fact-check found 19 wrong/fictional TEC citations across 14 files. When in doubt, soften ("see TEC §37.006(a) and local Board policy") rather than asserting a section that doesn't say what you think it says. Fictional sections we've caught: §32.158, §37.0041, §37.0052. SB 179 of 2017 (cyberbullying, §37.0832) is **different** from SB 179 of 2019 (counselor 80/20, §33.006) — same SB number, different sessions, different bills. Don't conflate.

**Domain rule:** Customer-facing URLs use `*.clearpathedgroup.com` subdomains. Pages.dev URLs are dev-only.

**No-auto-renewal language:** For Beacon and Toolkit (individual buyers via Zelle), all copy must say "no auto-renewal." We have no auto-bill infrastructure. Saying "renews monthly" misleads buyers and creates a trust loss the first time a license lapses.

**Adversarial-audit credibility:** Each product has been put through a 3-round multi-voice audit (competitor poacher + practitioner naysayer + plaintiff's attorney + district CIO). The trajectory and final verdicts are public-relations gold — use them carefully and accurately. Numbers in this brief are what each product actually scored, not aspirational.

---

## PRODUCT 1: WAYPOINT

### One-liner
**The Texas-specific DAEP and discipline management system that won't let you ship a non-compliant placement.**

### URLs
- Marketing: `clearpathedgroup.com/waypoint.html` (or section on the apex)
- Live app: `waypoint.clearpathedgroup.com` (also `app.clearpathedgroup.com`)

### Buyer
District-level: Director of Student Affairs, Assistant Superintendent of Student Services, sometimes the Superintendent directly. Occasionally a Director of Special Education when the deciding factor is SPED/504 compliance.

### User
Inside the platform: Admin, Principal, AP, Counselor, SPED Coordinator, CBC, SSS, 504 Coordinator, Director of Student Affairs. **Teachers and parents do NOT log in** — teachers document via SIS; parents are notified by email and use a read-only parent portal.

### Core problem solved
Texas districts running DAEPs have to comply with a stack of state law (Chapter 37, Senate Bill 179 of 2019, 19 TAC §103) plus federal IDEA / Section 504 requirements simultaneously. Most districts use Skyward / PowerSchool / eSchoolPlus discipline modules built for general K-12, not for DAEP. Result: AP enters a placement, pulls a transition plan from Word, copies SPED-MDR notes from a separate tracker, prints a parent-notification letter. Three systems, no enforcement, audit-vulnerable. Waypoint collapses the workflow into one app where the SPED-MDR gate, the 10-day cumulative-removal rule, and the parent-notification window are all enforced at the database trigger level — *you can't ship a placement that's out of compliance.*

### Differentiation vs. competitors
- **Skyward / PowerSchool discipline modules:** General-purpose. No DAEP-specific workflow, no SPED gate, no transition plan templates aligned to TEC §37.023 (transition services), no orientation kiosk.
- **Custom-built district solutions:** Districts spend $20K-$50K on consultants to build internal tools that don't get maintained. Waypoint is the maintained, multi-district version.
- **Compliance binders + Word docs:** What most districts actually use. The "after the lawsuit" replacement.

### Pricing
District contract — custom per district size. **Do not publish a number.** When asked, the answer is "we scope per district." For pilot conversations, the anchor is "less than the cost of one Title-I AP for a year."

### Live status
Pre-pilot. Feature-complete. Production app at the URL above. Demo seed at `admin@lonestar-isd.org` / `Password123!` (Lone Star ISD demo district with 12 active incidents, 6 transition plans, 57 days of behavior tracking).

### Defensible marketing claims (what's actually true)
- Texas Education Code §37 + 19 TAC §103-aligned (see citation discipline above for specific sections)
- IDEA 34 CFR §300.536 manifestation-determination gate enforced at database level
- Multi-tenant architecture, district-level data isolation enforced via Postgres RLS
- 27+ migration history (database is mature, not fresh)
- Parent portal, kiosk modes, PEIMS export, PDF + Excel reporting
- Texas-only by design (we don't sell to Oklahoma)

### Things NOT to claim
- Don't say "FERPA-compliant" without context — FERPA compliance is a function of district practices, not just software. Say "FERPA-conscious architecture" or "supports district FERPA obligations."
- Don't claim DAEP placement automation that bypasses local Board policy. Districts have their own TASB policies (FO, FOC, etc.) and we respect them.
- Don't overstate adoption — pre-pilot means pre-pilot.

### Marketing assets needed
1. **District sales one-pager** (PDF, 1 page front + back) — for handing out at TASB / TASA conferences
2. **Comparison matrix** — Waypoint vs. Skyward Discipline vs. internal custom-build
3. **Demo video script** (we have one, may need refresh)
4. **Email sequence** — 4-touch outreach to district directors of student affairs
5. **LinkedIn 90-day cadence** — Texas K-12 administrator audience
6. **Anchor blog post** — "What 19 TAC §103 actually requires of your DAEP" (educational, not pitch-heavy; SEO play)

---

## PRODUCT 2: NAVIGATOR

> **⚠️ CC30 CORRECTION (2026-06-02) — read before using any Navigator copy below.** Two claims in this section were found overstated during the CC30 naysayer audit and must NOT be repeated in customer-facing copy:
> 1. **"AP can sign up before lunch" / per-campus self-serve.** Onboarding is **not** self-serve — real tenant provisioning requires Clear Path staff (`provision_new_district` is `waypoint_admin`-only), and a campus gets real-student access only **after a signed data agreement** (the live `navigator.html` already says this correctly). Frame as "request a pilot, we provision you," not "sign up before lunch."
> 2. **"Admissible under FRE 803(6) trustworthiness."** Navigator's Hearing Packet discloses a post-hoc edit history, but that history is **not** backed by a tamper-evident hash chain (Waypoint has one via migration 081; Navigator does not yet — a port is scheduled). Reframe as **"a disclosed, attributed edit history — defensibility subject to district counsel review,"** not "admissible." Do not assert FRE 803(6) admissibility until the immutable chain ships.

### One-liner
**The single ISS/OSS placement system every Texas Title-I AP needs — and the only one that's been adversarially stress-tested.**

### URLs
- Marketing: `clearpathedgroup.com/navigator.html`
- Live: `navigator.clearpathedgroup.com` (campus-level instances)
- Demo district: Lincoln HS (campus-as-district provisioning model)

### Buyer
Campus-level: Assistant Principal who runs in-school and out-of-school suspensions. Sometimes the Principal directly. Occasionally Director of Student Services when a district-wide deal materializes — but the wedge is the AP.

### User
AP, Principal, Counselor, SPED Coordinator. Same role list as Waypoint, narrowed to placement workflow.

### Core problem solved
APs at Title-I middle schools and high schools handle 2-5 placements per day. The current state is a paper referral form, a Word transition plan, an Excel placement tracker, and a binder of MDR documentation. When OCR / IDEA litigation lands (and at Title-I campuses it lands routinely), the AP has to assemble a Hearing Packet from four different sources in a week, while the records may have been edited in the meantime. Navigator captures referrals, placements, and supports in one place; auto-detects 10-day cumulative-removal SPED triggers; logs every edit with attribution; generates a single-click FERPA-watermarked Hearing Packet PDF that includes a post-hoc edit-disclosure section (the disclosure itself is what makes it admissible under FRE 803(6) trustworthiness).

### Differentiation vs. competitors
- **Panorama (Sam Ortega persona's product):** Enterprise SEL / behavior platform, $30K+ entry, district-level deal, takes 8 months to procure. Navigator is per-campus, $499/year intro pricing, AP can sign up before lunch.
- **Branching Minds:** Tier-system intervention tracking. Doesn't do placement workflow or hearing-packet generation.
- **Generic discipline trackers:** Don't have the SPED 10-day rule built in, don't have audit-log fail-loud triggers, don't have disproportionality monitoring.

### Pricing
**$499/year intro pricing per campus** (campus-as-district provisioning model). Not per-seat. The whole campus admin team uses one license. Pilot form lives at `navigator.clearpathedgroup.com`.

### Live status
Production. Migrations 037-042 + 066-072 applied. Adversarially audited across 3 rounds:
- **R3 verdicts:** Marsha Wilkerson (12-yr Title-I AP persona) **84% "Ship it. Ship it confidently."** Reyes (IDEA + Title VI plaintiff's attorney) — "**DEFENDABLE under Federal Rules of Evidence 803(6) trustworthiness**." Chen (district CIO) — conditional pass with 4 pre-go-live conditions, all closed.
- **Trajectory:** Marsha 42% → 72% → 84% across three rounds. Reyes IDEA exposure SEVERE → ELEVATED → COLORABLE-but-defensible. Chen blocked → conditional pass. The trajectory itself is part of the story — "we ran the audit instead of believing our own marketing."

### Defensible marketing claims
- Manifestation-determination 10-day rule **enforced** (raises P0001 SQL exception when SPED student hits cumulative ≥10 without an MDR link). IDEA 34 CFR §300.530.
- Server-side parent-notice timestamp (you can't fake when the call was made).
- Audit log on every mutation. Every edit captured with attribution.
- Disproportionality Radar: OCR risk-index per race + Section 504 + SPED disability rows, small-cell suppression at n<10, longitudinal trend (current 90 days vs. prior 90 days).
- Hearing Packet PDF is single-click, FERPA-watermarked, includes a "Post-Hoc Edits" disclosure section that converts the edit log into admissible evidence.
- Adversarial audit verdicts above (use exact numbers, exact persona names — they're documented).

### Things NOT to claim
- Don't claim "automatic SPED compliance" — the **system** enforces the gate, but compliance is still the district's legal obligation.
- Don't say "court-ready" without "subject to district counsel review."
- Don't claim full district-tenant rollout — campus-level is the current product. District-tenant is on the roadmap (when Beacon district pull happens, similar architecture applies here).

### Marketing assets needed
1. **AP sales one-pager** — *"You'll spend less on Navigator than you'll spend on coffee for your next OCR investigation"* style angle
2. **Hearing Packet sample PDF** (anonymized) — show what the output looks like, this is the "wow" asset
3. **Adversarial audit one-pager** — the trajectory chart + exact persona quotes; this is uniquely Navigator's competitive moat
4. **Email outreach sequence** — Title-I AP audience, 5 touches over 3 weeks
5. **Educational blog post** — "What FRE 803(6) trustworthiness actually means for your discipline records" (legal-adjacent SEO)
6. **Comparison matrix** — Navigator vs. Panorama vs. Branching Minds vs. Excel
7. **Conference deck** — 12 slides for TASB / Texas Association of Secondary School Principals

---

## PRODUCT 3: BEACON

### One-liner
**The local-first command center for elementary school counselors — a chief-of-staff she opens at 8 AM, not a binder she opens after a lawsuit.**

### URLs
- Marketing: `clearpathedgroup.com/beacon.html` (Beacon recently promoted to first slot in Individual Pricing as of May 6)
- Live: `beacon.clearpathedgroup.com`
- Verify-attestation: `verify.clearpathedgroup.com` (third-party PDF integrity witness, ships with every legal PDF)

### Buyer
Individual elementary school counselor (out of pocket, $79/year). Occasionally a Director of Counseling for a small private school. District-level adoption is a real but currently demand-pull motion — when a district director commits, we sell at $79/counselor with no discount up to 50 seats.

### User
Single counselor on a single laptop. Mobile-friendly PWA. Currently in pilot with Nicole Hill at Magnolia ISD (real customer, real student data running through the local-mode IndexedDB).

### Core problem solved
Elementary counselors are the most lawsuit-exposed staff in K-12 (suicide, abuse, threat, FERPA-PII handling) and the worst-tooled. The standard is a paper crisis log, a Word session-note template, and a spreadsheet for SB 179 80/20 time tracking. Beacon collapses this into one PWA where every legal PDF carries a SHA-256 content hash + ops-Supabase third-party timestamp witness, every crisis event auto-schedules its 24h / 72h / 1-week follow-ups, and the SB 179 time log auto-generates from time entries (not hand-typed at year-end). Three transformative features on top: (1) crisis quick-launch with structured suicide / threat / abuse / distress workflows, (2) daily morning brief, (3) one-click Due-Process Documentation PDF for unanswered parent contacts. Voice capture (local Whisper-WASM only — never cloud — FERPA-clean) is on the roadmap.

### Differentiation vs. competitors
- **SCUTA** (~$200/seat): Cloud-only, decent UX, no FERPA-aware audit-log story. Beacon is local-first by default — the file in your Downloads folder is encrypted with AES-GCM-256 + PBKDF2(license + email).
- **CountSel** (free / ESC Region 12): Free is the right answer for some districts, but it's basic. Doesn't generate legal PDFs, doesn't auto-schedule crisis follow-ups, doesn't have CREST.
- **Panorama / Branching Minds:** Enterprise SaaS, $30K+ entry, sells to districts. Beacon's wedge is *individual buyer adoption* — the counselor swipes her own card, the district sees it works, the director writes a check for the team in year 2.

### Pricing
- **$79/year** per counselor (annual). No auto-renewal.
- **$8/month** (monthly). No auto-renewal.
- Districts: $79/counselor. No volume discount up to 50 seats. Single annual invoice.

### Live status
Production. 23 IndexedDB stores in v6 local mode. ~14 cloud tables (cloud-mode signup is currently broken on purpose — district plumbing is **demand-pull**, parked until Nicole's Magnolia ISD leadership conversation surfaces requirements). Adversarially audited 4 rounds:
- **Trajectory:** Marcia (6-month-retention naysayer persona) **40% → 58% → 82% → 84%** across R1–R4. R1 "buy with caveats." R3 **82% "buy. no caveats."** R4 **84% "Buy. Confidently. Ship and call it 1.0."**
- **R4 specifics:** Adversary lawyer on the record — *"the record is admissible. Its weight is for the jury."* CIO concerns #7 (consumer-cloud guardrail) and #8 (verify URL 404) closed GREEN-RESOLVED.
- **The most-quoted line:** Adversary lawyer on PMF — *"encrypted local-first PWA with a third-party timestamp witness is a real value proposition for a solo LPC who is not a school district."*

### Defensible marketing claims
- Local-first by default — student data lives on the counselor's machine, not on Clear Path servers
- AES-GCM-256 + PBKDF2 (210k iters, OWASP 2023 baseline) backup encryption
- SHA-256 content hash + Cloudflare Workers verify-attestation endpoint on every legal PDF (Crisis, Due-Process, SB 179) — the third-party witness mechanism the lawyer conceded was *"finally a third-party witness in the colorable sense I demanded"*
- SB 179 of 2019 (counselor 80/20 direct service rule, TEC §33.006) compliance reporting
- CREST award tracker mapping to the 5 Texas Model categories from TSCA's PSCC CREST evaluation rubric
- 38/38 logic tests passing (CC11 release)
- Native PWA browser notifications, ICS calendar export, Google Calendar / Apple Calendar / Outlook integration

### Things NOT to claim
- Don't say "your data never leaves your device" — the optional Crisis PDF attestation does send a SHA-256 hash + timestamp + counselor ID to ops Supabase (intentionally; that's the third-party witness). The actual student PII never leaves; the metadata receipt does. Be precise.
- Don't say "HIPAA-compliant" — Beacon is FERPA-aware, not HIPAA. Counselors are FERPA actors, not HIPAA actors, in K-12 settings. Don't muddy this.
- Don't claim full district mode — that's parked.

### Marketing assets needed
1. **Counselor landing page** — first-person, "what your day looks like with Beacon"
2. **The Lawsuit Insurance angle** — a one-pager that says "documentation is your job; Beacon is the tool that makes documentation defensible" (Marcia's framing, real practitioner words)
3. **Crisis-workflow demo video** — 2 minutes, screen recording, suicide-risk workflow end-to-end
4. **CREST tracker explainer** — for Texas counselors specifically, this is a niche but high-conversion topic (TSCA crowd)
5. **SB 179 80/20 time-tracking explainer** — PDF + blog post combo, this is the "have to comply with this anyway" hook
6. **Email drip** — 7-touch sequence post-purchase, onboarding the counselor through the 3 transformative features
7. **Adversarial audit one-pager** — same trajectory format as Navigator (40% → 58% → 82% → 84% across rounds)
8. **Comparison matrix** — Beacon vs. SCUTA vs. CountSel vs. spreadsheet
9. **Director-of-counseling deck** — for the year-2 district expansion conversation; 8 slides max

---

## PRODUCT 4: INVESTIGATOR'S TOOLKIT

### One-liner
**The 10-section campus investigation workflow that turns "we'll figure it out" into a defensible written record.**

### URLs
- Marketing: `clearpathedgroup.com/toolkit.html` (or section)
- Live: `investigatortoolkit.clearpathedgroup.com`
- Distribution: **Sold as downloadable HTML on `clearpathedgroup.com`. NOT on Teachers Pay Teachers.** TpT does not allow links in products, which kills the activation flow. (DECISIONS.md memory note `feedback_tpt_no_links.md`.)

### Buyer
Individual campus administrator — Principal, AP, sometimes Director of Student Services. Out of pocket. The buyer who already googled "investigation template Texas" and is tired of fragmented Word docs.

### User
The buyer. Single-user PWA. No login, no backend. Data lives in browser IndexedDB on the admin's laptop.

### Core problem solved
Campus admins do investigations: drugs, fights, harassment, threats, general misconduct. The legal exposure is real (Title IX harassment, Title VI race-based discipline, due-process cases) but the typical tooling is a Word template emailed by a colleague. Investigator's Toolkit gives the admin a 10-section structured workflow per offense type, captures every step in the order due process requires, and outputs a single PDF that holds up under attorney review.

### Differentiation vs. competitors
- **Word templates floating around the district:** Free, but not maintained, not version-controlled, not legally vetted. The Toolkit is the maintained version.
- **Generic case-management software (Boost, IntakeQ):** Healthcare-focused, $200+/month, totally wrong for K-12 admin investigations.
- **District-issued investigation forms (TASB):** Often outdated, not workflow-driven, not branded for the buyer's voice.

### Pricing
Single-payment downloadable. (**Vera/Sage: confirm exact price with Kim before publishing — I don't have current pricing locked in memory; the recent direction was downloadable HTML on the apex site.**) No auto-renewal language. Buyer downloads, runs locally, owns it forever.

### Live status
Production. PWA, zero backend, IndexedDB-only. 13 pages, 10-section investigation workflow, 5 offense types: Drugs/Alcohol, Fighting/Assault, General Misconduct, Harassment/Bullying, Threats. Each offense type has its own template-driven workflow. Standalone repo: `jkculley-cyber/investigator-toolkit`.

### Defensible marketing claims
- 10 structured sections per investigation (incident → witness statements → evidence chain → due-process notice → rebuttal opportunity → finding → consequence → appeal path → documentation → closure)
- 5 offense types covered (the ones that actually drive K-12 litigation)
- Generates a single PDF you can hand to district counsel
- Zero data leaves your laptop (IndexedDB-only, no backend)
- TEC-cited correctly (CC10 sweep was specifically about catching the §32.158 / §37.0041 / §37.0052 fictional-citation problem in this product's templates — the version on sale has the corrected citations)

### Things NOT to claim
- Don't claim "legally bulletproof" — no template is. Claim "structured for your district counsel's review."
- Don't claim cross-district sharing or audit logging — this is single-user by design.
- Don't promise "always up-to-date with TEC changes" — buyer pays once, gets the version they bought; updates are buyer-initiated re-purchase or free re-download depending on terms (clarify with Kim).

### Marketing assets needed
1. **The "fragmented Word docs" landing page** — practitioner pain point, clean conversion to Buy
2. **Sample investigation PDF** (anonymized fight case) — the "show, don't tell" asset
3. **Offense-type-specific landing sections** — five small landing pages, one per offense type, each ranking on its own SEO terms
4. **Comparison vs. Word templates** — visual comparison, what's automated vs. manual
5. **Email sequence** — 5-touch onboarding for the buyer, walking through their first investigation
6. **TEPSA / TASSP conference flyer** — Texas principal organizations
7. **AP-audience LinkedIn cadence** — separate from Navigator's because the buyer overlap is partial (Toolkit buyers may not be ready for Navigator yet, and vice versa)

---

## CHANNEL & ASSET PRIORITIES (suggested division)

### Long-form / web copy / SEO (likely Vera)
- Per-product landing page rewrite (4 pages)
- Educational blog posts (TEC §103, FRE 803(6), SB 179, 10-day SPED rule, due-process documentation)
- Comparison matrices (4 — one per product)
- Sample-output PDFs (Hearing Packet, Crisis log, Investigation report, Demo video script refresh)

### Channel cadence / direct outreach (likely Sage)
- Email sequences (4 — district director, AP, counselor, principal/AP investigation buyer)
- LinkedIn 90-day cadence (Texas K-12 admin audience)
- Conference materials (TASB, TASA, TASSP, TASCA, TEPSA — five different events, different audiences)
- District cold outreach scripts
- Pilot conversion follow-up sequences

Coordinate so we don't double-pitch a buyer. A district director who's already reading Waypoint emails shouldn't get hit with Navigator and Beacon emails the same week.

---

## COMPLIANCE GOTCHAS (read before shipping any copy)

1. **TEC citation policy:** Verify every TEC reference. The fictional-section problem is real and one bad citation in a customer email kills credibility for life. Ask Archer if you're unsure.
2. **TpT distribution rule:** Toolkit is NOT on TpT. Beacon and Waypoint are not on TpT. Do not write "find us on Teachers Pay Teachers" copy.
3. **Domain rule:** No `*.pages.dev` URLs anywhere customer-facing.
4. **Personal email rule:** Never use Kim's personal email in any marketing material. Always `support@clearpathedgroup.com`.
5. **No-auto-renewal language:** Beacon and Toolkit must say "no auto-renewal." Mandatory.
6. **No FERPA / HIPAA misclaims:** Be precise. FERPA-conscious / FERPA-aware. Not "FERPA-certified" (that's not a thing).
7. **Adversarial audit numbers:** Use the exact verdicts, exact persona names, exact percentages. Don't round, don't paraphrase, don't aspirationalize. The credibility comes from the precision.
8. **Pre-pilot vs. live:** Waypoint is pre-pilot (no district contracts signed). Navigator and Beacon are live with real customers (Lincoln HS, Nicole Hill at Magnolia ISD respectively). Toolkit has individual buyers. Don't conflate.
9. **The receiving-party-login rule:** Whatever marketing you write for parent-portal mentions in Waypoint, never imply a parent has to create an account to receive a notification or sign anything. Magic-link only. Lost a real Apex customer (Bobby) over forced-login friction; same lesson applies to Waypoint's parent flow.

---

## POSITIONING COMPASS

If you're stuck on tone, three north stars:

1. **Practitioner first.** Every product was built by a sitting Texas principal for sitting Texas educators. The voice is "I have been in your office at 4 PM with a hearing tomorrow," not "we leverage AI to optimize compliance outcomes."
2. **Compliance is the wedge, time-back is the close.** Lead with the compliance pain (you don't get to skip it; the lawsuit is coming whether you have software or not). Close on the time savings (your AP gets her Tuesdays back).
3. **Adversarial-tested, not adversarially-marketed.** The audit trajectory is the proof. Use it. Don't bury it. Don't oversell it.

---

## DELIVERABLES & TIMING

Suggested first-week output:
1. **Four product landing pages** (or refresh of existing if pages already exist on `clearpathedgroup.com`)
2. **Four sales one-pagers** (PDF, 1 page each, conference-ready)
3. **One adversarial-audit credibility one-pager** (cross-product, shows the trajectory across Navigator + Beacon)
4. **One TEC §103 educational blog post** (anchor SEO content for Waypoint + Navigator)

Second week:
5. **Email sequences** (4)
6. **Comparison matrices** (4)
7. **Sample-output PDFs** (Hearing Packet, Crisis log, Investigation report)

Ship copy as Markdown + Google Doc links into `docs/handovers/` (or `docs/marketing/` if you want to start a new folder — coordinate with Archer first). Submit drafts before publishing to the live site.

When in doubt: `support@clearpathedgroup.com` for inbound, Archer for technical accuracy, Kim for buyer-voice authenticity.

— End of brief —
