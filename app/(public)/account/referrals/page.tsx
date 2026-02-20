"use client";
import { useEffect, useState } from "react";
import PageShell from "@/components/shared/PageShell";

export default function ReferralPage() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    fetch("/api/account/referrals")
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <PageShell title="دعوت دوستان">
      <p className="mb-3">
        کد معرف شما: <b>{data?.data?.referralCode || "-"}</b>
      </p>
      <ul className="space-y-2">
        {(data?.data?.referrals || []).map((r: any) => (
          <li key={r._id} className="rounded border p-2">
            {r.invited?.mobile} - پاداش: {r.inviterReward}
          </li>
        ))}
        {(!data?.data?.referrals || data.data.referrals.length === 0) && (
          <li>هنوز دوستی دعوت نکرده‌اید.</li>
        )}
      </ul>
    </PageShell>
  );
}
