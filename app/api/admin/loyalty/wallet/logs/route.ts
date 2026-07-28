// app/api/admin/loyalty/wallet/logs/route.ts
// GET: لاگ حسابرسی عملیات مالی
import { NextRequest } from "next/server";
import WalletLog from "@/model/WalletLog";
import { ok, requireAdmin } from "@/lib/loyalty/api";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const filter: Record<string, unknown> = {};
  if (sp.get("userId")) filter.user = sp.get("userId");
  if (sp.get("action")) filter.action = sp.get("action");
  if (sp.get("success")) filter.success = sp.get("success") === "true";

  const [items, total] = await Promise.all([
    WalletLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate("user", "username mobile").populate("performedBy", "username").lean(),
    WalletLog.countDocuments(filter),
  ]);
  return ok({ items, total, page, pages: Math.ceil(total / limit) });
}
