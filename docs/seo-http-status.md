# HTTP status and canonical host correction

Missing product and article pages must return HTTP 404, rather than a streamed
200 response containing a not-found message. Their metadata resolution now calls
`notFound()` for absent records. Backend failures still propagate as server errors.

Next.js 14 can commit a 200 response through ancestor `loading.tsx` Suspense
boundaries even when metadata eventually calls `notFound()`. Therefore the public
fallback, blog fallback, and product/article detail loading boundaries are removed.
Other route-specific loading files and reusable skeleton components remain.
The affected routes wait for existence checks instead of showing a route skeleton.
Do not add ancestor loading boundaries without running the HTTP regression test.

`next.config.js` redirects the exact www host to HTTPS without www using 308.
Path and query are preserved; local and preview hosts are unaffected.
HTTPS terminates at ArvanCloud, while this VPS listens only on port 80 and Nginx
sets X-Forwarded-Proto from its own HTTP connection. Do not redirect the canonical
host based on that header: public HTTPS requests would loop. Enforce public
HTTP-to-HTTPS at the CDN edge, and verify its setting separately. No CDN or VPS
configuration is modified by this PR. Do not blindly trust client forwarding headers.

## Validation

- `npx tsc --noEmit` checks the complete application.
- `npm test` includes `seo-http.test.mjs`. The regression test extracts the actual
  product/blog metadata functions and builds a small production Next.js server
  using controlled data access, the actual redirect configuration, and the same
  loading-boundary presence. It checks missing records (404 and noindex), existing
  records (200), backend errors (500), browser/bot requests, query/encoded path
  preservation, and absence of loops and redirects on development/preview hosts.
- No live MongoDB data or production settings are changed by these tests.
- The fixture build is not a full store build. Production environment variables
  and the real reverse proxy still need deployment-time verification.

After deployment verify original removed URLs, one published product and article,
HTTPS www redirects, HTTP upgrades, and canonical URLs. No slug migration or
blanket redirects for deleted products are included: only use a replacement
redirect when the replacement is confirmed to be the same product/content.
