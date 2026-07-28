# Counselor Cards — canonical masters

Five free counselor products (TpT + lead magnets). Each subfolder holds the
**HTML source of truth** and its rendered 4-page PDF (US Letter landscape,
cover + 3 content pages). The old March-2026 xlsx files in `TPT/` were the
original content sources; their exported PDFs shipped with cp1252 mojibake,
broken layouts, truncated text, and footer links — all five were rebuilt from
scratch on 2026-07-28 (CC44).

| Card | Source | PDF |
|---|---|---|
| Conversation Starters | `conversation-starters/` | `Counselors-Conversation-Starter-Card.pdf` |
| Crisis Response | `crisis-response/` | `Counselor-Crisis-Response-Card.pdf` |
| Referral Triage | `referral-triage/` | `Referral-Triage-Decision-Card.pdf` |
| Small Group Starter Kit | `small-group-starter/` | `Small-Group-Starter-Kit-Card.pdf` |
| SB 179 Quick Reference | `sb179-quick-reference/` | `SB179-Compliance-Quick-Reference.pdf` |

## Rebuild any card

```bash
cd rnr-build
node render-card.mjs ../products/counselor-cards/<dir>/<file>.html ../products/counselor-cards/<dir>/<Product>.pdf
```

Then copy the PDF to `TPT/` for upload staging. Puppeteer lives in
`rnr-build/node_modules`.

## Non-negotiable content rules

- **No links in TpT copies** — TpT forbids external links. Brand text only.
- **Abuse reporting is 24 hours, not 48** — TFC §261.101 as amended by
  **SB 571 (89th Legislature, eff. 2025-06-20)**; duty is non-delegable.
  Failure to report: Class A misdemeanor (TFC §261.109). Good-faith immunity:
  TFC §261.106. Texas Abuse Hotline (DFPS): 1-800-252-5400.
- **SB 179 is 87th Legislature (2021)** — the old xlsx wrongly said 2019.
  80% on comprehensive-program duties, TEC §33.005/§33.006.
- The Referral Triage "schedule within 48 hours" (yellow lane) is practice
  guidance, not statute — deliberately unchanged.
- Per the 2026-07-14 decision: `products/` holds canonical masters — never
  deliver from root or `TPT/` copies without re-copying from here.
