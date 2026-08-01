"use client";
// app/(dashboard)/dashboard/loyalty/components.tsx
// اجزای مشترک پنل مدیریت باشگاه مشتریان:
// AdminTable (جدول استاندارد)، Modal، Field ورودی‌ها، Pager و Toggle
import { ReactNode, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { faNum } from "@/lib/loyalty/ui";

// ---------- جدول ----------

export function AdminTable({
  headers,
  children,
  empty,
  loading,
}: {
  headers: string[];
  children: ReactNode;
  empty: boolean;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-right text-sm text-slate-700">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="py-10 text-center text-slate-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={headers.length} className="py-10 text-center text-slate-400">
                موردی یافت نشد
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-3 py-2.5 ${className}`}>{children}</td>;
}

// ---------- صفحه‌بندی ----------

export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-slate-600">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-50 disabled:opacity-40"
        title="قبل"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="text-xs">
        صفحه {faNum(page)} از {faNum(pages)}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-50 disabled:opacity-40"
        title="بعد"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------- مودال ----------

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-700"
            title="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- ورودی‌ها ----------

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-slate-600"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "right-0.5" : "right-4"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
    >
      {loading ? "در حال ذخیره…" : label}
    </button>
  );
}

/** دکمه‌های ویرایش/حذف سطر جدول */
export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-600 transition hover:bg-indigo-100"
        >
          ویرایش
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-100"
        >
          حذف
        </button>
      )}
    </div>
  );
}
