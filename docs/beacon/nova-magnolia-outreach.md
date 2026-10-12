# Nova — Magnolia ISD Outreach Kit (DRAFT)

**Session:** Nova (CRO), 2026-10-12
**Goal:** Turn Nicole Hill's enthusiasm into (1) a usable testimonial, (2) a warm intro to the Magnolia ISD decision-maker who asked about secondary, and (3) 2–3 counselor referrals.
**Status:** Draft for Kim's review. Nothing has been sent.

---

## 0. Blocker: fix before any district conversation

`clearpath-site/beacon-product.html` → "What district adoption includes" promises things that **are not built or not true today**:

| Public claim | Reality (per repo) |
|---|---|
| "Texas-NDPA v1r6 on file — pre-cleared with district legal review" | The TX-NDPA prep package was drafted in CC10 and **held uncommitted pending vendor info**. Nothing has been signed or cleared. |
| "Role separation: counselor / director / principal views" | Not built. District plumbing (Path A) has been **parked as demand-pull since CC10**, and cloud mode is hard-disabled (CC31). |
| "District rollup dashboards: SB 179 compliance, SB 11 crisis response, cross-campus comparisons" | Only `/district-preview` exists, and it runs on **sample data** as a sales demo. There is no live rollup. |
| Page title/hero: "Elementary Counselor Command Center" | Secondary (6–8, 9–12, combined) shipped in CC43, and secondary is **exactly what Magnolia asked about**. |

**Why this matters now:** the first thing a director does after Nicole's intro is open this page. If the district asks for "the NDPA you have on file" or "the director view," we can't deliver either. That loses the deal, and it puts Nicole's credibility on the line with her own district.

**Recommended fix (Sage + Archer, ~30 min):** rewrite the list as *Available now* vs. *Built with your district*. Correct the NDPA line to "We will execute the Texas Student Privacy Alliance NDPA (v1r6) with your district" (and only if Kim is ready to sign it). Retitle to cover K–12.

---

## 1. Message to Nicole (text or email; send this first)

> Hi Nicole! Thank you for everything you've sent us this fall. Every fix in Beacon this semester came straight from you, and it shows.
>
> Two small asks, and no pressure on either:
>
> **1. Would you write 2–3 sentences about Beacon that we could share with other counselors?** Whatever's true for you. If it helps, what was tracking your time (or your 80/20) like before Beacon, and what's it like now? We'd use your name, title, and Magnolia ISD unless you'd rather we didn't. I'll send you the exact wording before anything goes public.
>
> **2. You mentioned your district was interested in a secondary version.** That's built and live now (middle, high, and 6–12 campuses, including a college/career advising log). Who was the person asking? If you're comfortable connecting us, I'd love a 20-minute conversation with them. Mostly so I can listen to what the district actually needs.
>
> And if any counselor friends would get value from Beacon, I'm happy to give them an extended trial.
>
> Thank you, truly. You've shaped this product.
> — Kim

**Coach notes:**
- Two asks, max. Don't add a survey, a case-study interview, or a logo request yet. Each extra ask lowers the odds of getting any of them.
- Hold the "extended trial" offer until Kim decides how long it is (see §4). The standard trial is 14 days.
- Get **written permission** for the name/title/district before any testimonial is published. Some districts restrict employees from endorsing vendors. Ask Nicole whether hers does.

---

## 2. The district intro call (20 min, Kim leads)

Use `docs/beacon/district-discovery-questions.md` as written. It's good. Three adjustments for this call:

1. **Open with what *they* asked about (secondary), not with pricing.** "Nicole said the district was interested in a secondary version. What prompted that?"
2. **Questions 1, 2 and 5 matter most** (counselor headcount, oversight vs. sharing, who owns the DPA). Those three alone tell us whether this is a simple multi-seat purchase or a build.
3. **The simplest yes is available today:** N counselor licenses at $79 each, one invoice, each counselor running Beacon on their own device. No build, no cloud, no SSO. If the director doesn't need a live rollup on day one, **offer this first**.

**Do not commit** to the director dashboard, SSO, rostering, or a timeline on this call. "Let me confirm scope and come back to you within the week."

---

