// app/api/admin/loyalty/wallet/route.ts
// GET: جستجو/مشاهده کیف پول کاربران — POST: هدیه اعتبار — PATCH: تعدیل دستی
import { NextRequest } from "next/server";
import Wallet from "@/model/Loyalty Club/Wallet";
import { fail, ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { credit, debit } from "@/lib/loyalty/wallet.service";
import { adminAdjustSchema, adminGiftSchema } from "@/validations/loyalty.validation";
import { getSettings } from "@/lib/loyalty/experience.service";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const userId = req.nextUrl.searchParams.get("userId");
  if (userId) {
    const wallet = await Wallet.findOne({ user: userId }).populate("user", "username mobile").lean();
    return ok(wallet);
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 20));
  const [items, total] = await Promise.all([
    Wallet.find().sort({ balance: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "username mobile").lean(),
    Wallet.countDocuments(),
  ]);
  return ok({ items, total, page, pages: Math.ceil(total / limit) });
}

// هدیه اعتبار
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, adminGiftSchema);
  if (error) return error;

  const settings = await getSettings();
  const expiresAt =
    data!.expiresInDays && data!.expiresInDays > 0
      ? new Date(Date.now() + data!.expiresInDays * 86_400_000)
      : settings.wallet.giftExpiryDays > 0
        ? new Date(Date.now() + settings.wallet.giftExpiryDays * 86_400_000)
        : undefined;

  const result = await credit({
    userId: data!.userId,
    amount: data!.amount,
    type: "gift",
    idempotencyKey: `gift:${crypto.randomUUID()}`,
    description: data!.description ?? "هدیه مدیریت",
    expiresAt,
    performedBy: auth.userId,
    notify: {
      title: "هدیه دریافت کردید",
      message: `مبلغ ${data!.amount.toLocaleString("fa-IR")} تومان هدیه به کیف پول شما اضافه شد.${data!.description ? ` ${data!.description}` : ""}`,
    },
  });

  if (!result.ok) return fail(result.error ?? "خطا در اعطای هدیه", 400);
  return ok({ balance: result.balance });
}

// تعدیل دستی (مثبت یا منفی)
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, adminAdjustSchema);
  if (error) return error;

  const key = `admin-adjust:${crypto.randomUUID()}`;
  const result =
    data!.amount > 0
      ? await credit({
          userId: data!.userId,
          amount: data!.amount,
          type: "admin_adjust",
          idempotencyKey: key,
          description: data!.description,
          performedBy: auth.userId,
          notify: null,
        })
      : await debit({
          userId: data!.userId,
          amount: Math.abs(data!.amount),
          type: "admin_adjust",
          idempotencyKey: key,
          description: data!.description,
          performedBy: auth.userId,
        });

  if (!result.ok) return fail(result.error ?? "خطا در تعدیل", 400);
  return ok({ balance: result.balance });
}
