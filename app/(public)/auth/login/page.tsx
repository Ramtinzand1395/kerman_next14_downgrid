// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import Image from "next/image";
// import { signIn } from "next-auth/react";
// import { toast } from "react-toastify";
// import * as yup from "yup";
// import { safeParseJSON } from "@/helpers/safeParseJSON";
// import { CheckPhoneAction } from "@/helpers/CheckPhoneAction";
// import { sendOtpToUser } from "@/helpers/sendSms";
// import { mobileSchema, otpSchema } from "@/validations/validation";

// type OtpCredential = {
//   code?: string;
// };

// declare global {
//   interface OTPCredential extends OtpCredential {}

//   interface CredentialRequestOptions {
//     otp?: {
//       transport: Array<"sms">;
//     };
//     signal?: AbortSignal;
//   }
// }

// const OTP_META_KEY = "otpMeta";
// const OTP_EXPIRE_KEY = "otpExpireTime";
// const OTP_TOTAL_TIME = 120;
// const OTP_LENGTH = 5;

// const normalizeOtpCode = (value: string) => {
//   const faDigits = "۰۱۲۳۴۵۶۷۸۹";
//   const arDigits = "٠١٢٣٤٥٦٧٨٩";

//   return value
//     .replace(/[۰-۹]/g, (d) => faDigits.indexOf(d).toString())
//     .replace(/[٠-٩]/g, (d) => arDigits.indexOf(d).toString())
//     .replace(/\D/g, "");
// };

// export default function LoginWithOtp() {
//   const [mobile, setMobile] = useState("");
//   const [otpSent, setOtpSent] = useState(false);
//   const [enteredOtp, setEnteredOtp] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [otpId, setOtpId] = useState<string | null>(null);
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [timer, setTimer] = useState(0);

//   const formRef = useRef<HTMLFormElement | null>(null);
//   const otpInputRef = useRef<HTMLInputElement | null>(null);
//   const lastSubmittedOtpRef = useRef("");

//   const formatTime = (sec: number) => {
//     const m = Math.floor(sec / 60);
//     const s = sec % 60;
//     return `${m}:${s < 10 ? "0" : ""}${s}`;
//   };

//   const clearOtpStorage = () => {
//     localStorage.removeItem(OTP_EXPIRE_KEY);
//     localStorage.removeItem(OTP_META_KEY);
//   };

//   const currentStep = useMemo(() => (otpSent ? "otp" : "mobile"), [otpSent]);

//   useEffect(() => {
//     const savedMeta = localStorage.getItem(OTP_META_KEY);
//     if (savedMeta) {
//       try {
//         const parsed = JSON.parse(savedMeta);
//         setOtpId(parsed?.otpId ?? null);
//         if (parsed?.mobile) {
//           setMobile(parsed.mobile);
//           setOtpSent(true);
//         }
//       } catch {
//         localStorage.removeItem(OTP_META_KEY);
//       }
//     }

//     const tick = () => {
//       const savedExpireTime = localStorage.getItem(OTP_EXPIRE_KEY);

//       if (!savedExpireTime) {
//         setTimer(0);
//         return;
//       }

//       const expire = Number(savedExpireTime);
//       const diff = Math.floor((expire - Date.now()) / 1000);

//       if (diff > 0) {
//         setTimer(diff);
//         setOtpSent(true);
//       } else {
//         setTimer(0);
//         localStorage.removeItem(OTP_EXPIRE_KEY);
//       }
//     };

//     tick();
//     const interval = setInterval(tick, 1000);

//     return () => clearInterval(interval);
//   }, []);

//   // وقتی مرحله کد فعال شد، فیلد را فوکوس کن تا:
//   // - در اندروید/کروم درخواست WebOTP بهتر کار کند
//   // - در iOS/سافاری پیشنهاد «از پیام‌ها» بالای کیبورد ظاهر شود
//   useEffect(() => {
//     if (!otpSent) return;
//     const t = setTimeout(() => otpInputRef.current?.focus(), 50);
//     return () => clearTimeout(t);
//   }, [otpSent]);

//   useEffect(() => {
//     if (
//       !otpSent ||
//       typeof window === "undefined" ||
//       !("OTPCredential" in window)
//     ) {
//       return;
//     }

//     const controller = new AbortController();

//     const getOtpFromSms = async () => {
//       try {
//         const credential = (await navigator.credentials.get({
//           otp: { transport: ["sms"] },
//           signal: controller.signal,
//         })) as OTPCredential | null;

