# Design QA — Kerman Atari landing page

- Source visual truth: C:\Users\Ramtin\Downloads\Kerman Atari Persian E-commerce Landing Page.png
- Browser-rendered implementation: C:\Users\Ramtin\.codex\visualizations\2026\10\03\01a10203-b848-71c1-a2d8-76111f90378d\landing-1440-final.png
- Mobile evidence: C:\Users\Ramtin\.codex\visualizations\2026\10\03\01a10203-b848-71c1-a2d8-76111f90378d\landing-390-final.png
- Combined comparison: C:\Users\Ramtin\.codex\visualizations\2026\10\03\01a10203-b848-71c1-a2d8-76111f90378d\design-comparison.png
- Viewports checked: 360×800, 390×844, 768×900, 1024×900, and 1440×1000 CSS px.
- Source pixels: 725×2170. Implementation pixels: 1425×7035 (the 15 px difference from 1440 is the desktop scrollbar gutter). Device scale factor: 1.
- Density normalization: the implementation was displayed at 725 px wide beside the 725 px-wide source in the combined comparison; aspect ratios were preserved and both images were top-aligned.
- State: public landing page, signed out, real published database content, all reveal animations completed.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- Typography: the existing Vazir local font, heavy display weights, RTL wrapping, compact labels, and button hierarchy match the source direction. Long product names remain line-clamped inside their cards.
- Spacing and layout rhythm: the hero, quick actions, promotional banner, product rails, repair split panel, service steps, FAQ, editorial area, visit panel, and existing footer follow the source hierarchy. The implementation is intentionally longer because the written brief requires 64–96 px desktop section spacing and because real content density differs from the concept mockup.
- Colors and tokens: the current site navy/blue palette, white surfaces, pale-blue background, red promotional badge, rounded corners, and restrained shadows are preserved.
- Image quality: all three supplied source assets are used with next/image, responsive sizes, intentional crops, and lazy loading below the fold. Product image failures use the existing fallback component. No screenshot or CSS drawing is used as page UI.
- Copy and content: approved hero, copy-hack, service, appointment, pickup, FAQ, address, opening-hour, and CTA copy is present. Empty game/genre sections are hidden because the database currently has no published products for them.
- Responsive behavior: measured scrollWidth equals clientWidth at 360 and 390 px. The 768/1024/1440 differences are only the browser scrollbar gutter. Mobile hero stacks image and copy, actions use a two-column grid, products use a horizontal rail, steps stack, service cards stack, and the mobile bottom navigation is present.

## Comparison history

1. First browser pass: P1 — product and article sections were absent because the Comment schema was not registered before product population. Fix: registered the existing model in lib/landing-data.ts. Post-fix evidence shows 10 real product links and 1 published article link.
2. Second browser pass: P2 — two-item product and editorial grids occupied only half of the desktop row. Fix: grid column count now adapts to the number of real records. Post-fix evidence is landing-1440-final.png.
3. Final pass: no actionable P0/P1/P2 findings.

## Interaction and runtime checks

- No Next.js error overlay and no Chrome runtime/log exceptions were detected.
- FAQ accordion was activated and reported open: true.
- The mobile bottom navigation computed to display: grid at 390 px.
- The delivery-by-courier control is a disabled button; out-of-stock products keep their existing disabled purchase state.
- Hero product CTA resolves to /products?sort=newest&page=1, appointment CTAs to /my-profile?step=6, repairs to /services, and routing to the address-based Google Maps query.
- After scrolling through the page, all lazy images loaded; the final desktop pass reported zero broken images.

## Follow-up polish

- P3: when more published games, genre-linked products, consoles, or articles are added, the hidden sections and denser grids will appear automatically and more closely match the concept mockup's content density.

final result: passed
