# Session BO Handover
**Date:** 2026-04-03
**Agent:** Archer (CTO)
**Focus:** SIGNAL build + deploy, spreadsheet audits, product images, SEO strategy

---

## What Was Done

### SIGNAL — Built, Deployed, and Rebuilt 3 Times
- **Repo:** `jkculley-cyber/clearpath-signal` (new)
- **Live URL:** `clearpath-signal.pages.dev` (Cloudflare Pages)
- **Custom domain pending:** `signal.clearpathedgroup.com`

**SIGNAL v1 (killed):** Simulated fake educator posts via Claude. No real data. User correctly rejected this.

**SIGNAL v2 (killed):** Used Claude web search to find real posts. Returned mostly company websites and seller pages, not real people with real problems.

**SIGNAL v3 (live):** Searches Reddit API directly for real threads from real educators. Claude analyzes the real posts and writes talking points. Kim successfully responded to actual Reddit threads using this version.

**SIGNAL v3 final feature set:**
- **Reddit** (direct API, fast): 7 subreddits — r/Teachers, r/SchoolCounseling, r/specialed, r/education, r/IBO, r/K12sysadmin, r/schoolpsychology. 6 scan rotations x 5 queries = 30 unique searches.
- **Twitter/X** (Claude web search): 8 educator hashtag queries
- **Quora** (Claude web search): 5 educator Q&A queries
- **TpT Forums** (Claude web search): 5 teacher discussion queries
- **Google Trends** (Claude web search): SEO competitor analysis showing who ranks for educator search terms, rising/declining trends, related searches, and specific page recommendations for clearpathedgroup.com
- Every signal: real URL, real author, pain point matched to product, ready-to-paste response, "Go to Thread" button
- Collapsible Google Trends panel with SEO opportunities

**Infrastructure:**
- GitHub repo with GitHub Actions deploy workflow
- Cloudflare Pages project `clearpath-signal`
- Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (rolled — updated on all 3 repos), `VITE_ANTHROPIC_API_KEY`
- Anthropic API key: `sk-ant-api03-q4UyShhVe25GcJlB-QwA...` (set in both GitHub secrets and Cloudflare Pages env vars)

### Cloudflare API Token Rolled
- Old token expired/invalid. New token `cfut_Haz722...` set on:
  - `jkculley-cyber/clearpath-signal`
  - `jkculley-cyber/waypoint-intelligent-design-daep`
  - `jkculley-cyber/clearpath-apex`

### Beacon Group Schedule Tracker — Audited + Fixed (from BN)
- Output: `C:\Users\jkcul\TPT\Beacon_Group_Schedule_Tracker_FIXED.xlsx`

### Counselor-CBC Student Risk Summary — Audited + Fixed (from BN)
- Root cause: 450 `&` formulas in original corrupted XML on re-save
- Fix: openpyxl script replaces all `&` with CONCATENATE before saving
- Output: `C:\Users\jkcul\Counselor-CBC-Student-Risk-Summary-FINAL.xlsx`
- **Status: awaiting Kim verification that it opens clean**

---

## Decisions Made

1. **SIGNAL uses real data only** — no simulated/fabricated intelligence. Every signal must have a real URL from a real person.
2. **Reddit direct API is the primary data source** — public, free, reliable, returns real threads with real URLs
3. **Twitter/Quora/TpT use Claude web search** — less reliable but catches some real posts
4. **No paid APIs** — Twitter $100/mo rejected. All free tier only.
5. **Facebook Groups and LinkedIn are inaccessible** — private APIs, no programmatic access
6. **SEO landing pages are the free retargeting strategy** — rank for educator search terms so Google sends traffic to clearpathedgroup.com instead of competitors
7. **No paid ads until revenue flows** — tracking pixels deferred

---

## What's Next

1. **SEO landing pages for clearpathedgroup.com** — target top educator search terms identified by SIGNAL's Google Trends (DAEP tracking, counselor caseload, T-TESS observation tool, student engagement activities)
2. **Custom domain** — add `signal.clearpathedgroup.com` in Cloudflare Pages settings
3. **Store redesign** — Kim wants clearpathedgroup.com/store to look like Bright Futures Counseling's visual product grid
4. **Kim creates Reddit account** — post as educator, build credibility, then naturally mention products
5. **Verify Risk Summary FINAL opens clean**
6. **Rebuild Investigator Toolkit single-file HTML**
7. **Reach Chad Bronowski**

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
| SIGNAL | B+ | Internal tool |
| Meridian | B+ | Hidden |
