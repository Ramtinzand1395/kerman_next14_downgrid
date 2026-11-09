# Design QA — landing and product art banners

## Source visual truth

- Landing references: `public/hero/photo_2026-10-28_16-36-59.webp`, `photo_2026-10-28_16-36-02.webp`, `photo_2026-10-28_16-36-00.webp`, and `photo_2026-10-28_16-35-57.webp`.
- Product-art references: `public/hero/inosuke-banner.webp`, `ezio-banner.webp`, `anime-banner.webp`, `devil-jin-banner.webp`, and `skull-banner.webp`.
- Each supplied source is 2048×682 (approximately 3:1). Every source was inspected at full view before implementation.
- Implementation evidence was captured at 1440×1000 CSS px and 390×844 CSS px, device scale 1.

## States and evidence

The original desktop and mobile review screenshots were removed from the working
source tree during the 2026-11-09 cleanup. They remain available in Git history
before this cleanup; new captures belong in the ignored `artifacts/banner-qa/`.

- Landing: all five slides, CTA labels and destinations, 6-second autoplay,
  pause/resume, reduced motion, swipe, keyboard controls and horizontal overflow
  were checked in the original review.
- Product art: all four slides, arrow keys, navigation buttons, indicators, swipe,
  preserved search/filter/sort/pagination and horizontal overflow were checked.

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
