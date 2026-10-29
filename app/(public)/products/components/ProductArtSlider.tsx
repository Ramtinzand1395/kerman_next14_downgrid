"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type ArtSlide = {
  id: string;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  accent: string;
  panel: string;
  text: string;
  mutedText: string;
  font: "estedad" | "lalezar" | "vazirmatn";
  weight: 400 | 600 | 800 | 900;
  priority?: boolean;
};

const ART_SLIDES: ArtSlide[] = [
  {
    id: "ezio",
    image: "/hero/ezio-banner.webp",
    imageAlt: "تابلوی اتزیو با پس‌زمینه معماری فلورانس",
    title: "افسانهٔ اتزیو، روی دیوار تو",
    description: "یک قاب از دنیای اساسینز کرید، برای فضای تو",
    accent: "#9f2629",
    panel: "#f3eadc",
    text: "#261c17",
    mutedText: "#665247",
    font: "estedad",
    weight: 600,
    priority: true,
  },
  {
    id: "anime-collage",
    image: "/hero/anime-banner.webp",
    imageAlt: "تابلوی کلاژ شخصیت‌های انیمه با نورهای نئونی",
    title: "دنیای انیمه، به سبک تو",
    description: "رنگ و شخصیت برای دیواری که شبیه خودته",
    accent: "#ff54d9",
    panel: "#10134a",
    text: "#ffffff",
    mutedText: "#e3e7ff",
    font: "lalezar",
    weight: 400,
  },
  {
    id: "devil-jin",
    image: "/hero/devil-jin-banner.webp",
    imageAlt: "تابلوی دویل جین در فضایی روشن با جزئیات قرمز و مشکی",
    title: "روی تاریک قدرت را قاب کن",
    description: "دویل‌جین؛ حضوری متفاوت در دکور اتاقت",
    accent: "#9c171c",
    panel: "#f1e6d4",
    text: "#2c1717",
    mutedText: "#6d4740",
    font: "estedad",
    weight: 900,
  },
  {
    id: "skull-soldier",
    image: "/hero/skull-banner.webp",
    imageAlt: "تابلوی سرباز نقاب جمجمه با عینک مشکی",
    title: "یک قاب از دنیای عملیات",
    description: "طرحی با حال‌وهوای تاکتیکی برای فضای گیمینگ تو",
    accent: "#d2b083",
    panel: "#1f2022",
    text: "#ffffff",
    mutedText: "#e5e7eb",
    font: "vazirmatn",
    weight: 800,
  },
];

const SWIPE_THRESHOLD = 48;

function titleFont(font: ArtSlide["font"]) {
  if (font === "lalezar") return "font-lalezar";
  if (font === "vazirmatn") return "font-vazirmatn";
  return "font-estedad";
}

export default function ProductArtSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const slideCount = ART_SLIDES.length;

  const goToSlide = useCallback(
    (index: number) => {
      setActiveIndex((index + slideCount) % slideCount);
    },
    [slideCount],
  );

  const goToNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slideCount);
  }, [slideCount]);

  const goToPrevious = useCallback(() => {
    setActiveIndex(
      (current) => (current - 1 + slideCount) % slideCount,
    );
  }, [slideCount]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!pointerStart.current) return;

    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;

    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) {
      return;
    }

    if (deltaX > 0) goToNext();
    else goToPrevious();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrevious();
    }
  };

  return (
    <section
      className="product-art-slider relative isolate mb-5 min-h-[390px] touch-pan-y overflow-hidden rounded-3xl bg-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.18)] outline-none focus-visible:ring-4 focus-visible:ring-blue-300 sm:min-h-0 sm:aspect-[3/1]"
      aria-label="معرفی طرح‌های تابلو"
      aria-roledescription="اسلایدر"
      dir="rtl"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      {ART_SLIDES.map((slide, index) => {
        const isActive = activeIndex === index;

        return (
          <article
            key={slide.id}
            className="product-art-slide absolute inset-0 flex flex-col sm:block"
            data-active={isActive}
            aria-hidden={!isActive}
            aria-label={`${index + 1} از ${slideCount}`}
            aria-roledescription="اسلاید"
            role="group"
            style={
              {
                "--art-accent": slide.accent,
                "--art-panel": slide.panel,
                "--art-text": slide.text,
                "--art-muted": slide.mutedText,
              } as CSSProperties
            }
          >
            <div className="relative aspect-[3/1] w-full shrink-0 overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
              <Image
                src={slide.image}
                alt={slide.imageAlt}
                fill
                priority={slide.priority}
                sizes="(max-width: 639px) 100vw, (max-width: 1499px) calc(100vw - 3rem), 1392px"
                className="object-contain sm:object-cover"
              />
            </div>

            <div className="relative z-10 flex flex-1 items-start bg-[var(--art-panel)] px-5 pb-20 pt-5 text-[var(--art-text)] sm:h-full sm:items-center sm:bg-transparent sm:px-8 sm:pb-12 sm:pt-8 lg:px-14">
              <div className="product-art-copy w-full sm:w-[49%]">
                <span className="mb-2 inline-flex border-r-4 border-[var(--art-accent)] pr-3 text-xs font-bold text-[var(--art-accent)] sm:text-sm">
                  مجموعه تابلوهای کرمان آتاری
                </span>
                <h2
                  className={`${titleFont(slide.font)} max-w-none text-[clamp(1.5rem,6.5vw,2.2rem)] leading-[1.35] sm:max-w-[19ch] sm:text-[clamp(1.5rem,3vw,2.8rem)] sm:leading-[1.25]`}
                  style={{ fontWeight: slide.weight }}
                >
                  {slide.title}
                </h2>
                <p className="mt-2 max-w-lg text-sm font-medium leading-7 text-[var(--art-muted)] sm:text-base">
                  {slide.description}
                </p>
              </div>
            </div>
          </article>
        );
      })}

      <div
        className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 text-[var(--art-text)] sm:inset-x-8 sm:bottom-5 lg:inset-x-14"
        style={
          {
            "--art-text": ART_SLIDES[activeIndex].text,
            "--art-panel": ART_SLIDES[activeIndex].panel,
          } as CSSProperties
        }
      >
        <div className="flex items-center gap-1.5" role="group" aria-label="انتخاب اسلاید">
          {ART_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 ${
                activeIndex === index ? "w-8" : "w-2.5 hover:opacity-80"
              }`}
              style={{
                backgroundColor:
                  activeIndex === index
                    ? ART_SLIDES[activeIndex].accent
                    : ART_SLIDES[activeIndex].text === "#ffffff"
                      ? "rgba(255, 255, 255, 0.42)"
                      : "rgba(38, 28, 23, 0.34)",
              }}
              aria-label={`نمایش اسلاید ${index + 1}: ${slide.title}`}
              aria-current={activeIndex === index ? "true" : undefined}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPrevious}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-current shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-current"
            style={{
              backgroundColor: ART_SLIDES[activeIndex].panel,
              borderColor: ART_SLIDES[activeIndex].accent,
            }}
            aria-label="اسلاید قبلی"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-current shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-current"
            style={{
              backgroundColor: ART_SLIDES[activeIndex].panel,
              borderColor: ART_SLIDES[activeIndex].accent,
            }}
            aria-label="اسلاید بعدی"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {`اسلاید ${activeIndex + 1} از ${slideCount}: ${ART_SLIDES[activeIndex].title}`}
      </p>
    </section>
  );
}
