"use client";
// app/(dashboard)/dashboard/loyalty/tabs/LevelsTab.tsx
// مدیریت سطوح Level (Rookie…Legend) و VIP (Bronze…Diamond): آستانه‌ها و مزایا
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Crown, RefreshCw, Sparkles } from "lucide-react";
import { apiFetch, faNum, toman } from "@/lib/loyalty/ui";
import { Field, inputCls, Modal, SubmitButton, Td, AdminTable, Toggle } from "../components";

interface Benefits {
  cashbackBonusPercent: number;
  discountPercent: number;
  xpMultiplier: number;
  prioritySupport: boolean;
  earlyAccessHours: number;
  periodicGift: boolean;
}

interface Level {
  _id: string;
  kind: "level" | "vip";
  code: string;
  titleFa: string;
  minXp: number;
  minTotalPurchase: number;
  benefits: Benefits;
  order: number;
  isActive: boolean;
}

export default function LevelsTab() {
  const [items, setItems] = useState<Level[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Level | null>(null);
  const [form, setForm] = useState({ titleFa: "", threshold: 0, benefits: {} as Benefits, isActive: true });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Level[]>("/api/admin/loyalty/levels");
    if (res.ok && res.data) setItems(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (l: Level) => {
    setEditing(l);
    setForm({
      titleFa: l.titleFa,
      threshold: l.kind === "level" ? l.minXp : l.minTotalPurchase,
      benefits: { ...l.benefits },
      isActive: l.isActive,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      kind: editing.kind,
      code: editing.code,
      titleFa: form.titleFa,
      benefits: form.benefits,
      isActive: form.isActive,
    };
    if (editing.kind === "level") payload.minXp = Number(form.threshold);
    else payload.minTotalPurchase = Number(form.threshold);

    const res = await apiFetch("/api/admin/loyalty/levels", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("سطح به‌روز شد");
      setEditing(null);
      load();
    } else toast.error(res.error ?? "خطا در ذخیره");
  };

  const seed = async () => {
    if (seeding || !confirm("سطوح پیش‌فرض ساخته/به‌روز شوند؟")) return;
    setSeeding(true);
    const res = await apiFetch("/api/admin/loyalty/levels", { method: "POST" });
    setSeeding(false);
    if (res.ok) {
      toast.success("Seed انجام شد");
      load();
    } else toast.error(res.error ?? "خطا در seed");
  };

  const levels = (items ?? []).filter((l) => l.kind === "level");
  const vips = (items ?? []).filter((l) => l.kind === "vip");

  const renderTable = (rows: Level[], thresholdLabel: string) => (
    <AdminTable
      headers={["کد", "عنوان", thresholdLabel, "کش‌بک اضافه", "تخفیف", "ضریب XP", "وضعیت", ""]}
      loading={loading}
      empty={rows.length === 0}
    >
      {rows.map((l) => (
        <tr key={l._id}>
          <Td className="font-mono text-xs">{l.code}</Td>
          <Td className="font-medium text-white">{l.titleFa}</Td>
          <Td className="text-xs">
            {l.kind === "level" ? `${faNum(l.minXp)} XP` : toman(l.minTotalPurchase)}
          </Td>
          <Td className="text-xs">{l.benefits?.cashbackBonusPercent ? `${faNum(l.benefits.cashbackBonusPercent)}٪` : "—"}</Td>
          <Td className="text-xs">{l.benefits?.discountPercent ? `${faNum(l.benefits.discountPercent)}٪` : "—"}</Td>
          <Td className="text-xs">×{l.benefits?.xpMultiplier ?? 1}</Td>
          <Td>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                l.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
              }`}
            >
              {l.isActive ? "فعال" : "غیرفعال"}
            </span>
          </Td>
          <Td>
            <button
              type="button"
              onClick={() => openEdit(l)}
              className="rounded-md border border-indigo-400/30 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-500/20"
            >
              ویرایش
            </button>
          </Td>
        </tr>
      ))}
    </AdminTable>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={seed}
          disabled={seeding}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
          Seed سطوح پیش‌فرض
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h3 className="font-bold">سطوح Level (بر اساس XP)</h3>
        </div>
        {renderTable(levels, "حداقل XP")}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-white">
          <Crown className="h-4 w-4 text-amber-400" />
          <h3 className="font-bold">سطوح VIP (بر اساس مجموع خرید)</h3>
        </div>
        {renderTable(vips, "حداقل مجموع خرید")}
      </div>

      {editing && (
        <Modal title={`ویرایش سطح «${editing.titleFa}»`} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="عنوان فارسی">
                <input
                  required
                  value={form.titleFa}
                  onChange={(e) => setForm({ ...form, titleFa: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label={editing.kind === "level" ? "حداقل XP" : "حداقل مجموع خرید (تومان)"}>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="کش‌بک اضافه (٪)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.benefits.cashbackBonusPercent ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      benefits: { ...form.benefits, cashbackBonusPercent: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="تخفیف اختصاصی (٪)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.benefits.discountPercent ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      benefits: { ...form.benefits, discountPercent: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="ضریب XP">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={form.benefits.xpMultiplier ?? 1}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      benefits: { ...form.benefits, xpMultiplier: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="دسترسی زودتر (ساعت)">
                <input
                  type="number"
                  min={0}
                  value={form.benefits.earlyAccessHours ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      benefits: { ...form.benefits, earlyAccessHours: Number(e.target.value) },
                    })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4">
              <Toggle
                checked={form.benefits.prioritySupport ?? false}
                onChange={(v) =>
                  setForm({ ...form, benefits: { ...form.benefits, prioritySupport: v } })
                }
                label="اولویت پشتیبانی"
              />
              <Toggle
                checked={form.benefits.periodicGift ?? false}
                onChange={(v) =>
                  setForm({ ...form, benefits: { ...form.benefits, periodicGift: v } })
                }
                label="هدیه دوره‌ای"
              />
              <Toggle
                checked={form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
                label="فعال"
              />
            </div>
            <SubmitButton loading={saving} label="ذخیره تغییرات" />
          </form>
        </Modal>
      )}
    </div>
  );
}
