import dbConnect from "@/lib/mongodb";
import { onUserSignup } from "@/lib/loyalty/purchase.hooks";
import {
  ownsSignupIntent,
  signupBenefitsCompleted,
} from "@/lib/loyalty/referral.policy";
import { notifyAdmins } from "@/lib/notifications/service";
import Otp from "@/model/Otp";
import User from "@/model/User";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const TOKEN_TTL_MS = 2 * 60_000;
const loginRetryMessage = "ورود تکمیل نشد؛ لطفاً کد جدید دریافت و دوباره تلاش کنید.";
const registrationExpiredMessage = "مهلت تکمیل ثبت‌نام به پایان رسید؛ لطفاً کد جدید دریافت کنید.";

function authError(message: string, status: number, code?: string) {
  return Response.json({ success: false, message, code }, { status });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;

  const name = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  return name.length <= 80 &&
    /^\p{L}[\p{L}\p{M}]*(?:[ '’\u200C\u200D-]\p{L}[\p{L}\p{M}]*)*$/u.test(name)
    ? name
    : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return authError("اطلاعات تایید ناقص است", 400);
  }

  if ("registrationToken" in body) {
    return completeRegistration(body);
  }

  const { otpId, enteredOtp } = body;

  const normalizedOtp = String(enteredOtp ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");

  if (typeof otpId !== "string" || !/^[a-f0-9]{24}$/i.test(otpId) ||
      !/^\d{5}$/.test(normalizedOtp)) {
    return authError("اطلاعات تایید ناقص است", 400);
  }

  await dbConnect();
  const registrationToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const registrationExpiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  let otpDoc;
  try {
    otpDoc = await Otp.findOneAndUpdate(
      {
        _id: otpId,
        otp: normalizedOtp,
        verifiedAt: { $exists: false },
        createdAt: { $gt: new Date(now.getTime() - TOKEN_TTL_MS) },
      },
      {
        $unset: { otp: 1 },
        $set: {
          verifiedAt: now,
          createdAt: now,
          registrationTokenHash: hashToken(registrationToken),
          registrationTokenExpiresAt: registrationExpiresAt,
        },
      },
      { returnDocument: "after", strict: "throw" },
    );
  } catch (error) {
    console.error("[auth] Could not verify OTP", error instanceof Error ? error.name : "UnknownError");
    return authError("بررسی کد تأیید موقتاً ممکن نیست. دوباره تلاش کنید.", 503);
  }

  if (!otpDoc) {
    return authError("OTP منقضی شده یا یافت نشد", 400);
  }

  const user = await User.findOne({ mobile: otpDoc.mobile });
  if (user && (!user.storeOrderPendingSignup || (normalizeName(user.firstName) && normalizeName(user.lastName)))) {
    const loginToken = randomBytes(32).toString("base64url");
    return finishLogin(otpDoc, user, loginToken, false);
  }

  return Response.json({
    success: true,
    requiresRegistration: true,
    registrationToken,
    registrationExpiresInMs: Math.max(0, registrationExpiresAt.getTime() - Date.now()),
  });
}

async function completeRegistration(body: {
  otpId?: unknown;
  registrationToken?: unknown;
  firstName?: unknown;
  lastName?: unknown;
}) {
  const { otpId, registrationToken } = body;
  if (typeof otpId !== "string" || !/^[a-f0-9]{24}$/i.test(otpId) ||
      typeof registrationToken !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(registrationToken)) {
    return authError(registrationExpiredMessage, 401, "REGISTRATION_EXPIRED");
  }

  const firstName = normalizeName(body.firstName);
  const lastName = normalizeName(body.lastName);
  if (!firstName || !lastName) {
    return authError("نام و نام خانوادگی را با حروف و حداکثر ۸۰ نویسه برای هر فیلد وارد کنید.", 400);
  }

  await dbConnect();
  const now = new Date();
  const ticket = await Otp.findOne({
    _id: otpId,
    verifiedAt: { $type: "date", $lte: now },
    registrationTokenHash: hashToken(registrationToken),
    registrationTokenExpiresAt: { $gt: now },
  });

  if (!ticket) {
    return authError(registrationExpiredMessage, 401, "REGISTRATION_EXPIRED");
  }

  const { mobile, referralCode, signupIntentId } = ticket;
  let user = await User.findOne({ mobile });
  let isNewUser = false;
  if (!user) {
    try {
      user = await User.create({
        mobile,
        firstName,
        lastName,
        username: `${firstName} ${lastName}`,
        phoneVerifiedAt: ticket.verifiedAt,
        registrationCompletedAt: now,
        pendingReferralCode: referralCode?.trim().toUpperCase() || undefined,
        signupIntentId: signupIntentId || undefined,
      });
      isNewUser = true;
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      user = await User.findOne({ mobile });
    }
  }

  if (!user) return authError(loginRetryMessage, 500);
  return finishLogin(ticket, user, registrationToken, isNewUser, { firstName, lastName });
}

async function finishLogin(
  otpDoc: NonNullable<Awaited<ReturnType<typeof Otp.findOne>>>,
  user: NonNullable<Awaited<ReturnType<typeof User.findOne>>>,
  token: string,
  isNewUser: boolean,
  profile?: { firstName: string; lastName: string },
) {
  const operationId = randomUUID();
  const mobile = otpDoc.mobile;
  const pendingReferralCode = otpDoc.referralCode?.trim().toUpperCase();
  const otpSignupIntentId = otpDoc.signupIntentId;
  if (user.storeOrderPendingSignup === true) {
    const claimed = await User.findOneAndUpdate(
      { _id: user._id, storeOrderPendingSignup: true },
      {
        $set: {
          phoneVerifiedAt: otpDoc.verifiedAt,
          registrationCompletedAt: new Date(),
          ...(profile ? { ...profile, username: `${profile.firstName} ${profile.lastName}` } : {}),
          ...(pendingReferralCode ? { pendingReferralCode } : {}),
          ...(otpSignupIntentId ? { signupIntentId: otpSignupIntentId } : {}),
        },
        $unset: { storeOrderPendingSignup: 1 },
      },
      { returnDocument: "after" },
    );
    const current = claimed ?? await User.findOne({ mobile });
    if (!current) return authError(loginRetryMessage, 500);
    user = current;
    isNewUser = Boolean(claimed);
  }

  let referral:
    | { ok: boolean; error?: string; retryable?: boolean }
    | undefined;
  if (isNewUser) {
    await notifyAdmins({
      title: "کاربر جدید",
      message: `کاربر جدید با شماره ${mobile} ثبت‌نام کرد.`,
      type: "USER_REGISTERED",
      category: "account",
      entityType: "User",
      entityId: user._id,
      link: "/dashboard/users",
      eventKey: `USER_REGISTERED:${user._id}`,
    }).catch((error) =>
      console.error(
        `[notifications] signup failed operationId=${operationId}`,
        error,
      ),
    );
  } else {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          phoneVerifiedAt: user.phoneVerifiedAt ?? otpDoc.verifiedAt,
          registrationCompletedAt: user.registrationCompletedAt ?? otpDoc.verifiedAt,
        },
      },
    );
  }

  const canApplySignupBenefits = ownsSignupIntent({
    isNewUser,
    otpIntentId: otpSignupIntentId,
    userIntentId: user.signupIntentId,
    alreadyCompleted: Boolean(user.loyaltySignupCompletedAt),
  });

  if (canApplySignupBenefits) {
    const effectiveReferralCode =
      user.pendingReferralCode || pendingReferralCode;
    const signupResult = await onUserSignup(
      user._id.toString(),
      effectiveReferralCode,
      operationId,
    );
    referral = signupResult.referral;

    if (
      signupBenefitsCompleted({
        codeOk: signupResult.code.ok,
        xpOk: signupResult.xp.ok,
        hasReferralCode: Boolean(effectiveReferralCode),
        referralRetryable: signupResult.referral?.retryable,
      })
    ) {
      await User.updateOne(
        {
          _id: user._id,
          ...(otpSignupIntentId ? { signupIntentId: otpSignupIntentId } : {}),
        },
        {
          $set: { loyaltySignupCompletedAt: new Date() },
          $unset: { signupIntentId: 1 },
        },
      );
    }
  } else if (pendingReferralCode && !otpDoc.loginTokenHash) {
    referral = {
      ok: false,
      error: "کد دعوت فقط هنگام تکمیل ثبت‌نام کاربر جدید قابل استفاده است",
      retryable: false,
    };
  }

  // NextAuth can consume the token only after the login hash has been set.
  const issuedAt = new Date();
  const result = await Otp.updateOne(
    { _id: otpDoc._id },
    {
      $set: {
        loginTokenHash: hashToken(token),
        loginTokenExpiresAt: new Date(issuedAt.getTime() + TOKEN_TTL_MS),
        createdAt: issuedAt,
      },
    },
  );
  if (result.matchedCount !== 1) {
    return authError(loginRetryMessage, 409, "OTP_RESTART_REQUIRED");
  }

  return Response.json({
    success: true,
    verificationToken: token,
    referral,
  });
}
