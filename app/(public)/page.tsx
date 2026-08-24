import { fetcher } from "@/helpers/fetcher";
import Hero from "./components/Hero";
import DiscountTimer from "./components/slider/DiscountTimer";
import SliderContainer from "./components/slider/SliderContainer";
import BoxContainer from "./components/BoxContainer";
import UsersComments from "./components/landing/UsersComments";
import Trust from "./components/landing/Trust";
import Subscribed from "./components/landing/Subscribed";
import Faq from "./components/landing/Faq";
import Link from "next/link";
import MainPageBanners from "./components/landing/MainPageBanners";
import Motion from "./components/Motion";

const now = new Date();
const nextMidnight = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate() + 1,
  0,
  0,
  0,
);

export default async function Home() {
  const [
    discountedProducts,
    consoles,
    games,
    gamingAccessories,
    accessories,
    accountGames,
  ] = await Promise.all([
    fetcher("/api/products?discount=true"),
    fetcher("/api/products?category=consoles"),
    fetcher("/api/products?category=games"),
    fetcher("/api/products?category=gaming-accessories"),
    fetcher("/api/products?category=accessories"),
    fetcher("/api/products?category=account-games"),
  ]);

  return (
    <div>
      <Hero />

      <div className="mx-2 md:mx-10">
        <Motion delay={0.08} duration={0.7} direction="down" distance={42}>
          <MainPageBanners />
        </Motion>

        <Motion delay={0.1} direction="up" distance={44}>
          <SliderContainer
            games={discountedProducts}
            title="تخفیف امروز"
            subtitle={<DiscountTimer endDate={nextMidnight.toISOString()} />}
          />
        </Motion>

        <Motion delay={0.12} direction="up" distance={36}>
          <BoxContainer
            title="خرید در سه مرحله ساده"
            subtitle=" بدون پیچیدگی خرید کن و سریع به تجربه بازی مورد علاقه‌ات برس. "
          />
        </Motion>

        <Motion delay={0.13} direction="up" distance={30}>
          <section className="my-8 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-l from-[#001A6E] via-[#12389b] to-indigo-500 px-6 py-8 text-white shadow-xl shadow-indigo-900/15 md:px-10 md:py-10">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <span className="inline-flex rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">
                  خدمات نصب بازی
                </span>
                <h2 className="mt-3 text-2xl font-black md:text-3xl">
                  نوبت نصب بازی‌ات را همین حالا ثبت کن
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-indigo-100 md:text-base">
                  کنسول و بازی‌های موردنظرت را انتخاب کن تا تیم ما در سریع‌ترین زمان با تو هماهنگ شود.
                </p>
              </div>
              <Link
                href="/my-profile?step=6"
                className="shrink-0 rounded-2xl bg-white px-6 py-3 text-sm font-black text-[#001A6E] transition hover:-translate-y-0.5 hover:bg-indigo-50"
              >
                ثبت نوبت بازی
              </Link>
            </div>
          </section>
        </Motion>

        <Motion delay={0.14} direction="right" distance={36}>
          <SliderContainer
            games={consoles}
            title="کنسول ها "
            subtitle="انواع دستگاه های نو و کار کرده"
            link="/products?sort=newest&category=consoles&page=1"
          />
        </Motion>

        <Motion delay={0.16} direction="left" distance={36}>
          <SliderContainer
            games={games}
            title="بازی‌ها"
            subtitle="بازی های پلی استیشن"
            link="/products?sort=newest&category=games&page=1"
          />
        </Motion>

        <Motion delay={0.18} direction="up" distance={34}>
          <UsersComments />
        </Motion>

        <Motion delay={0.2} direction="right" distance={36}>
          <SliderContainer
            games={gamingAccessories}
            title="لوازم گیمینگ"
            subtitle="لوازم پلی استیشن 4"
            link="/products?sort=newest&category=gaming-accessories&page=1"
          />
        </Motion>

        <Motion delay={0.22} direction="up" distance={34}>
          <Trust />
        </Motion>

        <Motion delay={0.24} direction="left" distance={36}>
          <SliderContainer
            games={accessories}
            title="لوازم جانبی"
            subtitle="لوازم جانبی کنسول"
            link="/products?sort=newest&category=accessories&page=1"
          />
        </Motion>

        <Motion delay={0.26} direction="right" distance={36}>
          <SliderContainer
            games={accountGames}
            title=" بازی ها"
            subtitle="بازی های اکانتی"
            link="/products?sort=newest&category=account-games&page=1"
          />
        </Motion>

        <Motion delay={0.28} direction="up" distance={34}>
          <Subscribed />
        </Motion>

        <Motion delay={0.3} direction="up" distance={34}>
          <Faq />
        </Motion>

        <Motion delay={0.32} duration={0.75} direction="down" distance={32}>
          <section className="mt-8 rounded-3xl border border-indigo-100 bg-indigo-50 px-6 py-8 text-center md:px-10">
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              هنوز برای انتخاب مرددی؟
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              تیم ما آماده‌ست با توجه به بودجه و سبک بازی‌ت بهترین پیشنهاد را
              ارائه بدهد. همین حالا پیام بده تا سریع راهنمایی‌ات کنیم.
            </p>
            <Link
              href="/contact-us"
              className="mt-5 inline-flex rounded-xl bg-[#001A6E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#000e3c]"
            >
              شروع مشاوره خرید
            </Link>
          </section>
        </Motion>
      </div>
    </div>
  );
}
