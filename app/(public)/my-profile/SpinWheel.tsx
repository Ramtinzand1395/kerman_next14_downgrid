"use client";
// app/(public)/my-profile/SpinWheel.tsx
// گردونه شانس روزانه: نمایش جوایز، چرخش SVG با انیمیشن، نتیجه و تاریخچه
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import { Dices, History } from "lucide-react";
import { toPersianDate } from "@/helpers/toPersianDate";
import { apiFetch, SPIN_PRIZE_TYPE_FA, SPIN_SEGMENT_COLORS } from "@/lib/loyalty/ui";
import { SpinPrizeType } from "@/types/loyalty";

interface Prize {
  _id: string;
  title: string;
  type: SpinPrizeType;
  value: number;
  order: number;
}

interface SpinRecord {
  _id: string;
  dayKey: string;
  prizeSnapshot: { title: string; type: SpinPrizeType; value: number };
  createdAt: string;
}

interface SpinStatus {
  canSpin: boolean;
  todaySpin: SpinRecord | null;
  history: SpinRecord[];
  prizes: Prize[];
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/** مسیر یک قطاع دایره (slice) */
function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y} Z`;
}

export default function SpinWheel() {
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const rotationRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<SpinStatus>("/api/loyalty/spin");
    if (res.ok && res.data) setStatus(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const prizes = useMemo(() => status?.prizes ?? [], [status]);
  const sliceAngle = prizes.length > 0 ? 360 / prizes.length : 360;

  const handleSpin = async () => {
    if (spinning || !status?.canSpin) return;
    setSpinning(true);
    setResult(null);

    const res = await apiFetch<{ prize: { title: string } }>("/api/loyalty/spin", {
      method: "POST",
    });

    if (!res.ok || !res.data) {
      toast.error(res.error ?? "خطا در چرخش گردونه");
      setSpinning(false);
      return;
    }

    // یافتن اندیس جایزه برنده برای توقف گردونه روی همان قطاع
    const winIndex = Math.max(
      0,
      prizes.findIndex((p) => p.title === res.data!.prize.title),
    );

    // اشاره‌گر بالای گردونه است (زاویه 0) — مرکز قطاع برنده باید به بالا برسد.
    const targetAngle = 360 - (winIndex * sliceAngle + sliceAngle / 2);
    const totalRotation = rotationRef.current + 360 * 5 + ((targetAngle - rotationRef.current) % 360 + 360) % 360;
    rotationRef.current = totalRotation;
    setRotation(totalRotation);

    // پایان انیمیشن (هم‌زمان با transition مدت‌دار روی چرخ)
    window.setTimeout(() => {
      setResult(res.data!.prize.title);
      setSpinning(false);
      load();
    }, 4200);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton height={320} />
      </section>
    );
  }

  if (!status || prizes.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Dices className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">گردونه شانس در حال حاضر فعال نیست</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-indigo-50 to-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dices className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">گردونه شانس روزانه</h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status.canSpin
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {status.canSpin ? "یک چرخش رایگان داری!" : "امروز چرخانده‌ای — فردا دوباره"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* گردونه */}
          <div className="relative">
            {/* اشاره‌گر */}
            <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
              <div className="h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-rose-500 drop-shadow" />
            </div>

            <svg
              width={280}
              height={280}
              viewBox="0 0 280 280"
              className="drop-shadow-lg"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? "transform 4.2s cubic-bezier(0.15, 0.9, 0.25, 1)"
                  : "none",
              }}
            >
              {prizes.map((p, i) => {
                const start = i * sliceAngle;
                const end = start + sliceAngle;
                const mid = start + sliceAngle / 2;
                const labelPos = polar(140, 140, 95, mid);
                return (
                  <g key={p._id}>
                    <path
                      d={slicePath(140, 140, 134, start, end)}
                      fill={SPIN_SEGMENT_COLORS[i % SPIN_SEGMENT_COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={prizes.length > 6 ? 9 : 11}
                      fontWeight={700}
                      transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                    >
                      {p.title.length > 14 ? `${p.title.slice(0, 13)}…` : p.title}
                    </text>
                  </g>
                );
              })}
              <circle cx={140} cy={140} r={30} fill="#fff" stroke="#e2e8f0" strokeWidth={2} />
              <circle cx={140} cy={140} r={10} fill="#6366f1" />
            </svg>
          </div>

          <button
            type="button"
            onClick={handleSpin}
            disabled={!status.canSpin || spinning}
            className="rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-300 transition hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            {spinning ? "در حال چرخش…" : status.canSpin ? "بچرخان!" : "فردا دوباره بیا"}
          </button>

          {result && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
              <p className="text-sm text-emerald-700">🎉 تبریک! جایزه شما:</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">{result}</p>
            </div>
          )}

          {status.todaySpin && !result && (
            <p className="text-sm text-slate-500">
              جایزه امروز شما: <b className="text-slate-700">{status.todaySpin.prizeSnapshot.title}</b>
            </p>
          )}
        </div>
      </div>

      {/* تاریخچه */}
      {status.history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <History className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">تاریخچه جوایز</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {status.history.map((h) => (
              <li key={h._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-slate-700">{h.prizeSnapshot.title}</p>
                  <p className="text-xs text-slate-400">
                    {SPIN_PRIZE_TYPE_FA[h.prizeSnapshot.type]}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{toPersianDate(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
