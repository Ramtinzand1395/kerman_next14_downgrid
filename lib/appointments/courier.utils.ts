/**
 * Pure city-name matching utilities for courier region resolution.
 *
 * These functions have no external dependencies so they can be imported
 * in tests directly without a database or Next.js context.
 */

/**
 * Normalizes a Persian/Arabic city name for fuzzy matching.
 *
 * Applies in order:
 * 1. Trim surrounding whitespace
 * 2. Remove zero-width / soft-hyphen / ZWNJ-like Unicode control characters
 * 3. Convert Arabic Kaf (ك U+0643) → Persian Kaf (ک U+06A9)
 * 4. Convert Arabic Yeh (ي U+064A) → Persian Yeh (ی U+06CC)
 * 5. Collapse multiple whitespace characters into a single space
 * 6. Strip common city prefixes ("شهر " / "شهرستان ") so that
 *    "شهر کرمان" and "کرمان" both normalise to "کرمان"
 *
 * This is intentionally a fallback path. Prefer ID-based region matching
 * whenever the caller has a reliable regionId.
 */
export function normalizeCityName(city: string): string {
  return city
    .trim()
    // Remove zero-width non-joiner (U+200C), zero-width joiner (U+200D),
    // zero-width space (U+200B), soft hyphen (U+00AD), BOM (U+FEFF)
    .replace(/[\u200B\u200C\u200D\u00AD\uFEFF]/g, "")
    // Arabic → Persian character substitutions
    .replace(/\u0643/g, "\u06A9") // ك → ک
    .replace(/\u064A/g, "\u06CC") // ي → ی
    // Collapse runs of whitespace
    .replace(/\s+/g, " ")
    .trim()
    // Strip leading city-prefix words
    .replace(/^شهرستان\s+/, "")
    .replace(/^شهر\s+/, "");
}

export interface CourierRegion {
  id: string;
  title: string;
  city: string;
  shippingCost: number;
  isActive: boolean;
}

/**
 * Finds the active courier region for a given address.
 *
 * Matching strategy (in priority order):
 * 1. If a valid `regionId` is supplied and the region is active → return it.
 * 2. Fall back to normalized city-name comparison against active regions.
 *    Normalisation is done via `normalizeCityName` so "شهر کرمان", "كرمان",
 *    and "کرمان " all resolve to the same canonical form as "کرمان".
 *
 * Only regions with `isActive === true` are considered in both paths.
 */
export function findCourierRegion(
  city: string,
  regions: CourierRegion[],
  regionId?: string,
): CourierRegion | null {
  // Path 1: authoritative ID lookup (preferred)
  if (regionId) {
    const byId = regions.find((r) => r.id === regionId && r.isActive);
    if (byId) return byId;
  }

  // Path 2: normalized city-name fallback
  const normalizedInput = normalizeCityName(city);
  return (
    regions.find(
      (r) => r.isActive && normalizeCityName(r.city) === normalizedInput,
    ) ?? null
  );
}
