"use client";

import * as yup from "yup";
import { Search } from "lucide-react";
import { toast } from "react-toastify";

import { Customer } from "@/types";
import { mobileSchema } from "@/validations/validation";

interface SearchCustomerProps {
  customerData: Customer;
  setCustomerData: React.Dispatch<React.SetStateAction<Customer>>;
  onNext: () => void;
}

const SearchCustomer = ({
  customerData,
  setCustomerData,
  onNext,
}: SearchCustomerProps) => {
  const handleSearch = async () => {
    try {
      mobileSchema.validateSync(customerData.mobile, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.errors.forEach((message) => toast.error(message));
      } else {
        toast.error("شماره موبایل معتبر نیست.");
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/store-order/customer?mobile=${customerData.mobile}`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "خطا در جستجوی مشتری");
      }

      if (data.status === 200 && data.data) {
        setCustomerData(data.data);
        toast.success("اطلاعات مشتری یافت شد.");
      } else {
        setCustomerData((prev) => ({
          ...prev,
          _id: "",
          name: "",
          lastName: "",
          sex: "",
          birthday: "",
          description: "",
        }));
        toast.info("مشتری جدید است. لطفا اطلاعات را ثبت کنید.");
      }

      onNext();
    } catch (err) {
      console.error(err);
      toast.error("در جستجوی مشتری خطایی رخ داد.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        شماره موبایل مشتری را وارد کنید تا اطلاعات قبلی بازیابی شود.
      </p>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          dir="rtl"
          type="tel"
          value={customerData.mobile}
          onChange={(e) =>
            setCustomerData((prev) => ({ ...prev, mobile: e.target.value }))
          }
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-700 outline-none ring-indigo-100 transition focus:ring-4"
          placeholder="09xxxxxxxxx"
        />

        <button
          title="جستجو"
          onClick={handleSearch}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Search className="h-4 w-4" />
          جستجو و ادامه
        </button>
      </div>
    </div>
  );
};

export default SearchCustomer;
