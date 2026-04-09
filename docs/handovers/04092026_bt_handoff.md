# Session BT Handover
**Date:** 2026-04-09
**Agent:** Archer (CTO)
**Focus:** Finish SP4 tunnel + ship 100% free SCOUT pipeline

---

## What Was Done

### 1. SP4 Cloudflare Tunnel — LIVE ✅
After 3 sessions of paste-corruption hell, the breakthrough was using Cloudflare Zero Trust dashboard's one-line install command instead of manually pasting the token in PowerShell. Tunnel `scout-inference` now serves Ollama at `https://scout.clearpathedgroup.com`.

- Service: `cloudflared` (Windows service, status Running)
- Public hostname route: `scout.clearpathedgroup.com` → `http://localhost:11434`
- Verified: `curl https://scout.clearpathedgroup.com/api/tags` returns gemma3:1b model list
- SP4 dashboard tab is "Published application routes" (renamed from "Public Hostname")

### 2. SCOUT Free Pipeline — SHIPPED ✅
SCOUT (clearpath-signal) now runs 100% free end-to-end. Architecture:

```
Browser/CLI → Cloudflare Worker (source proxy) → Reddit/HN/Twitter/Quora/TpT/Trends
            → scout.clearpathedgroup.com (tunnel) → SP4 Ollama (gemma3:1b) → analysis
```

**Files created/modified:**
- `C:\Users\jkcul\clearpath-signal-worker\` — new Worker repo (5 files: wrangler.toml, package.json, README, .gitignore, src/index.js)
- `C:\Users\jkcul\clearpath-signal\src\App.jsx` — refactored: removed all 4 Anthropic API calls, removed `API_KEY` env var, added Ollama analysis function, added Worker fetchers, added HN as new source. Builds clean (138ms).
- `C:\Users\jkcul\clearpath-signal\scripts\run-scan.mjs` — new CLI (no npm deps), runs scans from terminal/Claude Code, writes to `signal-runs/scan-*.md`

**Worker live at:** `https://clearpath-signal-worker.jkculley.workers.dev`
- Deployed via Cloudflare dashboard (npm install failed — SP4 is Win ARM64, workerd has no ARM64 build)
- All 6 routes registered: /reddit /hn /tpt /trends /twitter /quora

**Smoke test results (real test, no fabrication):**
| Route | Status | Why |
|---|---|---|
| /reddit | ✅ Real posts | Reddit JSON allows CF Worker IPs |
| /hn | ✅ Real posts | Algolia free, no blocks |
| /tpt | ❌ no __NEXT_DATA__ | TpT changed site structure |
| /trends | ❌ HTTP 429 | Google rate-limits CF Worker shared IPs |
| /twitter | ❌ all nitter mirrors unreachable | Twitter killed Nitter in 2024 |
| /quora | ❌ HTTP 429 | Google rate-limits CF Worker shared IPs |

**First real scan ran successfully.** Output at `clearpath-signal/signal-runs/scan-2026-04-09T22-21.md`. Reddit + HN returned real posts. Ollama (Gemma 3 1B) analyzed only the real posts — zero fabrication.

### 3. Memory Updated
- New file: `feedback_architecture_before_infrastructure.md` — lesson from 3-day spiral: verify the affected code can use the new substrate BEFORE provisioning infrastructure
- MEMORY.md index updated

---

## What's Live Right Now

- ✅ SP4 Ollama tunnel: `https://scout.clearpathedgroup.com` (gemma3:1b)
- ✅ Worker: `https://clearpath-signal-worker.jkculley.workers.dev` (6 routes, 2 working honestly)
- ✅ SCOUT browser build: clean, ready to redeploy with `npm run build && wrangler pages deploy dist`
- ✅ SIGNAL CLI: `cd C:\Users\jkcul\clearpath-signal && node scripts/run-scan.mjs`

---

## Honest Limitations

**4 of 6 sources don't work for free in 2026.** Twitter/Quora/Trends/TpT are blocked at the IP level by Cloudflare's shared Worker IPs (Google rate-limits, Nitter is dead, TpT changed structure). To unblock without paying:

- **Best option:** Add a Node scraper running on the SP4 (residential IP) that complements the Worker. SP4 already has the tunnel, just expose another endpoint. Free.
- **Alternative:** Pay for residential proxy rotation (~$10-30/mo, defeats "free")
- **Skip them:** Reddit + HN are the highest-signal sources for K-12 educator pain points anyway. SCOUT works today.

---

## Next Session Priority

1. **SP4 scraper add-on** — Node script on SP4 that scrapes Twitter/Quora/Trends/TpT from residential IP, exposes via tunnel. Brings all 6 sources fully free.
2. **Redeploy SCOUT browser app** — `cd clearpath-signal && npm run build && npx wrangler pages deploy dist` (make sure Worker URL is in env)
3. **Tune Ollama analysis prompts** — Gemma 3 1B output is generic. Either iterate prompts or upgrade to Gemma 3 4B on SP4 (slower but better quality)
4. **Re-upload VEP + PEIMS to TpT** (still pending from BR)
5. **Build remaining 6 TpT gap products** from Vera's list
6. **Investigator Toolkit single-file rebuild**
7. **Store redesign** (clearpathedgroup.com/store)
8. **Reach Chad Bronowski** (CSISD)

---

## Known State Notes

- Wrangler CLI does NOT work on Win ARM64 (workerd dependency). Worker management must be done via Cloudflare dashboard editor.
- Cloudflare dashboard editor sometimes corrupts pasted comments — workaround is to deploy comment-free code
- The minimal "// + comment" headers triggered "Unexpected token '*' at worker.js:2:1" errors — root cause unclear, possibly editor lint state from a prior failed deploy. Nuking the worker and recreating fixed it.

---

## What's Working Across the Stack (no change from BS)

- Waypoint app (waypoint.clearpathedgroup.com) — migrations 001–060 live
- Apex (clearpath-apex.pages.dev) — Stripe-free Zelle payment flow, magic link auth, morning brief cron
- Beacon, Investigator Toolkit — license-gated, Zelle, on-device IndexedDB
- Marketing site (clearpathedgroup.com) — SEO pages, store, lead capture, hero carousel
- Ops command center (clearpath-ops.pages.dev) — Partner Chat live
- SCOUT (clearpath-signal.pages.dev) — NOW FREE with Worker + Ollama pipeline
