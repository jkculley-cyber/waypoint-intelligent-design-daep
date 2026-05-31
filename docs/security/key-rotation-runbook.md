# Key Rotation & Secret-Exposure Remediation Runbook

> Created in response to the 2026-05-31 read-only secret audit (Section 1).
> Drives the fix for `service_role` keys exposed in client JS + git history across
> Waypoint, Apex, and Beacon. **Rotation only matters once the client can no longer
> leak the key — do Phase 1 (architecture) before Phase 2 (rotation).**

## Project ref legend
| Ref | Project |
|---|---|
| `kvxecksvkimcgwhxxyhw` | **Waypoint** (main) |
| `jvjsotlyvrzhsbgcsdfw` | **Apex** |
| `cghhabcbgyoqwqjzunfo` | **Beacon** |
| `bbmolhntcrtcwouqoyse` | legacy (Waypoint-era) |
| `xbpuqaqpcbixxodblaes` | ops (anon only — not compromised) |

## Findings being remediated
| Severity | Where | Role | Key fp |
|---|---|---|---|
| CRITICAL (live) | `waypoint.clearpathedgroup.com/assets/WaypointAdminPage-*.js` | service_role — Waypoint | 6b760ed7 |
| CRITICAL (live) | `waypoint.clearpathedgroup.com/assets/WaypointAdminPage-*.js` | service_role — Apex | 0d68a71e |
| CRITICAL (HEAD) | `src/pages/WaypointAdminPage.jsx:327-329` (`APEX_KEY`, hardcoded) | service_role — Apex | 0d68a71e |
| FINDING (HEAD) | `src/pages/WaypointAdminPage.jsx:54,131,1785,1907-1908,2214-2215` (`VITE_SUPABASE_SERVICE_ROLE_KEY` → bundled to client) | service_role — Waypoint | 6b760ed7 |
| CRITICAL (history) | Waypoint `supabase/create_admin.mjs:4`, `create_parent.mjs:4`, `run_migrations.sh:6` | service_role — legacy | 76a0c23f |
| CRITICAL (history) | Beacon `supabase/seed_demo.mjs:5` | service_role — Beacon | 23af9a0a |
| CRITICAL (history) | Apex `supabase/migrations/007_cron_fix_drip_trial.sql:18` | service_role — Apex | 0d68a71e |
| Secondary | Waypoint `docs/handovers/04112026_bw_handoff.md` (gcp-api-key); Apex `docs/handovers/03152026*.md` (curl-auth-header / generic-api-key) | — | — |

Beacon and Apex **deployed** sites are clean (anon only). Only the Waypoint production bundle leaks service_role.

---

## Phase 0 — Containment & rules (now)
1. Treat all 4 service_role keys above as compromised.
2. **Iron rule:** `service_role` / `sb_secret_` keys never appear in `src/`, never in a `VITE_*` var, never hardcoded in client code. Client gets anon/publishable only.
3. Don't rotate yet — build the server-side home for the secret first (Phase 1).

## Phase 1 — Get service_role OUT of the client
### 1a. Waypoint Admin → Apex calls (`WaypointAdminPage.jsx:327-461`)
- Replace direct `${APEX_URL}/rest/v1/...` calls (`apexFetch` GET on `principals`/`access_requests`; PATCH on `principals`/`access_requests`) with calls to the new proxy **`/api/apex/<resource>`**, passing the **current user's Waypoint session token** as the bearer.
- Delete `APEX_URL` / `APEX_KEY` / `APEX_HEADERS` constants. The Apex secret now lives only in the Pages Function env (`APEX_SECRET`).
- Proxy scaffold: `functions/api/apex/[[path]].js` (created alongside this runbook). RPC guard: `supabase/migrations/083_is_waypoint_admin.sql`.

### 1b. Waypoint admin writes via `VITE_SUPABASE_SERVICE_ROLE_KEY`
- Lines `54,131,1785,1907-1908,2214-2215`. Preferred: replace each with a `SECURITY DEFINER` RPC guarded by `is_waypoint_admin()` callable with the user's session (no secret in browser). Or route through a `functions/api/admin/[[path]].js` proxy like 1a.
- Delete every `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY` from `src/`. Remove the `VITE_SUPABASE_SERVICE_ROLE_KEY` var from `.env.local`, `.env`, and Cloudflare Pages **build** vars.

### 1c. Server scripts hardcoding service_role
- Ensure current HEAD reads `process.env.SUPABASE_SERVICE_ROLE_KEY`:
  Waypoint `supabase/create_admin.mjs`, `create_parent.mjs`, `run_migrations.sh`; Beacon `supabase/seed_demo.mjs:5`.
