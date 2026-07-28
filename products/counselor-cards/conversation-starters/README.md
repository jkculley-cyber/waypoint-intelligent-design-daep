# Counselor's Conversation Starters — canonical master

Free TpT/lead-magnet product: age-appropriate K-5 prompts across 8 topics
(grief, anger, anxiety, friendship, divorce, new student, bullying, suspected
abuse/neglect) + a "What Not to Say" don't/why/instead table.

## Files

| File | Role |
|---|---|
| `conversation-starters.html` | **Source of truth.** Edit this, then re-render. |
| `Counselors-Conversation-Starter-Card.pdf` | Rendered product (4 pages, US Letter landscape). |

## Rebuild

```bash
cd rnr-build
node render-card.mjs ../products/counselor-cards/conversation-starters/conversation-starters.html ../products/counselor-cards/conversation-starters/Counselors-Conversation-Starter-Card.pdf
```

(Puppeteer lives in `rnr-build/node_modules`, so the render script runs from there.)

## History / rules

- **2026-07-28 (CC44):** rebuilt from scratch. The original March PDF (exported
  from `TPT/Counselors-Conversation-Starter-Card.xlsx`) shipped with cp1252
  mojibake instead of emoji (`Ø=Þ"`), a broken scattered layout, text truncated
  at the page edge, and footer links — and the TpT listing's downloadable file
  was the raw .xlsx. The xlsx remains only as the content source it was; the
  PDF here is the product.
- **No links in the TpT copy.** TpT forbids external links; this PDF carries
  brand text only ("Clear Path Education Group"), no URLs. Don't add
  clearpathedgroup.com or Beacon links to the TpT-uploaded file.
- The abuse/neglect card cites **Texas Family Code §261.101** (professional
  duty to report within **24 hours** — amended by SB 571, 89th Legislature,
  2025; was 48 hours before. Texas Abuse Hotline 1-800-252-5400). Verify
  before changing any statute text.
- Per the 2026-07-14 decision: `products/` holds canonical masters — never
  deliver from root or `TPT/` copies without re-copying from here.
