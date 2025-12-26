"use client";

import { Customer } from "@/types";
import { mobileSchema } from "@/validations/validation";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import * as yup from "yup";

interface SearchCustomerProps {
  customerData: Customer;
  setCustomerData: React.Dispatch<React.SetStateAction<Customer>>;
}

const SearchCustomer = ({
  customerData,
  setCustomerData,
}: SearchCustomerProps) => {
  const router = useRouter();

  const handleSearch = async () => {
    try {
      mobileSchema.validateSync(customerData.mobile, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.inner.forEach((e) => toast.error(e.message));
      } else {
        toast.error("خطای ناشناخته");
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/store-order/customer?mobile=${customerData.mobile}`
      );

      const data = await res.json();

      toast.info(data.message);
      if (data.status === 200) {
        setCustomerData(data.data);
      } else {
        setCustomerData(
          (prev) =>
            ({
              mobile: prev.mobile,
            } as unknown as Customer)
        );
      }
      router.push("/dashboard/store-order?step=2", {
        scroll: false,
      });
    } catch (err) {
      console.error(err);
      toast.error("خطای سرور");
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="relative w-[480px] bg-white border rounded-2xl shadow-md p-1.5 transition-all duration-150 ease-in-out hover:scale-105 hover:shadow-lg">
        <input
          dir="rtl"
          type="tel"
          value={customerData.mobile}
          onChange={(e) =>
            setCustomerData((prev) => ({
              ...prev,
              mobile: e.target.value,
            }))
          }
          className="w-full pl-2 py-2 pr-8 text-base text-gray-700 bg-transparent rounded-lg focus:outline-none"
          placeholder="جستجو شماره تلفن"
        />
      </div>

      <button
        title="جستجو"
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm hover:shadow-md"
      >
        جستجو
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
};

export default SearchCustomer;
