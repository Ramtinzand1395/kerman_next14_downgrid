# Catalog route and About-page SEO review — 9 November 2026

Base: `origin/main` at `8e0498e`. Changes are isolated in `fix/catalog-routes-about-seo`.

## Route contract

| URL | Intended behavior |
| --- | --- |
| `/products` | All published products, indexable |
| `/products?sort=newest&page=1` | Same default listing, indexable, canonical `/products` |
| `/products?page=2` (also with default `sort=newest`) | Indexable; canonical `/products?page=2` |
| `/categories` | Directory of category landing pages |
| `/category/consoles` | Console landing page, including descendant categories |
| `/category/consoles?sort=newest&page=1` | Same collection; indexable if populated; clean canonical |
| `/category/gaming-wall-art?page=2` | Separate pagination canonical |
| `/category/<slug>?tag=...`, text search, price sorting, stock filter | `noindex, follow`; canonical to the base collection |
| `/products?category=<slug, ID, Persian name or old English label>` | Permanent 308 redirect to the current category slug; preserve search, tag, stock, sort and pagination |
| `/category/services` | Existing permanent redirect to `/services` |
| Unknown category / pagination beyond the last category page | HTTP 404 |

The old all-products page remains available. Category landing pages complement it; there is no reason to redirect the complete catalog to one category. Default query parameters alone must not make the all-products page noindex.

## Fixes

- Homepage hero, product tabs, equipment links, console shortcuts, product category links and buying-guide links now point directly at category landing pages. No product slug or ID changes.
- The old `Gaming Wall Art` link failed the strict slug decoder because it contains spaces. The legacy resolver now accepts old labels, encoded names and IDs against the actual valid catalog, while category path slugs retain their existing strict validation.
- Default newest sorting no longer makes the all-products listing noindex; page 2 keeps its canonical. Product-list JSON-LD pagination positions and Open Graph URLs are aligned.
- Stock filtering survives legacy redirects.
- The product filter links services to `/services` and avoids repeated React keys for service shortcuts.
- WebSite SearchAction now uses the real `/products?q=...` route, replacing nonexistent `/search`.
- About content now describes the actual Kerman store, user-confirmed 40+ years of service, PS4/PS5 installation, products, wall art, address and relevant internal links. AboutPage identifies the same Organization/WebSite as the layout. The sitemap records the actual content-change date.

## External canonical investigation

URL Inspection reports `/about-us` excluded as a duplicate, with Google-selected canonical `https://www.747live.bet/`, despite the user-declared canonical being `https://kermanatari.ir/about-us`.

A real Search Console live test on 9 November returned **URL is available to Google / Page can be indexed**. Its tested HTML shows the Kerman Atari page title, introduction and correct self canonical. Google received HTTP 200; response headers showed `Server: ArvanCloud`, `X-Cache: BYPASS`, `x-nextjs-cache: HIT`. No HTTP Link canonical or redirect was present in the displayed response headers. These current observations do not reveal the earlier cause of Google's cross-domain clustering.

Repository review:

- The current About metadata, site URL helper, redirects and middleware do not reference the external domain.
- A history search across available refs found no `747live` occurrence in app/lib/routing configuration.
- About-page commit `5a82866` (9 September) switched the metadata base to the shared site helper; `68201ed` (24 October) only changed shipping wording. Neither points to that external domain.
- Current ordinary and Googlebot-user-agent HTTP requests both returned the legitimate page and self canonical. A spoofed UA test is supplementary; the Search Console live test above is the real Google fetch evidence.
- Google Security issues and Manual actions reports both showed no issues during this session.
- The external domain returned 403 to the diagnostic HTTP request, so its content could not be compared. This is not evidence of bot detection or compromise.

**Limit:** there is no authenticated VPS/Nginx/ArvanCloud administration connection in this workspace. Deployed Nginx config, historic access/error logs, WAF responses and CDN rules were not inspected directly. No claim is made that historical compromise or alternate responses have been ruled out. Do not change proxy/TLS settings based on the canonical discrepancy alone.

Deployment follow-up:

1. Check the VPS virtual-host/default-host routing, redirect/rewrite rules, HTTP Link headers, CDN cache/WAF behavior and actual Googlebot access logs for `/about-us` around the recorded 8 November crawl.
2. Deploy the reviewed branch, confirm the new About text, one self canonical and a 200 response on the public site, and check HTTP/www variants preserve path and query. Public HTTPS terminates at ArvanCloud; do not introduce a redirect loop by trusting the VPS HTTP-origin header.
3. Run Search Console live test again, then request indexing of `/about-us` once the new version is live. No request for the unpublished new text has been submitted.
4. Check the indexed canonical later; a successful live test or indexing request does not guarantee that Google immediately changes its selected canonical.

## PS5 controller case

Read-only lookup of `ps5-dualsense-controller-carry-case-black` in the site's products collection found status **draft**, stored stock **1**, product type **single**. It has not been physically deleted; its public 404 is expected for a draft.

For a previously published product that is only temporarily unavailable, prefer published + real stock 0: keep the useful product page, disable purchase and show OutOfStock in schema. Draft is appropriate for unfinished/unapproved or deliberately hidden content. Do not assume the stored stock equals current physical inventory. This review does not modify product publication or stock.

## Verification

- Full test suite: 256 passed, 3 intentionally skipped, 0 failed (259 total).
- Category HTTP regression includes slug/ID/Persian/old-English redirects, encoded labels, filter preservation, default-sort indexing, pagination canonicals and real 404/500 responses, using controlled data.
- TypeScript and production build passed; only the pre-existing footer `no-img-element` warning was observed.
- Live route audit results are recorded below after completion. Live observations describe the deployed main version; branch corrections are verified locally and are not yet deployed.

### Live route audit result

164 address variants checked: all 98 sitemap URLs, all 19 database category slugs, their default query variants and legacy category links, homepage/category-directory links, and negative controls. Result: 161 returned HTTP 200 after redirects, and 3 returned the expected 404s (the draft controller case, a deliberately nonexistent category and deliberately out-of-range pagination). No sitemap URL failed or declared noindex. Non-ASCII/space-containing hrefs were percent-encoded for HTTP transport before evaluating the result.

The old `Gaming Wall Art` name remained on `/products?...` with noindex in production (both raw/encoded spellings describe the same link); the branch regression verifies it now 308-redirects to `/category/gaming-wall-art`. All 19 slug-based legacy category links already redirected; direct internal links avoid that extra hop. The audit covers emitted public catalog paths, not every possible arbitrary URL or authenticated dashboard route.
