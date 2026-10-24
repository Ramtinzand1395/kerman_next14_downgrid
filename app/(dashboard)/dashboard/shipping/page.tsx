"use client";

import { useEffect, useMemo, useState } from "react";
import { Iran } from "provinces-and-cities";
import { Loader2, Save, Truck } from "lucide-react";
import { toast } from "react-toastify";
import type { StoreShippingSettings } from "@/lib/shipping";

export default function ShippingSettingsPage() {
  const [settings, setSettings] = useState<StoreShippingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const provinceCities = useMemo(
    () => Iran.main.find((item) => item.name === settings?.coverage.province)?.cities || [],
    [settings?.coverage.province],
  );

  useEffect(() => {
    fetch("/api/admin/shipping-settings", { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) }))
      .then(({ response, body }) => {
        if (!response.ok || !body.ok) throw new Error(body.error || "تنظیمات ارسال دریافت نشد.");
        setSettings(body.data);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "تنظیمات ارسال دریافت نشد."));
  }, []);

  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/shipping-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) throw new Error(body.error || "تنظیمات ارسال ذخیره نشد.");
      setSettings(body.data);
      toast.success("تنظیمات ارسال ذخیره شد و در محاسبات جدید اعمال می‌شود.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تنظیمات ارسال ذخیره نشد.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-700" /></div>;
  }

  return (
    <main className="min-h-screen space-y-5 bg-gradient-to-b from-white to-slate-50 p-4 md:p-6" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-l from-blue-950 to-indigo-900 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3"><Truck className="h-7 w-7" /><div><h1 className="text-2xl font-black">تنظیمات ارسال فروشگاه</h1><p className="mt-1 text-sm text-blue-100">منبع واحد هزینه، محدوده و متن روش‌های ارسال سایت</p></div></div>
      </header>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex items-center justify-between gap-3"><span className="font-bold">ارسال شهری کرمان</span><input type="checkbox" checked={settings.localDelivery.enabled} onChange={(event) => setSettings({ ...settings, localDelivery: { ...settings.localDelivery, enabled: event.target.checked } })} /></label>
          <Field label="عنوان قابل نمایش" value={settings.localDelivery.title} onChange={(title) => setSettings({ ...settings, localDelivery: { ...settings.localDelivery, title } })} />
          <NumberField label="هزینه ثابت (تومان)" value={settings.localDelivery.feeToman} onChange={(feeToman) => setSettings({ ...settings, localDelivery: { ...settings.localDelivery, feeToman } })} />
          <TextArea label="توضیحات" value={settings.localDelivery.description} onChange={(description) => setSettings({ ...settings, localDelivery: { ...settings.localDelivery, description } })} />
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex items-center justify-between gap-3"><span className="font-bold">ارسال سراسری پس‌کرایه</span><input type="checkbox" checked={settings.nationalCollect.enabled} onChange={(event) => setSettings({ ...settings, nationalCollect: { ...settings.nationalCollect, enabled: event.target.checked } })} /></label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-600"><span>نمایش پس‌کرایه برای آدرس‌های داخل محدوده شهری</span><input type="checkbox" checked={settings.nationalCollect.availableForLocalAddresses} onChange={(event) => setSettings({ ...settings, nationalCollect: { ...settings.nationalCollect, availableForLocalAddresses: event.target.checked } })} /></label>
          <Field label="عنوان قابل نمایش" value={settings.nationalCollect.title} onChange={(title) => setSettings({ ...settings, nationalCollect: { ...settings.nationalCollect, title } })} />
          <TextArea label="توضیح پرداخت هنگام تحویل" value={settings.nationalCollect.description} onChange={(description) => setSettings({ ...settings, nationalCollect: { ...settings.nationalCollect, description } })} />
          <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">این روش نرخ ثابت ندارد؛ مبلغ حمل در سفارش و پرداخت آنلاین صفر ذخیره نمی‌شود و مقدار آن نامشخص باقی می‌ماند.</p>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="font-black text-slate-900">محدوده معتبر ارسال شهری</h2><p className="mt-1 text-xs leading-6 text-slate-500">استان و شهر از فهرست رسمی فرم آدرس انتخاب می‌شوند. اگر پیش‌شماره پستی وارد شود، آدرس فقط با کد پستی ۱۰ رقمی منطبق واجد شرایط است.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">استان<select value={settings.coverage.province} onChange={(event) => setSettings({ ...settings, coverage: { province: event.target.value, cities: [], postalCodePrefixes: settings.coverage.postalCodePrefixes } })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal">{Iran.main.map((province) => <option key={province.id} value={province.name}>{province.name}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-700">شهرهای تحت پوشش<select multiple value={settings.coverage.cities} onChange={(event) => setSettings({ ...settings, coverage: { ...settings.coverage, cities: Array.from(event.target.selectedOptions, (option) => option.value) } })} className="mt-2 h-36 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal">{provinceCities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
        </div>
        <Field label="پیش‌شماره‌های کد پستی (اختیاری، جداشده با ویرگول)" value={settings.coverage.postalCodePrefixes.join(", ")} onChange={(value) => setSettings({ ...settings, coverage: { ...settings.coverage, postalCodePrefixes: value.split(",").map((item) => item.trim().replace(/\D/g, "")).filter(Boolean) } })} />
      </section>

      <button type="button" onClick={save} disabled={saving || settings.coverage.cities.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white disabled:bg-slate-300">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره تنظیمات</button>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-blue-500" /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input type="number" min={1} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-blue-500" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal leading-7 outline-none focus:border-blue-500" /></label>;
}
