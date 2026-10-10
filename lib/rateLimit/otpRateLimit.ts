import { headers } from "next/headers";
import OtpRateLimit from "@/model/OtpRateLimit";
import {
  OTP_LIMITS,
  OtpRateLimitError,
  normalizeMobileForRateLimit,
  computeMobileRateLimitDecision,
} from "./policy";

export {
  OTP_LIMITS,
  OtpRateLimitError,
  normalizeMobileForRateLimit,
  computeMobileRateLimitDecision,
};

export function getClientIp(): string {
  try {
    const h = headers();
    const forwardedFor = h.get("x-forwarded-for");
    if (forwardedFor) {
      const parts = forwardedFor.split(",").map((p) => p.trim());
      if (parts[0]) return parts[0];
    }
    const realIp = h.get("x-real-ip");
    if (realIp && realIp.trim()) return realIp.trim();
    const cfIp = h.get("cf-connecting-ip");
    if (cfIp && cfIp.trim()) return cfIp.trim();
  } catch {
    // headers() might throw outside of request context (e.g. testing)
  }
  return "unknown";
}

export type ReservationSlot = {
  mobileKey: string;
  ipKey: string;
  reservationId: string;
};

/**
 * Atomically checks rate limits and acquires a temporary reservation lock
 * for both mobile and client IP.
 */
export async function reserveOtpSlot(
  rawMobile: string,
  clientIpOverride?: string,
): Promise<ReservationSlot> {
  const mobile = normalizeMobileForRateLimit(rawMobile);
  const clientIp = clientIpOverride ?? getClientIp();

  const mobileKey = `mobile:${mobile}`;
  const ipKey = `ip:${clientIp}`;
  const now = new Date();
  const lockExpires = new Date(
    now.getTime() + OTP_LIMITS.LOCK_TIMEOUT_SECONDS * 1000,
  );
  const mobileDocExpires = new Date(
    now.getTime() + OTP_LIMITS.MOBILE_WINDOW_SECONDS * 1000 + 3600 * 1000,
  );
  const ipDocExpires = new Date(
    now.getTime() + OTP_LIMITS.IP_WINDOW_SECONDS * 1000 + 3600 * 1000,
  );

  // 1. Check & Reserve IP limit (if IP is known)
  if (clientIp !== "unknown") {
    const ipDoc = await OtpRateLimit.findOne({ key: ipKey });
    if (ipDoc) {
      const ipWindowEnd = new Date(
        ipDoc.windowStart.getTime() + OTP_LIMITS.IP_WINDOW_SECONDS * 1000,
      );
      if (now > ipWindowEnd) {
        await OtpRateLimit.updateOne(
          { key: ipKey },
          {
            $set: {
              windowStart: now,
              count: 0,
              expiresAt: ipDocExpires,
            },
          },
        );
        ipDoc.count = 0;
        ipDoc.windowStart = now;
      }

      if (ipDoc.count >= OTP_LIMITS.IP_MAX_IN_WINDOW) {
        const retryAfter = Math.max(
          1,
          Math.ceil((ipWindowEnd.getTime() - now.getTime()) / 1000),
        );
        throw new OtpRateLimitError(
          `تعداد درخواست‌های مجاز از این اینترنت/IP تکمیل شده است. لطفاً ${retryAfter} ثانیه دیگر دوباره تلاش کنید.`,
          retryAfter,
          "IP_LIMIT",
        );
      }
    }
  }

  // 2. Check current mobile state first for accurate message & retryAfter
  const currentMobileDoc = await OtpRateLimit.findOne({ key: mobileKey });
  if (currentMobileDoc) {
    const decision = computeMobileRateLimitDecision({
      now,
      lastSentAt: currentMobileDoc.lastSentAt,
      windowStart: currentMobileDoc.windowStart,
      count: currentMobileDoc.count,
      lockedUntil: currentMobileDoc.lockedUntil,
    });

    if (!decision.allowed) {
      if (decision.reason === "CONCURRENT_REQUEST") {
        throw new OtpRateLimitError(
          `یک درخواست ارسال پیامک در حال پردازش است. لطفاً ${decision.retryAfter} ثانیه دیگر دوباره تلاش کنید.`,
          decision.retryAfter!,
          "CONCURRENT_REQUEST",
        );
      }
      if (decision.reason === "COOLDOWN") {
        throw new OtpRateLimitError(
          `برای ارسال مجدد کد، ${decision.retryAfter} ثانیه دیگر صبر کنید.`,
          decision.retryAfter!,
          "COOLDOWN",
        );
      }
      if (decision.reason === "WINDOW_LIMIT") {
        throw new OtpRateLimitError(
          `سقف مجاز دریافت پیامک برای این شماره در این بازه تکمیل شده است. لطفاً ${decision.retryAfter} ثانیه دیگر صبر کنید.`,
          decision.retryAfter!,
          "WINDOW_LIMIT",
        );
      }
    }
  }

  // Atomically acquire lock using conditional update / upsert
  const acquired = await OtpRateLimit.findOneAndUpdate(
    {
      key: mobileKey,
      $or: [
        { lockedUntil: { $exists: false } },
        { lockedUntil: null },
        { lockedUntil: { $lte: now } },
      ],
    },
    {
      $setOnInsert: {
        key: mobileKey,
        type: "mobile",
        windowStart: now,
        count: 0,
      },
      $set: {
        lockedUntil: lockExpires,
        expiresAt: mobileDocExpires,
      },
    },
    {
      upsert: true,
      new: true,
    },
  );

  if (!acquired) {
    throw new OtpRateLimitError(
      "یک درخواست دیگر به طور همزمان در حال پردازش است. لطفاً چند لحظه دیگر دوباره تلاش کنید.",
      5,
      "CONCURRENT_REQUEST",
    );
  }

  // Re-verify decisions on acquired document
  const postDecision = computeMobileRateLimitDecision({
    now,
    lastSentAt: acquired.lastSentAt,
    windowStart: acquired.windowStart,
    count: acquired.count,
    // we just locked it, so skip lockedUntil check
  });

  if (!postDecision.allowed) {
    await OtpRateLimit.updateOne(
      { key: mobileKey },
      { $unset: { lockedUntil: 1 } },
    );
    if (postDecision.reason === "COOLDOWN") {
      throw new OtpRateLimitError(
        `برای ارسال مجدد کد، ${postDecision.retryAfter} ثانیه دیگر صبر کنید.`,
        postDecision.retryAfter!,
        "COOLDOWN",
      );
    }
    if (postDecision.reason === "WINDOW_LIMIT") {
      throw new OtpRateLimitError(
        `سقف مجاز دریافت پیامک برای این شماره در این بازه تکمیل شده است. لطفاً ${postDecision.retryAfter} ثانیه دیگر صبر کنید.`,
        postDecision.retryAfter!,
        "WINDOW_LIMIT",
      );
    }
  }

  return {
    mobileKey,
    ipKey,
    reservationId: lockExpires.toISOString(),
  };
}

