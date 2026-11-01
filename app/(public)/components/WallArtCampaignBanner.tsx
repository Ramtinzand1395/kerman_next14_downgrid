"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WallArtCampaign } from "@/lib/campaigns/wall-art";

export default function WallArtCampaignBanner() {
  const [campaign, setCampaign] = useState<WallArtCampaign | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const request = controller;
      const timeout = window.setTimeout(() => request.abort(), 10000);
      try {
        const response = await fetch("/api/campaigns/wall-art", {
          cache: "no-store",
          signal: request.signal,
        });
        const data = response.ok ? await response.json() : { campaign: null };
        if (!disposed) setCampaign(data.campaign ?? null);
      } catch {
        if (!disposed) setCampaign(null);
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!campaign) return;
    const remaining = Date.parse(campaign.expiresAt) - Date.now();
    if (remaining <= 0) { setCampaign(null); return; }
    const timeout = window.setTimeout(() => setCampaign(null), Math.min(remaining, 2147483647));
    return () => window.clearTimeout(timeout);
  }, [campaign]);

  if (!campaign) return null;

  async function copyCode() {
    if (!campaign) return;
    try {
      await navigator.clipboard.writeText(campaign.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const deadline = new Date(campaign.expiresAt).toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <aside aria-label="کمپین تابلو گیمینگ" dir="rtl"
      className="border-y border-cyan-300/30 bg-[#071827] px-4 py-4 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold sm:text-base">
            ستاپتو کامل کن؛ {campaign.percent.toLocaleString("fa-IR")}٪ تخفیف تابلو و شاسی
          </p>
          <p className="mt-1 text-xs leading-6 text-slate-200">
            تا {deadline} به وقت تهران · هر حساب یک‌بار · هزینه ارسال جداگانه
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={copyCode}
            aria-label={`کپی کد تخفیف ${campaign.code}`}
            className="min-h-11 rounded-lg border border-cyan-300 px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
            <span dir="ltr">{campaign.code}</span>
            <span className="mr-2 text-xs" aria-live="polite">{copied ? "کپی شد" : "کپی کد"}</span>
          </button>
          <Link href="/category/gaming-wall-art?utm_source=website&utm_medium=banner&utm_campaign=setup7"
            className="inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-4 text-sm font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
            انتخاب تابلو
          </Link>
        </div>
      </div>
    </aside>
  );
}