//         if (!credential?.code) return;

//         const otpCode = normalizeOtpCode(credential.code).slice(0, OTP_LENGTH);
//         if (!otpCode) return;

//         setEnteredOtp(otpCode);
//         toast.success("کد پیامک به‌صورت خودکار وارد شد");
//       } catch {
//         // در بسیاری از مرورگرها WebOTP پشتیبانی نمی‌شود یا کاربر پیامک را تایید نمی‌کند.
//       }
//     };

//     getOtpFromSms();

//     return () => controller.abort();
//   }, [otpSent]);

//   useEffect(() => {
//     if (!otpSent || enteredOtp.length !== OTP_LENGTH || isVerifying) {
//       return;
//     }

//     // جلوگیری از ارسال مجدد همان کد (بعد از تایید موفق یا خطا)
//     if (lastSubmittedOtpRef.current === enteredOtp) {
//       return;
//     }

//     formRef.current?.requestSubmit();
//   }, [enteredOtp, isVerifying, otpSent]);

//   const sendOtp = async () => {
//     const savedExpireTime = localStorage.getItem(OTP_EXPIRE_KEY);
//     if (savedExpireTime) {
//       const expire = Number(savedExpireTime);
//       const diff = Math.floor((expire - Date.now()) / 1000);
//       if (diff > 0) {
//         setTimer(diff);
//         setOtpSent(true);
//         return;
//       }
//     }

//     setIsSubmitting(true);

//     try {
//       try {
//         await mobileSchema.validate(mobile, { abortEarly: false });
//       } catch (err) {
//         if (err instanceof yup.ValidationError) {
//           err.inner.forEach((e) => toast.error(e.message));
//         } else {
//           toast.error("خطای ناشناخته");
//         }
//         return;
//       }

//       await CheckPhoneAction(mobile);

//       const newOtpId = await sendOtpToUser(mobile);
//       const expireTime = Date.now() + OTP_TOTAL_TIME * 1000;

//       setOtpId(newOtpId);
//       setOtpSent(true);
//       setEnteredOtp("");
//       setTimer(OTP_TOTAL_TIME);

//       localStorage.setItem(OTP_EXPIRE_KEY, expireTime.toString());
//       localStorage.setItem(
//         OTP_META_KEY,
//         JSON.stringify({ otpId: newOtpId, mobile }),
//       );

//       toast.success("کد تایید ارسال شد");
//     } catch (err) {
//       console.log(err);
//       toast.error("ارسال کد با خطا مواجه شد");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleSendOtp = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     sendOtp();
//   };

//   const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (isVerifying) return;
//     lastSubmittedOtpRef.current = enteredOtp;
//     if (!otpId) {
//       toast.error("اطلاعات تایید ناقص است، دوباره درخواست کد دهید.");
//       return;
//     }

//     try {
//       await otpSchema.validate(enteredOtp);
//     } catch (err) {
//       if (err instanceof yup.ValidationError) {
//         toast.error(err.message);
//       } else {
//         toast.error("کد تایید معتبر نیست");
//       }
//       return;
//     }

//     try {
//       setIsVerifying(true);
//       const res = await fetch("/api/verifyOtp", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ otpId, enteredOtp, mobile }),
//       });

//       const data = await res.json();

//       if (!data.success) {
//         toast.error(data.message || "کد اشتباه است");
//         lastSubmittedOtpRef.current = "";
//         setIsVerifying(false);
//         return;
//       }

//       toast.success("ورود با موفقیت انجام شد");

//       clearOtpStorage();
//       setTimer(0);

//       // جلوگیری از ارسال مجدد کد: تا زمان کامل شدن ورود،
//       // stateها را خالی می‌کنیم تا افکت auto-submit دوباره فایر نشود.
//       setOtpSent(false);
//       setEnteredOtp("");
//       setOtpId(null);

//       // isVerifying را در این شاخه true نگه می‌داریم تا در finally
//       // false نشود و افکت auto-submit دوباره اجرا نشود. به‌جای finally،
//       // آن را اینجا مدیریت نمی‌کنیم چون finally همیشه اجرا می‌شود؛
//       // پس پس از signIn نیازی نیست false شود چون component در حال redirect است.
//       await signIn("credentials", {
//         mobile,
//         callbackUrl: "/",
//         redirect: false,
//       }).then(() => {
//         // ریدایرکت نهایی
//         window.location.href = "/";
//       });
//     } catch (err) {
//       console.log(err);
//       toast.error("مشکلی در تایید کد پیش آمد");
//       lastSubmittedOtpRef.current = "";
//       setIsVerifying(false);
//     }
//   };