/**
 * Commits the slot on successful SMS send:
 * updates lastSentAt, increments count, and unsets lockedUntil.
 */
export async function commitOtpSlot(slot: ReservationSlot): Promise<void> {
  const now = new Date();
  const mobileDoc = await OtpRateLimit.findOne({ key: slot.mobileKey });
  if (mobileDoc) {
    const windowElapsedMs = now.getTime() - mobileDoc.windowStart.getTime();
    const isNewWindow =
      windowElapsedMs >= OTP_LIMITS.MOBILE_WINDOW_SECONDS * 1000;

    await OtpRateLimit.updateOne(
      { key: slot.mobileKey },
      {
        $set: {
          lastSentAt: now,
          windowStart: isNewWindow ? now : mobileDoc.windowStart,
          count: isNewWindow ? 1 : mobileDoc.count + 1,
          expiresAt: new Date(
            now.getTime() +
              OTP_LIMITS.MOBILE_WINDOW_SECONDS * 1000 +
              3600 * 1000,
          ),
        },
        $unset: { lockedUntil: 1 },
      },
    );
  }

  // Update IP record if valid
  if (!slot.ipKey.endsWith(":unknown")) {
    const ipDocExpires = new Date(
      now.getTime() + OTP_LIMITS.IP_WINDOW_SECONDS * 1000 + 3600 * 1000,
    );
    const ipDoc = await OtpRateLimit.findOne({ key: slot.ipKey });
    if (!ipDoc) {
      await OtpRateLimit.create({
        key: slot.ipKey,
        type: "ip",
        windowStart: now,
        count: 1,
        expiresAt: ipDocExpires,
      });
    } else {
      const ipWindowElapsed = now.getTime() - ipDoc.windowStart.getTime();
      const isNewIpWindow =
        ipWindowElapsed >= OTP_LIMITS.IP_WINDOW_SECONDS * 1000;
      await OtpRateLimit.updateOne(
        { key: slot.ipKey },
        {
          $set: {
            windowStart: isNewIpWindow ? now : ipDoc.windowStart,
            count: isNewIpWindow ? 1 : ipDoc.count + 1,
            expiresAt: ipDocExpires,
          },
        },
      );
    }
  }
}

/**
 * Rolls back the reservation lock if SMS send fails.
 * Does NOT increase count and does NOT update lastSentAt,
 * preventing legitimate users from getting locked out due to network/SMS provider errors.
 */
export async function rollbackOtpSlot(slot: ReservationSlot): Promise<void> {
  await OtpRateLimit.updateOne(
    { key: slot.mobileKey },
    { $unset: { lockedUntil: 1 } },
  );
}
