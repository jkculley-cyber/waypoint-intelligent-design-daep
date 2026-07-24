# Teacher Engagement Activity Bundles — fulfillment masters

Melissa's classroom engagement bundles, sold on `clearpathedgroup.com/store`.

| Product | Store price | File |
|---|---|---|
| Partner Engagement Activities Bundle | $7.00 | `Bundle #1 Partner Activities.pdf` |
| Small Group Engagement Activities Bundle | $12.00 | `Bundle #2 Group Activities.pdf` |
| Whole Class Engagement Activities Bundle | $12.00 | `Bundle #3 Group Activities.pdf` |
| Check for Understanding Activities Bundle | $9.50 | `Bundle #4 CFUs.pdf` |

## These files are deliberately NOT on the public site

They used to sit in `clearpath-site/downloads/bundles/`, which **is** the deploy
root — so all four were publicly downloadable with no payment check (verified
live 2026-07-22: `application/pdf`, 4.5–11.5 MB, HTTP 200).

Nothing linked them. They were orphaned artifacts, not part of any delivery
path: no `<a href>` anywhere in the site pointed at them, and no bundle license
keys have ever been issued (`product_licenses` only carries `beacon` and
`investigator`). So license-gating them would have hidden them behind keys that
don't exist, and leaving them was giving away paid product.

They now live under `products/`, which is outside the Cloudflare Pages build
output (`clearpath-site/`) and therefore never deployed — same as
`products/campus-leadership-system/`.

**Do not move these back into `clearpath-site/`.**

## How these are delivered

Manual, same as the Campus Leadership Complete System:

1. Buyer registers on `/store` → gets Zelle payment instructions
   (`/api/store-register`) and a lead lands in ops `demo_leads` as
   `REGISTER: <product> ($x)`, status `new`.
2. Match the Zelle deposit to the registration.
3. Email the matching PDF(s) from `support@clearpathedgroup.com`.
4. **Move the lead off `new`** in Waypoint Admin → Demo Leads. This is what
   stops the +2-day payment nudge (`/api/store-drip`).

Note: the drip also skips anyone holding an active license, so existing
customers are never dunned — but these bundles have no licenses, so step 4 is
the only stop condition for them.

## If you ever want self-serve delivery

That needs real license issuance (a `BND-` prefix, keys minted on payment, and
a server-side validated download). It is a project, not a config change — and
worth noting the current `/activate` flow is a **client-side** gate: it reveals
a link to a file that is itself still public, so copying that pattern would not
actually protect these.
