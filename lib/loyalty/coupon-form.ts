export type CouponTargetMode = "all" | "categories" | "preserve";

export function couponTargetMode(coupon: { products?: string[]; categories?: string[] }): CouponTargetMode {
  if (coupon.products?.length) return "preserve";
  return coupon.categories?.length ? "categories" : "all";
}

export function couponTargetPayload(mode: CouponTargetMode, categories: string[]) {
  if (mode === "preserve") return {};
  if (mode === "categories" && categories.length === 0) {
    throw new Error("حداقل یک دسته‌بندی را انتخاب کنید.");
  }
  // Switching to category-only deliberately replaces legacy product exceptions.
  return { products: [], categories: mode === "categories" ? [...new Set(categories)] : [] };
}
