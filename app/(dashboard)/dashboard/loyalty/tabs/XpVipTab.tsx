"use client";
// app/(dashboard)/dashboard/loyalty/tabs/XpVipTab.tsx
// اعطای XP دستی و تغییر سطح VIP کاربر
import { useState } from "react";
import { toast } from "react-toastify";
import { Crown, Sparkles } from "lucide-react";
import { apiFetch, faNum } from "@/lib/loyalty/ui";
import { VipTier, VIP_TIER_FA, VIP_TIERS } from "@/types/loyalty";
import { Field, inputCls, SubmitButton } from "../components";

export default function XpVipTab() {
  // XP
  const [xpUserId, setXpUserId] = useState("");
  const [xpAmount, setXpAmount] = useState(100);
  const [xpDesc, setXpDesc] = useState("");
  const [savingXp, setSavingXp] = useState(false);

  // VIP
  const [vipUserId, setVipUserId] = useState("");
  const [tier, setTier] = useState<VipTier | "">("bronze");
  const [savingVip, setSavingVip] = useState(false);

  const grantXp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingXp) return;
    setSavingXp(true);
    const res = await apiFetch<{ totalXp: number; level: string }>("/api/admin/loyalty/xp", {
      method: "POST",
      body: JSON.stringify({
        userId: xpUserId.trim(),
        amount: Number(xpAmount),
        description: xpDesc,
      }),
    });
    setSavingXp(false);
    if (res.ok) {
      toast.success(`انجام شد — مجموع XP کاربر: ${faNum(res.data?.totalXp ?? 0)}`);
      setXpDesc("");
    } else toast.error(res.error ?? "خطا در اعطای امتیاز");
  };

  const changeVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingVip) return;
    setSavingVip(true);
    const res = await apiFetch("/api/admin/loyalty/vip", {
      method: "POST",
      body: JSON.stringify({ userId: vipUserId.trim(), tier: tier === "" ? null : tier }),
    });
    setSavingVip(false);
    if (res.ok) toast.success("سطح VIP تغییر کرد");
    else toast.error(res.error ?? "خطا در تغییر VIP");
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* اعطای XP */}
      <form
        onSubmit={grantXp}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-800">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold">اعطای امتیاز (XP) دستی</h3>
        </div>
        <Field label="شناسه کاربر (ObjectId)">
          <input
            required
            value={xpUserId}
            onChange={(e) => setXpUserId(e.target.value)}
            className={`${inputCls} font-mono`}
            dir="ltr"
          />
        </Field>
        <Field label="مقدار (مثبت = افزایش / منفی = کسر)">
          <input
            required
            type="number"
            value={xpAmount}
            onChange={(e) => setXpAmount(Number(e.target.value))}
            className={inputCls}
            dir="ltr"
          />
        </Field>
        <Field label="توضیح (الزامی)">
          <textarea
            required
            minLength={3}
            value={xpDesc}
            onChange={(e) => setXpDesc(e.target.value)}
            className={inputCls}
            rows={2}
          />
        </Field>
        <SubmitButton loading={savingXp} label="اعطای امتیاز" />
      </form>

      {/* تغییر VIP */}
      <form
        onSubmit={changeVip}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-800">
          <Crown className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold">تغییر سطح VIP کاربر</h3>
        </div>
        <Field label="شناسه کاربر (ObjectId)">
          <input
            required
            value={vipUserId}
            onChange={(e) => setVipUserId(e.target.value)}
            className={`${inputCls} font-mono`}
            dir="ltr"
          />
        </Field>
        <Field label="سطح جدید">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as VipTier | "")}
            className={inputCls}
          >
            {VIP_TIERS.map((t) => (
              <option key={t} value={t}>
                {VIP_TIER_FA[t]}
              </option>
            ))}
            <option value="">بدون VIP</option>
          </select>
        </Field>
        <p className="text-xs leading-5 text-slate-500">
          تغییر VIP در MembershipHistory ثبت و برای کاربر اعلان ارسال می‌شود. سطح VIP به‌صورت
          خودکار نیز بر اساس مجموع خرید کاربر به‌روز می‌شود.
        </p>
        <SubmitButton loading={savingVip} label="تغییر سطح" />
      </form>
    </div>
  );
}
