"use client";
// app/(public)/my-profile/MyWallet.tsx
// کیف پول کاربر: موجودی، اعتبار در حال انقضا، شارژ از طریق زرین‌پال،
// و تاریخچه تراکنش‌ها با صفحه‌بندی و فیلتر نوع.
import { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import { Wallet, CreditCard, History, ChevronLeft, ChevronRight } from "lucide-react";
import { toPersianDate } from "@/helpers/toPersianDate";
import {
  apiFetch,
  faNum,
  toman,
  Paged,
  WALLET_TX_STATUS_CLASS,
  WALLET_TX_STATUS_FA,
  WALLET_TX_TYPE_FA,
} from "@/lib/loyalty/ui";
import { WALLET_TX_TYPES, WalletTxStatus, WalletTxType } from "@/types/loyalty";

interface WalletSummary {
  balance: number;
  expiringSoon: number;
  isActive: boolean;
}

interface WalletTx {
  _id: string;
  type: WalletTxType;
  status: WalletTxStatus;
  amount: number;
  balanceAfter?: number;
  description?: string;
  createdAt: string;
}

const CHARGE_PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

export default function MyWallet() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [amount, setAmount] = useState<number>(100_000);
  const [charging, setCharging] = useState(false);

  const [txs, setTxs] = useState<Paged<WalletTx> | null>(null);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"" | WalletTxType>("");

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    const res = await apiFetch<WalletSummary>("/api/wallet");
    if (res.ok && res.data) setSummary(res.data);
    else if (res.error) toast.error(res.error);
    setLoadingSummary(false);
  }, []);

  const loadTxs = useCallback(async () => {
    setLoadingTxs(true);
    const q = new URLSearchParams({ page: String(page), limit: "10" });
    if (typeFilter) q.set("type", typeFilter);
    const res = await apiFetch<Paged<WalletTx>>(`/api/wallet/transactions?${q}`);
    if (res.ok && res.data) setTxs(res.data);
    else if (res.error) toast.error(res.error);
    setLoadingTxs(false);
  }, [page, typeFilter]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTxs();
  }, [loadTxs]);

  // درخواست شارژ → دریافت لینک درگاه → هدایت به زرین‌پال
  const handleCharge = async () => {
    if (charging) return;
    setCharging(true);
    const res = await apiFetch<{ paymentUrl: string }>("/api/wallet/charge", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });
    setCharging(false);
    if (res.ok && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else {
      toast.error(res.error ?? "خطا در ایجاد درخواست شارژ");
    }
  };

  return (
    <section className="space-y-5">
      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-l from-indigo-600 to-violet-600 p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 text-indigo-100">
            <Wallet className="h-5 w-5" />
            <span className="text-sm">موجودی کیف پول</span>
          </div>
          <p className="mt-3 text-2xl font-bold">
            {loadingSummary ? (
              <Skeleton width={120} height={28} baseColor="#818cf8" highlightColor="#a5b4fc" />
            ) : (
              toman(summary?.balance ?? 0)
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">اعتبار در حال انقضا</p>
          <p className="mt-3 text-xl font-bold text-amber-600">
            {loadingSummary ? <Skeleton width={100} height={24} /> : toman(summary?.expiringSoon ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">اعتبارات هدیه دارای تاریخ انقضا هستند</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">وضعیت کیف پول</p>
          <p className="mt-3 text-xl font-bold">
            {loadingSummary ? (
              <Skeleton width={80} height={24} />
            ) : summary?.isActive === false ? (
              <span className="text-rose-600">غیرفعال</span>
            ) : (
              <span className="text-emerald-600">فعال</span>
            )}
          </p>
        </div>
      </div>

      {/* شارژ کیف پول */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <CreditCard className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">شارژ کیف پول</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {CHARGE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                amount === preset
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {toman(preset)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="number"
            min={10_000}
            max={50_000_000}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm sm:max-w-xs"
            placeholder="مبلغ دلخواه (تومان)"
          />
          <button
            type="button"
            disabled={charging || amount < 10_000}
            onClick={handleCharge}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {charging ? "در حال اتصال به درگاه…" : "پرداخت و شارژ"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          حداقل مبلغ شارژ {toman(10_000)} — پرداخت از طریق درگاه امن زرین‌پال انجام می‌شود.
        </p>
      </div>

      {/* تاریخچه تراکنش‌ها */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">تاریخچه تراکنش‌ها</h3>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "" | WalletTxType);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"
          >
            <option value="">همه انواع</option>
            {WALLET_TX_TYPES.map((t) => (
              <option key={t} value={t}>
                {WALLET_TX_TYPE_FA[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="py-2 font-medium">نوع</th>
                <th className="py-2 font-medium">مبلغ</th>
                <th className="py-2 font-medium">موجودی بعد</th>
                <th className="py-2 font-medium">وضعیت</th>
                <th className="py-2 font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {loadingTxs ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={5} className="py-3">
                      <Skeleton height={18} />
                    </td>
                  </tr>
                ))
              ) : txs && txs.items.length > 0 ? (
                txs.items.map((tx) => (
                  <tr key={tx._id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3">
                      <p className="font-medium text-slate-700">{WALLET_TX_TYPE_FA[tx.type]}</p>
                      {tx.description && (
                        <p className="text-xs text-slate-400">{tx.description}</p>
                      )}
                    </td>
                    <td
                      className={`py-3 font-bold ${
                        ["payment", "expire", "admin_adjust"].includes(tx.type) &&
                        tx.type !== "admin_adjust"
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {faNum(tx.amount)}
                    </td>
                    <td className="py-3 text-slate-500">{faNum(tx.balanceAfter)}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${WALLET_TX_STATUS_CLASS[tx.status]}`}
                      >
                        {WALLET_TX_STATUS_FA[tx.status]}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-400">{toPersianDate(tx.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    تراکنشی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* صفحه‌بندی */}
        {txs && txs.pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
              title="صفحه قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">
              صفحه {faNum(page)} از {faNum(txs.pages)}
            </span>
            <button
              type="button"
              disabled={page >= txs.pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
              title="صفحه بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
