"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

const COURIER_TUTORIAL_URL = "/videos/1000202309.mp4";

export default function CourierTutorial() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="rounded-xl border border-blue-200 bg-blue-50 text-[#001A6E]"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 [&::-webkit-details-marker]:hidden">
        <PlayCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        {isOpen ? "بستن ویدئوی آموزش پیک" : "تماشای آموزش ثبت درخواست پیک"}
      </summary>
      {isOpen && (
        <div className="border-t border-blue-200 p-2 sm:p-3">
          <video
            aria-label="ویدئوی آموزش ثبت درخواست پیک کرمان آتاری"
            className="mx-auto aspect-[680/467] w-full max-w-2xl rounded-lg bg-slate-950"
            controls
            playsInline
            preload="none"
          >
            <source src={COURIER_TUTORIAL_URL} type="video/mp4" />
            <a href={COURIER_TUTORIAL_URL}>باز کردن ویدئوی آموزش پیک</a>
          </video>
        </div>
      )}
    </details>
  );
}
