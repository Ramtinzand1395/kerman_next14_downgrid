"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Loader2, Search, X } from "lucide-react";
import GameCover from "@/app/components/games/GameCover";
import { gameSelectionKey, gameVersionLabel, MAX_APPOINTMENT_GAMES, type AppointmentGame, type CatalogGame } from "@/lib/appointments/games";

type Props = {
  device: string;
  installationType: string;
  selected: AppointmentGame[];
  onChange: (games: AppointmentGame[]) => void;
};

export default function InstallationGames({ device, installationType, selected, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ items: CatalogGame[]; pages: number; total: number }>({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ device, installationType, search, page: String(page) });
        const response = await fetch(`/api/profile/appointments/games?${params}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "فهرست بازی‌ها دریافت نشد.");
        if (!controller.signal.aborted) setResult(payload);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "فهرست بازی‌ها دریافت نشد.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [device, installationType, search, page, reload]);

  const keys = new Set(selected.map(gameSelectionKey));
  const toggle = (game: AppointmentGame) => {
    const key = gameSelectionKey(game);
    if (keys.has(key)) onChange(selected.filter(item => gameSelectionKey(item) !== key));
    else if (selected.length < MAX_APPOINTMENT_GAMES) onChange([...selected, { gameId: game.gameId, platform: game.platform, name: game.name }]);
  };

  return <div className="space-y-4">
    <div>
      <h2 className="text-xl font-black text-slate-950">انتخاب بازی‌ها</h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">حداقل یک بازی انتخاب کنید. {device === "ps5" ? "بازی‌های PS4 و PS5 با برچسب نسخه نمایش داده می‌شوند." : "فهرست بر اساس دستگاه و نوع نصب شما نمایش داده می‌شود."}</p>
    </div>
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 focus-within:ring-4 focus-within:ring-blue-100">
      <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="sr-only">جست‌وجوی بازی</span>
      <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={250} placeholder="نام بازی را جست‌وجو کنید…" className="h-12 w-full min-w-0 bg-transparent text-sm outline-none" />
    </label>
    <div className="rounded-2xl bg-blue-50 p-3">
      <p aria-live="polite" className="text-sm font-bold text-[#001A6E]">{selected.length.toLocaleString("fa-IR")} بازی انتخاب شده</p>
      {selected.length > 0 && <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{selected.map(game => <button key={gameSelectionKey(game)} type="button" onClick={() => toggle(game)} aria-label={`حذف ${game.name} ${gameVersionLabel(game.platform)}`} className="inline-flex max-w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-700 focus-visible:ring-4 focus-visible:ring-blue-200"><span className="truncate">{game.name} · {gameVersionLabel(game.platform)}</span><X className="h-3 w-3 shrink-0" /></button>)}</div>}
      {selected.length >= MAX_APPOINTMENT_GAMES && <p className="mt-2 text-xs text-amber-800">حداکثر ۱۰۰ بازی قابل انتخاب است.</p>}
    </div>
    {loading ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />در حال دریافت بازی‌ها…</p> : error ? <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" onClick={() => setReload(value => value + 1)} className="mr-3 underline">تلاش دوباره</button></div> : !result.items.length ? <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">{search ? "بازی مطابق جست‌وجوی شما پیدا نشد." : "هنوز بازی‌ای برای این انتخاب ثبت نشده است."}</p> : <>
      <p className="text-xs text-slate-500">{result.total.toLocaleString("fa-IR")} بازی</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{result.items.map(game => {
        const active = keys.has(gameSelectionKey(game));
        return <button key={gameSelectionKey(game)} type="button" aria-pressed={active} disabled={!active && selected.length >= MAX_APPOINTMENT_GAMES} onClick={() => toggle(game)} className={`min-w-0 overflow-hidden rounded-2xl border p-2 text-right outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50 ${active ? "border-[#001A6E] bg-blue-50 ring-1 ring-[#001A6E]" : "border-slate-200 bg-white hover:border-blue-300"}`}>
          <GameCover game={game} className="aspect-[3/4] w-full rounded-xl" />
          <span className="mt-2 block rounded-lg bg-slate-100 px-2 py-1 text-center text-[11px] font-black text-[#001A6E]">{gameVersionLabel(game.platform)}</span>
          <strong dir="auto" className="mt-2 block min-h-10 text-xs leading-5 text-slate-800">{game.name}</strong>
          <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#001A6E]"><Gamepad2 className="h-4 w-4" />{active ? "انتخاب شده" : "انتخاب بازی"}</span>
        </button>;
      })}</div>
      {result.pages > 1 && <div className="flex items-center justify-between gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">صفحه قبل</button><span className="text-xs text-slate-500">{page.toLocaleString("fa-IR")} از {result.pages.toLocaleString("fa-IR")}</span><button type="button" disabled={page >= result.pages} onClick={() => setPage(value => value + 1)} className="rounded-xl border px-4 py-3 text-sm disabled:opacity-40">صفحه بعد</button></div>}
    </>}
  </div>;
}