//   return (
//     <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 sm:py-12">
//       <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
//         <div className="hidden flex-col justify-between bg-slate-900 p-8 text-white md:flex">
//           <div>
//             <div className="relative mb-6 h-12 w-12">
//               <Image
//                 src="/atari-seeklogo.svg"
//                 alt="لوگوی کرمان آتاری"
//                 fill
//                 priority
//                 className="object-contain"
//               />
//             </div>
//             <h1 className="text-2xl font-bold leading-9">ورود سریع و امن</h1>
//             <p className="mt-3 text-sm leading-7 text-slate-200">
//               برای ورود فقط شماره موبایل خود را وارد کنید. کد تایید برای شما
//               ارسال می‌شود و در موبایل‌های سازگار به‌صورت خودکار در فرم قرار
//               می‌گیرد.
//             </p>
//           </div>

//           <ul className="space-y-3 text-sm text-slate-200">
//             <li>• بدون نیاز به رمز عبور</li>
//             <li>• ورود امن با کد یکبار مصرف</li>
//             <li>• تجربه بهینه برای موبایل</li>
//           </ul>
//         </div>

//         <div className="p-6 sm:p-8">
//           <div className="mb-6 md:hidden">
//             <div className="relative mb-4 h-10 w-10">
//               <Image
//                 src="/atari-seeklogo.svg"
//                 alt="لوگوی کرمان آتاری"
//                 fill
//                 priority
//                 className="object-contain"
//               />
//             </div>
//             <h1 className="text-xl font-bold text-slate-900">
//               ورود به کرمان آتاری
//             </h1>
//           </div>

//           <div className="mb-8 flex items-center gap-2 rounded-xl bg-slate-100 p-2 text-xs">
//             <div
//               className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
//                 currentStep === "mobile"
//                   ? "bg-white text-slate-900 shadow"
//                   : "text-slate-500"
//               }`}
//             >
//               ۱) شماره موبایل
//             </div>
//             <div
//               className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
//                 currentStep === "otp"
//                   ? "bg-white text-slate-900 shadow"
//                   : "text-slate-500"
//               }`}
//             >
//               ۲) کد تایید
//             </div>
//           </div>

//           {!otpSent ? (
//             <form onSubmit={handleSendOtp} className="space-y-4">
//               <div>
//                 <label className="mb-2 block text-sm font-medium text-slate-700">
//                   شماره موبایل
//                 </label>
//                 <input
//                   type="tel"
//                   inputMode="numeric"
//                   dir="ltr"
//                   value={mobile}
//                   onChange={(e) => setMobile(e.target.value)}
//                   placeholder="09xxxxxxxxx"
//                   className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
//                 />
//               </div>

//               <p className="text-xs leading-6 text-slate-500">
//                 با ورود به کرمان آتاری، شرایط استفاده و قوانین حریم خصوصی را
//                 می‌پذیرید.
//               </p>

//               <button
//                 type="submit"
//                 disabled={isSubmitting || timer > 0}
//                 className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
//               >
//                 {isSubmitting ? "در حال ارسال..." : "دریافت کد تایید"}
//               </button>

//               {timer > 0 && (
//                 <p className="text-center text-sm text-slate-600">
//                   ارسال مجدد پس از <strong>{formatTime(timer)}</strong>
//                 </p>
//               )}
//             </form>
//           ) : (
//             <form
//               ref={formRef}
//               onSubmit={handleVerifyOtp}
//               className="space-y-4"
//             >
//               <div>
//                 <label className="mb-2 block text-sm font-medium text-slate-700">
//                   کد تایید پیامک‌ شده
//                 </label>
//                 <input
//                   ref={otpInputRef}
//                   name="otp"
//                   type="text"
//                   dir="ltr"
//                   inputMode="numeric"
//                   autoComplete="one-time-code"
//                   pattern="[0-9]{5}"
//                   maxLength={OTP_LENGTH}
//                   value={enteredOtp}
//                   onChange={(e) =>
//                     setEnteredOtp(
//                       normalizeOtpCode(e.target.value).slice(0, OTP_LENGTH),
//                     )
//                   }
//                   placeholder="-----"
//                   className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.45em] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
//                 />
//               </div>

