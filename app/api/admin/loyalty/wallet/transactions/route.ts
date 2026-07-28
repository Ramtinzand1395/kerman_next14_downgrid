// app/api/admin/loyalty/wallet/transactions/route.ts
// GET: گزارش تراکنش‌های کیف پول با فیلتر و صفحه‌بندی
import { NextRequest } from "next/server";
import WalletTransaction from "@/model/Loyalty Club/WalletTransaction";
import { ok, requireAdmin } from "@/lib/loyalty/api";
import { WALLET_TX_TYPES, WalletTxType } from "@/types/loyalty";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
  const filter: Record<string, unknown> = {};
  if (sp.get("userId")) filter.user = sp.get("userId");
  if (sp.get("type") && WALLET_TX_TYPES.includes(sp.get("type") as WalletTxType)) {
    filter.type = sp.get("type");
  }
  if (sp.get("status")) filter.status = sp.get("status");

  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username mobile")
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);
  return ok({ items, total, page, pages: Math.ceil(total / limit) });
}
