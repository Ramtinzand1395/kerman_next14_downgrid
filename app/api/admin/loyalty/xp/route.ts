// app/api/admin/loyalty/xp/route.ts — اعطای XP دستی توسط مدیر
import { fail, ok, requireAdmin } from "@/lib/loyalty/api";
import { grantXp } from "@/lib/loyalty/experience.service";
import { z } from "zod";
import { parseBody } from "@/lib/loyalty/api";
import crypto from "crypto";

const schema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "شناسه کاربر نامعتبر"),
  amount: z.number().int().refine((v) => v !== 0, "مقدار نمی‌تواند صفر باشد"),
  description: z.string().min(3).max(300),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const result = await grantXp({
    userId: data!.userId,
    amount: data!.amount,
    reason: "admin_grant",
    idempotencyKey: `admin-xp:${crypto.randomUUID()}`,
    description: data!.description,
    applyVipMultiplier: false,
  });

  if (!result.ok) return fail(result.error ?? "خطا در اعطای امتیاز", 400);
  return ok({ totalXp: result.totalXp, level: result.level });
}
