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

export async function POST(req: Request) {
  await dbConnect();
  const { otpId, enteredOtp } = await req.json();

  if (!otpId || !enteredOtp) {
    return new Response(
      JSON.stringify({ success: false, message: "اطلاعات تایید ناقص است" }),
      { status: 400 },
    );
  }
  const loginToken = randomBytes(32).toString("base64url");
  const now = new Date();
  let otpDoc;
  try {
    otpDoc = await Otp.findOneAndUpdate(
      { _id: otpId, otp: enteredOtp, verifiedAt: { $exists: false } },
      {
        $unset: { otp: 1 },
        $set: {
          verifiedAt: now,
          loginTokenHash: createHash("sha256").update(loginToken).digest("hex"),
          loginTokenExpiresAt: new Date(now.getTime() + 2 * 60_000),
          createdAt: now,
        },
      },
      { returnDocument: "after" },
    );
  } catch {
    otpDoc = null;
  }

  if (!otpDoc) {
    return new Response(
      JSON.stringify({ success: false, message: "OTP منقضی شده یا یافت نشد" }),
      { status: 400 },
    );
  }

  const operationId = randomUUID();
  const mobile = otpDoc.mobile;
  const pendingReferralCode = otpDoc.referralCode?.trim().toUpperCase();
  const otpSignupIntentId = otpDoc.signupIntentId;
  let user = await User.findOne({ mobile });
  let isNewUser = false;

  if (!user) {
    try {
      user = await User.create({
        mobile,
        phoneVerifiedAt: now,
        registrationCompletedAt: now,
        pendingReferralCode: pendingReferralCode || undefined,
        signupIntentId: otpSignupIntentId || undefined,
      });
      isNewUser = true;
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      user = await User.findOne({ mobile });
    }
  }

  if (!user) {
    console.error(`[auth] signup recovery failed operationId=${operationId}`);
    return new Response(
      JSON.stringify({ success: false, message: "تکمیل ثبت‌نام با خطا مواجه شد" }),
      { status: 500 },
    );
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
          phoneVerifiedAt: user.phoneVerifiedAt ?? now,
          registrationCompletedAt: user.registrationCompletedAt ?? now,
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
  } else if (pendingReferralCode) {
    referral = {
      ok: false,
      error: "کد دعوت فقط هنگام تکمیل ثبت‌نام کاربر جدید قابل استفاده است",
      retryable: false,
    };
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "OTP صحیح است",
      verificationToken: loginToken,
      referral,
    }),
    { status: 200 },
  );
}
