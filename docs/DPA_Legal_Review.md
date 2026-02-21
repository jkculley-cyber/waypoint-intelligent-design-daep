# DPA Legal Review Memo
**Document Reviewed:** District_DPA_Template.md
**Reviewed Against:** FERPA (34 C.F.R. Part 99), Texas Education Code § 32.151-32.158, Texas B&C Code § 521.053 (as amended by SB 768, eff. Sept. 1, 2023)
**Date:** February 2026

> ⚠️ This is a compliance and gap analysis, not legal advice. All flagged items should be confirmed with qualified Texas education law counsel before execution.

---

## Summary

The DPA provides a solid foundation covering FERPA school-official designation, data use restrictions, security minimums, subprocessor disclosure, breach notification, and data deletion. However, **12 issues** require correction or addition before the document is ready to sign. Three are critical regulatory gaps; the rest are missing standard commercial contract provisions or unresolved placeholders.

**Critical (must fix before any district signs):**
1. TEC § 32.151-32.158 not referenced — statutory compliance gap
2. Deletion timeline conflict — 90 days exceeds TEC § 32.154's 60-day maximum
3. AG breach notification missing — required by Texas B&C Code § 521.053 when 250+ residents affected

**Significant (fix before broad rollout):**
4. Indemnification — missing entirely
5. Limitation of liability — missing entirely
6. Notices provision — missing (no legal notice address/method)

**Standard (fix for professional-grade document):**
7. Insurance requirements — missing
8. Assignment clause — missing
9. Force majeure — missing
10. Termination for convenience — missing
11. Subpoena/law enforcement response provision — missing
12. Uploaded document files not covered by Article 8

**Drafting issues / placeholders remaining:**
13. Header still reads "Waypoint Behavioral Solutions" — not updated
14. Vendor address contains `[State]` placeholder
15. `[County]` placeholder in governing law clause
16. Article 11.2 termination language is internally contradictory

---

## Finding 1 — CRITICAL: Texas Education Code § 32.151-32.158 Not Referenced

**Article(s) affected:** Article 1, Article 3

**Issue:** Texas TEC § 32.151-32.158 (Student Privacy Protection Act) imposes specific obligations on "operators" of online educational platforms. Waypoint/Clear Path qualifies as an "Operator" under § 32.151. The statute:
- Defines "Covered Information" broadly (§ 32.151) — includes discipline records, special education data, behavioral records, identifiers, and more
- Prohibits targeted advertising, non-school-purpose profile building, and sale of covered information (§ 32.152)
- Requires "reasonable security procedures and practices" (§ 32.153)
- **Requires deletion of Covered Information within 60 days of district request** (§ 32.154)

The DPA's Article 3 already aligns substantively with § 32.152 prohibitions, but the statute is not cited and the term "Covered Information" (a defined Texas law term) is not used. A district's legal counsel reviewing this DPA will immediately ask why TEC § 32.151-32.158 is absent.

**Resolution applied in DPA:** Added Article 1.6 defining "Covered Information" per TEC § 32.151; added Article 2.4 designating Vendor as an Operator; added TEC § 32.151-32.158 compliance obligation to Article 3.4.

---

## Finding 2 — CRITICAL: Deletion Timeline Conflicts with TEC § 32.154

**Article(s) affected:** Article 8.3

**Issue:** Article 8.3 allows Vendor 90 days from production deletion for backup deletion, and Article 8.2 gives Vendor 30 days to provide a data export after request. The cumulative timeline for a deletion request could reach 120+ days. TEC § 32.154 requires deletion of Covered Information **not later than 60 days** after the district requests it.

**Resolution applied in DPA:** Article 8.3 revised to require production deletion within 60 days of district deletion request, with backup deletion following within 30 days thereafter (total maximum: 90 days, with production systems compliant within the 60-day statutory window).

---

## Finding 3 — CRITICAL: Attorney General Breach Notification Missing

**Article(s) affected:** Article 6

**Issue:** Texas B&C Code § 521.053 (as amended by SB 768, effective September 1, 2023) requires that when a breach affects **250 or more Texas residents**, the breached party must notify the Texas Attorney General **as soon as practicable and not later than 30 days** after determining the breach occurred. The notification must be submitted via the AG's online form and is posted publicly on the AG's website. The DPA's Article 6 does not mention this obligation.

