"use client";
// app/(dashboard)/dashboard/loyalty/tabs/WalletTab.tsx
// مدیریت کیف پول: جستجوی کاربر، هدیه اعتبار، تعدیل دستی، تراکنش‌ها و لاگ‌ها
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Gift, Search, SlidersHorizontal } from "lucide-react";
import {
  apiFetch,
  faNum,
  toman,
  Paged,
  WALLET_TX_STATUS_FA,
  WALLET_TX_TYPE_FA,
} from "@/lib/loyalty/ui";
import { WalletTxStatus, WalletTxType, WALLET_TX_TYPES } from "@/types/loyalty";
import { toPersianDate } from "@/helpers/toPersianDate";
import {
  AdminTable,
  Field,
  inputCls,
  Modal,
  Pager,
  SubmitButton,
  Td,
} from "../components";

interface TxItem {
  _id: string;
  user?: { username?: string; mobile?: string };
  type: WalletTxType;
  status: WalletTxStatus;
  amount: number;
  balanceAfter?: number;
  description?: string;
  createdAt: string;
}

interface LogItem {
  _id: string;
  user?: { username?: string; mobile?: string };
  performedBy?: { username?: string };
  action: string;
  success: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
}

interface WalletInfo {
  balance: number;
  user?: { username?: string; mobile?: string };
}

