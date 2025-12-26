"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import moment from "moment-jalaali";

export default function FilterOrders() {
  const router = useRouter();
  const pathname = usePathname();
  const [openSearch, setOpenSearch] = useState(false);

  const [filters, setFilters] = useState<{
    startDate: string | Date;
    endDate: string | Date;
    mobile: string;
    lastName: string;
  }>({
    startDate: "",
    endDate: "",
    mobile: "",
    lastName: "",
  });

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (filters.startDate) {
      // اگر DatePicker مقدار Date می‌ده، مستقیم به moment بده
      const start = moment(filters.startDate).format("jYYYY/jMM/jDD");
      params.set("startDate", start);
    }

    if (filters.endDate) {
      const end = moment(filters.endDate).format("jYYYY/jMM/jDD");
      params.set("endDate", end);
    }

    if (filters.mobile) params.set("mobile", filters.mobile);
    if (filters.lastName) params.set("lastName", filters.lastName);

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const resetFilters = () => {
    setFilters({ startDate: "", endDate: "", mobile: "", lastName: "" });
    router.push(pathname, { scroll: false });
  };

  return (
    <>
      <button
        onClick={() => setOpenSearch((p) => !p)}
        className="p-2 bg-blue-500 text-white rounded-lg"
      >
        جستجو پیشرفته
      </button>

      {openSearch && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 my-4 bg-gray-200 p-4 rounded-lg">
          {/* از تاریخ */}

          <DatePicker
            placeholder="تاریخ شروع"
            calendarPosition="bottom-left"
            inputClass="p-1 rounded-xl bg-white text-xs md:text-base border-2 border-gray-300 text-gray-700 my-1 w-full"
            containerStyle={{ width: "100%" }}
            style={{
              minWidth: "150px",
            }}
            calendar={persian}
            locale={persian_fa}
            value={filters.endDate ? new Date(filters.endDate) : null}
            onChange={(date) =>
              setFilters((p) => ({ ...p, endDate: date ? date.toDate() : "" }))
            }
          />
          {/* تا تاریخ */}
          <DatePicker
            placeholder="تاریخ پایان"
            calendarPosition="bottom-left"
            inputClass="p-1 rounded-xl bg-white text-xs md:text-base border-2 border-gray-300 text-gray-700 my-1 w-full"
            containerStyle={{ width: "100%" }}
            style={{
              minWidth: "150px",
            }}
            calendar={persian}
            locale={persian_fa}
            value={filters.startDate ? new Date(filters.startDate) : null}
            onChange={(date) =>
              setFilters((p) => ({
                ...p,
                startDate: date ? date.toDate() : "",
              }))
            }
          />

          {/* موبایل */}
          <input
            className="p-1 rounded-xl bg-white text-xs md:text-base border-2 border-gray-300 text-gray-700 my-1 "
            placeholder="موبایل"
            value={filters.mobile}
            onChange={(e) =>
              setFilters((p) => ({ ...p, mobile: e.target.value }))
            }
          />

          {/* نام خانوادگی */}
          <input
            className="p-1 rounded-xl bg-white text-xs md:text-base border-2 border-gray-300 text-gray-700 my-1 "
            placeholder="نام خانوادگی"
            value={filters.lastName}
            onChange={(e) =>
              setFilters((p) => ({ ...p, lastName: e.target.value }))
            }
          />

          <div className=" flex gap-3 mt-2">
            <button
              onClick={applyFilters}
              className="p-2 bg-blue-500 text-white rounded-lg"
            >
              جستجو
            </button>
            <button
              onClick={resetFilters}
              className="p-2 bg-gray-500 text-white rounded-lg"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </>
  );
}