//               <button
//                 disabled={isVerifying}
//                 type="submit"
//                 className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
//               >
//                 {isVerifying ? "در حال بررسی..." : "تایید و ورود"}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => {
//                   setOtpSent(false);
//                   setEnteredOtp("");
//                   lastSubmittedOtpRef.current = "";
//                 }}
//                 className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
//               >
//                 تغییر شماره موبایل
//               </button>

//               {timer > 0 ? (
//                 <p className="text-center text-sm text-slate-600">
//                   امکان ارسال مجدد تا <strong>{formatTime(timer)}</strong>
//                 </p>
//               ) : (
//                 <button
//                   type="button"
//                   onClick={sendOtp}
//                   className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
//                 >
//                   ارسال مجدد کد
//                 </button>
//               )}
//             </form>
//           )}
//         </div>
//       </section>
//     </main>
//   );
// }

// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import Image from "next/image";
// import { signIn } from "next-auth/react";
// import { toast } from "react-toastify";
// import * as yup from "yup";
// const otpInputRef = useRef<HTMLInputElement | null>(null);
// import { CheckPhoneAction } from "@/helpers/CheckPhoneAction";
// import { sendOtpToUser } from "@/helpers/sendSms";
// import { mobileSchema, otpSchema } from "@/validations/validation";

// type OtpCredential = {
//   code?: string;
// };

// declare global {
//   interface OTPCredential extends OtpCredential {}

//   interface CredentialRequestOptions {
//     otp?: {
//       transport: Array<"sms">;
//     };
//     signal?: AbortSignal;
//   }
// }

// const OTP_META_KEY = "otpMeta";
// const OTP_EXPIRE_KEY = "otpExpireTime";
// const OTP_TOTAL_TIME = 120;
// const OTP_LENGTH = 5;

// const normalizeOtpCode = (value: string) => {
//   const faDigits = "۰۱۲۳۴۵۶۷۸۹";
//   const arDigits = "٠١٢٣٤٥٦٧٨٩";

//   return value
//     .replace(/[۰-۹]/g, (d) => faDigits.indexOf(d).toString())
//     .replace(/[٠-٩]/g, (d) => arDigits.indexOf(d).toString())
//     .replace(/\D/g, "");
// };

// export default function LoginWithOtp() {
//   const [mobile, setMobile] = useState("");
//   const [otpSent, setOtpSent] = useState(false);
//   const [enteredOtp, setEnteredOtp] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [otpId, setOtpId] = useState<string | null>(null);
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [timer, setTimer] = useState(0);

//   const formRef = useRef<HTMLFormElement | null>(null);
//   const lastSubmittedOtpRef = useRef("");

//   const formatTime = (sec: number) => {
//     const m = Math.floor(sec / 60);
//     const s = sec % 60;
//     return `${m}:${s < 10 ? "0" : ""}${s}`;
//   };

//   const clearOtpStorage = () => {
//     localStorage.removeItem(OTP_EXPIRE_KEY);
//     localStorage.removeItem(OTP_META_KEY);
//   };

//   const currentStep = useMemo(() => (otpSent ? "otp" : "mobile"), [otpSent]);

//   useEffect(() => {
//     const savedMeta = localStorage.getItem(OTP_META_KEY);
//     if (savedMeta) {
//       try {
//         const parsed = JSON.parse(savedMeta);
//         setOtpId(parsed?.otpId ?? null);
//         if (parsed?.mobile) {
//           setMobile(parsed.mobile);
//           setOtpSent(true);
//         }
//       } catch {
//         localStorage.removeItem(OTP_META_KEY);
//       }
//     }

//     const tick = () => {
//       const savedExpireTime = localStorage.getItem(OTP_EXPIRE_KEY);

//       if (!savedExpireTime) {
//         setTimer(0);
//         return;
//       }

//       const expire = Number(savedExpireTime);
//       const diff = Math.floor((expire - Date.now()) / 1000);

//       if (diff > 0) {
//         setTimer(diff);
//         setOtpSent(true);
//       } else {
//         setTimer(0);
//         localStorage.removeItem(OTP_EXPIRE_KEY);
//       }
//     };

//     tick();
//     const interval = setInterval(tick, 1000);

//     return () => clearInterval(interval);
//   }, []);

//   useEffect(() => {
//     if (
//       !otpSent ||
//       typeof window === "undefined" ||
//       !("OTPCredential" in window)
//     ) {
//       return;
//     }

//     const controller = new AbortController();

