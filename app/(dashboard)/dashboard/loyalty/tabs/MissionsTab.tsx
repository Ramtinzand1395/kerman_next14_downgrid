"use client";
// app/(dashboard)/dashboard/loyalty/tabs/MissionsTab.tsx
// مدیریت ماموریت‌ها: ساخت/ویرایش/حذف، فیلتر دوره
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { apiFetch, faNum, toman } from "@/lib/loyalty/ui";
import { MissionMetric, MissionPeriod } from "@/types/loyalty";
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

interface MissionItem {
  _id: string;
  title: string;
  description?: string;
  period: MissionPeriod;
  metric: MissionMetric;
  target: number;
  minOrderAmount?: number;
  reward: { xp: number; walletCredit: number };
  isActive: boolean;
}

const PERIOD_FA: Record<MissionPeriod, string> = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  once: "یک‌بار",
};
const METRIC_FA: Record<MissionMetric, string> = {
  purchase_count: "تعداد خرید",
  purchase_amount: "مبلغ خرید",
  review_count: "تعداد نظر",
  referral_count: "تعداد دعوت",
  login_days: "روزهای ورود",
};

const emptyForm = {
  title: "",
  description: "",
  period: "daily" as MissionPeriod,
  metric: "purchase_count" as MissionMetric,
  target: 1,
  minOrderAmount: "",
  rewardXp: 0,
  rewardWallet: 0,
  isActive: true,
};

export default function MissionsTab() {
  const [items, setItems] = useState<MissionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("");
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = periodFilter ? `?period=${periodFilter}` : "";
    const res = await apiFetch<MissionItem[]>(`/api/admin/loyalty/missions${q}`);
    if (res.ok && res.data) setItems(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, [periodFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (m: MissionItem) => {
    setForm({
      title: m.title,
      description: m.description ?? "",
      period: m.period,
      metric: m.metric,
      target: m.target,
      minOrderAmount: m.minOrderAmount ? String(m.minOrderAmount) : "",
      rewardXp: m.reward.xp,
      rewardWallet: m.reward.walletCredit,
      isActive: m.isActive,
    });
    setModal({ id: m._id });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      period: form.period,
      metric: form.metric,
      target: Number(form.target),
      reward: { xp: Number(form.rewardXp) || 0, walletCredit: Number(form.rewardWallet) || 0 },
      isActive: form.isActive,
    };
    if (form.minOrderAmount) payload.minOrderAmount = Number(form.minOrderAmount);

    const res = modal?.id
      ? await apiFetch(`/api/admin/loyalty/missions/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/admin/loyalty/missions", {
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
    if (!confirm("ماموریت حذف شود؟")) return;
    const res = await apiFetch(`/api/admin/loyalty/missions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("حذف شد");
      load();
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className={`${inputCls} w-40`}
        >
          <option value="">همه دوره‌ها</option>
          {Object.entries(PERIOD_FA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setModal({});
          }}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> ماموریت جدید
        </button>
      </div>

      <AdminTable
        headers={["عنوان", "دوره", "معیار", "هدف", "پاداش", "وضعیت", "عملیات"]}
        loading={loading}
        empty={!items || items.length === 0}
      >
        {items?.map((m) => (
          <tr key={m._id}>
            <Td>
              <p className="font-medium text-white">{m.title}</p>
              {m.description && <p className="text-xs text-slate-400">{m.description}</p>}
            </Td>
            <Td>{PERIOD_FA[m.period]}</Td>
            <Td>{METRIC_FA[m.metric]}</Td>
            <Td>{faNum(m.target)}</Td>
            <Td className="text-xs">
              {m.reward.xp > 0 && <span>{faNum(m.reward.xp)} XP</span>}
              {m.reward.xp > 0 && m.reward.walletCredit > 0 && " + "}
              {m.reward.walletCredit > 0 && <span>{toman(m.reward.walletCredit)}</span>}
              {m.reward.xp === 0 && m.reward.walletCredit === 0 && "—"}
            </Td>
            <Td>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  m.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {m.isActive ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <RowActions onEdit={() => openEdit(m)} onDelete={() => remove(m._id)} />
            </Td>
          </tr>
        ))}
      </AdminTable>

      {modal && (
        <Modal title={modal.id ? "ویرایش ماموریت" : "ماموریت جدید"} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="عنوان">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="توضیح">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
                rows={2}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="دوره">
                <select
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value as MissionPeriod })}
                  className={inputCls}
                >
                  {Object.entries(PERIOD_FA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="معیار">
                <select
                  value={form.metric}
                  onChange={(e) => setForm({ ...form, metric: e.target.value as MissionMetric })}
                  className={inputCls}
                >
                  {Object.entries(METRIC_FA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="هدف (عدد)">
                <input
                  required
                  type="number"
                  min={1}
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="حداقل مبلغ سفارش (اختیاری)">
                <input
                  type="number"
                  min={0}
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="پاداش XP">
                <input
                  type="number"
                  min={0}
                  value={form.rewardXp}
                  onChange={(e) => setForm({ ...form, rewardXp: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="پاداش کیف پول (تومان)">
                <input
                  type="number"
                  min={0}
                  value={form.rewardWallet}
                  onChange={(e) => setForm({ ...form, rewardWallet: Number(e.target.value) })}
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
