"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { toPersianDigits } from "@/helpers/Price";
import { secondsUntilNextOffersCycle } from "@/lib/landing-offers-countdown";

export function OffersCountdown({ initialSeconds }: { initialSeconds: number }) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => setSeconds(secondsUntilNextOffersCycle());

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainingSeconds = seconds % 60;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-50">
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="size-4" aria-hidden="true" />
        تا ساعت ۸ صبح
      </span>
      <span
        role="timer"
        aria-label={
          toPersianDigits(hours) + " ساعت و " +
          toPersianDigits(minutes) + " دقیقه و " +
          toPersianDigits(remainingSeconds) + " ثانیه"
        }
        dir="ltr"
        className="flex items-center gap-1 font-black tabular-nums"
      >
        {[hours, minutes, remainingSeconds].map((value, index) => (
          <span key={index} className="min-w-9 rounded-lg bg-white px-2 py-1.5 text-center text-sm text-[#0b1d48]">
            {toPersianDigits(String(value).padStart(2, "0"))}
          </span>
        ))}
      </span>
    </div>
  );
}

export function OffersSlider({ children }: { children: ReactNode }) {
  const listId = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateEdges = () => {
      const offset = Math.abs(track.scrollLeft);
      const atStart = offset <= 1;
      const atEnd = offset >= track.scrollWidth - track.clientWidth - 1;
      setEdges((previous) =>
        previous.atStart === atStart && previous.atEnd === atEnd
          ? previous
          : { atStart, atEnd },
      );
    };

    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    track.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();

    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateEdges);
    };
  }, [children]);

  const move = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.9,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const buttonClass = "flex size-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40";

  return (
    <>
      <ul
        id={listId}
        ref={trackRef}
        dir="rtl"
        aria-label="محصولات تخفیف‌خورده"
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl bg-[#031739]/45 p-2.5 sm:p-3 [scrollbar-color:#8dbbff_#061f4f]"
      >
        {children}
      </ul>
      {(!edges.atStart || !edges.atEnd) && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            aria-label="محصولات قبلی"
            aria-controls={listId}
            className={buttonClass}
            disabled={edges.atStart}
            onClick={() => move(1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="محصولات بعدی"
            aria-controls={listId}
            className={buttonClass}
            disabled={edges.atEnd}
            onClick={() => move(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
