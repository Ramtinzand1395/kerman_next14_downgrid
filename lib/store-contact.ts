import { CURRENT_STORE_IDENTITY } from "@/lib/storeIdentity";

const mapQuery = encodeURIComponent(`${CURRENT_STORE_IDENTITY.name}، ${CURRENT_STORE_IDENTITY.address}`);

// Keep the public storefront hours in one place; booking availability is managed separately.
export const STORE_CONTACT = {
  name: CURRENT_STORE_IDENTITY.name,
  email: CURRENT_STORE_IDENTITY.email,
  phoneNumbers: ["09383077225", "09044754897"],
  address: CURRENT_STORE_IDENTITY.address,
  locality: "کرمان",
  logoPath: "/atari-seeklogo.svg",
  instagramUrl: "https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw==",
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
  mapEmbedUrl: `https://www.google.com/maps?q=${mapQuery}&output=embed`,
  morningHours: "صبح ۹ تا ۱۲:۳۰",
  afternoonHours: "عصر ۴ تا ۸",
  hoursText: "همه‌روزه صبح‌ها از ساعت ۹ تا ۱۲:۳۰ و عصرها از ساعت ۴ تا ۸.",
  openingHours: ["Mo-Su 09:00-12:30", "Mo-Su 16:00-20:00"],
};
