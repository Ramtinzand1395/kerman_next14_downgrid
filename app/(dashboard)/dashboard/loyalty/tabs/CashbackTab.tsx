"use client";
// app/(dashboard)/dashboard/loyalty/tabs/CashbackTab.tsx
// مدیریت قوانین کش‌بک: درصد بازگشت به کیف پول پس از خرید
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { apiFetch, faNum, toman } from "@/lib/loyalty/ui";
import { VipTier, VIP_TIER_FA, VIP_TIERS } from "@/types/loyalty";
import {
  AdminTable,
  Field,
  inputCls,
  Modal,
  RowActions,
  SubmitButton,
  Td,
  Toggle,
} from "../components";

interface Rule {
  _id: string;
  title: string;
  percent: number;
  maxAmount?: number;
  minOrderAmount: number;
  vipTiers: VipTier[];
  priority: number;
  isActive: boolean;
}

const emptyForm = {
  title: "",
  percent: 5,
  maxAmount: "",
  minOrderAmount: 0,
  vipTiers: [] as VipTier[],
  priority: 0,
  isActive: true,
};

export default function CashbackTab() {
  const [items, setItems] = useState<Rule[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Rule[]>("/api/admin/loyalty/cashback");
    if (res.ok && res.data) setItems(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (r: Rule) => {
    setForm({
      title: r.title,
      percent: r.percent,
      maxAmount: r.maxAmount ? String(r.maxAmount) : "",
      minOrderAmount: r.minOrderAmount,
      vipTiers: r.vipTiers ?? [],
      priority: r.priority,
      isActive: r.isActive,
    });
    setModal({ id: r._id });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title,
      percent: Number(form.percent),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      vipTiers: form.vipTiers,
      priority: Number(form.priority) || 0,
      isActive: form.isActive,
    };
    if (form.maxAmount) payload.maxAmount = Number(form.maxAmount);

    const res = modal?.id
      ? await apiFetch(`/api/admin/loyalty/cashback/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/admin/loyalty/cashback", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (res.ok) {
      toast.success("ذخیره شد");
      setModal(null);
      load();
    } else toast.error(res.error ?? "خطا در ذخیره");
  };

  const remove = async (id: string) => {
    if (!confirm("قاعده حذف شود؟")) return;
    const res = await apiFetch(`/api/admin/loyalty/cashback/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("حذف شد");
      load();
    } else toast.error(res.error ?? "خطا");
  };

  const toggleTier = (t: VipTier) =>
    setForm((f) => ({
      ...f,
      vipTiers: f.vipTiers.includes(t)
        ? f.vipTiers.filter((x) => x !== t)
        : [...f.vipTiers, t],
    }));

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setForm(emptyForm);
          setModal({});
        }}
        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" /> قاعده جدید
      </button>

      <AdminTable
        headers={["عنوان", "درصد", "سقف مبلغ", "حداقل سفارش", "سطوح VIP", "اولویت", "وضعیت", "عملیات"]}
        loading={loading}
        empty={!items || items.length === 0}
      >
        {items?.map((r) => (
          <tr key={r._id}>
            <Td className="font-medium text-slate-800">{r.title}</Td>
            <Td>{faNum(r.percent)}٪</Td>
            <Td>{r.maxAmount ? toman(r.maxAmount) : "—"}</Td>
            <Td>{r.minOrderAmount ? toman(r.minOrderAmount) : "—"}</Td>
            <Td className="text-xs">
              {r.vipTiers.length > 0 ? r.vipTiers.map((t) => VIP_TIER_FA[t]).join("، ") : "همه"}
            </Td>
            <Td>{faNum(r.priority)}</Td>
            <Td>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {r.isActive ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(r._id)} />
            </Td>
          </tr>
        ))}
      </AdminTable>

      {modal && (
        <Modal title={modal.id ? "ویرایش قاعده کش‌بک" : "قاعده کش‌بک جدید"} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="عنوان">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="درصد کش‌بک">
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.percent}
                  onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="سقف مبلغ کش‌بک (اختیاری)">
                <input
                  type="number"
                  min={0}
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="حداقل مبلغ سفارش">
                <input
                  type="number"
                  min={0}
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="اولویت (بزرگ‌تر = مهم‌تر)">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div>
              <span className="mb-1 block text-xs text-slate-500">
                محدود به سطوح VIP (هیچکدام = همه کاربران)
              </span>
              <div className="flex flex-wrap gap-2">
                {VIP_TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTier(t)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      form.vipTiers.includes(t)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-500 hover:border-slate-400"
                    }`}
                  >
                    {VIP_TIER_FA[t]}
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm({ ...form, isActive: v })}
              label="فعال"
            />
            <SubmitButton loading={saving} label="ذخیره" />
          </form>
        </Modal>
      )}
    </div>
  );
}