//     const getOtpFromSms = async () => {
//       try {
//         const credential = (await navigator.credentials.get({
//           otp: { transport: ["sms"] },
//           signal: controller.signal,
//         })) as OTPCredential | null;

//         if (!credential?.code) return;

//         const otpCode = normalizeOtpCode(credential.code).slice(0, OTP_LENGTH);
//         if (!otpCode) return;

//         setEnteredOtp(otpCode);
//         toast.success("کد پیامک به‌صورت خودکار وارد شد");

//         if (otpCode.length === OTP_LENGTH) {
//           requestAnimationFrame(() => formRef.current?.requestSubmit());
//         }
//       } catch {
//         // در بسیاری از مرورگرها WebOTP پشتیبانی نمی‌شود یا کاربر پیامک را تایید نمی‌کند.
//       }
//     };

//     getOtpFromSms();

//     return () => controller.abort();
//   }, [otpSent]);

//   useEffect(() => {
//     if (!otpSent || enteredOtp.length !== OTP_LENGTH || isVerifying) {
//       return;
//     }

//     if (lastSubmittedOtpRef.current === enteredOtp) {
//       return;
//     }

//     lastSubmittedOtpRef.current = enteredOtp;
//     formRef.current?.requestSubmit();
//   }, [enteredOtp, isVerifying, otpSent]);

//   const sendOtp = async () => {
//     const savedExpireTime = localStorage.getItem(OTP_EXPIRE_KEY);
//     if (savedExpireTime) {
//       const expire = Number(savedExpireTime);
//       const diff = Math.floor((expire - Date.now()) / 1000);
//       if (diff > 0) {
//         setTimer(diff);
//         setOtpSent(true);
//         return;
//       }
//     }

//     setIsSubmitting(true);

//     try {
//       try {
//          await mobileSchema.validate(mobile, { abortEarly: false });
//       } catch (err) {
//         if (err instanceof yup.ValidationError) {
//           err.inner.forEach((e) => toast.error(e.message));
//         } else {
//           toast.error("خطای ناشناخته");
//         }
//         return;
//       }

//       await CheckPhoneAction(mobile);

//       const newOtpId = await sendOtpToUser(mobile);
//       const expireTime = Date.now() + OTP_TOTAL_TIME * 1000;

//       setOtpId(newOtpId);
//       setOtpSent(true);
//       setEnteredOtp("");
//       setTimer(OTP_TOTAL_TIME);

//       localStorage.setItem(OTP_EXPIRE_KEY, expireTime.toString());
//       localStorage.setItem(
//         OTP_META_KEY,
//         JSON.stringify({ otpId: newOtpId, mobile }),
//       );

//       toast.success("کد تایید ارسال شد");
//     } catch (err) {
//       console.log(err);
//       toast.error("ارسال کد با خطا مواجه شد");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleSendOtp = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     sendOtp();
//   };

//   const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
// if (isVerifying) return;
//     if (!otpId) {
//       toast.error("اطلاعات تایید ناقص است، دوباره درخواست کد دهید.");
//       return;
//     }

//     try {
//       await otpSchema.validate(enteredOtp);
//    } catch (err) {
//      if (err instanceof yup.ValidationError) {
//        toast.error(err.message);
//      } else {
//        toast.error("کد تایید معتبر نیست");
//      }
//       return;
//     }

//     try {
//       setIsVerifying(true);
//       const res = await fetch("/api/verifyOtp", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ otpId, enteredOtp, mobile }),
//       });

//       const data = await res.json();

//       if (!data.success) {
//         toast.error(data.message || "کد اشتباه است");
//         return;
//       }

//       toast.success("ورود با موفقیت انجام شد");

//       clearOtpStorage();
//       setTimer(0);

//       signIn("credentials", {
//         mobile,
//         callbackUrl: "/",
//       });
//     } catch (err) {
//       console.log(err);
//       toast.error("مشکلی در تایید کد پیش آمد");
//        lastSubmittedOtpRef.current = "";
//     } finally {
//       setIsVerifying(false);
//     }
//   };

