"use server";
// 
import dbConnect from "@/lib/mongodb";
import Otp from "@/model/Otp";

async function sendSMS({
  bodyId,
  to,
  args,
}: {
  bodyId: number;
  to: string;
  args: string[];
}) {
  const defaultSharedUrl =
    "https://console.melipayamak.com/api/send/shared/cba17fa6705a4348b2e2d10279cf3fb9";
  const url = process.env.MELIPAYAMAK_SHARED_URL?.trim() || defaultSharedUrl;
  
  const payload = { bodyId, to, args };
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(payload),
      // جلوگیری از معلق ماندن درخواست هنگام قطعی/کندی سرویس پیامک
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      "اتصال به سرویس پیامک برقرار نشد. لطفا چند لحظه دیگر دوباره تلاش کنید.",
      { cause: err },
    );
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SMS provider error (${res.status}): ${text}`);
  }
  return { status: res.status, body: text };
}

export async function sendOtpToUser(mobile: string) {
  await dbConnect();

  // پاک کردن OTP قبلی شماره موبایل
  await Otp.deleteMany({ mobile });

  // تولید OTP 5 رقمی
  const otp = Math.floor(10000 + Math.random() * 90000).toString();

  // ذخیره OTP در دیتابیس با انقضای 2 دقیقه (TTL index در مدل)
  const otpDoc = await Otp.create({
    mobile,
    otp,
    createdAt: new Date(),
  });
  await sendSMS({
    bodyId: 401950,
    to: mobile,
    args: [otp],
  });
  return otpDoc._id.toString();
}
