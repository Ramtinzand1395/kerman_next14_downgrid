"use client";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ArrowLeft, ArrowRight, Smartphone, User } from "lucide-react";
import { toast } from "react-toastify";

import { Customer } from "@/types";

interface RegisterCustomerProps {
  customerData: Customer;
  setCustomerData: React.Dispatch<React.SetStateAction<Customer>>;
  onBack: () => void;
  onNext: () => void;
}

const RegisterCustomer = ({
  setCustomerData,
  customerData,
  onBack,
  onNext,
}: RegisterCustomerProps) => {
  const handleUserChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setCustomerData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCustomer = async () => {
    if (!customerData.lastName || !customerData.mobile) {
      toast.warning("لطفا نام، نام خانوادگی و موبایل را تکمیل کنید.");
      return;
    }

    if (customerData._id) {
      onNext();
      return;
    }

    try {
      const res = await fetch("/api/admin/store-order/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "خطا در ثبت مشتری");
      }

      setCustomerData((prev) => ({ ...prev, _id: data.data._id }));
      toast.success(data.message || "مشتری با موفقیت ثبت شد.");
      onNext();
    } catch (err) {
      console.error(err);
      toast.error("ثبت مشتری انجام نشد.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-600">
          <span>نام</span>
          <div className="relative">
            <input
              type="text"
              name="name"
              value={customerData.name}
              onChange={handleUserChange}
              disabled={!!customerData._id}
              className="h-10 w-full rounded-xl border border-slate-300 pr-9 pl-3 outline-none ring-indigo-100 focus:ring-4"
            />
            <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>نام خانوادگی</span>
          <div className="relative">
            <input
              type="text"
              name="lastName"
              value={customerData.lastName}
              onChange={handleUserChange}
              disabled={!!customerData._id}
              className="h-10 w-full rounded-xl border border-slate-300 pr-9 pl-3 outline-none ring-indigo-100 focus:ring-4"
            />
            <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>جنسیت</span>
          <select
            title="جنسیت"
            name="sex"
            value={customerData.sex}
            onChange={handleUserChange}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 outline-none ring-indigo-100 focus:ring-4"
          >
            <option value="">انتخاب جنسیت</option>
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
          </select>
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>شماره تماس</span>
          <div className="relative">
            <input
              type="text"
              name="mobile"
              value={customerData.mobile}
              disabled
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 pr-9 pl-3"
            />
            <Smartphone className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </label>

        <label className="space-y-1 text-sm text-slate-600">
          <span>تاریخ تولد</span>
          <DatePicker
            calendar={persian}
            locale={persian_fa}
            value={customerData.birthday}
            inputClass="h-10 w-full rounded-xl border border-slate-300 px-3 outline-none"
            containerStyle={{ width: "100%" }}
            onChange={(date) =>
              setCustomerData((prev) => ({
                ...prev,
                birthday: date?.toString() || "",
              }))
            }
          />
        </label>

        <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
          <span>توضیحات</span>
          <textarea
            value={customerData.description}
            onChange={handleUserChange}
            name="description"
            className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-indigo-100 focus:ring-4"
          />
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          <ArrowRight className="h-4 w-4" />
          مرحله قبل
        </button>

        <button
          onClick={handleSubmitCustomer}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          ادامه
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RegisterCustomer;