Additionally: individual resident notification under Texas law is required within **60 days** (not 72 hours). The DPA's 72-hour vendor-to-district notification window is fine contractually, but the 72-hour figure should not be conflated with the statutory 60-day individual notification deadline.

**Resolution applied in DPA:** Article 6.1(e) added requiring Vendor to notify the Texas AG within 30 days when 250+ Texas residents are affected; Article 6.4 added clarifying the 60-day statutory window for individual notification (separate from the contractual 72-hour vendor-to-district window).

---

## Finding 4 — SIGNIFICANT: Indemnification Missing

**Article(s) affected:** None — provision entirely absent

**Issue:** The DPA has no indemnification clause. Without it, if Vendor causes a data breach due to negligence or willful misconduct, the District's only contractual remedy is termination. Districts universally expect vendors to indemnify them for losses arising from the vendor's breach of the agreement.

**Resolution needed (requires legal drafting):** Add an Article 13 covering:
- Vendor indemnification of District for losses arising from Vendor's breach of this Agreement, Vendor's negligence, or Vendor's willful misconduct
- District indemnification of Vendor for losses arising from District's misuse of the platform or breach of this Agreement
- Mutual indemnification for third-party IP claims
- Procedural requirements (notice of claim, cooperation, control of defense)

Placeholder language has been added to the DPA. Have counsel draft the substantive indemnification terms, including any caps tied to deal value.

---

## Finding 5 — SIGNIFICANT: Limitation of Liability Missing

**Article(s) affected:** None — provision entirely absent

**Issue:** No limitation of liability clause means Clear Path Education Group, LLC faces unlimited contractual exposure in a breach scenario. Standard SaaS vendor agreements cap liability at 1-3x the annual contract value for general claims, with carve-outs for indemnification obligations and willful misconduct.

**Resolution needed (requires legal drafting):** Add to Article 13 (or as new Article 14). Counsel should determine appropriate cap given deal size and cyber insurance coverage.

---

## Finding 6 — SIGNIFICANT: Notices Provision Missing

**Article(s) affected:** Article 12 — provision entirely absent

**Issue:** The DPA has no provision specifying how formal legal notices (breach notifications, termination notices, audit requests) must be delivered, to whom, and at what address. Without this, a party could claim they never received a notice.

**Resolution applied in DPA:** Article 12.9 added requiring written notice by certified mail or overnight courier to the addresses in the signature block, or by email with confirmation of receipt for operational notices.

---

## Finding 7 — STANDARD: Insurance Requirements Missing

**Article(s) affected:** None — provision entirely absent

**Issue:** Many Texas district procurement policies require vendors handling student data to carry minimum levels of cyber liability insurance and errors & omissions (E&O) insurance. Without this clause, districts may reject the DPA or require redline before procurement approval.

**Recommendation:** Add Article 4.5 requiring Vendor to maintain, at minimum:
- Cyber liability insurance: $1,000,000 per occurrence / $2,000,000 aggregate
- Commercial general liability: $1,000,000 per occurrence
- E&O / professional liability: $1,000,000 per occurrence

Adjust limits based on district size and risk. Counsel to confirm appropriate amounts. Placeholder added to DPA.

---

## Finding 8 — STANDARD: Assignment Clause Missing

**Article(s) affected:** Article 12

**Issue:** No provision addresses whether either Party may assign the Agreement. If Clear Path Education Group, LLC is acquired, the acquirer would step into the DPA with no district consent. Districts should have the right to approve or terminate if Vendor is acquired by a competitor or entity with incompatible data practices.

**Resolution applied in DPA:** Article 12.10 added: Vendor may not assign without District's prior written consent, except that Vendor may assign to an acquirer who assumes all obligations under this Agreement and provides written notice to District within 30 days.

---

## Finding 9 — STANDARD: Force Majeure Missing

**Article(s) affected:** Article 12

**Issue:** No provision addresses performance failures due to events outside the Parties' control (natural disasters, government orders, pandemic, infrastructure failures). Without it, Vendor could be in breach for circumstances entirely outside its control.

