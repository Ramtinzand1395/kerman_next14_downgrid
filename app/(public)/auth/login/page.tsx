"use client";
// todo
// !چک بشهsitemap,robot.ts
// !سرچ محصولات اضافه بشه
// !زدن خودکار کد بعد از sms
import { useEffect, useState } from "react";
import { CheckPhoneAction } from "@/helpers/CheckPhoneAction";
import { sendOtpToUser } from "@/helpers/sendSms";
import { signIn } from "next-auth/react";
import { toast } from "react-toastify";
import Image from "next/image";
import { mobileSchema, otpSchema } from "@/validations/validation";
import * as yup from "yup";

export default function LoginWithOtp() {
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);

  const otpMetaKey = "otpMeta";
  const expireKey = "otpExpireTime";

  const totalTime = 120; // ثانیه
  const [timer, setTimer] = useState(0);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const clearOtpStorage = () => {
    localStorage.removeItem(expireKey);
    localStorage.removeItem(otpMetaKey);
  };

  // ✅ تایمر پایدار: همیشه از روی expireTime محاسبه می‌شود (مناسب رفرش‌های متعدد)
  useEffect(() => {
    const savedMeta = localStorage.getItem(otpMetaKey);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        setOtpId(parsed?.otpId ?? null);
        if (parsed?.mobile) setMobile(parsed.mobile);
      } catch {
        localStorage.removeItem(otpMetaKey);
      }
    }

    const tick = () => {
      const savedExpireTime = localStorage.getItem(expireKey);

      if (!savedExpireTime) {
        setTimer(0);
        // اینجا otpSent رو false نکن تا توی صفحه OTP بمونه
        return;
      }

      const expire = Number(savedExpireTime);
      const diff = Math.floor((expire - Date.now()) / 1000);

      if (diff > 0) {
        setTimer(diff);
        setOtpSent(true);
      } else {
        // تایمر تمام شد اما در صفحه OTP بمان
        setTimer(0);
        localStorage.removeItem(expireKey); // فقط expire رو پاک کن تا resend فعال بشه
      }
    };

    tick(); // همین الان یک بار
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, []);

  // ----------------------
  // ارسال OTP (فرم + resend)
  // ----------------------
  const sendOtp = async () => {
    // ✅ اگر تایمر فعاله، ارسال مجدد نکن
    const savedExpireTime = localStorage.getItem(expireKey);
    if (savedExpireTime) {
      const expire = Number(savedExpireTime);
      const diff = Math.floor((expire - Date.now()) / 1000);
      if (diff > 0) {
        setTimer(diff);
        setOtpSent(true);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      try {
        await mobileSchema.validate(mobile, { abortEarly: false });
      } catch (err) {
        if (err instanceof yup.ValidationError) {
          err.inner.forEach((e) => toast.error(e.message));
        } else {
          toast.error("خطای ناشناخته");
        }
        return;
      }

      await CheckPhoneAction(mobile);

      const otpRes = await sendOtpToUser(mobile);

      setOtpId(otpRes);
      setOtpSent(true);

      localStorage.setItem(
        otpMetaKey,
        JSON.stringify({ otpId: otpRes, mobile }),
      );

      toast.success("کد تایید ارسال شد");

      const expireTime = Date.now() + totalTime * 1000;
      localStorage.setItem(expireKey, expireTime.toString());

      setTimer(totalTime);
    } catch (err) {
      console.log(err);
      toast.error("ارسال کد با خطا مواجه شد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendOtp();
  };

  // ----------------------
  // تایید OTP
  // ----------------------
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otpId) {
      toast.error("اطلاعات تایید ناقص است، دوباره درخواست کد دهید.");
      return;
    }

    try {
      await otpSchema.validate(enteredOtp);
    } catch {
      toast.error("کد تایید معتبر نیست");
      return;
    }

    try {
      const res = await fetch("/api/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, enteredOtp, mobile }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "کد اشتباه است");
        return;
      }

      toast.success("ورود با موفقیت انجام شد");

      clearOtpStorage();
      setTimer(0);

      signIn("credentials", {
        mobile,
        callbackUrl: "/",
      });
    } catch (err) {
      console.log(err);
      toast.error("مشکلی در تایید کد پیش آمد");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen flex-col">
      <div className="relative mb-10 w-[50px] h-[50px]">
        <Image
          src="/atari-seeklogo.svg"
          alt="لوگوی کرمان آتاری"
          fill
          priority
          className="object-contain w-auto h-auto"
        />
      </div>

      <div className="w-[300px] md:w-[500px] mx-auto bg-white p-5">
        <h2 className="font-semibold mb-6">ورود به کرمان آتاری</h2>

        {!otpSent ? (
          <form onSubmit={handleSendOtp}>
            <label>شماره موبایل *</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="شماره موبایل را وارد کنید"
              className="w-full border px-4 py-3 rounded mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <span className="text-xs">
              با ورود به کرمان آتاری شرایط و قوانین حریم ‌خصوصی آن را می‌پذیرید.
            </span>

            <button
              type="submit"
              disabled={isSubmitting || timer > 0}
              className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50 mt-5"
            >
              {isSubmitting ? "در حال ارسال..." : "ارسال کد تایید"}
            </button>

            {timer > 0 && (
              <p className="text-center mt-3 text-gray-600">
                ارسال مجدد پس از: <strong>{formatTime(timer)}</strong>
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value)}
              placeholder="کد تایید را وارد کنید"
              className="w-full border px-4 py-3 rounded mb-3 focus:ring-2 focus:ring-green-500 outline-none"
            />

            <button className="w-full bg-green-500 text-white py-2 rounded">
              تایید کد
            </button>

            {timer > 0 ? (
              <p className="text-center mt-3 text-gray-600">
                امکان ارسال مجدد تا: <strong>{formatTime(timer)}</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={sendOtp}
                className="w-full bg-gray-200 text-black py-2 rounded mt-3"
              >
                ارسال مجدد کد
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
