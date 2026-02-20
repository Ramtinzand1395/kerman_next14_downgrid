"use client";
import { useEffect, useState } from "react";
import PageShell from "@/components/shared/PageShell";

export default function TransactionsPage() {
  const [data, setData] = useState<any>({ wallet: [], points: [] });
  useEffect(() => {
    fetch("/api/account/transactions")
      .then((r) => r.json())
      .then((d) => setData(d.data || { wallet: [], points: [] }));
  }, []);
  return (
    <PageShell title="تراکنش‌ها">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">کیف پول</h2>
          <ul className="space-y-2">
            {data.wallet.map((i: any) => (
              <li key={i._id} className="rounded border p-2 text-sm">
                {i.type} | {i.amount}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">امتیاز</h2>
          <ul className="space-y-2">
            {data.points.map((i: any) => (
              <li key={i._id} className="rounded border p-2 text-sm">
                {i.type} | {i.points}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
