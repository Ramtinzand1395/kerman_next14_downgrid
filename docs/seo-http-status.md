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
It also upgrades the canonical host when a trusted reverse proxy supplies
`X-Forwarded-Proto: http`. Path and query are preserved; local and preview hosts
are unaffected. The VPS proxy must overwrite this header from the actual client
scheme (for example `proxy_set_header X-Forwarded-Proto $scheme;`). Existing
HTTP-to-HTTPS handling at the proxy may result in two hops for HTTP www URLs;
a single-hop edge rule can be applied once the real Nginx configuration is reviewed.
Never blindly replace server blocks or trust a client-supplied forwarding header.

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
