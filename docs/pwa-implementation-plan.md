# Kerman Atari PWA — implementation plan (existing UI)

Branch: `feature/pwa-existing-ui`. Scope: add installability while preserving the current public UI, URLs, SEO, authentication and checkout. No production deployment or database migration in phase 1.

## Verified repository baseline
- Next.js 14.2.35, React 18.2.0, Node 24.x, App Router, NextAuth 4, MongoDB/Mongoose (package.json).
- Public shell is `app/(public)/layout.tsx`; homepage is `app/(public)/page.tsx` and uses `force-dynamic`.
- Product route: `app/(public)/product/[slug]/page.tsx`; existing metadata/canonical must remain unchanged.
- Auth middleware guards `/dashboard`, `/my-profile`, `/notifications`.
- `app/api/profile/orders/route.ts` already uses dynamic/no-store.
- No `app/manifest.ts` or `public/sw.js` was found at checked paths on main. This does not prove no other worker exists.
- `next.config.js` has image redirects, Cloudinary image support and SHA-gated build validation; preserve all of these.

## Implementation
1. Inventory all routes, static assets, payment/OTP endpoints, current caching headers, root layouts and any existing service-worker registration. Verify deployed production headers separately.
2. Add `app/manifest.ts` with Persian name, short name, RTL direction if supported, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, existing theme colors, 192/512 PNG and maskable icons. Use real Kerman Atari logo; do not generate substitute branding.
3. Add minimal `public/sw.js` and client registration component in public layout. Begin with navigation network-first and offline fallback only, or no navigation caching until verified. Never cache authenticated HTML, NextAuth/OTP/payment/admin/API responses, RSC flight requests, checkout/cart, order details or pricing/inventory API. Do not blindly cache all GETs.
4. Add lightweight Persian offline page and online-only explanation for checkout/payment.
5. Add unobtrusive install guidance for Android and manual Add to Home Screen instructions for iOS. Do not change existing navbar, footer, page templates or SEO routes.
6. Add service-worker versioning, activation/cleanup and safe update prompt. Test old tab/new deploy, open checkout and payment redirect during update.
7. Add response headers for worker script (no-cache) and review CSP; keep existing redirects and middleware.
8. Add automated tests for manifest, scope, asset existence, cache exclusions and registration; run `npm test`, build, and browser installability tests.
9. QA Android Chrome and iOS Safari: installation, OTP/login, product variants, price/stock refresh, cart, courier forms, payment interruption/reconciliation, order history, offline and returning online.
10. Deploy to staging first, compare Lighthouse PWA/accessibility/performance, then merge to main only after acceptance.

## Acceptance criteria
- Current public UI and canonical URLs unchanged.
- Installed PWA and browser website use same live database/API; changed prices/stock are not served from stale service-worker caches.
- No private/auth/payment content is persisted by service-worker cache.
- OTP, courier, cart, checkout, Zarinpal callback and paid-order recovery work after install.
- SW updates do not strand users on stale bundles; installability works on supported Android and iOS paths.
- CI build/tests pass, staging signoff complete, rollback plan documented.

## Open audit items
- Locate root app layout and all existing client registration/notification code.
- Inspect payment verification and interrupted callback behavior, and all sensitive route cache headers.
- Verify available logo dimensions, deployed HTTPS/manifest headers, and browser installability.
- Review dependency vulnerabilities separately; avoid bundling unrelated major upgrades into PWA change.