//   return (
//     <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 sm:py-12">
//       <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
//         <div className="hidden flex-col justify-between bg-slate-900 p-8 text-white md:flex">
//           <div>
//             <div className="relative mb-6 h-12 w-12">
//               <Image
//                 src="/atari-seeklogo.svg"
//                 alt="لوگوی کرمان آتاری"
//                 fill
//                 priority
//                 className="object-contain"
//               />
//             </div>
//             <h1 className="text-2xl font-bold leading-9">ورود سریع و امن</h1>
//             <p className="mt-3 text-sm leading-7 text-slate-200">
//               برای ورود فقط شماره موبایل خود را وارد کنید. کد تایید برای شما
//               ارسال می‌شود و در موبایل‌های سازگار به‌صورت خودکار در فرم قرار
//               می‌گیرد.
//             </p>
//           </div>

//           <ul className="space-y-3 text-sm text-slate-200">
//             <li>• بدون نیاز به رمز عبور</li>
//             <li>• ورود امن با کد یکبار مصرف</li>
//             <li>• تجربه بهینه برای موبایل</li>
//           </ul>
//         </div>

//         <div className="p-6 sm:p-8">
//           <div className="mb-6 md:hidden">
//             <div className="relative mb-4 h-10 w-10">
//               <Image
//                 src="/atari-seeklogo.svg"
//                 alt="لوگوی کرمان آتاری"
//                 fill
//                 priority
//                 className="object-contain"
//               />
//             </div>
//             <h1 className="text-xl font-bold text-slate-900">
//               ورود به کرمان آتاری
//             </h1>
//           </div>

//           <div className="mb-8 flex items-center gap-2 rounded-xl bg-slate-100 p-2 text-xs">
//             <div
//               className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
//                 currentStep === "mobile"
//                   ? "bg-white text-slate-900 shadow"
//                   : "text-slate-500"
//               }`}
//             >
//               ۱) شماره موبایل
//             </div>
//             <div
//               className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
//                 currentStep === "otp"
//                   ? "bg-white text-slate-900 shadow"
//                   : "text-slate-500"
//               }`}
//             >
//               ۲) کد تایید
//             </div>
//           </div>

//           {!otpSent ? (
//             <form onSubmit={handleSendOtp} className="space-y-4">
//               <div>
//                 <label className="mb-2 block text-sm font-medium text-slate-700">
//                   شماره موبایل
//                 </label>
//                 <input
//                   type="tel"
//                   inputMode="numeric"
//                   dir="ltr"
//                   value={mobile}
//                   onChange={(e) => setMobile(e.target.value)}
//                   placeholder="09xxxxxxxxx"
//                   className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
//                 />
//               </div>

//               <p className="text-xs leading-6 text-slate-500">
//                 با ورود به کرمان آتاری، شرایط استفاده و قوانین حریم خصوصی را
//                 می‌پذیرید.
//               </p>

//               <button
//                 type="submit"
//                 disabled={isSubmitting || timer > 0}
//                 className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
//               >
//                 {isSubmitting ? "در حال ارسال..." : "دریافت کد تایید"}
//               </button>

//               {timer > 0 && (
//                 <p className="text-center text-sm text-slate-600">
//                   ارسال مجدد پس از <strong>{formatTime(timer)}</strong>
//                 </p>
//               )}
//             </form>
//           ) : (
//             <form
//               ref={formRef}
//               onSubmit={handleVerifyOtp}
//               className="space-y-4"
//             >
//               <div>
//                 <label className="mb-2 block text-sm font-medium text-slate-700">
//                   کد تایید پیامک‌ شده
//                 </label>
//                 <input
//                   name="otp"
//                   type="text"
//                   dir="ltr"
//                   inputMode="numeric"
//                   autoComplete="one-time-code"
//                   pattern="[0-9]{5}"
//                   maxLength={OTP_LENGTH}
//                   value={enteredOtp}
//                   onChange={(e) =>
//                     setEnteredOtp(
//                       normalizeOtpCode(e.target.value).slice(0, OTP_LENGTH),
//                     )
//                   }
//                   placeholder="-----"
//                   className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.45em] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
//                 />
//               </div>

//               <button
//                  disabled={isVerifying}
//                 type="submit"
//                 className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
//               >
//             {isVerifying ? "در حال بررسی..." : "تایید و ورود"}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => {
//                   setOtpSent(false);
//                   setEnteredOtp("");
//                    lastSubmittedOtpRef.current = "";
//                 }}
//                 className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
//               >
//                 تغییر شماره موبایل
//               </button>