**Resolution applied in DPA:** Article 12.11 added with standard force majeure language excluding payment obligations.

---

## Finding 10 — STANDARD: Termination for Convenience Missing

**Article(s) affected:** Article 11

**Issue:** Article 11.2 only allows termination for material breach. There is no termination for convenience provision. If a district simply outgrows the platform, needs to switch vendors, or loses funding, they have no contractual mechanism to exit without a breach allegation.

**Resolution applied in DPA:** Article 11.4 added: Either Party may terminate for convenience upon 60 days written notice, subject to data return obligations in Article 8.

---

## Finding 11 — STANDARD: Subpoena / Law Enforcement Response Missing

**Article(s) affected:** None

**Issue:** No provision addresses what Vendor must do if it receives a government subpoena, court order, or law enforcement request for student records. FERPA allows disclosure in response to lawfully issued subpoenas (34 C.F.R. § 99.31(a)(9)) but requires the school to be notified in advance if feasible. Districts need assurance Vendor will notify them before complying.

**Resolution applied in DPA:** Article 3.5 added: Vendor shall notify District prior to disclosing Student Data in response to legal process, to the extent permitted by law, and shall disclose only the minimum data required.

---

## Finding 12 — STANDARD: Uploaded Documents Not Covered by Article 8

**Article(s) affected:** Article 8.2

**Issue:** Article 8.2 specifies data export in "CSV and/or JSON" format. Waypoint also stores uploaded files (incident documents, compliance attachments) in object storage (Supabase Storage/S3). These binary files cannot be exported as CSV/JSON. Article 8 does not address how uploaded documents are returned or deleted.

**Resolution applied in DPA:** Article 8.2 expanded to include: uploaded document files returned as a ZIP archive containing original file formats, in addition to tabular data in CSV/JSON.

---

## Drafting Issues / Remaining Placeholders

**13. Header typo — "Waypoint Behavioral Solutions"**
The document header (line 8) still reads "Between [District Name] and Waypoint Behavioral Solutions." This was not updated when the entity name was changed. Fixed directly in DPA.

**14. Vendor address — `[State]` placeholder**
The Vendor address block reads "located at [Address], [City], [State] [ZIP]." Should read "Texas" for the state. Fixed directly in DPA.

**15. `[County]` in governing law clause**
Article 12.1 has an unresolved `[County]` placeholder. Needs to be the county where Clear Path Education Group, LLC is registered or operates. Fixed with placeholder note.

**16. Article 11.2 — Contradictory termination language**
Current text: "Either Party may terminate this Agreement *immediately* upon written notice if the other Party materially breaches this Agreement and *fails to cure such breach within thirty (30) days* of written notice." This is contradictory — it cannot terminate both "immediately" and "after 30 days." Fixed directly in DPA.

---

## Items Requiring Legal Counsel Input (Not Applied)

The following items require substantive legal drafting and have been added as placeholders only:

| Item | Where | Notes |
|------|-------|-------|
| Indemnification terms | Article 13 | Scope, caps, carve-outs, defense rights |
| Limitation of liability cap | Article 13 | Amount tied to deal value; mutual vs. one-way |
| Insurance minimum amounts | Article 4.5 | Adjust by district size; confirm with broker |
| Governing law county | Article 12.1 | Fill in Clear Path's operating county |
| ESSER/state funds language | Article 12 | If districts pay with federal/state funds, additional certifications may be required |

---

*Sources: [Texas Ed. Code § 32.151](https://law.justia.com/codes/texas/education-code/title-2/subtitle-f/chapter-32/subchapter-d/section-32-151/), [TEC § 32.152 Prohibited Uses](https://texas.public.law/statutes/tex._educ._code_section_32.152), [Texas B&C Code § 521.053](https://codes.findlaw.com/tx/business-and-commerce-code/bus-com-sect-521-053/), [SB 768 AG notification amendment](https://www.dwt.com/blogs/privacy--security-law-blog/2023/06/texas-data-breach-notification-law-update), [StudentDPA Texas Overview](https://studentdpa.com/blog/texas-student-data-privacy-laws-10262025)*
