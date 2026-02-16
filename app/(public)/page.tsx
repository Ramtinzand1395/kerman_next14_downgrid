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
        {/* اسلایدر تخفیف */}
         <MainPageBanners />
        <SliderContainer
          games={discountedProducts}
          title="تخفیف امروز"
          subtitle={<DiscountTimer endDate={nextMidnight.toISOString()} />}
        />
        <BoxContainer
          title="خرید در سه مرحله ساده"
          subtitle=" بدون پیچیدگی خرید کن و سریع به تجربه بازی مورد علاقه‌ات برس. "
        />
        <SliderContainer
          games={consoles}
          title="کنسول ها "
          subtitle="انواع دستگاه های نو و کار کرده"
          link="/products?sort=newest&category=consoles&page=1"
        />
        <SliderContainer
          games={games}
          title="بازی‌ها"
          subtitle="بازی های پلی استیشن"
          link="/products?sort=newest&category=games&page=1"
        />

        <UsersComments />
        <SliderContainer
          games={gamingAccessories}
          title="لوازم گیمینگ"
          subtitle="لوازم پلی استیشن 4"
          link="/products?sort=newest&category=gaming-accessories&page=1"
        />
        <Trust />
        <SliderContainer
          games={accessories}
          title="لوازم جانبی"
          subtitle="لوازم جانبی کنسول"
          link="/products?sort=newest&category=accessories&page=1"
        />
        <SliderContainer
          games={accountGames}
          title=" بازی ها"
          subtitle="بازی های اکانتی"
          link="/products?sort=newest&category=account-games&page=1"
        />
        <Subscribed />
        <Faq />
        <section className="mt-8 rounded-3xl border border-indigo-100 bg-indigo-50 px-6 py-8 text-center md:px-10">
          <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
            هنوز برای انتخاب مرددی؟
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            تیم ما آماده‌ست با توجه به بودجه و سبک بازی‌ت بهترین پیشنهاد را
            ارائه بدهد. همین حالا پیام بده تا سریع راهنمایی‌ات کنیم.
          </p>
          {/* todo */}
          {/* مستقیم بره به تلگرام */}
          <Link
            href="/contact-us"
            className="mt-5 inline-flex rounded-xl bg-[#001A6E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#000e3c]"
          >
            شروع مشاوره خرید
          </Link>
        </section>
      </div>
    </div>
  );
}
