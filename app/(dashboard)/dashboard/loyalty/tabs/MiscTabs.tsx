"use client";
// app/(dashboard)/dashboard/loyalty/tabs/MiscTabs.tsx
// نشان‌ها (Achievements) و کمپین‌ها — CRUD ساده
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import { apiFetch, faNum } from "@/lib/loyalty/ui";
import { MissionMetric } from "@/types/loyalty";
import { toPersianDate } from "@/helpers/toPersianDate";
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

const METRIC_FA: Record<MissionMetric, string> = {
  purchase_count: "تعداد خرید",
  purchase_amount: "مبلغ خرید",
  review_count: "تعداد نظر",
  referral_count: "تعداد دعوت",
  login_days: "روزهای ورود",
};

// ================= نشان‌ها =================

interface Achievement {
  _id: string;
  code: string;
  title: string;
  description?: string;
  metric: MissionMetric;
  target: number;
  xpReward: number;
  order: number;
  isActive: boolean;
}

const emptyAch = {
  code: "",
  title: "",
  description: "",
  metric: "purchase_count" as MissionMetric,
  target: 1,
  xpReward: 0,
  order: 0,
  isActive: true,
};

export function AchievementsTab() {
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState(emptyAch);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Achievement[]>("/api/admin/loyalty/achievements");
    if (res.ok && res.data) setItems(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = {
      ...form,
      target: Number(form.target),
      xpReward: Number(form.xpReward) || 0,
      order: Number(form.order) || 0,
      description: form.description || undefined,
    };
    const res = modal?.id
      ? await apiFetch(`/api/admin/loyalty/achievements/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/admin/loyalty/achievements", {
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
    if (!confirm("نشان حذف شود؟")) return;
    const res = await apiFetch(`/api/admin/loyalty/achievements/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("حذف شد");
      load();
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setForm(emptyAch);
          setModal({});
        }}
        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" /> نشان جدید
      </button>

      <AdminTable
        headers={["کد", "عنوان", "شرط", "هدف", "پاداش XP", "وضعیت", "عملیات"]}
        loading={loading}
        empty={!items || items.length === 0}
      >
        {items?.map((a) => (
          <tr key={a._id}>
            <Td className="font-mono text-xs">{a.code}</Td>
            <Td className="font-medium text-white">{a.title}</Td>
            <Td>{METRIC_FA[a.metric]}</Td>
            <Td>{faNum(a.target)}</Td>
            <Td>{a.xpReward ? faNum(a.xpReward) : "—"}</Td>
            <Td>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  a.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {a.isActive ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <RowActions
                onEdit={() => {
                  setForm({
                    code: a.code,
                    title: a.title,
                    description: a.description ?? "",
                    metric: a.metric,
                    target: a.target,
                    xpReward: a.xpReward,
                    order: a.order,
                    isActive: a.isActive,
                  });
                  setModal({ id: a._id });
                }}
                onDelete={() => remove(a._id)}
              />
            </Td>
          </tr>
        ))}
      </AdminTable>

      {modal && (
        <Modal title={modal.id ? "ویرایش نشان" : "نشان جدید"} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="کد (انگلیسی، مثل first_purchase)">
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className={`${inputCls} font-mono`}
                  dir="ltr"
                />
              </Field>
              <Field label="عنوان">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
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
              <Field label="هدف">
                <input
                  required
                  type="number"
                  min={1}
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="پاداش XP">
                <input
                  type="number"
                  min={0}
                  value={form.xpReward}
                  onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="ترتیب نمایش">
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="توضیح">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
                rows={2}
              />
            </Field>
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

// ================= کمپین‌ها =================

interface Campaign {
  _id: string;
  title: string;
  description?: string;
  xpMultiplier: number;
  participationXp: number;
  vipEarlyAccessHours: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const emptyCamp = {
  title: "",
  description: "",
  xpMultiplier: 1,
  participationXp: 0,
  vipEarlyAccessHours: 0,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export function CampaignsTab() {
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { id?: string }>(null);
  const [form, setForm] = useState(emptyCamp);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Campaign[]>("/api/admin/loyalty/campaigns");
    if (res.ok && res.data) setItems(res.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.startsAt || !form.endsAt) {
      toast.error("بازه زمانی کمپین الزامی است");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      xpMultiplier: Number(form.xpMultiplier) || 1,
      participationXp: Number(form.participationXp) || 0,
      vipEarlyAccessHours: Number(form.vipEarlyAccessHours) || 0,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      isActive: form.isActive,
    };
    const res = modal?.id
      ? await apiFetch(`/api/admin/loyalty/campaigns/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/admin/loyalty/campaigns", {
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
    if (!confirm("کمپین حذف شود؟")) return;
    const res = await apiFetch(`/api/admin/loyalty/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("حذف شد");
      load();
    } else toast.error(res.error ?? "خطا");
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setForm(emptyCamp);
          setModal({});
        }}
        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" /> کمپین جدید
      </button>

      <AdminTable
        headers={["عنوان", "ضریب XP", "XP شرکت", "شروع", "پایان", "وضعیت", "عملیات"]}
        loading={loading}
        empty={!items || items.length === 0}
      >
        {items?.map((c) => (
          <tr key={c._id}>
            <Td className="font-medium text-white">{c.title}</Td>
            <Td>×{c.xpMultiplier}</Td>
            <Td>{c.participationXp ? faNum(c.participationXp) : "—"}</Td>
            <Td className="text-xs">{toPersianDate(c.startsAt)}</Td>
            <Td className="text-xs">{toPersianDate(c.endsAt)}</Td>
            <Td>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  c.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {c.isActive ? "فعال" : "غیرفعال"}
              </span>
            </Td>
            <Td>
              <RowActions
                onEdit={() => {
                  setForm({
                    title: c.title,
                    description: c.description ?? "",
                    xpMultiplier: c.xpMultiplier,
                    participationXp: c.participationXp,
                    vipEarlyAccessHours: c.vipEarlyAccessHours,
                    startsAt: c.startsAt.slice(0, 10),
                    endsAt: c.endsAt.slice(0, 10),
                    isActive: c.isActive,
                  });
                  setModal({ id: c._id });
                }}
                onDelete={() => remove(c._id)}
              />
            </Td>
          </tr>
        ))}
      </AdminTable>

      {modal && (
        <Modal title={modal.id ? "ویرایش کمپین" : "کمپین جدید"} onClose={() => setModal(null)}>
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
              <Field label="ضریب XP">
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={form.xpMultiplier}
                  onChange={(e) => setForm({ ...form, xpMultiplier: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="XP شرکت در کمپین">
                <input
                  type="number"
                  min={0}
                  value={form.participationXp}
                  onChange={(e) => setForm({ ...form, participationXp: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="شروع">
                <input
                  type="date"
                  required
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className={inputCls}
                  dir="ltr"
                />
              </Field>
              <Field label="پایان">
                <input
                  type="date"
                  required
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className={inputCls}
                  dir="ltr"
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
