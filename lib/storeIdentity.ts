export type StoreIdentitySnapshot = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

// These values are the same public business details used on /contact-us.
// Tax identifiers are intentionally absent because the project has no verified data for them.
export const CURRENT_STORE_IDENTITY: StoreIdentitySnapshot = {
  name: "کرمان آتاری",
  phone: "۰۹۳۸۳۰۷۷۲۲۵",
  email: "info@kermanatari.ir",
  address:
    "کرمان، خیابان باهنر (ناصریه)، بین کوچه ۲ و ۴، جنب داروخانه مادر",
};

export function createStoreIdentitySnapshot(): StoreIdentitySnapshot {
  return { ...CURRENT_STORE_IDENTITY };
}
