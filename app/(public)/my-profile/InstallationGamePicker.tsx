"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, HardDrive, Loader2, Search, X } from "lucide-react";
import GameCover from "@/app/components/games/GameCover";
import { gameKey, installationSize, MAX_INSTALLATION_GAMES, type InstallationGame } from "@/lib/appointments/games";

type Props = {
  device: string;
  installationType: string;
  value: InstallationGame[];
  onChange: (games: InstallationGame[]) => void;
};

export default function InstallationGamePicker({ device, installationType, value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [games, setGames] = useState<InstallationGame[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { totalSizeGB, unknownSizeCount } = installationSize(value);
  const selectedKeys = new Set(value.map(gameKey));

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ device, page: String(page), search });
        if (installationType) params.set("installationType", installationType);
        const response = await fetch(`/api/profile/appointments/games?${params}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "دریافت بازی‌ها ناموفق بود.");
        if (!active) return;
        setGames(data.games);
        setPages(data.pages);
        setTotal(data.total);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "دریافت بازی‌ها ناموفق بود.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [device, installationType, page, search, reload]);

  function toggle(game: InstallationGame) {
    const key = gameKey(game);
    onChange(selectedKeys.has(key) ? value.filter((item) => gameKey(item) !== key) : [...value, game]);
  }

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-950">بازی‌های دلخواهت را انتخاب کن</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">{device === "ps5" ? "بازی‌های PS5 و نسخه‌های سازگار PS4 در یک فهرست نمایش داده می‌شوند؛ نسخه هر بازی روی کارت مشخص است." : "فهرست بازی‌ها متناسب با دستگاه و نوع نصب شماست."}</p>
      </div>
      <div className="sticky top-2 z-10 rounded-2xl bg-[#001A6E] p-4 text-white shadow-lg" aria-live="polite" aria-atomic="true">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-bold"><HardDrive className="h-5 w-5" />حجم بازی‌های انتخابی</span>
          <strong className="text-xl" dir="ltr">{totalSizeGB.toLocaleString("fa-IR")} GB</strong>
        </div>
        <p className="mt-2 text-xs leading-6 text-blue-100">{value.length.toLocaleString("fa-IR")} بازی انتخاب شده{unknownSizeCount ? `؛ حجم ${unknownSizeCount.toLocaleString("fa-IR")} بازی هنوز مشخص نیست.` : "؛ حجم‌ها تقریبی‌اند."}</p>
      </div>
      {value.length > 0 && <div>
        <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-700">انتخاب‌های شما</h3><button type="button" onClick={() => onChange([])} className="min-h-10 px-2 text-xs font-bold text-rose-700">حذف همه</button></div>
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">{value.map((game) => <button type="button" key={gameKey(game)} onClick={() => toggle(game)} aria-label={`حذف ${game.name} نسخه ${game.version}`} className="flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-[#001A6E]"><span className="min-w-0 truncate" dir="auto">{game.name}</span><span className="shrink-0 font-bold">{game.version}</span><X className="h-4 w-4 shrink-0" /></button>)}</div>
      </div>}
      <label className="block"><span className="text-sm font-bold text-slate-700">جست‌وجوی بازی</span><span className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 focus-within:ring-4 focus-within:ring-blue-100"><Search className="h-5 w-5 shrink-0 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="نام بازی را بنویسید…" maxLength={250} className="h-12 min-w-0 flex-1 bg-transparent outline-none" /></span></label>
      {value.length >= MAX_INSTALLATION_GAMES && <p role="status" className="text-sm text-amber-800">حداکثر ۱۰۰ بازی قابل انتخاب است.</p>}
      {loading ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> در حال دریافت بازی‌ها…</div> : error ? <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-sm text-rose-700"><p>{error}</p><button type="button" onClick={() => setReload((n) => n + 1)} className="mt-3 min-h-10 rounded-xl border border-rose-200 px-4 font-bold">تلاش دوباره</button></div> : games.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{search ? "بازی‌ای با این نام پیدا نشد." : "هنوز بازی‌ای برای این انتخاب ثبت نشده است."}</p> : <>
        <p className="text-xs text-slate-500">{total.toLocaleString("fa-IR")} نسخه بازی در فهرست</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{games.map((game) => {
          const selected = selectedKeys.has(gameKey(game));
          return <button type="button" key={gameKey(game)} aria-pressed={selected} disabled={!selected && value.length >= MAX_INSTALLATION_GAMES} onClick={() => toggle(game)} className={`relative flex min-w-0 flex-col rounded-2xl border-2 p-2 text-right transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50 ${selected ? "border-[#001A6E] bg-blue-50 shadow-md" : "border-slate-100 bg-white hover:border-blue-200"}`}>
            <GameCover game={game} className="aspect-[3/4] w-full" sizes="(min-width: 1280px) 160px, (min-width: 640px) 180px, 45vw" />
            <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-[#001A6E] bg-[#001A6E] text-white" : "border-slate-300 bg-white"}`}>{selected && <Check className="h-4 w-4" />}</span>
            <span className={`mt-3 rounded-lg px-2 py-1 text-[10px] font-black ${game.version === "PS5" ? "bg-blue-100 text-blue-800" : game.version === "Xbox" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{game.version}</span>
            <strong className="my-2 line-clamp-2 min-h-10 break-words text-xs leading-5 text-slate-900" dir="auto">{game.name}</strong>
            <span className="mt-auto text-xs text-slate-500" dir="ltr">{game.sizeGB === null ? "حجم نامشخص" : `${game.sizeGB.toLocaleString("fa-IR")} GB`}</span>
          </button>;
        })}</div>
        <nav aria-label="صفحه‌بندی بازی‌ها" className="flex items-center justify-between gap-2">
          <button type="button" aria-label="صفحه قبل بازی‌ها" disabled={page <= 1} onClick={() => setPage((n) => n - 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
          <span className="text-xs text-slate-500">صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>
          <button type="button" aria-label="صفحه بعد بازی‌ها" disabled={page >= pages} onClick={() => setPage((n) => n + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
        </nav>
      </>}
    </div>
  );
}
