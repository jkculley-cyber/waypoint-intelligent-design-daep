# Beacon — District Discovery Questions

**Purpose:** When Nicole (or any counselor) surfaces Beacon to district leadership, these are the questions whose answers will let us scope the build precisely instead of guessing. Each question has a "why it matters" line so the listener knows what they're listening for.

**Use:** Hand this to Nicole directly, or use it as your own conversation framework if the meeting routes to you. You don't need all six answers in a single conversation — even three of them sharpen the build plan significantly.

---

## The six questions

### 1. How many counselors does the district have?

**Why it matters:** Beacon's "district-of-one" model (single admin overseeing isolated counselor accounts) scales well to ~50 counselors. Caseload sharing across counselors becomes important above ~12 counselors at the same campus. Below 5 counselors, an individual-license model with shared invoice may actually be cleaner than building district plumbing.

**What to listen for:** Counselor headcount, distribution across campuses (1 per campus or several at large campuses), turnover rate.

---

### 2. Do they want one admin viewing all counselors, or peer-level caseload sharing?

**Why it matters:** This is the single biggest scope fork.

- **Admin oversight only** = Path A, ~4 weeks to pilot. District admin sees aggregate stats per counselor (caseload size, time-tracking compliance, CREST status) but cannot read individual student records. Each counselor stays RLS-isolated.
- **Caseload sharing** = Path B, ~6–8 weeks to pilot. Counselor A can pick up Counselor B's student when she's out. Requires real RLS rework.

**What to listen for:** Phrases like "I want to see what each counselor is doing" (Path A) vs. "we cover for each other when someone's out" or "we co-lead groups" (Path B).

---

### 3. What's their existing single sign-on?

**Why it matters:** SSO build effort is wildly different by provider.

- Google Workspace or Microsoft 365 → ~1 day each in Supabase OAuth.
- Clever or ClassLink → 2–4 weeks per provider, includes provisioning agreements with the vendor.
- Custom SAML / Okta / proprietary identity → custom integration, scope on case-by-case.

**What to listen for:** "We're a Google district" / "Microsoft 365" / "everyone signs in through Clever."

---

### 4. Do they need student rostering pulled from a SIS automatically?

**Why it matters:** Determines whether Clever / ClassLink / OneRoster integration is required for go-live, or whether Beacon can manage its own student list (current behavior).

- Manual student entry is fine → no rostering build needed (faster).
- "We need our SIS roster to flow into Beacon" → Clever/ClassLink/OneRoster integration becomes a hard prerequisite, +2–4 weeks.

**What to listen for:** "We use Skyward / Frontline / Infinite Campus" + whether the district expects Beacon to read those rosters automatically.

---

### 5. Who owns the DPA decision — superintendent, CIO, legal, or all three?

**Why it matters:** Determines who sees the DPA template and what it needs to address.

- Superintendent only → faster cycle, less technical scrutiny, fewer addenda.
- CIO involvement → expect questions about encryption, audit logging, SOC 2, data residency.
- Legal involvement → expect specific TX-NDPA language, BAA-style addenda, breach notification SLAs.

**What to listen for:** "Our CIO will need to review" / "we'd send this to legal" / "the super signs off on these."

---

### 6. What's their renewal/budget cycle?

**Why it matters:** Tells us the contract close window. Most Texas districts run on a fiscal year starting July 1, with budget decisions made in March–May. A district that says "we'd want this for fall" has a hard date; a district that says "we'd evaluate next year" has a 6–9 month window.

**What to listen for:** "Fall semester" / "next budget cycle" / "we'd start with one campus this spring."

---

## Bonus signal questions (if conversation flows)

- **Existing counselor software:** "What do counselors use today for caseload tracking?" — tells you the displacement story (Replacement of CountSel / Naviance / spreadsheets / nothing).
- **80/20 SB 179 compliance pressure:** "Is your district under any TEA scrutiny on counselor time allocation?" — Beacon's biggest differentiator for Texas districts.
- **CREST award participation:** "Are any of your counselors pursuing CREST recognition?" — Beacon's portfolio rollup is unique here.
- **Crisis workflow gap:** "How does your district document parent contact during a student crisis right now?" — Beacon's due-process documentation is the strongest legal-defensibility story.

---

## What you do NOT need to commit in this conversation

- Pricing — say "we have published per-counselor pricing; for district volume we'd structure a per-seat agreement on the back of your DPA review."
- Timeline — say "with your DPA in hand we'd be 4–6 weeks to a pilot launch, depending on what your roster integration needs."
- Custom features — say "let me take that back and confirm scope before promising anything."

The goal of the discovery conversation is **information capture**, not deal-closing. Better to leave with six clear answers and a follow-up commitment than with a verbal handshake on misaligned expectations.

---

## After the conversation

Bring the answers back to a Beacon work session and we'll either:
1. Execute the Path A pull plan as written (`docs/beacon/path-a-pull-plan.md`), or
2. Re-spike the audit if the answers point to Path B / SIS rostering / SSO complications.

Either way, six answers cuts speculation work to near-zero.
