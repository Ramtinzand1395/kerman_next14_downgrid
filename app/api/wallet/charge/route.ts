// app/api/wallet/charge/route.ts
// POST: درخواست شارژ کیف پول — ساخت رکورد pending و اتصال به درگاه زرین‌پال.
// تأیید و واریز نهایی در app/api/payment-zarinpal/verify انجام می‌شود (فاز ۷).
import { getSiteUrl } from "@/lib/baseUrl";
import TempPayment from "@/model/TempPayment";
import WalletTransaction from "@/model/Loyalty Club/WalletTransaction";
import { getOrCreateWallet } from "@/lib/loyalty/wallet.service";
import { fail, ok, parseBody, requireUser, withRateLimit } from "@/lib/loyalty/api";
import { chargeWalletSchema } from "@/validations/loyalty.validation";
import crypto from "crypto";

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  // محدودیت نرخ: ۵ درخواست شارژ در ۱۰ دقیقه
  const limited = withRateLimit(`wallet-charge:${auth.userId}`, { limit: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;

  const { data, error } = await parseBody(req, chargeWalletSchema);
  if (error) return error;

  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) return fail("درگاه پرداخت پیکربندی نشده است", 500);

  const wallet = await getOrCreateWallet(auth.userId);
  const idempotencyKey = `charge:${crypto.randomUUID()}`;

  // تراکنش pending — در verify به completed تبدیل می‌شود
  const tx = await WalletTransaction.create({
    wallet: wallet._id,
    user: auth.userId,
    type: "charge",
    status: "pending",
    amount: data!.amount,
    idempotencyKey,
    description: "شارژ کیف پول",
    gateway: { provider: "zarinpal" },
  });

  // رکورد پرداخت موقت برای درگاه — با همان ساختار فلو اصلی فروشگاه
  const temp = await TempPayment.create({
    userId: auth.userId,
    gatewayAmount: data!.amount,
    totalPrice: data!.amount,
    finalPrice: data!.amount,
    purpose: "wallet_charge",
    walletTransaction: tx._id,
    status: "initiated",
  });

  const callbackUrl = `${getSiteUrl()}/api/payment-zarinpal/verify`;
  try {
    const res = await fetch("https://payment.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: data!.amount,
        callback_url: callbackUrl,
        description: `شارژ کیف پول کرمان آتاری`,
      }),
      cache: "no-store",
    });
    const json = (await res.json()) as { data?: { code?: number; authority?: string } };

    if (json?.data?.code !== 100 || !json.data.authority) {
      await WalletTransaction.updateOne({ _id: tx._id }, { $set: { status: "failed" } });
      await TempPayment.updateOne({ _id: temp._id }, { $set: { status: "failed" } });
      return fail("خطا در اتصال به درگاه پرداخت", 502);
    }

    await WalletTransaction.updateOne(
      { _id: tx._id },
      { $set: { "gateway.authority": json.data.authority } },
    );
    await TempPayment.updateOne({ _id: temp._id }, { $set: { authority: json.data.authority } });

    return ok({
      paymentUrl: `https://payment.zarinpal.com/pg/StartPay/${json.data.authority}`,
      authority: json.data.authority,
    });
  } catch {
    await WalletTransaction.updateOne({ _id: tx._id }, { $set: { status: "failed" } });
    await TempPayment.updateOne({ _id: temp._id }, { $set: { status: "failed" } });
    return fail("خطا در اتصال به درگاه پرداخت", 502);
  }
}
