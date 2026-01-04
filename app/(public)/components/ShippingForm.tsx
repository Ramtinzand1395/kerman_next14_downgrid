"use client";
import { useEffect, useRef, useState } from "react";
import { Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { addressSchema } from "@/validations/UserInfoValidation";
import { Address, Order } from "@/types";
import Skeleton from "react-loading-skeleton";
import * as yup from "yup";
import { Iran } from "provinces-and-cities";

interface ShippingFormProps {
  selectedAddress: Address | null;
  setSelectedAddress: (a: Address) => void;
}
// todo
// استفاده از کامپوننت ادرس های من و انتخاب ادرس اصلی
export default function ShippingForm({
  selectedAddress,
  setSelectedAddress,
}): ShippingFormProps {
  const [form, setForm] = useState<Partial<Address>>({});

  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleDelete = async (id: number) => {
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

  const selectedProvinceCities = form.province
    ? Iran.main.find((p) => p.name === form.province)?.cities ?? []
    : [];

  useEffect(() => {
    getAddresses();
  }, []);
  return (
    <div className="p-6  mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">آدرس‌های من</h1>

      {/* فرم اضافه/ویرایش */}
      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="bg-white shadow-lg rounded-xl p-8 mb-10 border border-gray-200 w-full"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
          <div className="flex flex-col">
            <label htmlFor="province" className="text-gray-700 text-sm mb-1">
              استان
            </label>
            <select
              id="province"
              value={form.province || ""}
              onChange={(e) =>
                setForm({ ...form, province: e.target.value, city: "" })
              }
              className="border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full"
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

          <div className="flex flex-col">
            <label htmlFor="city" className="text-gray-700 text-sm mb-1">
              شهر
            </label>
            <select
              id="city"
              value={form.city || ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full"
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

        <div className="flex flex-col mb-5">
          <label htmlFor="address" className="text-gray-700 text-sm mb-1">
            آدرس
          </label>
          <input
            id="address"
            type="text"
            placeholder="مثال: خیابان ولیعصر، پلاک 10"
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition w-full"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col">
            <label htmlFor="plaque" className="text-gray-700 text-sm mb-1">
              پلاک
            </label>
            <input
              id="plaque"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,5}"
              placeholder="مثال: 10"
              value={form.plaque || ""}
              onChange={(e) => setForm({ ...form, plaque: e.target.value })}
              className="border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="unit" className="text-gray-700 text-sm mb-1">
              واحد
            </label>
            <input
              id="unit"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{1,5}"
              placeholder="مثال: 2"
              value={form.unit || ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="postalCode" className="text-gray-700 text-sm mb-1">
              کدپستی
            </label>
            <input
              id="postalCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{10}"
              placeholder="مثال: 1234567890"
              value={form.postalCode || ""}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="border-gray-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition"
          >
            {form._id ? "ویرایش آدرس" : "افزودن آدرس"}
          </button>
        </div>
      </form>

      {/* لیست آدرس‌ها */}
      <div className="flex flex-col gap-6">
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl p-6 bg-gray-50 shadow animate-pulse"
              >
                <Skeleton height={20} width={`50%`} className="mb-3" />
                <Skeleton height={16} width={`80%`} className="mb-2" />
                <Skeleton height={16} width={`70%`} />
              </div>
            ))
        ) : addresses.length > 0 ? (
          addresses.map((a) => (
          
            <div
              key={a._id}
              onClick={() => setSelectedAddress(a)}
              className={`cursor-pointer rounded-xl p-6 shadow-md border transition
      ${
        selectedAddress?._id === a._id
          ? "border-blue-600 ring-2 ring-blue-400 bg-blue-50"
          : "border-gray-200 hover:shadow-xl"
      }`}
            >
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {a.province} - {a.city}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                {a.address} {a.plaque && `پلاک: ${a.plaque}`}{" "}
                {a.unit && `واحد: ${a.unit}`}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                کدپستی: {a.postalCode}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="text-blue-600 text-sm font-medium hover:underline"
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
                  className="text-red-600 text-sm font-medium hover:underline"
                  onClick={() => handleDelete(a._id)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 col-span-2 py-10">
            هیچ آدرسی ثبت نشده
          </div>
        )}
      </div>

      {/* مزایا  */}
      <div className="mt-12 bg-white p-6 rounded-xl shadow-sm flex flex-wrap justify-center gap-10 text-gray-700 text-sm">
        <div className="flex flex-col items-center">
          <ShieldCheck className="text-blue-600 mb-2" /> تضمین اصالت کالا
        </div>
        <div className="flex flex-col items-center">
          <Headphones className="text-blue-600 mb-2" /> پشتیبانی تلفنی
        </div>
        <div className="flex flex-col items-center">
          <RefreshCw className="text-blue-600 mb-2" /> 7 روز بازگشت کالا
        </div>
        <div className="flex flex-col items-center">
          <Truck className="text-blue-600 mb-2" /> ارسال سریع کالا
        </div>
      </div>
      <button
        disabled={!selectedAddress}
        onClick={() => router.push("/cart?step=3")}
        className={`w-full p-2 rounded-lg text-white transition ${
          selectedAddress
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-300 cursor-not-allowed"
        }`}
      >
        ادامه به پرداخت
      </button>
    </div>
  );
}
