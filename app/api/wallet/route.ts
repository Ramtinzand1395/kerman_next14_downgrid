// app/api/wallet/route.ts
// GET: موجودی + خلاصه کیف پول کاربر
import { ok, requireUser } from "@/lib/loyalty/api";
import Wallet from "@/model/Loyalty Club/Wallet";
export interface IExpiringCredit {
  amount: number;
  expiresAt: Date;
}

export interface IWallet {
  balance: number;
  isActive: boolean;
  expiringCredits: IExpiringCredit[];
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const wallet = await Wallet.findOneAndUpdate(
    { user: auth.userId },
    { $setOnInsert: { balance: 0 } },
    { upsert: true, new: true },
  ).lean<IWallet>();

  const now = new Date();
  const expiringSoon = (wallet?.expiringCredits ?? [])
    .filter((c) => c.amount > 0 && c.expiresAt > now)
    .reduce((s, c) => s + c.amount, 0);

  return ok({
    balance: wallet?.balance,
    expiringSoon,
    isActive: wallet?.isActive,
  });
}
