"use client";
import { useEffect, useState } from "react";
import PageShell from "@/components/shared/PageShell";

export default function AccountPage() {
  const [user, setUser] = useState<any>();
  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => setUser(d.data));
  }, []);
  return (
    <PageShell title="پروفایل">
      <div className="grid gap-2 text-sm">
        <p>نام: {user?.username || "-"}</p>
        <p>موبایل: {user?.mobile || "-"}</p>
        <p>سطح: {user?.tier || "bronze"}</p>
        <p>
          کیف پول:{" "}
          {new Intl.NumberFormat("fa-IR").format(user?.walletBalance || 0)}{" "}
          تومان
        </p>
        <p>امتیاز: {user?.pointsBalance || 0}</p>
      </div>
    </PageShell>
  );
}
