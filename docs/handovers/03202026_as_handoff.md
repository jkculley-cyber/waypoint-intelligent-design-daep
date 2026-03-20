# Session AS Handover — 2026-03-20

## What Was Done

### Apex — Platform Audit Fixes (continued from prior session)
- **Store checkout replaced** (`clearpath-site/store.html`): Removed Formspree-only flow + "within one business hour" messaging. Replaced with dual-option purchase modal: TpT instant download + Zelle direct payment (saves TpT fees). Zelle QR code, tag `clearpathedgroup`, 3-step instructions.
- **"Founding principal pricing" removed** from drip email day-14 template (prior session, confirmed deployed).
- **Soft gate trial enforcement** — PaymentGate component, AuthContext `isSoftGated`, migration 010 (subscription_status/paid_through/trial_started_at columns). $10/mo or $100/year via Zelle.
- **Zelle QR code** increased to 300px (store) and 300px max-width (Apex PaymentGate) after user reported too small to scan.
- **"Save $20" badge removed** from both website pricing and Apex PaymentGate — school year is only 10 months, savings math doesn't apply.

### clearpathedgroup.com Updates
- **Hero carousel** — Replaced static Waypoint-only hero card with auto-cycling carousel (5-second interval) showing both live products: Waypoint (green "Live Product" badge, DAEP compliance tags, "Launch App" CTA) and Apex (orange "Live Product" badge, instructional leadership tags, "Free Trial" + "Buy Now" CTAs). Dot navigation for manual switching.
- **Apex Buy Now** — Added "Buy Now" button to Apex product section and hero carousel Apex slide. Links to new Apex Pricing section with $10/mo and $100/year cards, Zelle QR code (240px), and payment instructions.
- **Stats bar** updated from "1 Live — 3 in Suite" to "2 Products Live".
- **Hero copy** updated: "Our flagship product, Waypoint, is live today" → "Two products live today — Waypoint and Apex."
- **`zelle-qr.jpg`** copied into `clearpath-site/` directory for deployment.

### Ops Command Center (`clearpath-ops.pages.dev`)
- **URLs tab** — Full CRUD for tracking product/website/internal/social URLs with category filters. 8 starter URLs pre-loaded (Waypoint app, Apex app, company site, store, TpT store, ops center, both Supabase dashboards).
- **PD Calendar tab** — Full CRUD for professional development sessions with date, time, audience, description, join link, and status filters (planned/confirmed/completed/cancelled). Date display with month/day cards.
- Both tabs added to sidebar nav, TITLES object, showTab routing, and state JSON.
- State updated in ops Supabase (`xbpuqaqpcbixxodblaes`).
- Site HTML pushed to GitHub (`jkculley-cyber/clearpath-ops`), auto-deployed via Cloudflare Pages.

## Commits Pushed (waypoint repo — clearpath-site)
- `9cb797f` — feat: replace store checkout with TpT + Zelle dual purchase options
- `ae4ec71` — fix: increase Zelle QR code size from 100px to 200px
- `a2091c1` — fix: increase Zelle QR to 300px for desktop scanning
- `f2b5d55` — feat: hero carousel cycling between Waypoint and Apex every 5 seconds
- `2556567` — feat: add Apex Buy Now button + pricing section with Zelle on website
- `fb8bc61` — fix: remove Save $20 badge from Apex pricing

## Commits Pushed (clearpath-apex)
- `3136052` — fix: increase Zelle QR to 300px for desktop scanning
- `68cc524` — fix: remove Save $20 badge from PaymentGate

## What's Next
1. **Apply migration 009 + 010 to Apex Supabase** — framework columns + subscription columns (SQL Editor)
2. **Build admin panel for Kim** — mark principals as `active` with `paid_through` date after Zelle payment
3. **Apply migration 059 to Waypoint Supabase** — enables DAEP campus picker
4. **Remaining audit bugs** — #9 (generate-communication no auth), #10 (CORS too permissive), #11 (password verify)
5. **SPF record** — add `include:spf.resend.com` to clearpathedgroup.com DNS

## Blockers
- None
