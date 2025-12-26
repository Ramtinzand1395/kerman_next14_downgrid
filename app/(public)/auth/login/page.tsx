"use client";
// todo
// اضافه کردن اعتبار سنجی
// !اضافه کرئدن sitemap,robot.ts
// !سرچ محصولات اضافه بشه
// !ریسپانسیو صفحه ارسال کد
// !زدن خودکار کد بعد از sms
// !ساخت یوزر های جدید عکس و دیتا بیسو ...
import { useState, useEffect } from "react";
import { CheckPhoneAction } from "@/helpers/CheckPhoneAction";
import { sendOtpToUser } from "@/helpers/sendSms";
import { signIn } from "next-auth/react";
import { toast } from "react-toastify";
import Image from "next/image";
import { mobileSchema } from "@/validations/validation";

export default function LoginWithOtp() {
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [Errors, setErrors] = useState("");
  // ----------------------
  // تایمر + ذخیره LocalStorage
  // ----------------------
  const totalTime = 120; // ۲ دقیقه
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const savedExpireTime = localStorage.getItem("otpExpireTime");

    if (savedExpireTime) {
      const expire = Number(savedExpireTime);
      const now = Date.now();
      const diff = Math.floor((expire - now) / 1000);

      if (diff > 0) {
        setTimer(diff);
        setOtpSent(true);
      } else {
        localStorage.removeItem("otpExpireTime");
      }
    }
  }, []);

  // اجرای تایمر
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 10;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ----------------------
  // تابع اصلی ارسال OTP (فرم + resend)
  // ----------------------
  const sendOtp = async () => {
    if (timer > 0) return; // جلوگیری از ارسال دوباره

    setIsSubmitting(true);

    try {
      await mobileSchema.validate(mobile);
      await CheckPhoneAction(mobile);
      const otpRes = await sendOtpToUser(mobile);

      setOtpId(otpRes);
      setOtpSent(true);

      toast.success("کد تایید ارسال شد");

      // ۲ دقیقه بعدی
      const expireTime = Date.now() + totalTime * 1000;
      localStorage.setItem("otpExpireTime", expireTime.toString());

      setTimer(totalTime);
    } catch (err) {
      console.log(err);
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
    if (!otpId) return;

    try {
      const res = await fetch("/api/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, enteredOtp }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "کد اشتباه است");
        return;
      }

      toast.success("ورود با موفقیت انجام شد");

      localStorage.removeItem("otpExpireTime");

      signIn("credentials", {
        mobile,
        callbackUrl: "/",
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen flex-col">
      <Image
        width={30}
        height={30}
        alt="لوگوی کرمان آتاری"
        src="/atari-seeklogo.svg"
        className="w-30 h-30 mb-10"
        priority
      />
      <div className="max-w-md mx-auto  bg-white p-5">
        <h2 className="font-semibold mb-6">ورود به کرمان آتاری</h2>
        {!otpSent ? (
          <form onSubmit={handleSendOtp}>
            <label htmlFor="">شماره موبایل *</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="شماره موبایل را وارد کنید"
              className="w-full border px-4 py-3 rounded mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-xs">
              با ورود به کرمان آتاری شرایط مبیت و قوانین حریم ‌خصوصی آن را
              می‌پذیرید.
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

            {/* دکمه ارسال مجدد */}
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

// !قبل از تایمر
// "use client";
// import { useState } from "react";
// import { CheckPhoneAction } from "@/helpers/CheckPhoneAction";
// import { sendOtpToUser } from "@/helpers/sendSms";
// import { signIn } from "next-auth/react";
// import { toast } from "react-toastify";

// export default function LoginWithOtp() {
//   const [mobile, setMobile] = useState("");
//   const [otpSent, setOtpSent] = useState(false);
//   const [enteredOtp, setEnteredOtp] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [otpId, setOtpId] = useState<string | null>(null);

//   const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     try {
//       await CheckPhoneAction(mobile); // بررسی یا ساخت کاربر
//       const otpRes = await sendOtpToUser(mobile);
//       setOtpId(otpRes);
//       // todo پاک بشه
//       alert(otpRes)
//       setOtpSent(true);
//     } catch (err) {
//       console.log(err);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!otpId) return;

//     try {
//       const res = await fetch("/api/verifyOtp", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ otpId, enteredOtp }),
//       });
//       const data = await res.json();

//       if (data.success === false) {
//         toast.error(data.message || "خطایی رخ داد");
//         return;
//       }

//       toast.success(data.message);
//       if (data.success) {
//         signIn("credentials", {
//           mobile,
//           callbackUrl: "/",
//         });
//       }
//     } catch (err) {
//       console.log(err);
//     }
//   };

//   return (
//     <div className="max-w-sm mx-auto p-4">
//       {!otpSent ? (
//         <form onSubmit={handleSendOtp}>
//           <input
//             type="tel"
//             value={mobile}
//             onChange={(e) => setMobile(e.target.value)}
//             placeholder="شماره تماس را وارد کنید"
//             className="w-full border px-4 py-3 rounded mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
//           />
//           <button
//             type="submit"
//             disabled={isSubmitting}
//             className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
//           >
//             {isSubmitting ? "در حال ارسال..." : "ارسال کد تایید"}
//           </button>
//         </form>
//       ) : (
//         <form onSubmit={handleVerifyOtp}>
//           <input
//             type="text"
//             value={enteredOtp}
//             onChange={(e) => setEnteredOtp(e.target.value)}
//             placeholder="کد تایید را وارد کنید"
//             className="w-full border px-4 py-3 rounded mb-3 focus:ring-2 focus:ring-green-500 outline-none"
//           />
//           <button className="w-full bg-green-500 text-white py-2 rounded">
//             تایید کد
//           </button>
//         </form>
//       )}
//     </div>
//   );
// }
