# X-2 — Uptime & Correctness Monitoring (scope)

> **Risk X-2:** *Infra fragility + single operator → unattended failure (key expiry, CF config, Supabase incident) becomes an outage during a customer's hearing/crisis.*
> **Status:** Active since CC31 (2026-06-03). Nothing watches production today.
> **Scoped:** 2026-07-22.

---

## The design insight that matters

**A bare `200` proves nothing.** Every real incident and near-miss in this codebase returned `200` while being broken:

| Incident | What it returned | Why a naive check misses it |
|---|---|---|
| **CC31** — cpeg-site rebuilt with Vite, served the **Waypoint app** at `clearpathedgroup.com` | `200` + valid HTML | Site was "up." Just the wrong site. |
| **B-2** — Pages Functions not bundled, `/api/*` fell through to the SPA | `200` + HTML | Endpoint "responded." Returned a web page instead of JSON. |
| **2026-07-22** — orphaned PDFs / missing files | `200`, 136,780 bytes | SPA fallback. Identical response for *every* nonexistent path. |

A monitor that only asserts `status == 200` would have caught **none** of them.

**Therefore: every check asserts on content, not just status.** This is the whole point of the build. Status-only monitoring here is theater.

---

## What to watch

Baseline captured 2026-07-22 — all 8 currently healthy (0.13–0.54 s).

| # | Surface | Assertion (beyond 200) | Catches |
|---|---|---|---|
| 1 | `clearpathedgroup.com/` | body contains `Clear Path Education Group` **AND NOT** `Waypoint DAEP` | **The exact CC31 failure** |
| 2 | `clearpathedgroup.com/api/ping` | `content-type: application/json` | B-2 (Functions not bundled) |
| 3 | `clearpathedgroup.com/store` | contains a known product string | Store page broken/blank |
| 4 | `clearpathedgroup.com/activate` | contains the license-key input | Customers can't activate |
| 5 | `clearpathedgroup.com/verify-attestation` | page loads + `/api/verify-attestation` returns JSON | Beacon's printed "witness" URL 404s (B-2's real feature) |
| 6 | `waypoint.clearpathedgroup.com/` | serves the app shell | Waypoint down |
| 7 | `beacon.clearpathedgroup.com/` | serves the app shell | Beacon down |
| 8 | `investigatortoolkit.clearpathedgroup.com/` | serves the app shell | Toolkit down |
| 9 | `clearpath-ops.pages.dev/` | serves the ops shell | Command center down |
| 10 | Supabase `kvxecksvkimcgwhxxyhw` REST reachable | non-5xx | Waypoint/Navigator DB down |
| 11 | Supabase `xbpuqaqpcbixxodblaes` REST reachable | non-5xx | Ops/licensing down — **breaks `/activate` for every customer** |

**Deliberately excluded:** anything requiring auth or writes. This is a read-only liveness probe, not a smoke test. It must never mutate customer data, and must never need a credential that can expire (which would make the monitor itself an X-2 failure).

---

## Delivery options

| | **A. GitHub Actions cron** | **B. Cloudflare Worker cron** | **C. UptimeRobot (external)** |
|---|---|---|---|
| Cost | Free | Free (100k req/day) | Free (50 monitors, 5 min) |
| Content assertions | ✅ full (arbitrary Node) | ✅ full (arbitrary JS) | ⚠️ single keyword per monitor |
| Schedule reliability | ⚠️ **delay-prone**; auto-disabled after 60 days repo inactivity | ✅ reliable | ✅ reliable |
| Alerting | Action failure → GitHub email; or Resend (key already configured) | Resend | Built-in email/SMS/app |
| Reuses existing pattern | ✅ `beacon-drip-cron.yml` | ➖ new surface | ➖ external |
| Independent of the thing it monitors | ✅ | ❌ **runs on Cloudflare** — a CF outage takes the monitor with it | ✅ |

### Recommendation: **A now, C alongside it**

- **A (GitHub Actions)** gives the rich content assertions that actually catch these failures, reuses a cron pattern already proven in this repo, and needs no new accounts. Its weakness is schedule slop — fine, because the goal is *"know within the hour,"* not sub-minute paging.
- **C (UptimeRobot)** as a **dead-man's switch**: it's off-infrastructure, so it still alerts if Cloudflare *and* GitHub are having a bad day. Free tier's single-keyword check is enough for a coarse "is the site serving the right site" signal.
- **B is rejected** for the primary: running the monitor on Cloudflare means a Cloudflare incident silently takes out both the sites *and* the thing meant to notice.

**Cadence:** every 15 min (`*/15 * * * *`). Hearings and crises are hour-scale events; 15 min bounds the blind window without burning minutes.

**Alert routing:** Resend → `support@clearpathedgroup.com` (the key is already configured on cpeg-site and proven working by the drips). Include which check failed, expected vs actual, and the response snippet — an alert that doesn't say *what* broke just creates a second investigation.

**Anti-noise:** alert only on **2 consecutive failures** of the same check (one transient blip shouldn't page), and send at most one alert per check per 6 h until it recovers. A monitor that cries wolf gets muted, and a muted monitor is worse than none.

---

## Effort

| Piece | Estimate |
|---|---|
| `scripts/uptime-check.mjs` (checks + assertions + Resend alert) | ~2 h |
| `.github/workflows/uptime-cron.yml` (+ manual dispatch, `--dry`) | ~30 min |
| Offline tests for the assertion logic | ~1 h |
| UptimeRobot setup (manual, Kim) | ~15 min |
| **Total** | **~half a day** |

No new secrets needed for A — `RESEND_API_KEY` already exists in the repo's Actions secrets for the Beacon drip.

## Definition of done

1. `--dry` run reports all 11 checks green against production.
2. A deliberately broken assertion (e.g. expect `"Waypoint DAEP"` on the homepage) produces exactly one alert email naming the check and showing expected vs actual.
3. Cron runs unattended for 7 days with zero false alarms.
4. X-2 moves `Active → Watch`, with the trip threshold restated as *"any unattended outage lasting > 1 h"* — now actually measurable, which today it is not.

## Open question for Kim

Where should alerts land? `support@clearpathedgroup.com` is the default, but if that inbox isn't checked out-of-hours, an SMS path (UptimeRobot free tier includes it) may matter more than the richer email.
