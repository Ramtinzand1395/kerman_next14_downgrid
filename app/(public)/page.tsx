import { fetcher } from "@/helpers/fetcher";
import Hero from "./components/Hero";
import DiscountTimer from "./components/slider/DiscountTimer";
import SliderContainer from "./components/slider/SliderContainer";
import BoxContainer from "./components/BoxContainer";

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
  const [discountedProducts, consoles, games, gamingAccessories, accessories] =
    await Promise.all([
      fetcher("/api/products?discount=true"),
      fetcher("/api/products?category=consoles"),
      fetcher("/api/products?category=games"),
      fetcher("/api/products?category=gaming-accessories"),
      fetcher("/api/products?category=accessories"),
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
        />
        <SliderContainer
          games={games}
          title="بازی‌ها"
          subtitle="بازی های پلی استیشن"
        />
        <SliderContainer
          games={gamingAccessories}
          title="لوازم گیمینگ"
          subtitle="لوازم پلی استیشن 4"
        />
        <SliderContainer
          games={accessories}
          title="لوازم جانبی"
          subtitle="لوازم جانبی کنسول"
        />
      </div>
    </div>
  );
}
