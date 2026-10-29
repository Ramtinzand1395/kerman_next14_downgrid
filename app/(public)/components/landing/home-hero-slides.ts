export type HeroSlide = {
  id: string;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
  };
  accent: string;
  panel: string;
  text: string;
  mutedText: string;
  buttonText: string;
  headingFont?: "estedad";
  headingWeight?: 800;
  courierOnly?: boolean;
  priority?: boolean;
};

export const HOME_HERO_SLIDES: HeroSlide[] = [
  {
    id: "game-installation",
    image: "/hero/photo_2026-10-28_16-36-59.webp",
    imageAlt: "کنسول پلی استیشن ۵ و دنیاهای مختلف بازی",
    title: "بازی بعدی‌ات رو انتخاب کن",
    description: "بازی‌های دلخواهت رو انتخاب کن و درخواست نصب بده",
    primaryCta: {
      label: "انتخاب بازی و ثبت درخواست",
      href: "/my-profile?step=6",
    },
    accent: "#36d7ff",
    panel: "#051a3f",
    text: "#ffffff",
    mutedText: "#dbeafe",
    buttonText: "#032251",
    priority: true,
  },
  {
    id: "gaming-wall-art",
    image: "/hero/inosuke-banner.webp",
    imageAlt: "تابلوی اینوسکه زیر ماه آبی برای دکور اتاق گیمینگ",
    title: "قهرمانت، روی دیوار تو",
    description: "از دنیای بازی و انیمه، برای اتاق تو",
    primaryCta: {
      label: "دیدن تابلوها",
      href: "/products?category=gaming-wall-art&sort=newest&page=1",
    },
    accent: "#4ad8ff",
    panel: "#071827",
    text: "#ffffff",
    mutedText: "#d9f3ff",
    buttonText: "#03243a",
    headingFont: "estedad",
    headingWeight: 800,
  },
  {
    id: "courier",
    image: "/hero/photo_2026-10-28_16-36-00.webp",
    imageAlt: "پیک موتوری همراه کنسول پلی استیشن برای دریافت و تحویل دستگاه",
    title: "تو خونه بمون، کنسولت رو بسپار به ما",
    description: "درخواست دریافت و تحویل دستگاه در کرمان",
    primaryCta: {
      label: "ثبت درخواست پیک",
      href: "/my-profile?step=6&fulfillment=courier",
    },
    accent: "#5ee8ff",
    panel: "#06224c",
    text: "#ffffff",
    mutedText: "#dbeafe",
    buttonText: "#032251",
    courierOnly: true,
  },
  {
    id: "repair",
    image: "/hero/photo_2026-10-28_16-35-57.webp",
    imageAlt: "تعمیر دسته پلی استیشن روی میز کار تخصصی",
    title: "برگرد به جریان بازی",
    description: "درخواست بررسی و تعمیر کنسول و دسته",
    primaryCta: {
      label: "ثبت درخواست تعمیر",
      href: "/my-profile?step=6",
    },
    accent: "#65d8ff",
    panel: "#071d42",
    text: "#ffffff",
    mutedText: "#dbeafe",
    buttonText: "#032251",
  },
  {
    id: "gaming-accessories",
    image: "/hero/photo_2026-10-28_16-36-02.webp",
    imageAlt: "هدست، دسته و کابل پلی استیشن برای تکمیل ستاپ گیمینگ",
    title: "ستاپت رو کامل کن",
    description: "لوازم موردنیازت رو برای تجربه بهتر پیدا کن",
    primaryCta: {
      label: "دیدن لوازم جانبی",
      href: "/products?category=gaming-accessories&sort=newest&page=1",
    },
    accent: "#62e4ff",
    panel: "#061b44",
    text: "#ffffff",
    mutedText: "#dbeafe",
    buttonText: "#032251",
  },
];
