# Waypoint — Terminology Guide

## TEA / TEC Acronyms (Use Correctly)

| Acronym | Full Term | Usage Notes |
|---------|-----------|-------------|
| DAEP | Disciplinary Alternative Education Program | Texas-specific. Always spell out on first use in any document. |
| JJAEP | Juvenile Justice Alternative Education Program | For students with criminal involvement. More restrictive than DAEP. |
| ARD | Admission, Review, and Dismissal | The committee that makes placement decisions for SPED students |
| MDR | Manifestation Determination Review | Must occur within 10 school days of discipline decision for SPED/504 students |
| BIP | Behavioral Intervention Plan | Required when FBA is conducted; supports the student, not just a punishment plan |
| FBA | Functional Behavioral Assessment | Determines the function (why) behind problem behavior |
| PEIMS | Public Education Information Management System | Texas state data reporting to TEA |
| TEC | Texas Education Code | The law. Chapter 37 governs discipline. Never cite a section without verifying. |
| IDEA | Individuals with Disabilities Education Act | Federal law governing SPED. Trumps TEC when in conflict. |
| FAPE | Free Appropriate Public Education | Must be provided even during DAEP placement for SPED students |
| LRE | Least Restrictive Environment | SPED principle — DAEP placement must consider this |
| IEP | Individualized Education Program | The written plan for a SPED student's services and goals |
| 504 | Section 504 of the Rehabilitation Act | Separate from IDEA; covers students with disabilities who don't qualify for SPED |
| TEA | Texas Education Agency | The state agency. They audit. Districts need to be audit-ready. |
| ESC | Education Service Center | Regional support centers for districts; potential channel partners |
| CICO | Check-In Check-Out | A Tier 2 behavioral intervention strategy; tracked in transition plan reviews |
| MTSS | Multi-Tiered System of Supports | Framework for academic and behavioral interventions (Tiers 1-3) |
| OSS | Out-of-School Suspension | Consequence type; tracked in incidents |
| ISS | In-School Suspension | Consequence type; 3+ in 30 days triggers a yellow alert |

---

## Language Rules

### Use These Terms
- **"Placement"** — when a student is assigned to DAEP (not "sentencing" or "sending to DAEP")
- **"Referral"** — the disciplinary action that initiates a DAEP placement process
- **"Intervention"** — a structured support provided to a student (not "punishment")
- **"Compliance checklist"** — the SPED/504 compliance workflow in Waypoint
- **"Behavioral support plan"** — emphasizes helping, not punishing
- **"Transition plan"** — the student's plan for returning to their home campus
- **"Student-centered"** — Waypoint supports students through the process, not just tracks violations
- **"Compliance-driven"** — positions districts as proactive, not reactive

### Avoid These Terms
- **"Zero tolerance"** — politically charged; associated with discriminatory outcomes; not our positioning
- **"Punishment tracking"** — frames the product negatively
- **"Surveillance"** — especially for parent portal and kiosk features
- **"Discipline software"** alone — always pair with "compliance" or "management"
- **"Sending a kid to DAEP"** — use "DAEP placement" or "referral to DAEP"
- Any TEC section number not verified against the actual code

---

## Laserfiche-Specific Terms

| Laserfiche Field | What It Means in Waypoint Context |
|-----------------|----------------------------------|
| Instance ID | Unique Laserfiche workflow ID — maps to `incidents.laserfiche_instance_id` |
| Current step | Where the referral is in the Laserfiche workflow (e.g., "DAEP", "Back to CBC for Correction") |
| Current stage | Broader phase (e.g., "DAEP Location", "CBC") |
| Completed via terminate end event | Workflow was stopped early — maps to "overturned" status |
| C_no | Student ID from the district SIS — often blank in Laserfiche exports |

---

## Product-Specific Terms

| Term | Definition |
|------|-----------|
| Compliance hold | Incident status when SPED/504 student has DAEP/expulsion consequence and checklist isn't complete |
| Approval chain | The sequential review process (CBC → Counselor → SPED → 504 → SSS → Director) |
| Placement blocking | Waypoint prevents the placement from proceeding until compliance steps are complete |
| Synthetic student ID | ID assigned to students created from Laserfiche import: `LF-LASTNAME-FIRSTNAME-G{grade}` |
| Waypoint admin | Internal Waypoint staff role with `district_id = NULL`; accesses `/waypoint-admin` panel |
| Instance | A Laserfiche DAEP referral workflow |
