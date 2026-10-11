"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import type { RewardSummary, RewardType } from "@/types/appointments";
import { rewardLabel } from "./appointment-ui";

type Props = {
  rules: RewardSummary[];
  submitting: boolean;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onToggle: (rule: RewardSummary) => void;
};

const rewardTypeLabel: Record<RewardType, string> = {
  fixed: "تخفیف مبلغی",
  percent: "تخفیف درصدی",
  free_game: "یک نصب بازی رایگان",
  free_shipping: "ارسال رایگان",
};

export default function RewardRules({
  rules,
  submitting,
  onCreate,
  onToggle,
}: Props) {
  const [rewardType, setRewardType] = useState<RewardType>("fixed");
  const [activationRule, setActivationRule] = useState<RewardSummary | null>(
    null,
  );

  const toggle = (rule: RewardSummary) => {
    setActivationRule(null);
    onToggle(rule);
  };

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <form
          onSubmit={onCreate}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-black text-slate-900">قانون پاداش جدید</h2>
              <p className="text-xs text-slate-500">
                قانون ابتدا غیرفعال ساخته می‌شود.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              عنوان قانون
              <input
                required
                name="title"
                placeholder="مثلاً پاداش مشتری وفادار"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-slate-700">
                تعداد مراجعه
                <input
                  required
                  name="requiredVisits"
                  type="number"
                  min="1"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                اعتبار پاداش (روز)
                <input
                  required
                  name="validityDays"
                  type="number"
                  min="1"
                  defaultValue="30"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                />
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-bold text-slate-700">
                خدمات واجد شرایط
              </legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="services"
                    value="game_install"
                    defaultChecked
                  />
                  نصب بازی
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="services"
                    value="repair"
                    defaultChecked
                  />
                  تعمیرات
                </label>
              </div>
            </fieldset>

            <label className="block text-sm font-bold text-slate-700">
              تکرار قانون
              <select
                name="recurrence"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
              >
                <option value="once">یک‌باره</option>
                <option value="repeat">تکرارشونده</option>
              </select>
            </label>

            <label className="block text-sm font-bold text-slate-700">
              نوع پاداش
              <select
                name="rewardType"
                value={rewardType}
                onChange={(event) =>
                  setRewardType(event.target.value as RewardType)
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
              >
                {(
                  Object.entries(rewardTypeLabel) as Array<[RewardType, string]>
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {rewardType === "fixed" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <MoneyField name="value" label="مبلغ تخفیف" />
                <MoneyField name="minAmount" label="حداقل مبلغ خدمت" />
              </div>
            ) : null}

            {rewardType === "percent" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-bold text-slate-600">
                  درصد تخفیف
                  <input
                    name="value"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
                  />
                </label>
                <MoneyField
                  name="maxDiscountAmount"
                  label="سقف تخفیف"
                />
                <MoneyField name="minAmount" label="حداقل مبلغ" />
              </div>
            ) : null}

            {rewardType === "free_game" ? (
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <label className="block text-xs font-bold text-slate-600">
                  شناسه دستگاه‌ها
                  <input
                    name="eligibleDevices"
                    placeholder="خالی = همه دستگاه‌ها"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                    dir="ltr"
                  />
                </label>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="font-bold text-slate-600">نوع نصب:</span>
                  <label>
                    <input
                      type="checkbox"
                      name="installationTypes"
                      value="account"
                      className="ml-1"
                    />{" "}
                    اکانتی
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="installationTypes"
                      value="copy"
                      className="ml-1"
                    />{" "}
                    کپی‌خور
                  </label>
                </div>
              </div>
            ) : null}

            {rewardType === "free_shipping" ? (
              <div className="grid gap-3 rounded-2xl bg-cyan-50/60 p-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">
                  محدوده ارسال
                  <input
                    name="shippingRegion"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                  />
                </label>
                <MoneyField
                  name="maxShippingCost"
                  label="سقف هزینه ارسال"
                />
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="combinable" />
              قابل ترکیب با تخفیف دیگر
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                شروع اعتبار قانون
                <input
                  name="startsAt"
                  type="datetime-local"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                پایان اعتبار قانون
                <input
                  name="endsAt"
                  type="datetime-local"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-950">
              <strong className="block">پیش‌نمایش خوانا</strong>
              بعد از تعداد مراجعه تعیین‌شده، «
              {rewardTypeLabel[rewardType]}» برای مشتری صادر می‌شود.
              {rewardType === "free_shipping" ? (
                <span className="block text-xs text-blue-700">
                  این پاداش فقط برای درخواست دارای پیک قابل استفاده است.
                </span>
              ) : null}
            </div>

            <button
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-[#001A6E] font-bold text-white disabled:opacity-50"
            >
              ساخت قانون غیرفعال
            </button>
          </div>
        </form>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-900">قواعد ثبت‌شده</h2>
              <p className="mt-1 text-xs text-slate-500">
                وضعیت و نتیجه هر قانون را قبل از فعال‌سازی بررسی کنید.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {rules.length.toLocaleString("fa-IR")} قانون
            </span>
          </div>

          {rules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              قانونی تعریف نشده است.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rules.map((rule) => (
                <article
                  key={rule._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900">{rule.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {Number(rule.requiredVisits || 0).toLocaleString("fa-IR")}{" "}
                        مراجعه ·{" "}
                        {rule.recurrence === "repeat"
                          ? "تکرارشونده"
                          : "یک‌باره"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        rule.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {rule.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-900">
                      {rewardLabel(rule)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      اعتبار:{" "}
                      {rule.reward.validityDays.toLocaleString("fa-IR")} روز
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      rule.isActive
                        ? toggle(rule)
                        : setActivationRule(rule)
                    }
                    className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {rule.isActive
                      ? "غیرفعال‌کردن"
                      : "بازبینی و فعال‌سازی"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {activationRule ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActivationRule(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-activation-title"
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2
                id="reward-activation-title"
                className="font-black text-slate-950"
              >
                فعال‌سازی قانون
              </h2>
              <button
                type="button"
                onClick={() => setActivationRule(null)}
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <h3 className="font-black">{activationRule.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                بعد از هر{" "}
                {Number(
                  activationRule.requiredVisits || 0,
                ).toLocaleString("fa-IR")}{" "}
                مراجعه، {rewardLabel(activationRule)} صادر می‌شود.
              </p>
              <p className="text-sm text-slate-500">
                اعتبار:{" "}
                {activationRule.reward.validityDays.toLocaleString("fa-IR")} روز
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setActivationRule(null)}
                className="h-11 flex-1 rounded-xl border border-slate-200 font-bold"
              >
                بازگشت
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => toggle(activationRule)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                تأیید و فعال‌سازی
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function MoneyField({ name, label }: { name: string; label: string }) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <input
        name={name}
        type="number"
        min="0"
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
      />
    </label>
  );
}
