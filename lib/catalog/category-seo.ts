export type CategoryRow = {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  seoTitle?: string;
  metaDescription?: string;
  introduction?: string;
  buyingGuide?: string;
  faqs?: { question: string; answer: string }[];
  updatedAt?: string;
};
export type CategoryEntry = CategoryRow & { productCount: number };
export type CatalogQuery = {
  page: number;
  q: string;
  tag: string;
  sort: string;
  inStock: boolean;
};

export function decodeCategorySlug(value: string): string | null {
  let slug = value.trim();
  try {
    for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(slug); i++)
      slug = decodeURIComponent(slug);
    encodeURIComponent(slug); // Reject lone surrogates as well as invalid URL segments.
  } catch {
    return null;
  }
  return slug &&
    slug !== "." &&
    slug !== ".." &&
    !/[\/\\?#%\u0000-\u0020]/.test(slug)
    ? slug
    : null;
}
export function categoryHref(slug: string) {
  return `/category/${encodeURIComponent(slug)}`;
}
export function categoryAncestors(
  category: CategoryRow,
  rows: CategoryRow[],
): CategoryRow[] | null {
  const byId = new Map(rows.map((row) => [row._id, row]));
  const ancestors: CategoryRow[] = [];
  const seen = new Set([category._id]);
  let parent = category.parent;
  while (parent) {
    const row = byId.get(parent);
    if (!row || seen.has(parent)) return null;
    seen.add(parent);
    ancestors.unshift(row);
    parent = row.parent;
  }
  return ancestors;
}
export function descendantIds(id: string, rows: CategoryRow[]): string[] {
  const ids = new Set([id]);
  const queue = [id];
  for (let index = 0; index < queue.length; index++) {
    for (const row of rows) {
      if (row.parent === queue[index] && !ids.has(row._id)) {
        ids.add(row._id);
        queue.push(row._id);
      }
    }
  }
  return [...ids];
}
export function buildCategoryEntries(
  rows: CategoryRow[],
  counts: { _id: unknown; count: number }[],
): CategoryEntry[] {
  const valid = rows.filter(
    (row) => row.name?.trim() && decodeCategorySlug(row.slug) === row.slug,
  );
  const unique = valid.filter(
    (row) => valid.filter((other) => other.slug === row.slug).length === 1,
  );
  const safe = unique.filter((row) => categoryAncestors(row, unique) !== null);
  const countById = new Map(counts.map((row) => [String(row._id), row.count]));
  return safe.map((row) => ({
    ...row,
    productCount: descendantIds(row._id, safe).reduce(
      (sum, id) => sum + (countById.get(id) || 0),
      0,
    ),
  }));
}
export function parseCatalogQuery(
  raw: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const one = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string) : "";
  const pageValue = one("page");
  const page = /^\d+$/.test(pageValue) ? Number(pageValue) : 1;
  return {
    page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1,
    q: one("q").trim().slice(0, 80),
    tag: one("tag").trim().slice(0, 150),
    sort: ["newest", "lowPrice", "highPrice"].includes(one("sort"))
      ? one("sort")
      : "newest",
    inStock: one("inStock") === "1",
  };
}
export function catalogQueryString(query: CatalogQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.tag) params.set("tag", query.tag);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (query.inStock) params.set("inStock", "1");
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}
export function categoryCanonical(category: CategoryRow, query: CatalogQuery) {
  return (
    categoryHref(category.slug) +
    (query.page > 1 && !hasCatalogFilters(query) ? `?page=${query.page}` : "")
  );
}
export function hasCatalogFilters(query: CatalogQuery) {
  return Boolean(
    query.q || query.tag || query.inStock || query.sort !== "newest",
  );
}

