export const OTP_LIMITS = {
  MOBILE_COOLDOWN_SECONDS: 120, // 2 minutes between successful sends
  MOBILE_WINDOW_SECONDS: 30 * 60, // 30 minutes
  MOBILE_MAX_IN_WINDOW: 5, // max 5 OTPs per 30 minutes
  IP_WINDOW_SECONDS: 10 * 60, // 10 minutes
  IP_MAX_IN_WINDOW: 10, // max 10 OTPs per 10 minutes
  LOCK_TIMEOUT_SECONDS: 15, // temporary reservation lock
} as const;

export class OtpRateLimitError extends Error {
  code = "OTP_RATE_LIMITED" as const;
  retryAfter: number;
  reason: "COOLDOWN" | "WINDOW_LIMIT" | "IP_LIMIT" | "CONCURRENT_REQUEST";

  constructor(
    message: string,
    retryAfter: number,
    reason: "COOLDOWN" | "WINDOW_LIMIT" | "IP_LIMIT" | "CONCURRENT_REQUEST",
  ) {
    super(message);
    this.name = "OtpRateLimitError";
    this.retryAfter = retryAfter;
    this.reason = reason;
  }
}

export function normalizeMobileForRateLimit(mobile: string): string {
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arDigits = "٠١٢٣٤٥٦٧٨٩";
  let cleaned = mobile
    .replace(/[۰-۹]/g, (d) => faDigits.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => arDigits.indexOf(d).toString())
    .replace(/\D/g, "");

  if (cleaned.startsWith("98") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  } else if (!cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

export function computeMobileRateLimitDecision(input: {
  now: Date;
  lastSentAt?: Date;
  windowStart: Date;
  count: number;
  lockedUntil?: Date;
}): { allowed: boolean; retryAfter?: number; reason?: "COOLDOWN" | "WINDOW_LIMIT" | "CONCURRENT_REQUEST" } {
  const { now, lastSentAt, windowStart, count, lockedUntil } = input;
  const mobileWindowMs = OTP_LIMITS.MOBILE_WINDOW_SECONDS * 1000;
  const cooldownMs = OTP_LIMITS.MOBILE_COOLDOWN_SECONDS * 1000;

  if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
    const waitSeconds = Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
    return { allowed: false, retryAfter: waitSeconds, reason: "CONCURRENT_REQUEST" };
  }

  if (lastSentAt) {
    const elapsedMs = now.getTime() - lastSentAt.getTime();
    if (elapsedMs < cooldownMs) {
      const retryAfter = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000));
      return { allowed: false, retryAfter, reason: "COOLDOWN" };
    }
  }

  const windowElapsedMs = now.getTime() - windowStart.getTime();
  if (windowElapsedMs < mobileWindowMs && count >= OTP_LIMITS.MOBILE_MAX_IN_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((mobileWindowMs - windowElapsedMs) / 1000));
    return { allowed: false, retryAfter, reason: "WINDOW_LIMIT" };
  }

  return { allowed: true };
}
