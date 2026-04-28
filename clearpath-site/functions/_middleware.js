// Cloudflare Pages middleware — runs on every request before static-asset
// serving. Used here only for hostname-based routing on the verify subdomain.
//
// On verify.clearpathedgroup.com:
//   /         → 302 to /verify-attestation
//   /index.html → 302 to /verify-attestation
//   anything else → flows through to static assets / Pages Functions normally
//
// On clearpathedgroup.com (and any other custom domain): no-op pass-through.
//
// Why a middleware redirect instead of a static _redirects rule: Cloudflare
// Pages _redirects doesn't support per-hostname conditions, and we serve
// both the marketing site and the verification subdomain from the same
// Pages project (cpeg-site). A middleware lets the verify subdomain land
// directly on the verification page without a /verify-attestation suffix
// in the URL the PDFs stamp.

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.hostname === 'verify.clearpathedgroup.com'
      && (url.pathname === '/' || url.pathname === '/index.html')) {
    const dest = `${url.origin}/verify-attestation`;
    return Response.redirect(dest, 302);
  }

  return next();
}