const guides: Record<string, { intro: string; guide: string }> = {
  "gaming-wall-art": {
    intro:
      "تابلو گیمینگ و شاسی دکوراتیو با طرح بازی‌ها و شخصیت‌های محبوب را در این صفحه ببینید. هر طرح صفحهٔ مخصوص خود را دارد و اندازه‌ها و نوع اجرای موجود در همان صفحه قابل انتخاب‌اند.",
    guide:
      "برای انتخاب تابلو اتاق گیمینگ، ابتدا سبک و رنگ طرح را با فضای اتاق هماهنگ کنید. ابعاد محل نصب را اندازه بگیرید و اندازه‌های موجود را در صفحهٔ همان طرح مقایسه کنید. شاسی و تابلو قاب‌دار را بر اساس ظاهر لبه‌ها و سلیقهٔ دکوراسیون انتخاب کنید؛ اندازه، نوع اجرا و قیمت نهایی هر ترکیب را پیش از افزودن به سبد بررسی کنید.",
  },
  consoles: {
    intro:
      "کنسول‌های بازی موجود در کرمان آتاری را بر اساس مدل، مشخصات و قیمت مقایسه کنید.",
    guide:
      "هنگام خرید کنسول، نسل دستگاه، بازی‌های مورد علاقه، ظرفیت ذخیره‌سازی و لوازم همراه را بررسی کنید. وضعیت نو یا کارکرده و شرایط هر دستگاه در صفحهٔ محصول مشخص می‌شود. برای انتخاب دقیق‌تر، راهنماهای خرید کنسول را بخوانید.",
  },
  games: {
    intro:
      "بازی‌های فروشگاه را بر اساس پلتفرم و نوع عرضه بررسی کنید و جزئیات هر عنوان را در صفحهٔ آن بخوانید.",
    guide:
      "پیش از خرید بازی، سازگاری با کنسول، نوع دیسکی یا اکانتی، شیوهٔ فعال‌سازی و شرایط استفاده را در اطلاعات همان محصول بررسی کنید. برای بازی چندنفره، تعداد بازیکن و نیاز به اتصال اینترنت را هم در نظر بگیرید.",
  },
  accessories: {
    intro:
      "لوازم جانبی کنسول و محصولات دکور اتاق گیمینگ را در زیرمجموعه‌های این بخش پیدا کنید.",
    guide:
      "برای لوازم جانبی، مدل دستگاه و سازگاری محصول را بررسی کنید. برای دکور اتاق نیز ابعاد، رنگ و نوع اجرای محصول اهمیت دارد. مشخصات، موجودی و قیمت گزینهٔ انتخابی در صفحهٔ هر کالا نمایش داده می‌شود.",
  },
  controllers: {
    intro:
      "دسته‌های بازی را بر اساس پلتفرم، نوع اتصال و مشخصات هر محصول مقایسه کنید.",
    guide:
      "قبل از انتخاب دسته بازی، سازگاری با کنسول یا کامپیوتر، نوع اتصال، منبع تغذیه و اقلام همراه را در مشخصات کالا بررسی کنید. تفاوت مدل‌ها و قیمت هر گزینه را در صفحهٔ محصول ببینید.",
  },
};
// Keep factual buying advice separate for existing product families; stock,
// warranty, delivery speed and material claims are never invented.
Object.assign(guides, {
  "playstation-5": {
    intro:
      "مدل‌های پلی‌استیشن ۵ را با توجه به نسخه، ظرفیت و مشخصات هر دستگاه مقایسه کنید.",
    guide:
      "برای خرید PS5، به دیسک‌خور یا دیجیتال بودن، ظرفیت ذخیره‌سازی، مدل دستگاه و اقلام همراه توجه کنید. در نمونه‌های کارکرده، وضعیت ظاهری و توضیحات فروشنده اهمیت دارد. راهنمای خرید PS5 و صفحهٔ هر دستگاه به مقایسهٔ دقیق‌تر کمک می‌کنند.",
  },
  "playstation-4": {
    intro:
      "کنسول‌های پلی‌استیشن ۴ را بر اساس مدل و اطلاعات درج‌شده برای هر دستگاه بررسی کنید.",
    guide:
      "در مقایسهٔ PS4، تفاوت مدل‌های استاندارد، اسلیم و پرو، ظرفیت هارد و وضعیت دستگاه را در نظر بگیرید. توضیحات مربوط به اجرای بازی‌ها، لوازم همراه و شرایط استفادهٔ هر کنسول را پیش از انتخاب بخوانید.",
  },
  "playstation-3": {
    intro: "مدل‌های پلی‌استیشن ۳ و اطلاعات هر دستگاه را در این مجموعه ببینید.",
    guide:
      "برای انتخاب PS3، مدل بدنه، فضای ذخیره‌سازی، وضعیت دسته و دستگاه و روش اجرای بازی‌های مورد نظرتان را بررسی کنید. اقلام همراه و توضیحات هر دستگاه را در صفحهٔ همان محصول مقایسه کنید.",
  },
  "playstation-2": {
    intro: "کنسول‌های پلی‌استیشن ۲ را برای تجربهٔ بازی‌های کلاسیک بررسی کنید.",
    guide:
      "هنگام خرید PS2، به مدل دستگاه، ورودی‌های تصویر، سازگاری با تلویزیون، دسته‌ها و مموری کارت توجه کنید. روش اجرای بازی و کابل‌های مورد نیاز را از مشخصات همان دستگاه بررسی کنید.",
  },
  "account-games": {
    intro:
      "بازی‌های اکانتی را همراه با پلتفرم و شرایط استفادهٔ هر محصول بررسی کنید.",
    guide:
      "در خرید بازی اکانتی، ظرفیت، شیوهٔ فعال‌سازی، نیاز به اینترنت و محدودیت‌های دسترسی را در توضیحات محصول بخوانید. پیش از پرداخت، مطمئن شوید گزینهٔ انتخابی با کنسول و نحوهٔ بازی‌کردنتان سازگار است.",
  },
  "disc-games": {
    intro:
      "بازی‌های دیسکی فروشگاه را با توجه به پلتفرم و نسخهٔ هر عنوان مقایسه کنید.",
    guide:
      "برای انتخاب دیسک بازی، پلتفرم، نسخه و وضعیت دیسک را بررسی کنید. زبان‌ها، محتوای اضافه و شرایط استفاده از کدهای همراه ممکن است بین نسخه‌ها متفاوت باشند؛ ملاک خرید، اطلاعات همان محصول است.",
  },
  "gift-cards": {
    intro:
      "گیفت کارت‌های موجود را بر اساس سرویس، منطقه و مبلغ اعتبار بررسی کنید.",
    guide:
      "قبل از خرید گیفت کارت، کشور حساب و ارز کارت را تطبیق دهید. اعتبار کارت، سرویس مقصد و روش استفاده را در توضیحات همان محصول بخوانید؛ کارت نامتناسب با منطقهٔ حساب ممکن است قابل استفاده نباشد.",
  },
  headsets: {
    intro:
      "هدست و هدفون‌های بازی را از نظر نوع اتصال و سازگاری با دستگاه مقایسه کنید.",
    guide:
      "نوع اتصال سیمی یا بی‌سیم، میکروفون، راحتی استفاده و سازگاری با کنسول یا کامپیوتر را بررسی کنید. امکانات صدا و اقلام همراه را از مشخصات همان مدل بخوانید و کاربرد خود را در اولویت قرار دهید.",
  },
  "stands-coolers": {
    intro:
      "پایه‌ها و خنک‌کننده‌های کنسول را متناسب با مدل دستگاهتان بررسی کنید.",
    guide:
      "مدل دقیق کنسول، حالت قرارگیری، ابعاد پایه و روش تأمین برق را تطبیق دهید. اگر پایه شارژ دسته دارد، نوع دسته‌های پشتیبانی‌شده و نیاز به آداپتور را نیز در مشخصات کالا بررسی کنید.",
  },
  "flash-memories": {
    intro: "فلش مموری‌های فروشگاه را بر اساس ظرفیت و مشخصات اتصال بررسی کنید.",
    guide:
      "برای انتخاب فلش مموری، ظرفیت، نسخهٔ USB و کاربرد مورد نظر را در نظر بگیرید. پیش از استفاده با کنسول یا دستگاه دیگر، محدودیت ظرفیت و قالب فایل مورد پشتیبانی آن دستگاه را بررسی کنید.",
  },
  "gaming-accessories": {
    intro:
      "تجهیزات گیمینگ و زیرمجموعه‌های آن را برای تکمیل میز و فضای بازی بررسی کنید.",
    guide:
      "پیش از انتخاب تجهیزات گیمینگ، سازگاری با دستگاه، فضای میز، نوع اتصال و نیاز روزانه را مشخص کنید. زیرمجموعه‌های موس، کیبورد و سایر تجهیزات به مقایسهٔ دقیق‌تر گزینه‌ها کمک می‌کنند.",
  },
  mouse: {
    intro:
      "موس‌های گیمینگ را با توجه به نوع اتصال، ابعاد و ویژگی‌های هر مدل بررسی کنید.",
    guide:
      "اندازه و فرم موس را با شیوهٔ گرفتن دست و فضای میز تطبیق دهید. نوع حسگر، تنظیم حساسیت، تعداد کلیدها و اتصال را در مشخصات کالا مقایسه کنید؛ برای موس بی‌سیم، نوع باتری و شارژ هم اهمیت دارد.",
  },
  keyboard: {
    intro:
      "کیبوردهای فروشگاه را بر اساس چیدمان، نوع اتصال و مشخصات کلیدها بررسی کنید.",
    guide:
      "برای انتخاب کیبورد، ابعاد، وجود بخش اعداد، زبان حروف و نوع کلیدها را در نظر بگیرید. اتصال، نورپردازی و سازگاری نرم‌افزاری را از مشخصات مدل بخوانید و فضای میز را اندازه بگیرید.",
  },
  powerbank: {
    intro: "پاوربانک‌ها را از نظر ظرفیت و مشخصات ورودی و خروجی مقایسه کنید.",
    guide:
      "ظرفیت اسمی به‌تنهایی معیار انتخاب نیست. توان خروجی، درگاه‌ها، پروتکل شارژ و سازگاری با دستگاهتان را بررسی کنید. اطلاعات کابل همراه و روش شارژ خود پاوربانک را در صفحهٔ کالا بخوانید.",
  },
  services: {
    intro:
      "محصولات خدماتی ثبت‌شده در فروشگاه را بررسی کنید و جزئیات خدمت مورد نظر را بخوانید.",
    guide:
      "نوع دستگاه، شرح نیاز و شرایط انجام خدمت را مشخص کنید. هزینه و جزئیات هر مورد در صفحهٔ مربوط به آن درج می‌شود. برای نصب بازی، تعمیر یا بررسی شرایط انجام کار، از بخش خدمات یا تماس با فروشگاه استفاده کنید.",
  },
});
export function categoryContent(
  category: CategoryRow,
  ancestors: CategoryRow[],
) {
  const specific = guides[category.slug];
  const parentName = ancestors.at(-1)?.name;
  const name = category.name;
  return {
    title: category.seoTitle || `خرید ${name} و بررسی قیمت`,
    description:
      category.metaDescription ||
      `خرید ${name} از کرمان آتاری؛ مشاهده محصولات${parentName ? ` در دسته ${parentName}` : ""}، مقایسه قیمت و مشخصات و بررسی مدل‌های موجود.`,
    intro:
      category.introduction ||
      specific?.intro ||
      `محصولات ${name}${parentName ? ` از مجموعهٔ ${parentName}` : ""} را در این صفحه بررسی کنید. با جستجو، انتخاب برچسب و مرتب‌سازی، گزینه‌های متناسب با نیازتان را پیدا کنید.`,
    guide:
      category.buyingGuide ||
      specific?.guide ||
      `برای انتخاب ${name}، مشخصات و کاربرد کالا را با نیاز خود مقایسه کنید. در صفحهٔ هر محصول، تصاویر، توضیحات، مدل‌های قابل انتخاب و وضعیت موجودی را ببینید. قیمت نهایی به گزینهٔ انتخابی بستگی دارد؛ پیش از ثبت سفارش، اطلاعات محصول و شرایط خرید را بررسی کنید.`,
    faqs: category.faqs?.length
      ? category.faqs
      : [
          {
            question: `قیمت ${name} را کجا ببینم؟`,
            answer:
              "قیمت هر کالا در کارت محصول و قیمت نهایی مدل انتخابی در صفحهٔ همان محصول نمایش داده می‌شود. برای مقایسه می‌توانید نتایج را از کمترین قیمت مرتب کنید.",
          },
          {
            question: `چطور ${name} مناسب را انتخاب کنم؟`,
            answer:
              "محصولات و زیرمجموعه‌های این صفحه را بررسی کنید، سپس تصاویر و مشخصات گزینه‌های مورد نظرتان را در صفحهٔ محصول مقایسه کنید. جستجو و فیلتر موجودی به محدودکردن انتخاب‌ها کمک می‌کنند.",
          },
        ],
  };
}
