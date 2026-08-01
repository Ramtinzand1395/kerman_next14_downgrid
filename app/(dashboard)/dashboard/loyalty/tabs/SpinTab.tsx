"use client";
// app/(dashboard)/dashboard/loyalty/tabs/SpinTab.tsx
// مدیریت جوایز گردونه شانس: عنوان، نوع، مقدار و وزن احتمال
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { apiFetch, faNum, SPIN_PRIZE_TYPE_FA } from "@/lib/loyalty/ui";
import { SpinPrizeType, SPIN_PRIZE_TYPES } from "@/types/loyalty";
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

interface Prize {
  _id: string;
  title: string;
  type: SpinPrizeType;
  value: number;
  weight: number;
  order: number;
  isActive: boolean;
}

const emptyForm = {
  title: "",
  type: "wallet_credit" as SpinPrizeType,
  value: 0,
  weight: 10,
  order: 0,
  isActive: true,
};

export default function SpinTab() {
  const [items, setItems] = useState<Prize[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Prize[]>("/api/admin/loyalty/spin");
    if (res.ok && res.data) setItems(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalWeight = (items ?? [])
    .filter((p) => p.isActive)
    .reduce((s, p) => s + p.weight, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = {
      title: form.title,
      type: form.type,
      value: Number(form.value) || 0,
      weight: Number(form.weight),
      order: Number(form.order) || 0,
      isActive: form.isActive,
    };
    const res = modal?.id
      ? await apiFetch(`/api/admin/loyalty/spin/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/admin/loyalty/spin", {
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
    if (!confirm("جایزه حذف شود؟")) return;
    const res = await apiFetch(`/api/admin/loyalty/spin/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("حذف شد");
      load();
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setModal({});
          }}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> جایزه جدید
        </button>
        <p className="text-xs text-slate-400">
          مجموع وزن فعال: {faNum(totalWeight)} — احتمال هر جایزه = وزن ÷ مجموع وزن
        </p>
      </div>

      <AdminTable
        headers={["عنوان", "نوع", "مقدار", "وزن", "احتمال تقریبی", "ترتیب", "وضعیت", "عملیات"]}
        loading={loading}
        empty={!items || items.length === 0}
      >
        {items?.map((p) => (
          <tr key={p._id}>
            <Td className="font-medium text-white">{p.title}</Td>
            <Td>{SPIN_PRIZE_TYPE_FA[p.type]}</Td>
            <Td>{p.value ? faNum(p.value) : "—"}</Td>
            <Td>{faNum(p.weight)}</Td>
            <Td className="text-xs text-indigo-300">
              {p.isActive && totalWeight > 0
                ? `${((p.weight / totalWeight) * 100).toFixed(1)}٪`
                : "—"}
            </Td>
            <Td>{faNum(p.order)}</Td>
            <Td>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  p.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {p.isActive ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <RowActions
                onEdit={() => {
                  setForm({
                    title: p.title,
                    type: p.type,
                    value: p.value,
                    weight: p.weight,
                    order: p.order,
                    isActive: p.isActive,
                  });
                  setModal({ id: p._id });
                }}
                onDelete={() => remove(p._id)}
              />
            </Td>
          </tr>
        ))}
      </AdminTable>

      {modal && (
        <Modal title={modal.id ? "ویرایش جایزه" : "جایزه جدید"} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="عنوان جایزه">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as SpinPrizeType })}
                  className={inputCls}
                >
                  {SPIN_PRIZE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {SPIN_PRIZE_TYPE_FA[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="مقدار (تومان / XP)">
                <input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="وزن احتمال">
                <input
                  required
                  type="number"
                  min={0}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="ترتیب نمایش روی گردونه">
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
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
