import { Product } from "@/types";
import Slider from "./Slider";
import Link from "next/link";
import { ReactNode } from "react";
import Motion from "../Motion";

interface SliderContainerProps {
  games: Product[];
  title: string;
  subtitle: string | ReactNode;
  href?: string; // لینک برای دکمه مشاهده همه
}

export default function SliderContainer({
  games,
  title,
  subtitle,
  href = "/products", // لینک پیش‌فرض
}: SliderContainerProps) {
  return (
    <section
      className="p-5"
      aria-labelledby={`section-${title.replace(/\s+/g, "-")}`}
    >
      {/* ✅ عنوان بخش با heading semantic */}
      <Motion delay={0.25}>
        <div className="flex items-center justify-between">
          <h2
            id={`section-${title.replace(/\s+/g, "-")}`}
            className="font-bold text-base md:text-lg whitespace-nowrap my-5 flex items-center"
          >
            <span className="bg-[#001A6E] w-3 h-10 rounded-md ml-3" />
            {title}
          </h2>
        </div>
      </Motion>

      {/* ✅ توضیح بخش */}
      <Motion delay={0.5}>
        <h3 className="flex items-center justify-between font-semibold text-sm md:text-xl mb-5">
          {subtitle}
        </h3>
      </Motion>

      {/* ✅ اسلایدر محصولات */}
      {games.length > 0 ? (
        <>
          <Slider games={games} />
          {/* ✅ دکمه مشاهده همه (لینک قابل کراول برای گوگل) */}
          <div className="flex items-center justify-center mt-10">
            <Link
              href={href}
              className="w-full md:w-64 text-center bg-[#001A6E] hover:bg-[#010c32] text-white py-3 rounded-xl transition-all cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-[#1B4242]"
              aria-label={`مشاهده همه ${title}`}
            >
              مشاهده همه
            </Link>
          </div>
        </>
      ) : (
        <p>هیچ محصولی نداریم.</p>
      )}
    </section>
  );
}
