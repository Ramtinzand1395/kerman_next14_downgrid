"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
