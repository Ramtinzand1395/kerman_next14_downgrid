import { fetcher } from "@/helpers/fetcher";
import Hero from "./components/Hero";
import DiscountTimer from "./components/slider/DiscountTimer";
import SliderContainer from "./components/slider/SliderContainer";
import BoxContainer from "./components/BoxContainer";
import UsersComments from "./components/landing/UsersComments";
import Trust from "./components/landing/Trust";
// todo
// خبر نامه و مقالات بیاد
const now = new Date();
const nextMidnight = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate() + 1,
  0,
  0,
  0
);
export default async function Home() {
  const [discountedProducts, consoles, games, gamingAccessories, accessories,accountGames] =
    await Promise.all([
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
        <SliderContainer
          games={discountedProducts}
          title="تخفیف امروز"
          subtitle={<DiscountTimer endDate={nextMidnight.toISOString()} />}
        />
        <BoxContainer title="دسته بندی ها" subtitle="جستجو بر اساس دسته بندی" />
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
        {/* <Subscribed /> */}
      </div>
    </div>
  );
}
