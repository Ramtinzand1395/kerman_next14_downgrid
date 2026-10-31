# Category landing pages and SEO branch review

Reviewed against `main` at `5cb5bb35665073f46374207ee3014fc27b099e2d` (31 October 2026).

## Decisions carried forward

- Existing `/product/[slug]` URLs, product IDs and variant relationships stay intact.
- A different artwork remains a distinct product; size and frame/mounted options remain variants.
- `/categories` is the crawlable category directory. `/category/[slug]` serves every valid database category, including subcategories at any depth. The globally unique category slug gives each category one stable URL even when its parent changes.
- Categories derive their hierarchy and counts from MongoDB, not the hard-coded menu. The directory exposes the complete current tree; menu shortcuts and the product filter point to landing pages.
- Existing `/products?category=<slug>` links permanently redirect to the corresponding landing page, retaining search, tag, sort and pagination parameters. Products are never redirected or renamed.

## Delivered behavior

The new pages render products on the server using direct database queries, with no calls to the production website from the new pages. Only published, non-deleted products count or appear. A parent includes all descendants, not just its immediate children.

Responsive category pages provide breadcrumbs, child collections, sibling links, search, tag filters, in-stock filtering, price/newest sorting, empty states, and crawlable pagination links. Price sorting and stock filtering use active multi-product variants. Existing product cards preserve the cart/favorite/variant behavior.

Each page includes one H1, a unique category title/description, a buying guide, visible FAQs, CollectionPage/ItemList/BreadcrumbList JSON-LD and internal links. Existing product-family guides provide initial Persian copy. Unknown new categories receive a conservative default. Rich original copy can be edited per category in Dashboard → Products → category management → pencil icon. Fields are optional; no data migration is necessary. The superadmin endpoint updates SEO fields only and rejects slug, hierarchy and unknown fields. HTML is not interpreted in edited text; JSON-LD escapes `<`.

Clean populated category pages are indexable and enter the dynamic sitemap. Empty categories remain available but are noindex and excluded from the sitemap. Search, tag, stock and non-default sort views are noindex, follow and canonicalize to the base collection. Unfiltered page 2+ has its own canonical. Missing categories and pages beyond the final page return 404; service failures remain server errors. Malformed/cyclic/orphan categories are omitted rather than publishing broken paths. FAQs are visible content, without implying eligibility for Google's restricted FAQ rich results.

## Existing branch readiness

| PR | Branch | Review result |
| --- | --- | --- |
| #36 | `fix/seo-status-canonical-redirects` | Mergeable; missing-record status and domain redirect changes included. Regression fixture passes. Includes the ArvanCloud compatibility correction: canonical-host requests are not redirected based on the HTTP origin header. |
| #37 | `fix/blog-sitemap` | Mergeable; published blog sitemap changes included, with category URLs added on top. |
| #38 | `fix/merchant-policy-schema` | Mergeable; return-policy/schema changes included. No fabricated shipping/rating data. |

All three remote PRs were still Draft, had no unresolved review threads, and had only a successful GitGuardian check, not a store build workflow. They merge together without conflicts. This feature branch includes their original commits and verifies the combined code. The latest production workflow for the current main commit completed successfully on 30 October 2026 at 18:37 Tehran time. POS integration (#32), cheapest default variant (#33), and checkout/shipping (#34–35) were already merged into main.

## Validation and limits

- `npm test`: **85 passed, 0 failed**. Unit/service/authorization/sitemap tests plus real production Next.js HTTP fixtures use controlled data, never the store database.
- `npx tsc --noEmit` and `git diff --check`: passed.
- `npm run build`: full store build passed without production credentials. Dynamic data is intentionally resolved at runtime. One pre-existing `no-img-element` warning remains in the public footer.
- New PR validation workflow runs install, tests, type checking and full build, without production secrets.
- No database writes, main updates, deployment or Search Console submissions are part of this branch.

Before release, review the combined diff and run with the deployment environment's existing configuration. After release, check the live category directory, a populated category, a child category, page 2, a missing slug, legacy query redirects and sitemap. Verify public HTTP-to-HTTPS at the ArvanCloud CDN edge as noted in `docs/seo-http-status.md`; then resubmit the sitemap and inspect category URLs in Search Console. Indexing and search ranking are not guaranteed by code or build success.

Official reference: https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites
