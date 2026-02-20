export interface CategoryItem {
  name: string;
  slug: string;
  description: string;
  subcategories: { name: string; slug: string }[];
}

export const categories: CategoryItem[] = [
  {
    name: "کنسول‌ها",
    slug: "consoles",
    description: "خرید انواع کنسول نسل جدید و کلاسیک با ضمانت اصالت",
    subcategories: [
      { name: "پلی‌استیشن 5", slug: "playstation-5" },
      { name: "پلی‌استیشن 4", slug: "playstation-4" },
      { name: "پلی‌استیشن 3", slug: "playstation-3" },
    ],
  },
  {
    name: "بازی‌ها",
    slug: "games",
    description: "بازی‌های جدید، اکانتی و دیسکی برای پلتفرم‌های مختلف",
    subcategories: [
      { name: "بازی اکانتی", slug: "account-games" },
      { name: "بازی دیسکی", slug: "disc-games" },
      { name: "گیفت کارت", slug: "gift-cards" },
    ],
  },
  {
    name: "لوازم جانبی",
    slug: "accessories",
    description: "دسته، هدست و تجهیزات کاربردی برای تجربه بهتر بازی",
    subcategories: [
      { name: "دسته بازی", slug: "controllers" },
      { name: "هدست و هدفون", slug: "headsets" },
      { name: "پایه و خنک‌کننده", slug: "stands-coolers" },
    ],
  },
  {
    name: "لوازم گیمینگ",
    slug: "gaming-accessories",
    description: "تجهیزات جانبی حرفه‌ای برای گیمرها",
    subcategories: [
      { name: "موس", slug: "mouse" },
      { name: "کیبورد", slug: "keyboard" },
      { name: "پاوربانک", slug: "powerbank" },
    ],
  },
  {
    name: "خدمات",
    slug: "services",
    description: "خدمات تخصصی نصب بازی، تعمیر و پشتیبانی",
    subcategories: [
      { name: "نصب بازی", slug: "services" },
      { name: "اکانت قانونی", slug: "services" },
      { name: "تعمیرات کنسول", slug: "services" },
    ],
  },
];
