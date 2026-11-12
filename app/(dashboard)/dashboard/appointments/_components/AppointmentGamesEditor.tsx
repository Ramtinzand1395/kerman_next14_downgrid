"use client";

import { useEffect, useState, type FormEvent } from "react";
import { gameKey, MAX_INSTALLATION_GAMES, type InstallationGame } from "@/lib/appointments/games";
import type { AppointmentItem } from "@/types/appointments";

type Props = {
  item: AppointmentItem;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export default function AppointmentGamesEditor({ item, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<InstallationGame[]>(item.selectedGames || []);
  const initialAmount = String(item.pricing?.serviceBaseAmount ?? item.pricing?.baseAmount ?? "");
  const [amount, setAmount] = useState(initialAmount);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [games, setGames] = useState<InstallationGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      device: item.device,
      installationType: item.installationType || "",
      search,
      page: String(page),
    });
    setLoading(true);
    setCatalogError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/profile/appointments/games?${params}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "فهرست بازی‌ها دریافت نشد.");
        setGames(payload.games);
        setPages(payload.pages);
      } catch (error) {
        if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : "فهرست بازی‌ها دریافت نشد.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [item.device, item.installationType, page, search]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected.length || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`/api/admin/appointments/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedGames: selected.map(({ platform, gameId }) => ({ platform, gameId })),
          ...(amount !== initialAmount && amount !== "" ? { baseAmount: Number(amount) } : {}),
          expectedUpdatedAt: item.updatedAt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تغییرات سفارش ذخیره نشد.");
      const status = payload.data?.gamesNotificationStatus;
      onSaved(status === "failed" ? "تغییرات ذخیره شد. ارسال اعلان به مشتری ناموفق بود."
        : status === "sent" ? "تغییرات ذخیره شد و اعلان برای مشتری ارسال شد." : "سفارش ذخیره شد.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "تغییرات سفارش ذخیره نشد.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-slate-950/50 p-4">
      <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="appointment-games-title"
        className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5">
        <h2 id="appointment-games-title" className="font-black text-slate-900">ویرایش بازی‌های سفارش</h2>
        <label className="block text-sm font-bold">
          جست‌وجو در فهرست بازی‌ها
          <input autoFocus type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="mt-1 w-full rounded-lg border p-2" />
        </label>
        <div className="max-h-48 space-y-1 overflow-auto rounded-xl border p-2" aria-busy={loading}>
          {loading ? <p className="p-2 text-sm">در حال دریافت بازی‌ها…</p> : catalogError ? (
            <p role="alert" className="p-2 text-sm text-rose-700">{catalogError}</p>
          ) : games.length ? games.map((game) => {
            const key = gameKey(game);
            return (
              <button key={key} type="button" disabled={saving || selected.length >= MAX_INSTALLATION_GAMES || selected.some((entry) => gameKey(entry) === key)}
                onClick={() => setSelected((previous) => [...previous, game])}
                className="block w-full rounded-lg px-3 py-1.5 text-right text-sm hover:bg-indigo-50 disabled:opacity-40">
                افزودن {game.name} · {game.version}
              </button>
            );
          }) : <p className="p-2 text-sm">بازی پیدا نشد.</p>}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">قبلی</button>
            <span>{page.toLocaleString("fa-IR")} / {pages.toLocaleString("fa-IR")}</span>
            <button type="button" disabled={loading || page >= pages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">بعدی</button>
          </div>
        )}
        <p className="text-sm font-bold">بازی‌های انتخاب‌شده ({selected.length.toLocaleString("fa-IR")})</p>
        <ul className="flex flex-wrap gap-2">
          {selected.map((game) => (
            <li key={gameKey(game)} className="rounded-lg bg-indigo-50 px-2 py-1 text-sm">
              <button type="button" disabled={saving} aria-label={`حذف ${game.name} نسخه ${game.version}`}
                onClick={() => setSelected((previous) => previous.filter((entry) => gameKey(entry) !== gameKey(game)))}>
                {game.name} · {game.version} ×
              </button>
            </li>
          ))}
        </ul>
        <label className="block text-sm font-bold">
          مبلغ خدمت (تومان)
          <input type="number" min={0} max={1_000_000_000} step={1} value={amount} onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-lg border p-2" />
        </label>
        {saveError && <p role="alert" className="text-sm font-bold text-rose-700">{saveError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving || !selected.length} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">ذخیره تغییرات</button>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-bold">بستن</button>
        </div>
      </form>
    </div>
  );
}
