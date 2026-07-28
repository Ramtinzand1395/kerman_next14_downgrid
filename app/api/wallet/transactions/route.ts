// app/api/wallet/transactions/route.ts
// GET: تاریخچه تراکنش‌های کیف پول با صفحه‌بندی و فیلتر نوع
import { NextRequest } from "next/server";
import { ok, requireUser } from "@/lib/loyalty/api";
import { getTransactions } from "@/lib/loyalty/wallet.service";
import { walletTxQuerySchema } from "@/validations/loyalty.validation";
import { WalletTxType } from "@/types/loyalty";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = walletTxQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) return ok({ items: [], total: 0, page: 1, pages: 0 });

  const { page, limit, type } = parsed.data;
  const result = await getTransactions(auth.userId, {
    page,
    limit,
    type: type as WalletTxType | undefined,
  });
  return ok(result);
}
