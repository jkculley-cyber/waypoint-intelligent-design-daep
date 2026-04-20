# Vera — Beacon User Guide Brief
**Date:** 2026-04-20
**Author:** Archer (CTO)
**Owner on pickup:** Vera (COO / documentation)
**Deliverable:** Rewrite `clearpath-beacon/docs/user-guide-beacon.md` (existing file is stale)

---

## Context

Beacon has shipped features that most elementary-counselor tools don't have — and a few marketing claims that aren't actually backed by code. The current `user-guide-beacon.md` was written before features ship-stabilized and in places it promises things the app doesn't do. Kim has also flagged a real weakness in the store/email flow: new counselors bought Beacon without ever getting a structured "here's how to get started in 5 minutes" document. We want to fix both problems at once.

We also want to **name our differentiation honestly**. SCUTA dominates the mindshare in school-counselor circles. CountSel is the TX 80/20 time-tracker shipped through ESC Region 12. Beacon beats both on specific, verifiable points — but those points have to be stated accurately or we lose credibility with a skeptical audience (counselors who've been burned by over-promising edtech).

---

## What Vera is producing

One document, two sections, written for a solo elementary school counselor in Texas who just received her license key.

- **`user-guide-beacon.md`** in the `clearpath-beacon/docs/` directory (replace the existing file)
- Max length: 2,500 words total
- Plain markdown, no emoji (per house style)
- Opens with a 10-minute Quick Start. Then the in-depth section goes deeper by feature area.

---

## Required structure

### Part 1 — Quick Start (≈400–500 words)

Assume the reader has her license key in hand and wants to be logging sessions today. Walk her through, in order:

1. Open Beacon (URL: `https://clearpath-beacon.pages.dev`)
2. Local Mode Setup — pick Local Mode (default), enter name, campus, district, school year start/end
3. Paste license key (format `BCN-XXXXXX-XXXX`), click Start
4. Add 1 student (Students → Add; name, grade, teacher, MTSS tier)
5. Log 1 session on that student (Quick Log from Dashboard; pick domain — this is what feeds the SB 179 meter)
6. Check the Dashboard — the SB 179 80/20 meter now shows her direct % based on that one entry
7. Point her at Settings → Backup to show she owns her data as a file

The Quick Start should end with a single sentence of encouragement and a pointer to Part 2 for feature depth. No upsells, no "when you upgrade to…" — she already bought.

### Part 2 — In-Depth Guide (≈1,600–1,800 words)

One subsection per feature area. Cover these, in this order:

1. **Data modes — Local vs Cloud.** Local is the default and stores everything in her browser's IndexedDB. Cloud mode is dormant (not yet built — DO NOT document a Cloud signup flow, it does not exist). Emphasize the privacy story: student data never leaves her computer in Local mode.
2. **Students and caseload.** Add individually or CSV bulk import. MTSS tier tagging (1/2/3). Profile with session history, referral history, timeline view, counselor notes, student goals, needs assessment.
3. **Referrals.** Manual entry + CSV import. Workflow: Open → In Progress → Closed. Include a public-facing referral form if present in the shipped build (Explore report says it's there — Vera should verify in the app before documenting).
4. **Groups.** Create a group, add students, log group sessions, track attendance per student, progress ratings 1–3. Group Starter Kits (5 pre-made: anxiety, friendship, grief, behavior, social skills) with auto-generated lesson plans. Completion tracking.
5. **Sessions + Time Logging (SB 179).** Log individual or group session with domain tagging (guidance / planning / responsive / system / non-counseling). The Dashboard compliance meter recalculates in real time. **Calendar import is the feature to spotlight here** — upload an `.ics` export from Google Calendar or Outlook, Beacon parses events and classifies them by keyword into the correct SB 179 domain. This is the single biggest time-saver in the app.
6. **Lessons Library (35 bundled).** Academic / social-emotional / career. K–5. Each lesson has objective, materials, minute-by-minute activities, assessment notes. Lessons can be attached to session logs so the counselor has a record of which lesson she delivered. Includes an SB 179 documentation template.
7. **Communication Templates (14 EN + 14 ES = 28 total).** Parent notifications, progress updates, crisis follow-up, MTSS tier change, end-of-year summary, friendship concerns, etc. Mustache-style placeholders (`{{student_name}}`, `{{progress_notes}}`). Edit, copy to clipboard. **Do not document the "AI Generate" button.** The edge function behind it is not deployed. It currently shows an error. (Flag: we should hide the button until the backend ships — tracked separately.)
8. **Reports and PDF Export.** Key metrics card, tier distribution pie, sessions-over-time line, domain breakdown bar, referral pipeline, group utilization, compliance %. Date range presets (month/semester/year/custom). PDF export for sharing with principal / admin as SB 179 proof-of-compliance.
9. **Settings.** Profile, school year dates, alert threshold (default 80%), schedule blocks (weekly recurring blocks tagged direct/indirect), license management, calendar import, **Backup/Restore** (JSON file download/upload — her data is portable), **School Year Transition** (batch promote grades K→1, 1→2, etc. and archive old groups at summer), **Share Beacon / Impact Summary PDF** (caseload stats she can share with principal).
10. **License lifecycle.** Active / trial / expired states. Soft gate: if license expires, she can still view and edit existing records but can't create new ones. 5-min online check, 7-day offline grace. How to extend: send another Zelle, Kim updates `expires_at`, no new key needed.

### Part 3 — What Beacon doesn't do (≈150 words)

Short, honest section at the end. Lists things a counselor might expect that Beacon does NOT do yet, so she doesn't waste time hunting for them:

- No Cloud mode / multi-counselor sync (local only today)
- No email send from within the app (templates are copy/paste)
- No Google Forms → Beacon live pipeline (CSV import only)
- No automatic parent email delivery
- No mobile-native app (PWA only — but it installs on iOS/Android home screens)

This section is a trust-builder. It tells the counselor we're not overselling.

---

## Differentiation angle — use these framings verbatim or adapt

All five statements below have been verified against vendor-published materials. Citations are in the research dossier (see "Source Material" at the bottom of this brief). Vera may quote these directly in the guide's intro paragraph and/or on the clearpathedgroup.com Beacon product page.

1. **Beacon is the only counselor platform where an individual counselor can buy, install, and run the product without her district ever having to sign a contract.** Student data lives in her browser by default, not in a vendor's cloud. CountSel requires a superintendent contract with ESC Region 12. SCUTA is sold through Z Labs Inc. with a Sole Source procurement packet. Beacon's IndexedDB-first architecture means no DPA is required for a single-counselor purchase.

2. **Beacon is priced for the counselor paying out of pocket.** $79/year or $8/month. SCUTA Pro is $225/year. SCUTA Max is $295/year. CountSel is $150/year. Beacon at $79 includes the Lessons library, Outcome Goals, and Needs Assessment — three features SCUTA locks behind its Max tier.

3. **Beacon is built around Texas SB 179's 80/20 rule at the elementary level.** SCUTA tracks time against the ASCA national model and makes no reference to SB 179. CountSel is framed around SB 179 but is a time-tracker only — no referrals, no caseload, no session notes, no groups, no lesson library.

4. **Beacon works offline.** It's a Progressive Web App with a service worker. SCUTA is browser-only and requires internet access to log an event. For a counselor who spends her day in hallways, cafeterias, and portables with spotty Wi-Fi, that difference matters.

5. **If a Beacon counselor changes districts, her data goes with her as a file.** If a SCUTA or CountSel counselor changes districts, her historical caseload data stays with the previous district's vendor subscription. Beacon gives her a JSON backup/restore she can carry.

**Tone note:** These are differentiation claims, not trash-talk. Name SCUTA and CountSel respectfully — they're good tools with real customers. We're not better at everything; we're better at specific things that matter to a specific user (Texas elementary counselor paying out of pocket, or a small district without procurement overhead). Don't overreach.

---

## Things to AVOID saying (features that don't exist yet)

These will damage credibility if documented as real:

| Don't say | Because |
|---|---|
| "AI-generated parent updates" | Edge function is not deployed; UI falls back to an error message |
| "Google Forms integration for referrals" | CSV import only — no Apps Script, no OAuth, no Sheets sync |
| "Cloud mode with multi-counselor sync" | Cloud signup flow is not implemented |
| "Scheduled email delivery of templates" | Templates are copy-paste; no sending |
| "32 bundled lessons" | It's 35, not 32 — old count |
| "14 communication templates" | 28 total (14 EN + 14 ES) — say "14 scenarios, each in English and Spanish" |

When in doubt, Vera should open the app at `https://clearpath-beacon.pages.dev` and verify. If it's not in the app, it's not in the guide.

---

## Style rules

- Plain language. Eighth-grade reading level. No jargon unless defined on first use (ASCA, MTSS, SB 179 — all need a one-sentence definition).
- No emoji.
- No exclamation marks except the very last sentence of Quick Start.
- Second person ("you"), conversational.
- Short paragraphs — 2–3 sentences.
- Code blocks only for the license key format and file paths. Otherwise prose.
- Texas-first framing (SB 179, TEC, Texas Model) — not ASCA-first. This is the audience.

---

## Deliverable placement + review path

1. Vera drafts to `clearpath-beacon/docs/user-guide-beacon.md` (overwrite existing).
2. Vera commits with message: `docs(beacon): rewrite user guide — quick start + in-depth + differentiation`
3. Tag Archer for review before pushing. Specifically verify:
   - No aspirational features claimed as real
   - All competitor claims match the research dossier below
   - Feature counts (35 lessons, 28 templates) are correct
4. On approval, push to main. No deploy impact (docs folder, not hosted).

---

## Source material

- **Beacon feature catalog** (code-verified 2026-04-20) — available in this session's conversation transcript. Key finding: 14 feature areas shipped, 6 aspirational claims in the old user guide must be removed.
- **Competitor research dossier** (2026-04-20) — SCUTA, CountSel, EZAnalyze, Google Forms DIY. Pricing, compliance posture, feature scope. Sources: SCUTA's 2025-26 Features & Pricing PDF, ESC Region 12 CountSel Subscription flyer, Confident Counselors SCUTA review. Full citations in the transcript.
- **Existing docs** Vera should read before starting:
  - `clearpath-beacon/docs/user-guide-beacon.md` (current stale version — what we're replacing)
  - `clearpath-beacon/docs/license-operations-guide.md` (Customer Getting Started section, lines 150–194, has correct getting-started language already)
  - `clearpath-beacon/docs/beacon-trial-nudge-sequence.md` (voice and tone reference — Kim's voice)
  - `clearpath-beacon/docs/beacon-welcome-email.md` (Quick-Start content already pulled into the welcome email — guide should be consistent with what customers just read)

---

## Time estimate

- First draft: 2–3 hours
- Archer review + revision: 30 min
- Commit + merge: 5 min

Ship target: 2026-04-25 (Friday).
