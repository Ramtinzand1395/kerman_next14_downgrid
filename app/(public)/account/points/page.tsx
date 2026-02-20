"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageShell from "@/components/shared/PageShell";

export default function PointsPage() {
  const [user, setUser] = useState<any>();
  const [points, setPoints] = useState(100);
  const load = () =>
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => setUser(d.data));
  useEffect(() => {
    void load();
  }, []);
  const redeem = async () => {
    const r = await fetch("/api/account/points/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.message);
    toast.success("تبدیل انجام شد");
    load();
  };
  return (
    <PageShell title="امتیاز و سطح">
      <div className="space-y-2">
        <p>امتیاز فعلی: {user?.pointsBalance || 0}</p>
        <p>سطح عضویت: {user?.tier || "bronze"}</p>
        <div className="flex gap-2">
          <input
            type="number"
            className="rounded border p-2"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
          <button
            onClick={redeem}
            className="rounded bg-emerald-600 px-4 py-2 text-white"
          >
            تبدیل به کیف پول
          </button>
        </div>
      </div>
    </PageShell>
  );
}
