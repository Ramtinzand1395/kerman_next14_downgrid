"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageShell from "@/components/shared/PageShell";

export default function CouponsPage() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    code: "",
    type: "percent",
    value: 10,
    minCartAmount: 0,
    perUserLimit: 1,
  });
  const load = () =>
    fetch("/api/admin/coupons")
      .then((r) => r.json())
      .then((d) => setList(d.data || []));
  useEffect(() => {
    void load();
  }, []);
  const create = async () => {
    const r = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) return toast.error("خطا");
    toast.success("ایجاد شد");
    load();
  };
  const del = async (id: string) => {
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    load();
  };
  return (
    <PageShell title="مدیریت کد تخفیف">
      <div className="mb-4 grid gap-2 md:grid-cols-5">
        <input
          className="rounded border p-2"
          placeholder="code"
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <select
          className="rounded border p-2"
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="percent">درصدی</option>
          <option value="fixed">ثابت</option>
        </select>
        <input
          type="number"
          className="rounded border p-2"
          onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
        />
        <button onClick={create} className="rounded bg-indigo-600 text-white">
          ایجاد
        </button>
      </div>
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c._id} className="rounded border p-2 flex justify-between">
            <span>
              {c.code} - {c.type} - {c.value}
            </span>
            <button onClick={() => del(c._id)} className="text-rose-600">
              حذف
            </button>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