- Confirm nothing remains:
  ```bash
  for d in ~/waypoint-intelligent-design-daep-master ~/clearpath-beacon ~/clearpath-apex; do
    grep -rnE 'eyJ[A-Za-z0-9_-]{20,}\.eyJ' "$d" \
      --include='*.js' --include='*.mjs' --include='*.jsx' --include='*.ts' \
      --include='*.sql' --include='*.sh' 2>/dev/null
  done
  ```
- Apex `007_cron_fix_drip_trial.sql:18`: move the key into Supabase **Vault**; have the cron read from Vault instead of an embedded literal.

> Commit Phase 1 + Phase 3 locally; deploy in Phase 4 (after keys exist).

## Phase 2 — Rotate keys (per project: Waypoint, Apex, Beacon, legacy)
**Option A — modern API keys (preferred, no forced logout):**
1. Dashboard → Project Settings → API Keys.
2. Create new **publishable** key (`sb_publishable_…`) → new client key.
3. Create new **secret** key (`sb_secret_…`) → server-only.
4. Migrate to new keys (Phase 3), deploy, verify, then **revoke the legacy anon + service_role JWT keys** (kills the leaked `eyJ…` tokens).

**Option B — roll legacy JWT secret (simpler, signs everyone out):**
1. Dashboard → Project Settings → API → JWT Keys → rotate/generate new secret.
2. Regenerates anon + service_role, invalidates all sessions.
3. Copy the new anon + service_role for Phase 3.

Legacy `bbmolhntcrtcwouqoyse`: if abandoned, **pause/delete the project** instead of rotating.

## Phase 3 — Store new keys correctly
| Key | Goes | Never |
|---|---|---|
| new anon / publishable | client env (`VITE_SUPABASE_ANON_KEY`), static HTML, CF build vars | — |
| new service_role / secret | CF Pages **Functions** env (`APEX_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`), Supabase Vault, local `.env.local` | any `VITE_*`, any `src/` file, any committed file |

Update: `.env.local` (each repo, confirm `.env*` gitignored); Cloudflare Pages (set anon build var + Functions secrets, remove any `VITE_*SERVICE_ROLE*`); hardcoded anon keys in `clearpath-site/*.html`, `download-gate.js`, `downloads/*.html` (these strings change after a JWT-secret roll).

## Phase 4 — Redeploy
1. Commit Phase 1+3 (no secrets in the diff). Push → CF Pages auto-deploys.
2. Redeploy Pages Functions / Edge Functions so they pick up new secrets (running instances don't always reload secrets).

## Phase 5 — Verify
1. Live bundle must be anon-only:
   ```bash
   # re-read current chunk names from deployed index.html, then:
   curl -sL https://waypoint.clearpathedgroup.com/assets/<chunk>.js \
   | grep -aoE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}' | sort -u
   # decode each payload's role → expect ZERO service_role. Repeat for Beacon + Apex.
   ```
2. Old keys dead: REST call with an old key returns 401.
3. `grep -rnE 'service_role|SUPABASE_SERVICE' src/` → only env-var names in server-bound code, no tokens.

## Phase 6 — Purge git history (after rotation; defense-in-depth)
Use `git filter-repo` with the shared pattern file `C:\Users\jkcul\secret-scrub-replacements.txt`:
```bash
pip install git-filter-repo
cd ~/<repo>
git filter-repo --replace-text /c/Users/jkcul/secret-scrub-replacements.txt
git push --force --all && git push --force --tags   # solo repos — coordinate
```
Delete stale `claude/*` branches first so they don't reintroduce the strings. Also redact the secondary findings in the handover markdown files.

## Phase 7 — Prevent recurrence
1. Pre-commit: `gitleaks protect --staged` hook in all 3 repos.
2. CI: gitleaks step in GitHub Actions, fail build on findings.
3. Convention: ban `VITE_` + `SERVICE`/`SECRET` in one identifier; ban literal `eyJ…service_role…` in `src/`.
4. `.gitignore` audit: `.env`, `.env.local`, `env`, `*.env` ignored everywhere (history had a committed `env (2)`).
5. Log in DECISIONS.md: "service_role never crosses the network to a browser; cross-project admin reads go through an auth-gated server proxy."

### Minimal-downtime order
Phase 1 → preview deploy → Phase 2A (new keys, legacy still live) → Phase 3 → Phase 4 (prod on new keys) → Phase 5 → revoke legacy → Phase 6 → Phase 7.
Fast/accept-brief-signout: Phase 2B first to kill the live Waypoint+Apex keys, then 1/3/4.
