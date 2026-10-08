"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { AppointmentStatus, CourierStatus } from "@/types/appointments";
import type { AppointmentFiltersState } from "./admin-types";
import { courierLabel, statusLabel } from "./appointment-ui";

type Props = {
  filters: AppointmentFiltersState;
  courierMode?: boolean;
  onChange: (next: AppointmentFiltersState) => void;
};

export default function AppointmentsFilters({
  filters,
  courierMode = false,
  onChange,
}: Props) {
  const set = (patch: Partial<AppointmentFiltersState>) =>
    onChange({ ...filters, ...patch, page: 1 });
  const hasFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.serviceType ||
      filters.courierStatus ||
      filters.date,
  );

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="فیلتر درخواست‌ها"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-[#1269f5]" />
          جست‌وجو و فیلتر
        </h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                search: "",
                status: "",
                serviceType: "",
                courierStatus: "",
                date: "",
                page: 1,
              })
            }
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" />
            پاک‌کردن فیلترها
          </button>
        ) : null}
      </div>

      <div
        className={`grid gap-3 md:grid-cols-2 ${courierMode ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
      >
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">جست‌وجو</span>
          <Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => set({ search: event.target.value })}
            placeholder="نام، موبایل یا کد پیگیری"
            className="h-11 w-full rounded-xl border border-slate-200 pr-9 pl-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <select
          aria-label="فیلتر خدمت"
          value={filters.serviceType}
          onChange={(event) => set({ serviceType: event.target.value })}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">همه خدمات</option>
          <option value="game_install">نصب بازی</option>
          <option value="repair">تعمیرات</option>
        </select>

        <select
          aria-label="فیلتر وضعیت خدمت"
          value={filters.status}
          onChange={(event) => set({ status: event.target.value })}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">همه وضعیت‌های خدمت</option>
          {(Object.entries(statusLabel) as Array<[AppointmentStatus, string]>).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>

        {courierMode ? (
          <select
            aria-label="فیلتر وضعیت پیک"
            value={filters.courierStatus}
            onChange={(event) => set({ courierStatus: event.target.value })}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">همه وضعیت‌های پیک</option>
            {(Object.entries(courierLabel) as Array<[CourierStatus, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        ) : null}

        <input
          aria-label="فیلتر تاریخ"
          type="date"
          value={filters.date}
          onChange={(event) => set({ date: event.target.value })}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>
    </section>
  );
}