//               {timer > 0 ? (
//                 <p className="text-center text-sm text-slate-600">
//                   امکان ارسال مجدد تا <strong>{formatTime(timer)}</strong>
//                 </p>
//               ) : (
//                 <button
//                   type="button"
//                   onClick={sendOtp}
//                   className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
//                 >
//                   ارسال مجدد کد
//                 </button>
//               )}
//             </form>
//           )}
//         </div>
//       </section>
//     </main>
//   );
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { toast } from "react-toastify";
import * as yup from "yup";
import { safeParseJSON } from "@/helpers/safeParseJSON";
import { CheckPhoneAction } from "@/helpers/CheckPhoneAction";
import { sendOtpToUser } from "@/helpers/sendSms";
import { mobileSchema, otpSchema } from "@/validations/validation";

type OtpCredential = {
  code?: string;
};

declare global {
  interface OTPCredential extends OtpCredential {}

  interface CredentialRequestOptions {
    otp?: {
      transport: Array<"sms">;
    };
    signal?: AbortSignal;
  }
}

const OTP_META_KEY = "otpMeta";
const OTP_EXPIRE_KEY = "otpExpireTime";
const OTP_TOTAL_TIME = 120;
const OTP_LENGTH = 5;

const normalizeOtpCode = (value: string) => {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arDigits = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (d) => faDigits.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => arDigits.indexOf(d).toString())
    .replace(/\D/g, "");
};

