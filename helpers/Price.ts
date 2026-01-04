export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fa-IR").format(price);
};

export const calculateDiscountPercent = (
  original: number,
  discounted: number
): number => {
  if (!original || !discounted) return 0;
  return Math.round(((original - discounted) / original) * 100);
};

export const toPersianDigits = (n: string | number): string => {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return n.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
};

