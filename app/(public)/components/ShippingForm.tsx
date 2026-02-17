"use client";

import { addressSchema } from "@/validations/UserInfoValidation";
import { Address } from "@/types";
import { MapPin, PencilLine, ShieldCheck, Trash2, Truck } from "lucide-react";
import { Iran } from "provinces-and-cities";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import * as yup from "yup";

interface ShippingFormProps {
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
}

export default function ShippingForm({
  selectedAddress,
  setSelectedAddress,
}: ShippingFormProps) {
  const [form, setForm] = useState<Partial<Address>>({});
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedProvinceCities = useMemo(
    () =>
      form.province
        ? (Iran.main.find((province) => province.name === form.province)
            ?.cities ?? [])
        : [],
    [form.province],
  );

  const getAddresses = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/profile/address");
      if (!response.ok) throw new Error();

      const data = await response.json();
      setAddresses(data);
    } catch {
      toast.error("دریافت آدرس‌ها با مشکل مواجه شد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAddresses();
  }, []);

  const resetForm = () => setForm({});

  useEffect(() => {
    if (addresses.length === 0) {
      return;
    }

    const hasValidSelection = selectedAddress
      ? addresses.some((address) => address._id === selectedAddress._id)
      : false;

    if (!hasValidSelection) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress, setSelectedAddress]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await addressSchema.validate(form, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((item) => toast.error(item.message));
      } else {
        toast.error("اطلاعات وارد شده نامعتبر است.");
      }
      return;
    }

    try {
      const method = form._id ? "PUT" : "POST";
      const response = await fetch("/api/profile/address", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error();

      toast.success(
        form._id ? "آدرس با موفقیت ویرایش شد." : "آدرس جدید ثبت شد.",
      );
      resetForm();
      await getAddresses();
    } catch {
      toast.error("ثبت آدرس انجام نشد.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این آدرس مطمئن هستید؟")) return;

    try {
      const response = await fetch(`/api/profile/address?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      setAddresses((current) =>
        current.filter((address) => address._id !== id),
      );

      if (selectedAddress?._id === id) {
        const nextAddress =
          addresses.find((address) => address._id !== id) ?? null;
        setSelectedAddress(nextAddress);
      }

      toast.info("آدرس حذف شد.");
    } catch {
      toast.error("حذف آدرس انجام نشد.");
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">مرحله آدرس تحویل</h2>
          <p className="text-sm text-slate-500">
            آدرس جدید ثبت کنید یا یکی از آدرس‌های قبلی را انتخاب کنید.
          </p>
        </div>

        <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
          انتخاب آدرس برای ادامه پرداخت الزامی است.
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="province"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              استان
            </label>
            <select
              id="province"
              value={form.province || ""}
              onChange={(event) =>
                setForm({ ...form, province: event.target.value, city: "" })
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-cyan-500 focus:ring"
              required
            >
              <option value="">انتخاب استان</option>
              {Iran.main.map((province) => (
                <option key={province.id} value={province.name}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="city"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              شهر
            </label>
            <select
              id="city"
              value={form.city || ""}
              onChange={(event) =>
                setForm({ ...form, city: event.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-cyan-500 focus:ring"
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
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            آدرس کامل
          </label>
          <input
            id="address"
            value={form.address || ""}
            onChange={(event) =>
              setForm({ ...form, address: event.target.value })
            }
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-cyan-500 focus:ring"
            placeholder="مثال: خیابان ولیعصر، پلاک ۱۲، طبقه دوم"
            required
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="plaque"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              پلاک
            </label>
            <input
              id="plaque"
              value={form.plaque || ""}
              onChange={(event) =>
                setForm({ ...form, plaque: event.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-cyan-500 focus:ring"
              inputMode="numeric"
            />
          </div>

          <div>
            <label
              htmlFor="unit"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              واحد
            </label>
            <input
              id="unit"
              value={form.unit || ""}
              onChange={(event) =>
                setForm({ ...form, unit: event.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-cyan-500 focus:ring"
              inputMode="numeric"
            />
          </div>

          <div>
            <label
              htmlFor="postalCode"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              کد پستی
            </label>
            <input
              id="postalCode"
              value={form.postalCode || ""}
              onChange={(event) =>
                setForm({ ...form, postalCode: event.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-cyan-500 focus:ring"
              inputMode="numeric"
              required
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {form._id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              لغو ویرایش
            </button>
          )}

          <button
            type="submit"
            className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {form._id ? "ذخیره تغییرات" : "ثبت آدرس جدید"}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-bold text-slate-800">
          آدرس‌های ذخیره‌شده
        </h3>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <Skeleton height={18} width="50%" />
                <Skeleton height={14} width="80%" className="mt-2" />
                <Skeleton height={14} width="60%" className="mt-2" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            هنوز آدرسی ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => {
              const isSelected = selectedAddress?._id === address._id;

              return (
                <div
                  key={address._id}
                  onClick={() => setSelectedAddress(address)}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    isSelected
                      ? "border-cyan-300 bg-cyan-50 ring-1 ring-cyan-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                      <MapPin className="h-4 w-4 text-cyan-600" />
                      {address.province}، {address.city}
                    </p>

                    {isSelected && (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800">
                        انتخاب شده
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {address.address}
                    {address.plaque ? `، پلاک ${address.plaque}` : ""}
                    {address.unit ? `، واحد ${address.unit}` : ""}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    کد پستی: {address.postalCode}
                  </p>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setForm(address);
                        formRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      ویرایش
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(address._id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-3">
        <p className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-700" />
          تضمین امنیت اطلاعات ارسال
        </p>

        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-cyan-700" />
          ارسال سریع و قابل رهگیری
        </p>

        <button
          type="button"
          onClick={() => router.push("/cart?step=3", { scroll: false })}
          disabled={!selectedAddress}
          className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          ادامه به پرداخت
        </button>
      </div>
    </div>
  );
}
