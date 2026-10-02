import dbConnect from "@/lib/mongodb";
import { onUserSignup } from "@/lib/loyalty/purchase.hooks";
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
  let user = await User.findOne({ mobile });
  let isNewUser = false;

  if (!user) {
    try {
      user = await User.create({
        mobile,
        phoneVerifiedAt: now,
        registrationCompletedAt: now,
        pendingReferralCode: pendingReferralCode || undefined,
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

  let referral: { ok: boolean; error?: string } | undefined;
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

    const signupResult = await onUserSignup(
      user._id.toString(),
      pendingReferralCode,
      operationId,
    );
    referral = signupResult.referral;
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
    if (
      pendingReferralCode &&
      user.pendingReferralCode === pendingReferralCode
    ) {
      const signupResult = await onUserSignup(
        user._id.toString(),
        pendingReferralCode,
        operationId,
      );
      referral = signupResult.referral;
    } else if (pendingReferralCode) {
      referral = {
        ok: false,
        error: "کد دعوت فقط هنگام تکمیل ثبت‌نام کاربر جدید قابل استفاده است",
      };
    }
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
