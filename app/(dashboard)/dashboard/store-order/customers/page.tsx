"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "react-toastify";

import { Customer } from "@/types";
import UpdateUser from "../modals/updateModal/UpdateUser";

export default function CustomersPage() {
  const ITEMS_PER_PAGE = 10;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        // const res = await fetch("/api/admin/store-order/customer");

        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", ITEMS_PER_PAGE.toString());
        if (query.trim()) {
          params.set("query", query.trim());
        }

        const res = await fetch(
          `/api/admin/store-order/customer?${params.toString()}`,
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "خطا در دریافت لیست مشتریان");
        }

        setCustomers(data.data || []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } catch (err) {
        console.error(err);
        toast.error("در دریافت لیست مشتریان مشکلی پیش آمد.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [page, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (
      selectedCustomerId &&
      !customers.some((customer) => customer._id === selectedCustomerId)
    ) {
      setSelectedCustomerId(null);
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () =>
      customers.find((customer) => customer._id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );
  const from = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(page * ITEMS_PER_PAGE, total);

  return (
    <div className="min-h-screen bg-slate-50 text-right">
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">
            مدیریت مشتریان
          </h1>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            ویرایش اطلاعات مشتریان سفارش دستی از این صفحه انجام می‌شود.
          </p>

          <label className="relative mt-4 block">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجو با نام، نام خانوادگی یا موبایل"
              className="h-11 w-full rounded-xl border border-slate-300 pr-10 pl-3 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <h2 className="mb-4 text-base font-bold text-slate-800">
              لیست مشتریان
            </h2>

            {isLoading ? (
              <p className="text-sm text-slate-500">در حال دریافت اطلاعات...</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-slate-500">مشتری‌ای پیدا نشد.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      onClick={() => setSelectedCustomerId(customer._id)}
                      className={`w-full rounded-xl border p-3 text-right transition ${
                        customer._id === selectedCustomerId
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-indigo-200"
                      }`}
                    >
                      <p className="font-semibold text-slate-800">
                        {customer.name} {customer.lastName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {customer.mobile}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-xs text-slate-500">
                    نمایش {from} تا {to} از نتیجه
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((prev) => prev - 1)}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                    >
                      قبلی
                    </button>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((prev) => prev + 1)}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                    >
                      بعدی
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            {selectedCustomer ? (
              <UpdateUser
                customer={selectedCustomer}
                setCustomer={(updater) => {
                  setCustomers((prev) =>
                    prev.map((item) =>
                      item._id === selectedCustomer._id
                        ? typeof updater === "function"
                          ? (updater(item) as Customer)
                          : updater || item
                        : item,
                    ),
                  );
                }}
              />
            ) : (
              <p className="text-sm text-slate-500">
                برای ویرایش، یک مشتری را از لیست انتخاب کنید.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