export default function LoginWithOtp() {
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(0);

  const formRef = useRef<HTMLFormElement | null>(null);
  const otpInputRef = useRef<HTMLInputElement | null>(null);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const clearOtpStorage = () => {
    localStorage.removeItem(OTP_EXPIRE_KEY);
    localStorage.removeItem(OTP_META_KEY);
  };

  const currentStep = useMemo(() => (otpSent ? "otp" : "mobile"), [otpSent]);

  useEffect(() => {
    const savedMeta = localStorage.getItem(OTP_META_KEY);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        setOtpId(parsed?.otpId ?? null);
        if (parsed?.mobile) {
          setMobile(parsed.mobile);
          setOtpSent(true);
        }
      } catch {
        localStorage.removeItem(OTP_META_KEY);
      }
    }

    const tick = () => {
      const savedExpireTime = localStorage.getItem(OTP_EXPIRE_KEY);

      if (!savedExpireTime) {
        setTimer(0);
        return;
      }

      const expire = Number(savedExpireTime);
      const diff = Math.floor((expire - Date.now()) / 1000);

      if (diff > 0) {
        setTimer(diff);
        setOtpSent(true);
      } else {
        setTimer(0);
        localStorage.removeItem(OTP_EXPIRE_KEY);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, []);

  // وقتی مرحله کد فعال شد، فیلد را فوکوس کن تا:
  // - در اندروید/کروم درخواست WebOTP بهتر کار کند
  // - در iOS/سافاری پیشنهاد «از پیام‌ها» بالای کیبورد ظاهر شود
  useEffect(() => {
    if (!otpSent) return;
    const t = setTimeout(() => otpInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [otpSent]);

  useEffect(() => {
    if (
      !otpSent ||
      typeof window === "undefined" ||
      !("OTPCredential" in window)
    ) {
      return;
    }

    const controller = new AbortController();

    const getOtpFromSms = async () => {
      try {
        const credential = (await navigator.credentials.get({
          otp: { transport: ["sms"] },
          signal: controller.signal,
        })) as OTPCredential | null;

        if (!credential?.code) return;

        const otpCode = normalizeOtpCode(credential.code).slice(0, OTP_LENGTH);
        if (!otpCode) return;

        setEnteredOtp(otpCode);
        toast.success("کد پیامک به‌صورت خودکار وارد شد");
      } catch {
        // در بسیاری از مرورگرها WebOTP پشتیبانی نمی‌شود یا کاربر پیامک را تایید نمی‌کند.
      }
    };

    getOtpFromSms();

    return () => controller.abort();
  }, [otpSent]);

  // تأیید کد فقط با زدن دکمه‌ی «تایید و ورود» انجام می‌شود.
  // ارسال خودکار فرم بعد از تکمیل طول کد حذف شده تا در صورت اشتباه
  // بودن کد، حلقه‌ی ارسال مجدد و نمایش چندتوییست «منقضی شده» پیش نیاید.

  const sendOtp = async () => {
    const savedExpireTime = localStorage.getItem(OTP_EXPIRE_KEY);
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

      const newOtpId = await sendOtpToUser(mobile);
      const expireTime = Date.now() + OTP_TOTAL_TIME * 1000;

      setOtpId(newOtpId);
      setOtpSent(true);
      setEnteredOtp("");
      setTimer(OTP_TOTAL_TIME);

      localStorage.setItem(OTP_EXPIRE_KEY, expireTime.toString());
      localStorage.setItem(
        OTP_META_KEY,
        JSON.stringify({ otpId: newOtpId, mobile }),
      );

      toast.success("کد تایید ارسال شد");
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

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isVerifying) return;
    if (!otpId) {
      toast.error("اطلاعات تایید ناقص است، دوباره درخواست کد دهید.");
      return;
    }

    try {
      await otpSchema.validate(enteredOtp);
   } catch (err) {
     if (err instanceof yup.ValidationError) {
       toast.error(err.message);
     } else {
       toast.error("کد تایید معتبر نیست");
     }
      return;
    }

    try {
      setIsVerifying(true);
      const res = await fetch("/api/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, enteredOtp, mobile }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "کد اشتباه است");
        setIsVerifying(false);
        return;
      }

      toast.success("ورود با موفقیت انجام شد");

      clearOtpStorage();
      setTimer(0);

      setOtpSent(false);
      setEnteredOtp("");
      setOtpId(null);

      // isVerifying را true نگه می‌داریم چون در حال redirect هستیم و
      // دکمه‌ی «تایید و ورود» باید غیرفعال بماند تا کلیک مضاعف پیش نیاید.
      await signIn("credentials", {
        mobile,
        callbackUrl: "/",
        redirect: false,
      }).then(() => {
        // ریدایرکت نهایی
        window.location.href = "/";
      });
    } catch (err) {
      console.log(err);
      toast.error("مشکلی در تایید کد پیش آمد");
      setIsVerifying(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 sm:py-12">
      <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-slate-900 p-8 text-white md:flex">
          <div>
            <div className="relative mb-6 h-12 w-12">
              <Image
                src="/atari-seeklogo.svg"
                alt="لوگوی کرمان آتاری"
                fill
                priority
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold leading-9">ورود سریع و امن</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              برای ورود فقط شماره موبایل خود را وارد کنید. کد تایید برای شما
              ارسال می‌شود و در موبایل‌های سازگار به‌صورت خودکار در فرم قرار
              می‌گیرد.
            </p>
          </div>

          <ul className="space-y-3 text-sm text-slate-200">
            <li>• بدون نیاز به رمز عبور</li>
            <li>• ورود امن با کد یکبار مصرف</li>
            <li>• تجربه بهینه برای موبایل</li>
          </ul>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 md:hidden">
            <div className="relative mb-4 h-10 w-10">
              <Image
                src="/atari-seeklogo.svg"
                alt="لوگوی کرمان آتاری"
                fill
                priority
                className="object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              ورود به کرمان آتاری
            </h1>
          </div>

          <div className="mb-8 flex items-center gap-2 rounded-xl bg-slate-100 p-2 text-xs">
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
                currentStep === "mobile"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-500"
              }`}
            >
              ۱) شماره موبایل
            </div>
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
                currentStep === "otp"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-500"
              }`}
            >
              ۲) کد تایید
            </div>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  شماره موبایل
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <p className="text-xs leading-6 text-slate-500">
                با ورود به کرمان آتاری، شرایط استفاده و قوانین حریم خصوصی را
                می‌پذیرید.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || timer > 0}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "در حال ارسال..." : "دریافت کد تایید"}
              </button>

              {timer > 0 && (
                <p className="text-center text-sm text-slate-600">
                  ارسال مجدد پس از <strong>{formatTime(timer)}</strong>
                </p>
              )}
            </form>
          ) : (
            <form
              ref={formRef}
              onSubmit={handleVerifyOtp}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  کد تایید پیامک‌ شده
                </label>
                <input
                  ref={otpInputRef}
                  name="otp"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{5}"
                  maxLength={OTP_LENGTH}
                  value={enteredOtp}
                  onChange={(e) =>
                    setEnteredOtp(
                      normalizeOtpCode(e.target.value).slice(0, OTP_LENGTH),
                    )
                  }
                  placeholder="-----"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.45em] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                 disabled={isVerifying}
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
            {isVerifying ? "در حال بررسی..." : "تایید و ورود"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setEnteredOtp("");
                }}
                className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                تغییر شماره موبایل
              </button>

              {timer > 0 ? (
                <p className="text-center text-sm text-slate-600">
                  امکان ارسال مجدد تا <strong>{formatTime(timer)}</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  ارسال مجدد کد
                </button>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
