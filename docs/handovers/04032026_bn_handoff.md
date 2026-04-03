# Session BN Handover
**Date:** 2026-04-03
**Agent:** Archer (CTO)
**Focus:** Spreadsheet product audits + fixes, product image carousels

---

## What Was Done

### Beacon Group Schedule Tracker — Audited + Fixed
- Identified 10 issues: single-group attendance/progress, hardcoded summary, no validations, empty scheduler
- ExcelJS fix script (`fix-beacon-tracker.mjs`): added 4 groups to attendance + progress, formula-driven summary, data validation dropdowns, 15 roster students
- Output: `C:\Users\jkcul\TPT\Beacon_Group_Schedule_Tracker_FIXED.xlsx`

### Counselor-CBC Student Risk Summary — Audited + Fixed
- Original had zero formulas despite claiming "auto-calculates" — empty dashboard, no cross-sheet lookups, no sample data
- **Root cause of XML corruption found:** original file had 450 formulas using `&` for string concatenation across sheets 2-6. openpyxl doesn't properly XML-escape `&` on re-save. ExcelJS had the same problem.
- **Fix:** Python/openpyxl script that first replaces all 450 `&` formulas with CONCATENATE equivalents, then adds sample data + dashboard formulas
- Added: 12 sample students, 6 behavior entries, 7 outreach entries, 5 watch list entries, 3 MDR items, 12 dashboard formulas, behavior trend auto-calc, cross-sheet INDEX/MATCH lookups
- Output: `C:\Users\jkcul\Counselor-CBC-Student-Risk-Summary-FINAL.xlsx`

### Website Product Images (from Session BM, deployed today)
- Command Toolkit 4 marketing images live on clearpathedgroup.com/resources
- **Fixed rendering bug:** paid product cards were fetching image config but never rendering carousels — only teacher bundles had carousel HTML. Now all products with images get carousels.

---

## Decisions Made

1. **Counselor-CBC Risk Summary stays on TPT only** — not added to clearpathedgroup.com store for now
2. **Excel `&` formulas must be replaced with CONCATENATE** when using openpyxl/ExcelJS to modify files — both libraries fail to XML-escape `&` in formula strings during re-save

---

## Technical Discovery: Excel Library XML Corruption

When modifying .xlsx files with cross-sheet formulas containing `&`:
- **ExcelJS:** Corrupts sheet XML every time — cannot be used for files with `&` formulas
- **openpyxl:** Also corrupts if existing `&` formulas are present — must replace with CONCATENATE before saving
- **SheetJS:** Handles `&` correctly but strips all formatting
- **Solution:** Use openpyxl + replace all `&` formulas with CONCATENATE equivalents before any save operation

---

## What's Next

1. **Verify Risk Summary FINAL opens clean** — awaiting Kim confirmation
2. **Product images for remaining products** (DAEP, ISS, Navigator, Meridian) on resources page
3. **Rebuild Investigator Toolkit single-file HTML** with student history, case locking, audit trail
4. **Reach Chad Bronowski** — LinkedIn or phone
5. **Re-send Apex marketing emails**
6. **Meridian deep audit**

---

## Product Grades (Current)

| Product | Grade | Sell? |
|---------|-------|-------|
| Waypoint | A | Yes |
| Navigator | A- | Yes |
| Apex Texas | A+ | Yes |
| Apex IB Hub | A | Yes |
| Beacon | A- | Yes |
| Investigator Toolkit | A+ | Yes |
| Beacon Group Tracker (spreadsheet) | A- | Yes (after fix) |
| Risk Summary (spreadsheet) | A | Yes (TPT, after fix) |
| Testing Command Center | Built | Shelved |
| Meridian | B+ | Hidden |
