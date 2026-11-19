import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { Customer } from "@/types";
import { toPersianDate } from "@/helpers/toPersianDate";

type Props = {
  closeModal: () => void;
  customer: Pick<Customer, "name" | "lastName" | "mobile" | "sex" | "birthday" | "description"> | null;
  createdAt?: string | null;
  children: ReactNode;
  actions?: ReactNode;
};

export default function OrderInfoDialog({ closeModal, customer, createdAt, children, actions }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={closeModal}
      />

      <div role="dialog" aria-modal="true" aria-label="اطلاعات سفارش" className="relative z-10 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute left-4 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        <header className="flex flex-col gap-2 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            اطلاعات سفارش {customer?.lastName ? `(${customer.lastName})` : ""}
          </h2>
          <span className="text-sm text-slate-500">
            تاریخ ثبت: {toPersianDate(createdAt)}
          </span>
        </header>

        <div className="space-y-5 p-5">
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-base font-bold text-slate-800">
              اطلاعات کاربر
            </h3>

            {customer ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">نام</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.name || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">نام خانوادگی</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.lastName || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">شماره موبایل</p>
                  <p className="mt-1 font-medium text-slate-800" dir="ltr">
                    {customer.mobile || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">جنسیت</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.sex || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">تاریخ تولد</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.birthday || "---"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:col-span-2 lg:col-span-1">
                  <p className="text-xs text-slate-500">توضیحات مشتری</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {customer.description || "---"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                اطلاعات کاربر برای این سفارش ثبت نشده است.
              </p>
            )}
          </section>
          {children}
        </div>

        {actions && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-5">
          {actions}
        </footer>}
      </div>
    </div>
  );
}
