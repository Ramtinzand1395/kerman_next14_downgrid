import type { InstallationGame } from "@/lib/appointments/games";
import { gameKey, installationGameTotal, installationSize } from "@/lib/appointments/games";
import { formatPrice } from "@/helpers/Price";

export default function InstallationGameSummary({ games = [], showPrices = false }: { games?: InstallationGame[]; showPrices?: boolean }) {
  if (!games.length) return null;
  const { totalSizeGB, unknownSizeCount } = installationSize(games);
  const gameTotal = installationGameTotal(games);
  return (
    <section className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <h3 className="font-black text-slate-900">بازی‌های انتخابی ({games.length.toLocaleString("fa-IR")})</h3>
      <p className="mt-1 text-xs leading-6 text-slate-600">
        حجم بازی‌ها: <strong dir="ltr">{totalSizeGB.toLocaleString("fa-IR")} GB</strong>
        {unknownSizeCount > 0 && ` + ${unknownSizeCount.toLocaleString("fa-IR")} بازی با حجم نامشخص`}
      </p>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto print:max-h-none print:overflow-visible">
        {games.map((game) => <li key={gameKey(game)} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs print:break-inside-avoid">
          <span className="min-w-0 break-words font-bold" dir="auto">{game.name}</span>
          <span className="shrink-0 text-left text-slate-500"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-[#001A6E]">{game.version}</span><span className="mt-1 block" dir="ltr">{game.sizeGB === null ? "حجم نامشخص" : `${game.sizeGB.toLocaleString("fa-IR")} GB`}</span>
            {showPrices && <span className="mt-1 block font-bold text-slate-700">{game.price == null ? "قیمت پس از بررسی" : `${formatPrice(game.price)} تومان`}</span>}
          </span>
        </li>)}
      </ul>
      {showPrices && <p className="mt-3 text-sm font-bold text-slate-800">
        جمع قیمت بازی‌ها {gameTotal === null ? "پس از بررسی اعلام می‌شود" : `${formatPrice(gameTotal)} تومان`}
      </p>}
      <p className="mt-2 text-[11px] leading-5 text-slate-500">حجم‌ها تقریبی‌اند و ممکن است با به‌روزرسانی بازی تغییر کنند.</p>
    </section>
  );
}
