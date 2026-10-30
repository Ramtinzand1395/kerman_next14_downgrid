
"use server";

type SmsResult = {
  ok: boolean;
  status: number | null;
  body: string;
};

export default async function senSMS({
  bodyId,
  to,
  args,
}: {
  bodyId: number;
  to: string;
  args: string[];
}): Promise<SmsResult> {
  const url = process.env.MELIPAYAMAK_SHARED_URL?.trim();
  if (!url) {
    return {
      ok: false,
      status: null,
      body: "پیکربندی سرویس پیامک کامل نیست.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ bodyId, to, args }),
      // جلوگیری از معلق ماندن درخواست هنگام قطعی/کندی سرویس پیامک
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    const body = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        body: `خطای سرویس پیامک (${res.status})`,
      };
    }

    return { ok: true, status: res.status, body };
  } catch {
    // خطای شبکه / تایم‌اوت اتصال به ملی‌پیامک — نباید کل عملیات را بشکند
    console.error("[business-sms] provider request failed");
    return {
      ok: false,
      status: null,
      body: "اتصال به سرویس پیامک برقرار نشد. لطفا دوباره تلاش کنید.",
    };
  }
}
