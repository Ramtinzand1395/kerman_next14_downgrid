# Design QA — landing and product art banners

## Source visual truth

- Landing references: `public/hero/photo_2026-10-28_16-36-59.webp`, `photo_2026-10-28_16-36-02.webp`, `photo_2026-10-28_16-36-00.webp`, and `photo_2026-10-28_16-35-57.webp`.
- Product-art references: `public/hero/inosuke-banner.webp`, `ezio-banner.webp`, `anime-banner.webp`, `devil-jin-banner.webp`, and `skull-banner.webp`.
- Each supplied source is 2048×682 (approximately 3:1). Every source was inspected at full view before implementation.
- Implementation evidence was captured at 1440×1000 CSS px and 390×844 CSS px, device scale 1.

## States and evidence

Landing slider:

- Desktop game-install state: `artifacts/banner-qa/landing-desktop-game-final.png`
- Desktop Inosuke state: `artifacts/banner-qa/landing-desktop-inosuke-final.png`
- Mobile game-install state: `artifacts/banner-qa/landing-mobile-game.png`
- Verified all five slide images, CTA labels and destinations, 6-second autoplay, pause/resume, reduced-motion behavior, swipe, keyboard controls, and no horizontal overflow.

Product-art slider:

- Desktop Ezio state: `artifacts/banner-qa/products-desktop-ezio-final.png`
- Mobile Ezio: `artifacts/banner-qa/products-mobile-ezio-final.png`
- Mobile anime: `artifacts/banner-qa/products-mobile-anime-final.png`
- Mobile Devil Jin: `artifacts/banner-qa/products-mobile-devil-jin-final.png`
- Mobile skull soldier: `artifacts/banner-qa/products-mobile-skull-final.png`
- Verified all four states, arrow keys, previous/next buttons, indicators, swipe, no autoplay, no links/CTAs, preserved product search/filter/sort/pagination behavior, and no horizontal overflow.

## Accessibility and runtime checks

- Product slider scoped axe scan: 0 violations, 0 incomplete checks.
- Landing slider scoped axe scan: 0 violations; 1 incomplete automated contrast check because the text sits over a raster image. Manual review confirmed white text remains on the intentionally dark, empty side of the supplied artwork.
- Clean warmed browser sessions reported no console errors on landing or products.
- Custom typefaces loaded at the required weights: Estedad 600/800/900, Lalezar 400, and Vazirmatn 800.

## Issue history

- P2: inactive product indicators lacked sufficient visible differentiation. Fixed with explicit panel, border, and indicator colors; post-fix screenshots captured.
- P2: local font fallbacks initially resolved to the site font. Fixed the family declarations and confirmed exact computed families and weights in-browser.
- P2: the mobile Devil Jin heading wrapped awkwardly. Adjusted the responsive heading size/width and recaptured all product mobile states.

## Final result

passed