## 3. One-page proposal (send *after* the discovery call, filled in with their answers)

> ### Beacon for Magnolia ISD Counselors
> **Prepared for:** [Name, Title], Magnolia ISD · **From:** Clear Path Education Group, LLC · **Date:** [ ]
>
> **What you told us:** [1–2 lines in their words, from discovery: e.g. secondary counselors need a way to document SB 179 time without double entry.]
>
> **What Beacon does today** (live, in use at Magnolia ISD by Nicole Hill):
> - Tracks direct vs. indirect counseling time against the SB 179 80/20 standard, with an auto-calculated gauge and an exportable report
> - Imports a counselor's existing Google Calendar, including recurring events, so their schedule becomes their compliance record
> - Caseload, individual/group/whole-class sessions, small-group attendance and progress
> - Crisis documentation workflows with auto-scheduled follow-ups (24 hours / 72 hours / 1 week)
> - Elementary, middle, high, and combined 6–12 campuses, with a college/career advising log for secondary
> - Student data stays on the counselor's device (no cloud storage of student records)
>
> **Proposed pilot:** [N] counselors at [campus(es)], [start] through [end, e.g. 90 days].
>
> **Success measures (agreed up front):**
> 1. Each pilot counselor can produce a current SB 179 time report on request, every week of the pilot
> 2. Crisis follow-ups logged on time for every crisis entry
> 3. Counselor-reported time spent on documentation, before vs. after (short survey at week 1 and week 12)
> 4. [A measure the district names in discovery]
>
> **Investment:** $79 per counselor per year. One annual invoice. [N] counselors = $[N×79]. Pilot terms: [DECISION NEEDED, see §4].
>
> **Data privacy:** [Only after the product page is fixed and Kim has decided on NDPA execution:] Clear Path will execute the Texas Student Privacy Alliance NDPA with Magnolia ISD.
>
> **Next step:** [One concrete action with a date.]

**Rules for this one-pager:**
- Every bullet under "What Beacon does today" must be live. Archer should spot-check before sending.
- **No director dashboard / role separation / district rollup** unless Archer has scoped and committed to it after discovery. If the district requires it, it becomes a separate, dated line: "Director oversight view: [scope], available [date]."
- No TEC/TAC citations beyond SB 179 without Archer verification.
- No claims about Magnolia ISD (enrollment, counselor count, initiatives) we didn't hear from them directly.

---

## 4. Decisions Kim needs to make (Nova recommendations)

| # | Decision | Nova recommends | Why |
|---|---|---|---|
| D1 | Fix the product-page overclaims before the intro? | **Yes, first.** | See §0. This is the only item that can actively lose the deal. |
| D2 | Pilot pricing | **Paid from day one at $79/seat**, with a 60-day "no questions" refund. | At $79, a free pilot saves the district almost nothing and trains them to expect free. Paying gives you a real reference customer. If Kim prefers a free pilot, cap it (e.g. ≤5 counselors, 60 days) and log it in DECISIONS.md before quoting. |
| D3 | NDPA: execute TX-NDPA v1r6 now? | **Yes, if a district asks.** Finish the CC10 prep package (vendor info is the only gap). | It's the real Texas procurement gate at this price point (CC10 audit). Without it, a director who wants to say yes can't. |
| D4 | Build the director view (Path A, ~4 weeks) speculatively? | **No.** Keep it demand-pull. | Only build it if discovery shows the district needs live oversight *to buy*. The multi-seat local-mode purchase may be enough. |
| D5 | Counselor-referral trial length | **30 days** for Nicole's referrals (vs. 14 standard). | Small cost, rewards the referrer, and is easy to track. Log it if adopted. |

---

## 5. Pipeline entry (for the ops command center, Districts & Contracts)

- **District:** Magnolia ISD
- **Stage:** Prospect (warm, internal champion)
- **Champion:** Nicole Hill (counselor, active paying Beacon user)
- **Decision-maker:** unknown (ask Nicole)
- **Product:** Beacon (secondary interest)
- **Next action:** Fix product page (D1) → send Nicole message (§1) → book discovery call
- **Stall flag:** If there's no intro within 30 days of sending §1, follow up once with Nicole, then re-plan.
