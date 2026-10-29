"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { HeroSlide } from "./home-hero-slides";

const AUTOPLAY_DELAY = 6000;
const SWIPE_THRESHOLD = 48;

function HeroImage({ slide }: { slide: HeroSlide }) {
  return (
    <div className="relative aspect-[3/1] w-full shrink-0 overflow-hidden sm:absolute sm:inset-0 sm:aspect-auto">
      <Image
        src={slide.image}
        alt={slide.imageAlt}
        fill
        priority={slide.priority}
        sizes="(max-width: 639px) 100vw, (max-width: 1399px) calc(100vw - 3rem), 1320px"
        className="home-hero-image object-contain sm:object-cover"
      />
    </div>
  );
}

export default function HomeHeroSlider({ slides }: { slides: HeroSlide[] }) {
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex((index + slideCount) % slideCount);
  }, [slideCount]);

  const goToNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % slideCount);
  }, [slideCount]);

  const goToPrevious = useCallback(() => {
    setActiveIndex(
      (current) =>
        (current - 1 + slideCount) % slideCount,
    );
  }, [slideCount]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () =>
      setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () =>
      mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () =>
      setIsPageVisible(document.visibilityState === "visible");

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (
      !isAutoplayEnabled ||
      isHovered ||
      isFocusWithin ||
      !isPageVisible ||
      prefersReducedMotion
    ) {
      return;
    }

    const timer = window.setTimeout(goToNext, AUTOPLAY_DELAY);
    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    goToNext,
    isAutoplayEnabled,
    isFocusWithin,
    isHovered,
    isPageVisible,
    prefersReducedMotion,
  ]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
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

    // In an RTL carousel the next item sits visually to the right.
    if (deltaX > 0) goToNext();
    else goToPrevious();
  };

  return (
    <section
      className="home-hero relative isolate min-h-[430px] overflow-hidden rounded-2xl bg-[#031633] shadow-[0_22px_60px_rgba(3,31,79,0.24)] sm:min-h-0 sm:aspect-[3/1] sm:rounded-[24px]"
      aria-label="پیشنهادهای ویژه کرمان آتاری"
      aria-roledescription="اسلایدر"
      dir="rtl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocusWithin(false);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      <div className="absolute inset-0">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const Heading = index === 0 ? "h1" : "h2";

          return (
            <div
              key={slide.id}
              className="home-hero-slide absolute inset-0 flex flex-col sm:block"
              data-active={isActive}
              aria-hidden={!isActive}
              aria-label={`${index + 1} از ${slideCount}`}
              aria-roledescription="اسلاید"
              role="group"
              style={
                {
                  "--hero-accent": slide.accent,
                  "--hero-panel": slide.panel,
                  "--hero-text": slide.text,
                  "--hero-muted": slide.mutedText,
                  "--hero-button-text": slide.buttonText,
                } as CSSProperties
              }
            >
              <HeroImage slide={slide} />
              <div className="relative z-10 flex flex-1 items-start bg-[var(--hero-panel)] px-5 pb-20 pt-5 text-[var(--hero-text)] sm:h-full sm:items-center sm:bg-transparent sm:px-7 sm:pb-10 sm:pt-8 lg:px-12 lg:pb-12 lg:pt-10 xl:px-16">
                <div className="home-hero-content w-full max-w-[660px] sm:w-[52%] lg:w-[50%]">
                  <span className="mb-2 inline-flex rounded-full border border-current/20 px-3 py-1 text-[11px] font-black text-[var(--hero-accent)] sm:mb-2.5">
                    پیشنهاد کرمان آتاری
                  </span>
                  <Heading
                    className={`max-w-[20ch] text-[clamp(1.55rem,7vw,2.15rem)] leading-[1.35] sm:text-[clamp(1.35rem,3vw,2.65rem)] sm:leading-[1.25] lg:text-[clamp(2rem,3.2vw,3rem)] ${
                      slide.headingFont === "estedad"
                        ? "font-estedad"
                        : "font-black"
                    }`}
                    style={{
                      fontWeight: slide.headingWeight ?? 900,
                    }}
                  >
                    {slide.title}
                  </Heading>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-[var(--hero-muted)] sm:mt-2.5 sm:text-[clamp(0.75rem,1.25vw,1rem)] sm:leading-6 lg:leading-7">
                    {slide.description}
                  </p>
                  <div className="mt-4 flex min-[380px]:flex-row sm:mt-4 lg:mt-5">
                    <Link
                      href={slide.primaryCta.href}
                      tabIndex={isActive ? 0 : -1}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--hero-accent)] px-5 text-sm font-black text-[var(--hero-button-text)] shadow-lg transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#082e6c] sm:min-h-11"
                    >
                      {slide.primaryCta.label}
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 sm:inset-x-7 sm:bottom-5 lg:inset-x-12">
        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label="انتخاب اسلاید"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#082e6c] ${
                activeIndex === index
                  ? "w-8"
                  : "w-2.5 bg-white/55 hover:bg-white"
              }`}
              style={
                activeIndex === index
                  ? { backgroundColor: slides[activeIndex].accent }
                  : undefined
              }
              aria-label={`نمایش اسلاید ${index + 1}: ${slide.title}`}
              aria-current={activeIndex === index ? "true" : undefined}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsAutoplayEnabled((enabled) => !enabled)}
            className="home-hero-control"
            aria-label={
              isAutoplayEnabled ? "توقف پخش خودکار" : "ادامه پخش خودکار"
            }
            aria-pressed={!isAutoplayEnabled}
          >
            {isAutoplayEnabled ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={goToPrevious}
            className="home-hero-control"
            aria-label="اسلاید قبلی"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="home-hero-control"
            aria-label="اسلاید بعدی"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {`اسلاید ${activeIndex + 1} از ${slideCount}: ${slides[activeIndex].title}`}
      </p>
    </section>
  );
}
