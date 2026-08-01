"use client";
// app/(dashboard)/dashboard/loyalty/tabs/CouponsTab.tsx
// مدیریت کوپن‌های تخفیف: لیست با جستجو، ساخت/ویرایش، فعال/غیرفعال
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Search } from "lucide-react";
import { apiFetch, faNum, toman, Paged } from "@/lib/loyalty/ui";
import { CouponScope, CouponType } from "@/types/loyalty";
import { toPersianDate } from "@/helpers/toPersianDate";
import {
  AdminTable,
  Field,
  inputCls,
  Modal,
  Pager,
  RowActions,
  SubmitButton,
  Td,
  Toggle,
} from "../components";

export interface CouponItem {
  _id: string;
  code: string;
  title?: string;
  type: CouponType;
  value: number;
  scope: CouponScope;
  minPurchaseAmount: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit: number;
  usedCount?: number;
  expiresAt?: string;
  isActive: boolean;
}

const emptyForm = {
  code: "",
  title: "",
  type: "percent" as CouponType,
  value: 10,
  scope: "public" as CouponScope,
  minPurchaseAmount: 0,
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: 1,
  expiresAt: "",
  isActive: true,
};

export default function CouponsTab() {
  const [data, setData] = useState<Paged<CouponItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) q.set("search", search);
    const res = await apiFetch<Paged<CouponItem>>(`/api/admin/loyalty/coupons?${q}`);
    if (res.ok && res.data) setData(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setModal({});
  };

  const openEdit = (c: CouponItem) => {
    setForm({
      code: c.code,
      title: c.title ?? "",
      type: c.type,
      value: c.value,
      scope: c.scope,
      minPurchaseAmount: c.minPurchaseAmount ?? 0,
      maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : "",
      usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      perUserLimit: c.perUserLimit ?? 1,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      isActive: c.isActive,
    });
    setModal({ id: c._id });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      code: form.code.trim(),
      title: form.title || undefined,
      type: form.type,
      value: Number(form.value),
      scope: form.scope,
      minPurchaseAmount: Number(form.minPurchaseAmount) || 0,
      perUserLimit: Number(form.perUserLimit) || 1,
      isActive: form.isActive,
    };
    if (form.maxDiscountAmount) payload.maxDiscountAmount = Number(form.maxDiscountAmount);
    if (form.usageLimit) payload.usageLimit = Number(form.usageLimit);
    if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

    const res = modal?.id
      ? await apiFetch(`/api/admin/loyalty/coupons/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/admin/loyalty/coupons", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (res.ok) {
      toast.success(modal?.id ? "کوپن ویرایش شد" : "کوپن ساخته شد");
      setModal(null);
      load();
    } else {
      toast.error(res.error ?? "خطا در ذخیره");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("کوپن غیرفعال شود؟")) return;
    const res = await apiFetch(`/api/admin/loyalty/coupons/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("کوپن غیرفعال شد");
      load();
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="جستجوی کد…"
            className={`${inputCls} pr-8 w-56`}
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> کوپن جدید
        </button>
      </div>

      <AdminTable
        headers={["کد", "نوع", "مقدار", "حداقل خرید", "استفاده", "انقضا", "وضعیت", "عملیات"]}
        loading={loading}
        empty={!data || data.items.length === 0}
      >
        {data?.items.map((c) => (
          <tr key={c._id}>
            <Td className="font-mono font-bold text-indigo-600">{c.code}</Td>
            <Td>{c.type === "percent" ? "درصدی" : "مبلغ ثابت"}</Td>
            <Td>{c.type === "percent" ? `${faNum(c.value)}٪` : toman(c.value)}</Td>
            <Td>{c.minPurchaseAmount ? toman(c.minPurchaseAmount) : "—"}</Td>
            <Td>
              {faNum(c.usedCount ?? 0)}
              {c.usageLimit ? ` / ${faNum(c.usageLimit)}` : ""}
            </Td>
            <Td className="text-xs">{c.expiresAt ? toPersianDate(c.expiresAt) : "—"}</Td>
            <Td>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {c.isActive ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <RowActions onEdit={() => openEdit(c)} onDelete={() => remove(c._id)} />
            </Td>
          </tr>
        ))}
      </AdminTable>
      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}

      {modal && (
        <Modal title={modal.id ? "ویرایش کوپن" : "کوپن جدید"} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="کد (انگلیسی)">
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className={`${inputCls} font-mono`}
                  dir="ltr"
                />
              </Field>
              <Field label="عنوان (اختیاری)">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="نوع">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}
                  className={inputCls}
                >
                  <option value="percent">درصدی</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </Field>
              <Field label={form.type === "percent" ? "درصد تخفیف" : "مبلغ تخفیف (تومان)"}>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="حداقل مبلغ خرید">
                <input
                  type="number"
                  min={0}
                  value={form.minPurchaseAmount}
                  onChange={(e) =>
                    setForm({ ...form, minPurchaseAmount: Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="سقف تخفیف (اختیاری)">
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="محدودیت تعداد استفاده (خالی = نامحدود)">
                <input
                  type="number"
                  min={1}
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="تعداد مجاز برای هر کاربر">
                <input
                  type="number"
                  min={1}
                  value={form.perUserLimit}
                  onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="تاریخ انقضا (اختیاری)">
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                />
              </Field>
              <Field label="دامنه">
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value as CouponScope })}
                  className={inputCls}
                >
                  <option value="public">عمومی</option>
                  <option value="private">خصوصی</option>
                </select>
              </Field>
            </div>
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm({ ...form, isActive: v })}
              label="فعال"
            />
            <SubmitButton loading={saving} label={modal.id ? "ذخیره تغییرات" : "ساخت کوپن"} />
          </form>
        </Modal>
      )}
    </div>
  );
}
