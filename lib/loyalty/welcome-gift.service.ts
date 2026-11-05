import { credit } from "@/lib/loyalty/wallet.service";
import { deliverBusinessSms } from "@/lib/sms/business";
import WalletTransaction from "@/model/Loyalty Club/WalletTransaction";
import { welcomeGiftOffer } from "./welcome-gift.policy";

/**
 * Called only after a successful OTP verification. An explicit launch timestamp
 * prevents retroactive gifts. One stable wallet idempotency key per user prevents
 * duplicate gifts even across concurrent sign-ins or retries.
 */
export async function grantWelcomeGiftForVerifiedSignup(input: {
  userId: string;
  mobile: string;
  registeredAt: Date;
}) {
  const offer = welcomeGiftOffer({
    enabled: process.env.WELCOME_WALLET_GIFT_ENABLED === "true",
    amount: Number(process.env.WELCOME_WALLET_GIFT_AMOUNT_TOMAN ?? "50000"),
    startAt: process.env.WELCOME_WALLET_GIFT_START_AT,
    endAt: process.env.WELCOME_WALLET_GIFT_END_AT,
    registeredAt: input.registeredAt,
    now: new Date(),
  });
  if (!offer) return { granted: false, reason: "not_eligible" as const };

  const key = `welcome-wallet-72h:${input.userId}`;
  const result = await credit({
    userId: input.userId,
    amount: offer.amount,
    type: "gift",
    idempotencyKey: key,
    expiresAt: offer.expiresAt,
    description: "هدیه خوش‌آمدگویی ثبت‌نام؛ ۷۲ ساعت",
    notify: {
      title: "هدیه ثبت‌نام کرمان آتاری",
      message: `${offer.amount.toLocaleString("fa-IR")} تومان اعتبار هدیه به کیف پول شما اضافه شد؛ این اعتبار تا ${offer.expiresAt.toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })} معتبر است.`,
    },
  });
  if (!result.ok) throw new Error(result.error || "welcome gift credit failed");

  // A retry after an amount change must never send an SMS with the wrong amount.
  const tx = result.transaction ??
    (await WalletTransaction.findOne({ idempotencyKey: key })
      .select("amount expiresAt status").lean());
  const amount = Number(tx?.amount ?? offer.amount);
  const expiresAt = tx?.expiresAt ? new Date(tx.expiresAt) : offer.expiresAt;
  if (expiresAt > new Date()) {
    const bodyId = Number(process.env.WELCOME_WALLET_SMS_BODY_ID);
    if (Number.isSafeInteger(bodyId) && bodyId > 0) {
      // Template: "کرمان آتاری: {0} تومان اعتبار هدیه ... تا ۷۲ ساعت ... kermanatari.ir"
      // business SMS outbox guards duplicate provider sends.
      const sms = await deliverBusinessSms({
        eventKey: key,
        eventType: "WELCOME_WALLET_GIFT",
        entityType: "User",
        entityId: input.userId,
        bodyId,
        to: input.mobile,
        args: [amount.toLocaleString("fa-IR")],
      });
      if (sms.state !== "sent") {
        console.error("[welcome-wallet] SMS delivery not confirmed", sms.errorCode);
      }
    } else {
      console.warn("[welcome-wallet] WELCOME_WALLET_SMS_BODY_ID is missing; in-app notification only");
    }
  }
  return { granted: !result.duplicate, amount, expiresAt };
}
