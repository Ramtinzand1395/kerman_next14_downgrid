# Design QA — Kerman Atari landing page

final result: passed

## Comparison inputs

- Reference: `C:\Users\Ramtin\Downloads\Kerman Atari Persian E-commerce Landing Page.png`
- Reference size: 725 × 2170 px
- Final implementation capture: `D:\vercel_kermanatari\design-qa-implementation-725-final.png`
- Final capture size: 710 × 2820 px at a 725 × 900 CSS viewport (15 px browser scrollbar)
- Side-by-side full comparison: `D:\vercel_kermanatari\design-qa-comparison-725.png`
- Focused top comparison: `D:\vercel_kermanatari\design-qa-comparison-top-725.png`
- Responsive evidence: `D:\vercel_kermanatari\design-qa-mobile-375.png` and `D:\vercel_kermanatari\design-qa-desktop-1440.png`

## Full-view findings

- Section order, RTL structure, blue/white visual system, rounded panels, hero, quick actions, promotional banner, catalog areas, repair block, service flow, benefits, FAQ, articles, map, and footer match the reference hierarchy.
- The three supplied campaign assets are used directly and retain their intended cropping and focal points.
- Published MongoDB content is used for products, consoles, genres, and articles. The reference contains more catalog cards than the database currently publishes; empty panel space is preserved instead of inventing products, prices, or articles.
- The implementation is taller than the static reference because the real catalog is sparse and the responsive/touch targets remain accessible. This is an intentional content constraint, not an unresolved visual defect.

## Responsive checks

| Viewport | Document scroll width | Result |
| --- | ---: | --- |
| 375 px | 360 px | pass — no horizontal overflow |
| 390 px | 375 px | pass — no horizontal overflow |
| 725 px | 710 px | pass — no horizontal overflow |
| 768 px | 753 px | pass — no horizontal overflow |
| 1440 px | 1425 px | pass — no horizontal overflow |

## Interaction and console checks

- Game tabs and equipment tabs change their selected state and rendered catalog data.
- FAQ details expand correctly; the first item is open by default.
- Search submits the expected `/products?q=...&page=1&sort=newest` destination.
- Pickup/delivery messaging is truthful: in-store request is available and courier delivery is visibly disabled.
- Fresh production browser session: no page errors and no console errors.
- Production build completed successfully; lint and TypeScript checks passed.

## Iteration history

1. Initial comparison found an incorrect hero crop, lazy campaign/repair imagery, excessive section height, and an oversized footer.
2. The second pass corrected focal points, eager/priority loading, panel dimensions, catalog card density, FAQ spacing, and footer height.
3. Mobile QA found logo intrinsic sizing causing horizontal overflow; the logo was constrained to 28 × 28 px and retested.
4. Final cold-load comparison found no actionable P0, P1, or P2 visual issues. The only remaining difference is expected real-data density versus the illustrative mock.

---

# Design QA — service ordering section (2026-10-06)

final result: passed

## Comparison inputs

- Source visual truth: `C:\Users\Ramtin\Downloads\سه مرحله تا خدمات گیمિંગ.png` (filesystem-resolved attachment; 1456 × 1086 px).
- Browser-rendered implementation: `D:\vercel_kermanatari\artifacts\service-order-final-1440.png` (1440 × 1200 px).
- Side-by-side comparison: `D:\vercel_kermanatari\artifacts\service-order-comparison.png` (2849 × 1086 px).
- CSS viewport: 1440 × 1200 px, device scale factor 1, unauthenticated landing-page state after the entrance animation completed.
- Normalization: the implementation was cropped to the service section (1440 × 1136 px) and proportionally downsampled to the source height for the side-by-side comparison. The site container remains intentionally narrower than the standalone mockup canvas.

## Findings

- No actionable P0, P1, or P2 mismatches remain.
- Typography: the project Vazirmatn/Vazir font, black display weights, responsive heading sizes, line heights, and RTL wrapping preserve the source hierarchy. At 1024 px the button labels were tightened to remain single-line.
- Spacing and layout: the three equal-height step cards, dotted desktop connectors, section rhythm, paired fulfillment cards, radii, borders, and soft shadows match the source structure. The implementation honors the existing 1320 px site container requested in the brief.
- Colors and visual tokens: navy headings, vivid blue emphasis, pale blue backgrounds, white surfaces, and gray disabled courier state have sufficient contrast and follow the source palette. The courier's gray state is an intentional product-truth override from the user brief.
- Image quality: all seven supplied assets load through `next/image`; transparent step/decorative assets use contain behavior, and storefront/courier images use controlled cover crops with white edge fades. Browser checks reported nonzero natural widths for every asset.
- Copy and content: all required Persian copy is HTML text. The source's available courier label and active blue CTA were intentionally replaced by «به‌زودی», a real disabled button, and the required explanatory message.
- Icons and accessibility: supporting icons come from the existing Lucide dependency; the active link and disabled button are semantic, the active link has a visible focus ring, tap targets are at least 48 px, decorative images have empty alt text, and reduced motion is respected.

## Responsive evidence

| Viewport | Evidence | Result |
| --- | --- | --- |
| 360 × 800 | `artifacts/service-order-360.png` | pass — cards stack 1, 2, 3 in RTL order; no horizontal overflow |
| 390 × 844 | `artifacts/service-order-390-methods.png` | pass — fulfillment cards stack; disabled courier state and image remain readable |
| 768 × 900 | browser geometry check | pass — 753 px document width, buttons remain inside cards |
| 1024 × 1000 | `artifacts/service-order-1024.png` | pass — fulfillment cards are side by side without clipping |
| 1440 × 1200 | `artifacts/service-order-final-1440.png` | pass — desktop layout and mockup proportions verified |

## Interaction and runtime checks

- «دریافت نوبت حضوری» resolves to `/my-profile?step=6`; in an unauthenticated browser it redirected to `/auth/login` with that exact URL preserved as `callbackUrl`.
- «ارسال با پیک؛ به‌زودی» is a native disabled button and creates no route or form.
- Browser page errors: none.
- Framework error overlay: absent.
- Browser console: no errors; one pre-existing logo aspect-ratio warning outside this section.
- All seven new image requests completed successfully with no 404s.

## Focused comparison evidence

- A separate focused crop was not needed: the source itself is a single bounded section and the 2849 × 1086 side-by-side comparison preserves legible typography, icons, status states, imagery, and both card groups in one view.

## Comparison history

1. Initial responsive pass found the two fulfillment cards stacking at 1024 px and CTA labels wrapping.
2. The grid breakpoint was moved to 1024 px and CTA typography/padding was tightened.
3. Post-fix 1024 px and 1440 px captures show two cards side by side, one-line CTAs, correct image crops, and no overflow.

## Follow-up polish

- P3: the decorative dot clusters could be moved a few pixels closer to the standalone mockup positions, but the current placement does not affect hierarchy, reading, or interaction.
