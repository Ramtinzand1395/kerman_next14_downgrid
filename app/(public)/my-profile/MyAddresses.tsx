"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-toastify";
import { Iran } from "provinces-and-cities";
import { addressSchema } from "@/validations/UserInfoValidation";
import * as yup from "yup";
import { Address } from "@/types";

export default function MyAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Address>>({});
  const formRef = useRef<HTMLFormElement | null>(null);

  const getAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/address");
      const data = await res.json();
      setAddresses(data);
    } catch (err) {
      toast.error("خطا در دریافت آدرس‌ها");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addressSchema.validate(form, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.inner.forEach((e) => toast.error(e.message));
      } else {
        toast.error("خطای ناشناخته");
      }
      return;
    }

    try {
      const method = form._id ? "PUT" : "POST";
      const res = await fetch("/api/profile/address", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success("آدرس با موفقیت ذخیره شد");
      setForm({});
      getAddresses();
    } catch {
      toast.error("خطا در ذخیره آدرس");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا مطمئن هستید می‌خواهید این آدرس را حذف کنید؟")) return;

    try {
      const res = await fetch(`/api/profile/address?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setAddresses((prev) => prev.filter((a) => a._id !== id));
      toast.info("آدرس حذف شد");
    } catch {
      toast.error("خطا در حذف آدرس");
    }
  };

  const selectedProvinceCities = useMemo(
    () =>
      form.province
        ? Iran.main.find((p) => p.name === form.province)?.cities ?? []
        : [],
    [form.province]
  );

  useEffect(() => {
    getAddresses();
  }, []);

  return (
    <section className="rounded-3xl bg-gradient-to-b from-slate-50 via-white to-white p-4 md:p-8">
      <header className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              ADDRESS BOOK
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-800 md:text-3xl">
              مدیریت آدرس‌های من
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              آدرس‌های ارسال را از اینجا اضافه، ویرایش یا حذف کنید.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-100 p-3 text-center text-xs font-semibold text-slate-600">
            <div className="rounded-lg bg-white px-4 py-2">
              <span className="block text-xl font-black text-slate-900">
                {addresses.length}
              </span>
              آدرس ثبت‌شده
            </div>
            <div className="rounded-lg bg-white px-4 py-2">
              <span className="block text-xl font-black text-indigo-700">
                {form._id ? "درحال" : "آماده"}
              </span>
              {form._id ? "ویرایش" : "ثبت جدید"}
            </div>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {form._id ? "ویرایش آدرس" : "افزودن آدرس جدید"}
          </h2>
          {form._id && (
            <button
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              onClick={() => setForm({})}
            >
              انصراف از ویرایش
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="province"
              className="mb-1 block text-sm text-slate-600"
            >
              استان
            </label>
            <select
              id="province"
              value={form.province || ""}
              onChange={(e) =>
                setForm({ ...form, province: e.target.value, city: "" })
              }
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              required
            >
              <option value="">انتخاب استان</option>
              {Iran.main.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city" className="mb-1 block text-sm text-slate-600">
              شهر
            </label>
            <select
              id="city"
              value={form.city || ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              required
              disabled={!form.province}
            >
              <option value="">انتخاب شهر</option>
              {selectedProvinceCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="address"
            className="mb-1 block text-sm text-slate-600"
          >
            آدرس کامل
          </label>
          <input
            id="address"
            type="text"
            placeholder="مثال: تهران، خیابان ولیعصر، کوچه مهر، پلاک ۱۰"
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="plaque"
              className="mb-1 block text-sm text-slate-600"
            >
              پلاک
            </label>
            <input
              id="plaque"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,5}"
              placeholder="مثال: ۱۰"
              value={form.plaque || ""}
              onChange={(e) => setForm({ ...form, plaque: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="unit" className="mb-1 block text-sm text-slate-600">
              واحد
            </label>
            <input
              id="unit"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,5}"
              placeholder="مثال: ۲"
              value={form.unit || ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="postalCode"
              className="mb-1 block text-sm text-slate-600"
            >
              کدپستی
            </label>
            <input
              id="postalCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{10}"
              placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
              value={form.postalCode || ""}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            {form._id ? "ثبت ویرایش" : "ذخیره آدرس"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Skeleton height={18} width="40%" className="mb-3" />
                <Skeleton height={14} width="85%" className="mb-2" />
                <Skeleton height={14} width="65%" />
              </div>
            ))
        ) : addresses.length > 0 ? (
          addresses.map((a) => (
            <article
              key={a._id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {a.province} / {a.city}
                </p>
                <span className="text-xs text-slate-400">
                  کدپستی: {a.postalCode}
                </span>
              </div>

              <p className="min-h-[48px] text-sm leading-7 text-slate-700">
                {a.address}
                {a.plaque && <span> | پلاک {a.plaque}</span>}
                {a.unit && <span> | واحد {a.unit}</span>}
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  onClick={() => {
                    setForm(a);
                    formRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  ویرایش
                </button>

                <button
                  className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  onClick={() => handleDelete(a._id)}
                >
                  حذف
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            هنوز آدرسی ثبت نشده است.
          </div>
        )}
      </div>
    </section>
  );
}
