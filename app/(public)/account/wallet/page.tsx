"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageShell from "@/components/shared/PageShell";

export default function WalletPage() {
  const [list, setList] = useState<any[]>([]);
  const [amount, setAmount] = useState(100000);
  const load = () =>
    fetch("/api/account/wallet/topup")
      .then((r) => r.json())
      .then((d) => setList(d.data || []));
  useEffect(() => {
    void load();
  }, []);
  const submit = async () => {
    const r = await fetch("/api/account/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method: "offline" }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.message);
    toast.success("درخواست ثبت شد");
    load();
  };
  return (
    <PageShell title="کیف پول">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="number"
            className="rounded border p-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <button
            onClick={submit}
            className="rounded bg-indigo-600 px-4 py-2 text-white"
          >
            ثبت درخواست شارژ
          </button>
        </div>
        <ul className="space-y-2">
          {list.length === 0 && <li>درخواستی ثبت نشده است.</li>}
          {list.map((i) => (
            <li key={i._id} className="rounded border p-2">
              {new Intl.NumberFormat("fa-IR").format(i.amount)} تومان -{" "}
              {i.status}
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
