import Image from "next/image";
import Link from "next/link";

const banners = [
  {
    title: "پیشنهاد ویژه کنسول",
    description: "کنسول‌های منتخب با قیمت رقابتی، ضمانت سلامت و ارسال سریع.",
    cta: "مشاهده کنسول‌ها",
    href: "/products?sort=newest&category=consoles&page=1",
    bgImage: "/banner_1.webp",
    icon: "/icons/gamepad.webp",
    color: "from-indigo-900/80 via-blue-900/70 to-cyan-900/70",
  },
  {
    title: "بازی‌های پرفروش",
    description: "محبوب‌ترین بازی‌ها را همین امروز با تخفیف‌های ویژه تهیه کن.",
    cta: "خرید بازی",
    href: "/products?sort=newest&category=games&page=1",
    bgImage: "/banner_3.webp",
    icon: "/icons/game.webp",
    color: "from-fuchsia-900/80 via-purple-900/70 to-rose-900/70",
  },
  {
    title: "لوازم جانبی حرفه‌ای",
    description: "از دسته و هدست تا تجهیزات کامل گیمینگ برای تجربه حرفه‌ای‌تر.",
    cta: "مشاهده لوازم جانبی",
    href: "/products?sort=newest&category=accessories&page=1",
    bgImage: "/banner_2.webp",
    icon: "/icons/action-figure.webp",
    color: "from-emerald-900/80 via-teal-900/70 to-cyan-900/70",
  },
  {
    title: "بازی‌های اکانتی",
    description: "آرشیو بازی‌های اکانتی با تحویل سریع و پشتیبانی خرید.",
    cta: "مشاهده بازی‌های اکانتی",
    href: "/products?sort=newest&category=account-games&page=1",
    bgImage: "/banner_4.webp",
    icon: "/icons/tic-tac-toe.webp",
    color: "from-amber-900/80 via-orange-900/70 to-red-900/70",
  },
];

export default function MainPageBanners() {
  return (
    <section className="my-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
       {banners.map((banner, index) => (
        <article
          key={banner.title}
          className="group relative min-h-[220px] overflow-hidden rounded-3xl"
        >
          <Image
            src={banner.bgImage}
            alt={banner.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
              priority={index < 2}
          />

          <div
            className={`absolute inset-0 bg-gradient-to-br ${banner.color}`}
            aria-hidden="true"
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Image
                src={banner.icon}
                alt="icon"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>

            <div>
              <h2 className="text-xl font-black md:text-2xl">{banner.title}</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-white/90 md:text-base">
                {banner.description}
              </p>
              <Link
                href={banner.href}
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                {banner.cta}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
