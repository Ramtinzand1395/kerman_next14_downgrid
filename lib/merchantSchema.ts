/** Custom product categories are Text, not guessed Google taxonomy IDs. */
export function normalizeProductCategory(category: unknown): string | undefined {
  const raw = typeof category === "string"
    ? category
    : category && typeof category === "object" && "name" in category
      ? category.name
      : undefined;
  if (typeof raw !== "string") return undefined;
  const name = raw.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ").trim();
  if (!name || name.length > 750 || !/\p{L}/u.test(name) ||
      /^[a-f\d]{24}$/i.test(name) || /^https?:\/\//i.test(name)) return undefined;
  return name;
}

export function merchantReturnPolicyId(siteUrl: string): string {
  return `${new URL(siteUrl).origin}/terms#return-policy`;
}

/**
 * Google supports a policy-page link at Organization level. The visible policy
 * uses working days and product exceptions, so do not invent calendar-day rules
 * or declare returns forbidden for digital products as a blanket policy.
 */
export function buildMerchantReturnPolicy(siteUrl: string) {
  return {
    "@type": "MerchantReturnPolicy",
    "@id": merchantReturnPolicyId(siteUrl),
    merchantReturnLink: `${new URL(siteUrl).origin}/terms#returns`,
  };
}
