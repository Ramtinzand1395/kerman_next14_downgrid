"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "react-toastify";

import { Customer } from "@/types";
import {
  MAX_CUSTOMER_BARCODE_LENGTH,
  normalizeCustomerBarcode,
} from "@/lib/store-customer-barcodes";
import { mobileSchema } from "@/validations/validation";

interface SearchCustomerProps {
  customerData: Customer;
  setCustomerData: React.Dispatch<React.SetStateAction<Customer>>;
  onNext: () => void;
  barcode: string;
  setBarcode: (value: string) => void;
}

const SearchCustomer = ({
  customerData,
  setCustomerData,
  onNext,
  barcode,
  setBarcode,
}: SearchCustomerProps) => {
  const [searching, setSearching] = useState(false);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searching) return;

    const mobile = customerData.mobile.trim();
    const normalizedBarcode = normalizeCustomerBarcode(barcode);
    if (!mobile && !normalizedBarcode) {
      toast.warning("شماره موبایل یا بارکد دستگاه را وارد کنید.");
      return;
    }
    if (mobile && !mobileSchema.isValidSync(mobile)) {
      toast.error("شماره موبایل معتبر نیست.");
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (mobile) params.set("mobile", mobile);
      if (normalizedBarcode) params.set("barcode", normalizedBarcode);
      const res = await fetch(`/api/admin/store-order/customer?${params}`);
      const data = await res.json();

      if (res.status === 400 && data?.message === "خریدار پیدا نشد.") {
        setCustomerData({
          _id: "",
          name: "",
          mobile,
          lastName: "",
          sex: "",
          birthday: "",
          description: "",
          createdAt: "",
          updatedAt: "",
        });
        toast.info("مشتری پیدا نشد. اطلاعات مشتری جدید را وارد کنید.");
      } else if (res.ok && data.data) {
        setCustomerData({ ...data.data, mobile: data.data.mobile || mobile });
        toast.success("مشتری پیدا شد.");
      } else {
        throw new Error(data?.message || data?.error || "خطا در جست‌وجوی مشتری");
      }

      setBarcode(normalizedBarcode);
      onNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "جست‌وجوی مشتری انجام نشد.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <p className="text-sm text-slate-600">
        با شماره موبایل یا بارکد دستگاه جست‌وجو کنید.
      </p>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          aria-label="شماره موبایل"
          disabled={searching}
          dir="ltr"
          type="tel"
          value={customerData.mobile}
          onChange={(e) =>
            setCustomerData((prev) => ({ ...prev, mobile: e.target.value }))
          }
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-700 outline-none ring-indigo-100 transition focus:ring-4"
          placeholder="09xxxxxxxxx"
        />

        <input
          aria-label="بارکد دستگاه"
          disabled={searching}
          dir="ltr"
          maxLength={MAX_CUSTOMER_BARCODE_LENGTH}
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-700 outline-none ring-indigo-100 transition focus:ring-4"
          placeholder="بارکد (اختیاری)"
        />

        <button
          title="جستجو"
          type="submit"
          disabled={searching}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Search className="h-4 w-4" />
          جستجو و ادامه
        </button>
      </div>
    </form>
  );
};

export default SearchCustomer;