export default function WalletTab() {
  const [view, setView] = useState<"transactions" | "logs">("transactions");

  // جستجوی کاربر برای عملیات
  const [userId, setUserId] = useState("");
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  const [txs, setTxs] = useState<Paged<TxItem> | null>(null);
  const [logs, setLogs] = useState<Paged<LogItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  const [modal, setModal] = useState<null | "gift" | "adjust">(null);
  const [amount, setAmount] = useState(10_000);
  const [description, setDescription] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: "15" });
    if (userId.trim()) q.set("userId", userId.trim());
    if (typeFilter) q.set("type", typeFilter);
    const path =
      view === "transactions"
        ? `/api/admin/loyalty/wallet/transactions?${q}`
        : `/api/admin/loyalty/wallet/logs?${q}`;
    const res = await apiFetch<Paged<TxItem> & Paged<LogItem>>(path);
    if (res.ok && res.data) {
      if (view === "transactions") setTxs(res.data);
      else setLogs(res.data);
    } else if (res.error) toast.error(res.error);
    setLoading(false);
  }, [page, view, userId, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const lookupWallet = async () => {
    if (!userId.trim()) return;
    const res = await apiFetch<WalletInfo>(
      `/api/admin/loyalty/wallet?userId=${encodeURIComponent(userId.trim())}`,
    );
    if (res.ok) setWalletInfo(res.data ?? null);
    else toast.error(res.error ?? "کیف پول یافت نشد");
  };

  const submitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !modal) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      toast.error("مبلغ باید عددی غیرصفر باشد");
      return;
    }
    if (modal === "gift" && Math.abs(numericAmount) < 1_000) {
      toast.error("حداقل مبلغ هدیه ۱٬۰۰۰ تومان است");
      return;
    }
    setSaving(true);
    const payload =
      modal === "gift"
        ? {
            userId: userId.trim(),
            amount: Math.abs(numericAmount),
            description: description || undefined,
            expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
          }
        : { userId: userId.trim(), amount: numericAmount, description };
    const res = await apiFetch<{ balance: number }>("/api/admin/loyalty/wallet", {
      method: modal === "gift" ? "POST" : "PATCH",
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`انجام شد — موجودی جدید: ${toman(res.data?.balance ?? 0)}`);
      setModal(null);
      setDescription("");
      lookupWallet();
      load();
    } else toast.error(res.error ?? "خطا در انجام عملیات");
  };

  return (
    <div className="space-y-4">
      {/* عملیات روی کاربر */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-slate-800">عملیات کیف پول کاربر</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="شناسه کاربر (ObjectId)">
            <div className="relative">
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={`${inputCls} w-72 font-mono`}
                dir="ltr"
                placeholder="64f…"
              />
            </div>
          </Field>
          <button
            type="button"
            onClick={lookupWallet}
            className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Search className="h-4 w-4" /> مشاهده
          </button>
          <button
            type="button"
            disabled={!userId.trim()}
            onClick={() => {
              setAmount(10_000);
              setModal("gift");
            }}
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            <Gift className="h-4 w-4" /> هدیه اعتبار
          </button>
          <button
            type="button"
            disabled={!userId.trim()}
            onClick={() => {
              setAmount(0);
              setModal("adjust");
            }}
            className="flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-40"
          >
            <SlidersHorizontal className="h-4 w-4" /> تعدیل دستی
          </button>
        </div>
        {walletInfo && (
          <p className="mt-3 text-sm text-slate-600">
            موجودی فعلی{" "}
            <b className="text-slate-800">
              {walletInfo.user?.username || walletInfo.user?.mobile || "کاربر"}
            </b>
            : <b className="text-emerald-600">{toman(walletInfo.balance)}</b>
          </p>
        )}
      </div>

      {/* سوییچ تراکنش/لاگ + فیلتر */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(["transactions", "logs"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-1.5 text-sm transition ${
                view === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {v === "transactions" ? "تراکنش‌ها" : "لاگ حسابرسی"}
            </button>
          ))}
        </div>
        {view === "transactions" && (
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className={`${inputCls} w-44`}
          >
            <option value="">همه انواع</option>
            {WALLET_TX_TYPES.map((t) => (
              <option key={t} value={t}>
                {WALLET_TX_TYPE_FA[t]}
              </option>
            ))}
          </select>
        )}
      </div>

      {view === "transactions" ? (
        <>
          <AdminTable
            headers={["کاربر", "نوع", "مبلغ", "موجودی بعد", "وضعیت", "توضیح", "تاریخ"]}
            loading={loading}
            empty={!txs || txs.items.length === 0}
          >
            {txs?.items.map((t) => (
              <tr key={t._id}>
                <Td className="text-xs">{t.user?.username || t.user?.mobile || "—"}</Td>
                <Td>{WALLET_TX_TYPE_FA[t.type]}</Td>
                <Td className="font-bold">{faNum(t.amount)}</Td>
                <Td>{faNum(t.balanceAfter)}</Td>
                <Td>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {WALLET_TX_STATUS_FA[t.status]}
                  </span>
                </Td>
                <Td className="max-w-48 truncate text-xs text-slate-500">{t.description ?? "—"}</Td>
                <Td className="text-xs">{toPersianDate(t.createdAt)}</Td>
              </tr>
            ))}
          </AdminTable>
          {txs && <Pager page={page} pages={txs.pages} onChange={setPage} />}
        </>
      ) : (
        <>
          <AdminTable
            headers={["کاربر", "عملیات", "نتیجه", "انجام‌دهنده", "تاریخ"]}
            loading={loading}
            empty={!logs || logs.items.length === 0}
          >
            {logs?.items.map((l) => (
              <tr key={l._id}>
                <Td className="text-xs">{l.user?.username || l.user?.mobile || "—"}</Td>
                <Td className="font-mono text-xs">{l.action}</Td>
                <Td>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      l.success
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {l.success ? "موفق" : "ناموفق"}
                  </span>
                </Td>
                <Td className="text-xs">{l.performedBy?.username ?? "سیستم"}</Td>
                <Td className="text-xs">{toPersianDate(l.createdAt)}</Td>
              </tr>
            ))}
          </AdminTable>
          {logs && <Pager page={page} pages={logs.pages} onChange={setPage} />}
        </>
      )}

      {modal && (
        <Modal
          title={modal === "gift" ? "هدیه اعتبار کیف پول" : "تعدیل دستی موجودی"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submitAction} className="space-y-3">
            <Field label={modal === "gift" ? "مبلغ هدیه (تومان)" : "مبلغ (مثبت = افزایش / منفی = کسر)"}>
              <input
                required
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={inputCls}
                dir="ltr"
              />
            </Field>
            {modal === "gift" && (
              <Field label="انقضا بعد از چند روز؟ (خالی = پیش‌فرض سیستم)">
                <input
                  type="number"
                  min={0}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}
            <Field label={modal === "adjust" ? "توضیح (الزامی)" : "توضیح (اختیاری)"}>
              <textarea
                required={modal === "adjust"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
                rows={2}
              />
            </Field>
            <SubmitButton loading={saving} label="تأیید و اجرا" />
          </form>
        </Modal>
      )}
    </div>
  );
}
