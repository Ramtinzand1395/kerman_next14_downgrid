import { Home, Info, Phone, Grid2x2, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  { name: "خانه", href: "/", icon: Home },
  { name: "دسته‌بندی‌ها", href: "/categories", icon: Grid2x2 },
  { name: "درباره ما", href: "/about", icon: Info },
  { name: "تماس با ما", href: "/contact", icon: Phone },
  { name: "وبلاگ", href: "/weblog", icon: FileText },
];

export default function Footer() {
  return (
    <footer
      className="bg-white text-gray-700 mt-10 border-t rounded-2xl"
      role="contentinfo"
      aria-label="پاورقی سایت"
    >
      {/* Local Business Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Kerman Atari",
            address: "کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه",
            telephone: "09383077225",
            image: "/atari-seeklogo.svg",
            url: "https://kermanatari.ir",
          }),
        }}
      />
      {/* todo */}
      {/* پاک کردن هاشیه بالا */}
      <div className="">
        <Image
          width={120}
          height={120}
          alt="شخصیت بازی پلی‌استیشن"
          src="/post.webp"
          className="object-contain w-52 h-52 "
        />
      </div>
      {/* بخش اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10  pb-5 px-5 md:px-10 ">
        {/* آخرین مقالات - فقط اگر واقعی داری */}
        {/* در صورت نبود داده، این بخش را با data واقعی پر کن */}
        <section aria-labelledby="latest-articles">
          <h2
            id="latest-articles"
            className="text-lg md:text-xl font-bold text-black mb-4 border-b border-red-600 pb-2 w-fit"
          >
            آخرین مقالات
          </h2>
          {/* TODO */}
          {/* بهتر است این لیست از CMS یا DB بیاید */}
          {false && (
            <ul className="space-y-4">
              {[1, 2, 3].map((i) => (
                <li key={i}>
                  <Link
                    href={`/blog/sample-${i}`}
                    className="flex items-center gap-3 hover:text-black transition"
                  >
                    <Image
                      src="/thumbnails/article-60.jpg"
                      alt="تصویر مقاله"
                      width={60}
                      height={60}
                      className="rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-sm">عنوان مقاله</h3>
                      <p className="text-xs text-gray-400">توضیح کوتاه...</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* آخرین محصولات - مثل بالا */}
        <section aria-labelledby="latest-products">
          <h2
            id="latest-products"
            className="text-lg md:text-xl font-bold text-black mb-4 border-b border-red-600 pb-2 w-fit"
          >
            آخرین محصولات
          </h2>

          {false && (
            <ul className="space-y-4">
              {[1, 2, 3].map((i) => (
                <li key={i}>
                  <Link
                    href={`/products/sample-${i}`}
                    className="flex items-center gap-3 hover:text-black transition"
                  >
                    <Image
                      src="/thumbnails/product-60.jpg"
                      alt="تصویر محصول"
                      width={60}
                      height={60}
                      className="rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-sm">محصول نمونه</h3>
                      <p className="text-xs text-gray-400">توضیح کوتاه...</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* اطلاعات شرکت */}
        <section
          aria-labelledby="company-info"
          className="flex flex-col items-center md:items-start text-center md:text-right"
        >
          <Link
            href="/"
            className="flex items-center mb-4"
            aria-label="بازگشت به صفحه اصلی"
          >
            <Image
              width={45}
              height={45}
              alt="لوگوی کرمان آتاری"
              src="/atari-seeklogo.svg"
            />
            <h2 className="text-black mx-2 font-semibold text-xl hover:scale-105">
              Kerman Atari
            </h2>
          </Link>

          <p className="text-sm text-gray-700 leading-6 mb-2">
            خرید و فروش بازی‌های پلی‌استیشن، کنسول و اکانت‌های دیجیتالی با
            بهترین قیمت در کرمان.
          </p>

          <address className="not-italic text-gray-600 text-sm mb-2 leading-6">
            <p>آدرس: کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه</p>
            <p>
              شماره تماس:{" "}
              <a href="tel:09383077225" className="hover:text-black transition">
                09383077225
              </a>
            </p>
          </address>
        </section>
      </div>

      {/* نوار پایینی */}
      <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-700 pt-4 text-sm  pb-5 px-5 md:px-10 ">
        <nav aria-label="منوی فوتر">
          <ul className="flex flex-wrap items-center gap-4 mb-3 md:mb-0">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={i} className="cursor-pointer flex items-center">
                  <Link
                    href={item.href}
                    className="flex items-center hover:text-red-500 transition"
                  >
                    <Icon className="w-4 h-4 ml-1" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

<p className="text-gray-700 text-xs md:text-sm text-center">
          © 2025 KermanAtari. کلیه حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}
