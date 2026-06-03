# B-2 — Beacon verify-attestation endpoint: resolution playbook

> **Risk B-2 (Active, trust-spine #1):** Beacon stamps `clearpathedgroup.com/verify-attestation?hash=…` on every Crisis / Due-Process / SB-179 PDF. The page loads, but its `/api/verify-attestation` call 404s → the headline "third-party witness" feature looks like vaporware.
> **STATUS: RESOLVED (CC32, 2026-06-03) — endpoint live on prod.**
>
> **⚠️ Correction to the original theory below:** the deeper root cause was **in the repo**, not just dashboard config. The GitHub Action `deploy-clearpath-site.yml` ran `wrangler pages deploy clearpath-site` **from the repo root**, so wrangler looked for `./functions` at the repo root (nonexistent) and uploaded the static site **without** the `/api/*` Functions. That direct-upload deploy fires on every `clearpath-site/**` push and **raced/overwrote** the dashboard git-integration build, so the endpoint flapped between working and 404. **The durable fix was `workingDirectory: clearpath-site` + `command: pages deploy .` in that workflow** (commit `19496be`) so wrangler bundles `clearpath-site/functions/`. Plus the two infra steps: cpeg-site Root directory → `clearpath-site` (for the git-integration path) and the `OPS_SUPABASE_SERVICE_ROLE_KEY` secret (command-center `service_role`). **Verified end-to-end on prod:** `/api/ping`→JSON, registered hash→`found:true`, novel hash→404 `found:false`, homepage + verify page intact. Sections 2–6 below are the original (partial) diagnosis, kept for context.
>
> **Lesson:** when a static site lives in a monorepo subdir, `wrangler pages deploy <subdir>` from the repo root does NOT bundle that subdir's `functions/` — run it from inside the subdir (`workingDirectory`/`cd`). And two deploy paths to one Pages project (GH Action direct-upload + dashboard git-integration) will race; make them produce identical output or use only one.

---

## 1. What was verified (code is correct — do NOT edit it)

The whole chain is consistent; the *only* broken link is Cloudflare Functions routing.

| Piece | File | Verified |
|---|---|---|
| Printed URL | `clearpath-beacon/src/lib/pdfAttestation.js:102` | `https://clearpathedgroup.com/verify-attestation?hash=<hash>` ✓ |
| Hash registration (write) | same file, `attestPdfHash()` | anon-INSERT to ops `pdf_attestations`, server-set `generated_at`, `return=minimal` (anon has no SELECT) ✓ |
| Verify page (static) | `clearpath-site/verify-attestation.html:295` | `fetch('/api/verify-attestation?hash=' + raw)` ✓ |
| Verify endpoint | `clearpath-site/functions/api/verify-attestation.js` | service-role read of `pdf_attestations`, 400/404/200/502 paths, 60 s success cache ✓ |
| Liveness probe | `clearpath-site/functions/api/ping.js` | `{ ok:true, source:'ping' }` ✓ |
| Subdomain redirect | `clearpath-site/functions/_middleware.js` | `verify.clearpathedgroup.com/` → `/verify-attestation` ✓ |

**No `package.json` in `clearpath-site/`** — this is the key de-risk: pointing the project Root directory at `clearpath-site` will NOT re-trigger the Vite framework auto-detect that broke the marketing site in CC31. Framework=None holds.

---

## 2. Root cause (deterministic, per Cloudflare Pages behavior)

cpeg-site's **locked CC31 config** is:
- Root directory = **(empty → repo root)**
- Build output directory = `clearpath-site`
- Framework preset = None · Build command = (empty)

Cloudflare Pages looks for the `functions/` directory at the **Root directory**. The repo root has **no** `functions/` — they live at `clearpath-site/functions/`. So:
- `/api/*` (incl. `/api/ping`) matches no Function → falls through to static serving → returns the SPA/homepage HTML instead of JSON. **← this is B-2.**
- `_middleware.js` never runs either → the `verify.clearpathedgroup.com` redirect is also dead today (same cause; fixed by the same change).

---

## 3. The fix (config change — NO code change)

Point the project root at the subdirectory so `functions/` resolves:

| Setting | Current (Config A) | Target (Config B) |
|---|---|---|
| **Root directory** | (empty) | `clearpath-site` |
| **Build output directory** | `clearpath-site` | **(empty / `/`)** — output is relative to root; the static files *are* the root now |
| Framework preset | None | None (unchanged — holds, no `package.json` in `clearpath-site`) |
| Build command | (empty) | (empty) (unchanged) |

After Config B: static serves from `clearpath-site/`; `functions/` resolves at `clearpath-site/functions/`; `/api/*` and `_middleware` route. The Beacon-stamped URL works.

> ⚠️ **Why not "test on a branch/preview of cpeg-site"** (the CC31 note): Pages build config is **project-level** — it applies to *every* deployment of that project, production included. You cannot run Config A on prod and Config B on a preview of the *same* project. So validate Config B on a **separate throwaway project** first (Section 4), THEN apply to cpeg-site (Section 5).

---

## 4. Validate on a throwaway project (zero risk to the live site)

1. Cloudflare → Pages → **Create project** → Connect to Git → same repo `jkculley-cyber/waypoint-intelligent-design-daep`, branch `main`.
2. Set: **Framework = None, Build command = empty, Root directory = `clearpath-site`, Build output = empty.** Name it e.g. `cpeg-verify-test`. **Do NOT** add any custom domain.
3. After it deploys, hit its `*.pages.dev` URL and confirm — no secret needed for these:
   ```
   curl -s https://cpeg-verify-test.pages.dev/api/ping
   # expect: {"ok":true,"source":"ping"}            ← Functions route ✓
   curl -s -o /dev/null -w "%{http_code}\n" https://cpeg-verify-test.pages.dev/
   # expect: 200, and the body is the marketing homepage  ← static still serves ✓
   curl -s "https://cpeg-verify-test.pages.dev/api/verify-attestation?hash=bad"
   # expect: {"error":"Invalid hash. Expected 64 lowercase hex characters."}  (400) ← reaches the function ✓
   curl -s "https://cpeg-verify-test.pages.dev/api/verify-attestation?hash=$(printf 'a%.0s' {1..64})"
   # expect: {"error":"Verification service is not configured...."} (500) ← function runs; just needs the secret ✓
   ```
   All four passing = Config B is proven. The 500 is expected (no secret on the test project) and itself proves routing.
4. Delete `cpeg-verify-test` when done (it shares the repo but has no domain, so it's harmless either way).

---

## 5. Promote to cpeg-site + add the secret

1. cpeg-site → Settings → Builds & deployments → set **Root directory = `clearpath-site`**, **Build output = (empty)**. Re-assert **Framework = None, Build command = empty** (CC31: reconnects/edits can re-trigger auto-detect — verify these two before saving).
2. cpeg-site → Settings → **Variables and Secrets** (Production) → add **encrypted secret**:
   - `OPS_SUPABASE_SERVICE_ROLE_KEY` = the ops project (`xbpuqaqpcbixxodblaes`) **service_role** key. (CC29 did NOT disable the ops project's legacy keys, so a legacy `service_role` still works there. `OPS_SUPABASE_URL` is optional — the endpoint defaults to the ops URL.)
   - The table has anon-INSERT-only RLS; service-role is required to READ (anon SELECT would let anyone enumerate hashes). This is correct.
3. Trigger a deploy. **Have Rollback ready** (Deployments → ⋯ → Rollback) — the CC31 muscle memory.
4. Verify on the **real domain**:
   ```
   curl -s https://clearpathedgroup.com/api/ping                       # {"ok":true,...}
   curl -s -o /dev/null -w "%{http_code}\n" https://clearpathedgroup.com/   # 200, homepage intact
   curl -s "https://clearpathedgroup.com/api/verify-attestation?hash=$(printf 'a%.0s' {1..64})"
   # now {"found":false} (404) — service configured, hash just not in the registry
   ```
   `{"found":false}` (not a 500) confirms the secret is wired.

---

## 6. End-to-end proof — a known-good hash is already registered

The write half of the chain was **verified live during this investigation** (CC32):
- anon INSERT into ops `pdf_attestations` → **HTTP 201** (RLS allows the write, the `document_kind` CHECK validates — only values like `crisis` / `parent_contact` are accepted, server sets `generated_at`).
- anon SELECT → 200 with **0 rows** (RLS correctly blocks reads; service-role is required — exactly what the endpoint uses).

A throwaway attestation row was pre-registered, so once the endpoint is live you can confirm end-to-end **without generating a PDF**:
```
# content_hash = 64 lowercase 'c'  (counselor_id "b2-playbook-test", document_kind "crisis")
curl -s "https://clearpathedgroup.com/api/verify-attestation?hash=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
# expect: {"found":true,"row":{"counselor_id":"b2-playbook-test","document_kind":"crisis","generated_at":"<server UTC>", ...}}
```
A `found:true` with a server `generated_at` = the headline "third-party witness" feature working end to end. (To register your own: POST to `…/rest/v1/pdf_attestations` with the **ops anon key** — public-by-design, in CLAUDE.md — using a valid `document_kind` like `crisis` and `Prefer: return=minimal`.)

**Net:** every link in the chain is proven working except the Cloudflare Functions routing in Section 3. That single config change is the whole fix.

---

## 7. After it's green
- Flip **B-2 → Resolved** in `docs/risk-register.md`.
- Optionally point `verify.clearpathedgroup.com` at cpeg-site (the `_middleware` redirect now works) so the short URL also lands on the verify page.
- The local `wrangler pages dev clearpath-site` sim (curl `/api/ping`) is an even-earlier check if you want it next time; it was skipped here (wrangler wouldn't install cleanly under Node 24 on this machine — not worth fighting when the throwaway project is the authoritative test).
