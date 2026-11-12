"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/app/components/navigation/NavigationFeedback";
import { signIn } from "next-auth/react";
import { toast } from "react-toastify";
import * as yup from "yup";
import { sendOtpToUser } from "@/helpers/sendSms";
import {
  isValidReferralCode,
  normalizeReferralCode,
  restoredReferralCode,
  shouldClearReferralForMobileChange,
} from "@/lib/loyalty/referral.policy";
import { mobileSchema, otpSchema } from "@/validations/validation";
import { ButtonLoading } from "@/app/components/loading/LoadingSystem";

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

const clearOtpStorage = () => {
  localStorage.removeItem(OTP_EXPIRE_KEY);
  localStorage.removeItem(OTP_META_KEY);
};

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
  const [referralCode, setReferralCode] = useState("");
  const [referralBoundMobile, setReferralBoundMobile] = useState<string | null>(
    null,
  );
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(0);

  const [registration, setRegistration] = useState<{
    otpId: string;
    token: string;
    expiresInMs: number;
  } | null>(null);
  const [registrationExpired, setRegistrationExpired] = useState(false);
  const [registrationError, setRegistrationError] = useState("");

  const firstNameInputRef = useRef<HTMLInputElement | null>(null);
  const isRegisteringRef = useRef(false);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const isVerifyingRef = useRef(false);
  const verificationAbortRef = useRef<AbortController | null>(null);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentStep = registration ? "registration" : otpSent ? "otp" : "mobile";

  const resetOtp = useCallback(() => {
    clearOtpStorage();
    setOtpSent(false);
    setEnteredOtp("");
    setOtpId(null);
    setTimer(0);
  }, []);

  const finishSignIn = useCallback(async (data: {
    verificationToken?: string;
    referral?: { ok: boolean; error?: string };
  }) => {
    if (!data.verificationToken) {
      throw new Error("ورود تکمیل نشد؛ لطفاً کد جدید دریافت و دوباره تلاش کنید.");
    }

    const result = await signIn("credentials", {
      verificationToken: data.verificationToken,
      callbackUrl,
      redirect: false,
    });
    if (!result?.ok) {
      resetOtp();
      setRegistration(null);
      throw new Error("ورود انجام نشد؛ لطفاً کد جدید دریافت و دوباره تلاش کنید.");
    }

    toast.success("با موفقیت وارد حساب شدید.");
    if (data.referral?.ok) {
      toast.success("کد دعوت ثبت شد و پاداش آن پس از احراز شرایط اعمال می‌شود.");
    } else if (data.referral?.error) {
      toast.warning(data.referral.error);
    }

    clearOtpStorage();
    window.location.assign(callbackUrl);
  }, [callbackUrl, resetOtp]);

  useEffect(() => {
    if (!registration) return;
    firstNameInputRef.current?.focus();
    const timeout = setTimeout(
      () => setRegistrationExpired(true),
      registration.expiresInMs,
    );
    return () => clearTimeout(timeout);
  }, [registration]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") ?? params.get("referral") ?? params.get("referralCode");
    if (ref) {
      setReferralCode(restoredReferralCode({ urlCode: ref }));
    }
    const requestedCallbackUrl = params.get("callbackUrl");
    if (requestedCallbackUrl) {
      try {
        const parsedCallbackUrl = new URL(requestedCallbackUrl, window.location.origin);
        if (parsedCallbackUrl.origin === window.location.origin) {
          setCallbackUrl(
            `${parsedCallbackUrl.pathname}${parsedCallbackUrl.search}${parsedCallbackUrl.hash}`,
          );
        }
      } catch {
        // مقصد نامعتبر است؛ پس از ورود به صفحه اصلی برمی‌گردیم.
      }
    }


    const savedMeta = localStorage.getItem(OTP_META_KEY);
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta);
        setOtpId(parsed?.otpId ?? null);
        if (parsed?.mobile) {
          setMobile(parsed.mobile);
          setOtpSent(true);
          setReferralBoundMobile(parsed.mobile);
        }
        if (parsed?.referralCode) {
          setReferralCode(
            restoredReferralCode({
              urlCode: ref,
              savedOtpCode: parsed.referralCode,
            }),
          );
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

  // پس از منقضی شدن کد (OTP_TOTAL_TIME)، فرم به‌صورت خودکار به مرحله شماره موبایل بازگردانده می‌شود
  useEffect(() => {
    if (!otpSent || timer > 0 || isVerifying) return;
    resetOtp();
    toast.info("کد تأیید منقضی شد؛ برای ورود، کد جدید دریافت کنید.");
  }, [isVerifying, otpSent, resetOtp, timer]);

  useEffect(
    () => () => {
      verificationAbortRef.current?.abort();
    },
    [],
  );

  const verifyOtpCode = useCallback(async (rawCode: string) => {
    const code = normalizeOtpCode(rawCode).slice(0, OTP_LENGTH);
    setEnteredOtp(code);
    if (code.length !== OTP_LENGTH || isVerifyingRef.current) return;
    if (!otpId) {
      toast.error("اطلاعات تأیید کامل نیست؛ لطفاً کد جدید دریافت کنید.");
      return;
    }

    try {
      otpSchema.validateSync(code);
    } catch (err) {
      toast.error(
        err instanceof yup.ValidationError
          ? err.message
          : "کد تأیید معتبر نیست؛ کد پیامک‌شده را دوباره بررسی کنید.",
      );
      return;
    }

    isVerifyingRef.current = true;
    setIsVerifying(true);
    verificationAbortRef.current?.abort();
    const controller = new AbortController();
    verificationAbortRef.current = controller;

    try {
      const res = await fetch("/api/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, enteredOtp: code }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (data.code === "OTP_RESTART_REQUIRED") resetOtp();
        throw new Error(data.message || "کد واردشده درست نیست؛ دوباره بررسی کنید.");
      }
      if (data.requiresRegistration && data.registrationToken) {
        resetOtp();
        setRegistrationExpired(false);
        setRegistrationError("");
        setRegistration({
          otpId,
          token: data.registrationToken,
          expiresInMs: data.registrationExpiresInMs,
        });
        isVerifyingRef.current = false;
        setIsVerifying(false);
        return;
      }

      await finishSignIn(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(
        err instanceof Error
          ? err.message
          : "کد تأیید بررسی نشد؛ اتصال اینترنت را بررسی و دوباره تلاش کنید.",
      );
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  }, [finishSignIn, otpId, resetOtp]);

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
        void verifyOtpCode(otpCode);
      } catch {
        // در بسیاری از مرورگرها WebOTP پشتیبانی نمی‌شود یا کاربر پیامک را تایید نمی‌کند.
      }
    };

    getOtpFromSms();

    return () => controller.abort();
  }, [otpSent, verifyOtpCode]);

  // ورود دستی، paste، پیشنهاد iOS و WebOTP همگی از verifyOtpCode عبور می‌کنند.

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
          toast.error("شماره موبایل بررسی نشد؛ آن را دوباره وارد کنید.");
        }
        return;
      }

      const normalizedReferral = normalizeReferralCode(referralCode);
      if (
        normalizedReferral &&
        !isValidReferralCode(normalizedReferral)
      ) {
        toast.warning(
          "فرمت کد دعوت باید به شکل KA-XXXXXX باشد؛ ورود شما ادامه پیدا می‌کند.",
        );
      }

      const result = await sendOtpToUser(
        mobile,
        normalizedReferral || undefined,
      );

      if (!result.success) {
        if (result.code === "OTP_RATE_LIMITED" && result.retryAfter) {
          const remaining = Math.max(1, result.retryAfter);
          setTimer(remaining);
          const expireTime = Date.now() + remaining * 1000;
          localStorage.setItem(OTP_EXPIRE_KEY, expireTime.toString());
          toast.warning(result.error);
        } else {
          toast.error(result.error || "کد تأیید ارسال نشد؛ دوباره تلاش کنید.");
        }
        return;
      }

      const newOtpId = result.otpId;
      const expireTime = Date.now() + OTP_TOTAL_TIME * 1000;

      setOtpId(newOtpId);
      setOtpSent(true);
      setEnteredOtp("");
      setTimer(OTP_TOTAL_TIME);
      setReferralCode(normalizedReferral);
      setReferralBoundMobile(mobile);

      localStorage.setItem(OTP_EXPIRE_KEY, expireTime.toString());
      localStorage.setItem(
        OTP_META_KEY,
        JSON.stringify({
          otpId: newOtpId,
          mobile,
          referralCode: normalizedReferral || undefined,
        }),
      );

      toast.success("کد تأیید ارسال شد؛ پیامک خود را بررسی کنید.");
    } catch (err) {
      console.log(err);
      toast.error("کد تأیید ارسال نشد؛ اتصال اینترنت را بررسی و دوباره تلاش کنید.");
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
    await verifyOtpCode(enteredOtp);
  };

  const handleRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!registration || registrationExpired || isRegisteringRef.current) return;

    const fields = new FormData(event.currentTarget);
    isRegisteringRef.current = true;
    setIsSubmitting(true);
    setRegistrationError("");

    try {
      const response = await fetch("/api/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpId: registration.otpId,
          registrationToken: registration.token,
          firstName: fields.get("firstName"),
          lastName: fields.get("lastName"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (data.code === "REGISTRATION_EXPIRED") {
        setRegistrationExpired(true);
        return;
      }
      if (data.code === "OTP_RESTART_REQUIRED") {
        resetOtp();
        setRegistration(null);
        toast.error(data.message);
        return;
      }
      if (!response.ok || !data.success) {
        setRegistrationError(data.message || "ثبت‌نام انجام نشد؛ دوباره تلاش کنید.");
        return;
      }

      await finishSignIn(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ثبت‌نام انجام نشد؛ دوباره تلاش کنید.";
      setRegistrationError(message);
      toast.error(message);
    } finally {
      isRegisteringRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 sm:py-12">
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
              برای شروع شماره موبایل خود را وارد کنید. کد تایید برای شما
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
                  : "text-slate-600"
              }`}
            >
              ۱) شماره موبایل
            </div>
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-center font-semibold transition ${
                currentStep === "otp"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600"
              }`}
            >
              ۲) کد تایید
            </div>
            {registration && (
              <div
                aria-current="step"
                className="flex-1 rounded-lg bg-white px-3 py-2 text-center font-semibold text-slate-900 shadow"
              >
                ۳) مشخصات
              </div>
            )}
          </div>

          {registration ? (
            <form onSubmit={handleRegistration} className="space-y-4">
              <p className="text-sm leading-7 text-slate-600">
                شماره موبایل تأیید شد. برای ساخت حساب، نام و نام خانوادگی را وارد کنید.
              </p>
              <fieldset disabled={isSubmitting || registrationExpired} className="space-y-4">
                <div>
                  <label htmlFor="registration-first-name" className="mb-2 block text-sm font-medium text-slate-700">
                    نام
                  </label>
                  <input
                    ref={firstNameInputRef}
                    id="registration-first-name"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    dir="auto"
                    required
                    maxLength={80}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label htmlFor="registration-last-name" className="mb-2 block text-sm font-medium text-slate-700">
                    نام خانوادگی
                  </label>
                  <input
                    id="registration-last-name"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    dir="auto"
                    required
                    maxLength={80}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSubmitting ? <ButtonLoading label="در حال ثبت‌نام…" /> : "تکمیل ثبت‌نام و ورود"}
                </button>
              </fieldset>
              {registrationExpired ? (
                <p role="alert" className="text-sm text-red-700">
                  مهلت تکمیل ثبت‌نام به پایان رسید. لطفاً دوباره کد تأیید بگیرید.
                </p>
              ) : registrationError && (
                <p role="alert" className="text-sm text-red-700">{registrationError}</p>
              )}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setRegistration(null)}
                className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                بازگشت به شماره موبایل
              </button>
            </form>
          ) : !otpSent ? (
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
                  onChange={(e) => {
                    const nextMobile = e.target.value;
                    if (
                      shouldClearReferralForMobileChange(
                        referralBoundMobile,
                        nextMobile,
                      )
                    ) {
                      setReferralCode("");
                      setReferralBoundMobile(null);
                      clearOtpStorage();
                    }
                    setMobile(nextMobile);
                  }}
                  placeholder="09xxxxxxxxx"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
                <label className="mb-2 mt-4 block text-sm font-medium text-slate-700">
                  کد دعوت (اختیاری)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={referralCode}
                  onChange={(e) =>
                    setReferralCode(e.target.value.trimStart().toUpperCase())
                  }
                  placeholder="KA-XXXXXX"
                  maxLength={9}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <p className="text-xs leading-6 text-slate-500">
                با ورود به کرمان آتاری، {" "}
                <Link
                  href="/terms"
                  className="font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  شرایط استفاده
                </Link>{" "}
                و {" "}
                <Link
                  href="/terms#privacy"
                  className="font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  قوانین حریم خصوصی
                </Link>{" "}
                را می‌پذیرید.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || timer > 0}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <ButtonLoading label="در حال ارسال کد…" /> : "دریافت کد تایید"}
              </button>

              {timer > 0 && (
                <p className="text-center text-sm text-slate-600">
                  ارسال مجدد پس از <strong>{formatTime(timer)}</strong>
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                  onChange={(e) => {
                    const code = normalizeOtpCode(e.target.value).slice(0, OTP_LENGTH);
                    setEnteredOtp(code);
                    if (code.length === OTP_LENGTH) void verifyOtpCode(code);
                  }}
                  placeholder="-----"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.45em] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                disabled={isVerifying}
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {isVerifying ? <ButtonLoading label="در حال بررسی…" /> : "تایید و ورود"}
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
    </div>
  );
}
