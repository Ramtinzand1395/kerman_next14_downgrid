export type HeroSlide = {
  id: string;
  image: string;
  mobileImage?: string;
  fallbackImage: string;
  imageAlt: string;
  imagePosition?: string;
  mobileImagePosition?: string;
  title: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  priority?: boolean;
};

export const HOME_HERO_SLIDES: HeroSlide[] = [
  {
    id: "gaming-wall-art",
    image: "/images/hero/hero-gaming-art.webp",
    fallbackImage: "/PS5 Hero Banner with Game Cases-1.png",
    imageAlt: "تابلوها و دکور گیمینگ برای اتاق بازی",
    imagePosition: "32% center",
    mobileImagePosition: "32% center",
    title: "دیوارت هم گیمر باشه!",
    description: "تابلوهای گیمینگ و دکوراتیو برای ساختن فضای خاص خودت",
    primaryCta: {
      label: "مشاهده تابلوها",
      href: "/products?category=gaming-wall-art&sort=newest&page=1",
    },
    secondaryCta: {
      label: "همه محصولات",
      href: "/products?sort=newest&page=1",
    },
    priority: true,
  },
  {
    id: "repair",
    image: "/images/hero/hero-repair.webp",
    fallbackImage: "/White controller on blue repair bench-3.png",
    imageAlt: "تعمیر تخصصی دسته و کنسول پلی استیشن",
    imagePosition: "28% center",
    mobileImagePosition: "35% center",
    title: "دسته‌ات خراب شده؟ بسپرش به ما!",
    description:
      "تعمیر تخصصی دسته و کنسول PS4 و PS5 با بررسی دقیق و خدمات حضوری در کرمان",
    primaryCta: {
      label: "ثبت درخواست تعمیر",
      href: "/my-profile?step=6",
    },
    secondaryCta: {
      label: "مشاهده خدمات",
      href: "/services",
    },
  },
  {
    id: "delivery-and-services",
    image: "/images/hero/hero-delivery.webp",
    fallbackImage: "/service-order/Blue courier with gamepad box-2.png",
    imageAlt: "هماهنگی خدمات کنسول و پشتیبانی کرمان آتاری",
    imagePosition: "25% center",
    mobileImagePosition: "34% center",
    title: "خدمات گیمینگ، راحت‌تر از همیشه!",
    description:
      "ثبت درخواست خدمات کنسول، هماهنگی و پیگیری با پشتیبانی کرمان آتاری",
    primaryCta: {
      label: "ثبت درخواست خدمات",
      href: "/my-profile?step=6",
    },
    secondaryCta: {
      label: "ارتباط با پشتیبانی",
      href: "/contact-us",
    },
  },
  {
    id: "gaming-accessories",
    image: "/images/hero/hero-accessories.webp",
    fallbackImage: "/White PS5 console with controller on blue-2.png",
    imageAlt: "دسته، هدست و لوازم جانبی گیمینگ",
    imagePosition: "28% center",
    mobileImagePosition: "36% center",
    title: "گیمینگ حرفه‌ای، تجهیزات حرفه‌ای!",
    description:
      "دسته بازی، هدست و لوازم جانبی کاربردی برای تجربه بهتر بازی",
    primaryCta: {
      label: "مشاهده لوازم جانبی",
      href: "/products?category=gaming-accessories&sort=newest&page=1",
    },
    secondaryCta: {
      label: "مشاهده محصولات",
      href: "/products?sort=newest&page=1",
    },
  },
  {
    id: "playstation-games",
    image: "/images/hero/hero-games.webp",
    fallbackImage: "/PS5 Hero Banner with Game Cases-1.png",
    imageAlt: "بازی‌های پلی استیشن 4 و پلی استیشن 5",
    imagePosition: "30% center",
    mobileImagePosition: "38% center",
    title: "بازی بعدیت رو انتخاب کن!",
    description:
      "بازی‌های جذاب PS4 و PS5، راهنمای انتخاب و خدمات نصب بازی",
    primaryCta: {
      label: "مشاهده بازی‌ها",
      href: "/products?category=games&sort=newest&page=1",
    },
    secondaryCta: {
      label: "درخواست نصب بازی",
      href: "/my-profile?step=6",
    },
  },
];
