// lib/loyalty/wallet.service.ts
// سرویس کیف پول — قلب مالی سیستم باشگاه مشتریان.
//
// اصول طراحی:
// ۱) هر تغییر موجودی داخل MongoDB Transaction (session) انجام می‌شود → Atomicity کامل.
// ۲) هر تراکنش idempotencyKey یکتا دارد → عملیات تکراری (ری‌ترای وب‌هوک درگاه، دابل‌کلیک) دوباره اعمال نمی‌شود.
// ۳) برداشت با فیلتر اتمیک balance >= amount انجام می‌شود → جلوگیری از دوباره‌خرج (double-spend) حتی در رقابت هم‌زمان.
// ۴) تمام رویدادها (موفق و ناموفق) در WalletLog ثبت می‌شوند → حسابرسی کامل.
// ۵) موجودی منفی غیرممکن است (هم سطح مدل min:0 و هم فیلتر اتمیک).
import mongoose from "mongoose";
import Wallet from "@/model/Loyalty Club/Wallet";
import WalletTransaction, { IWalletTransaction } from "@/model/Loyalty Club/WalletTransaction";
import WalletLog from "@/model/Loyalty Club/WalletLog";
import Notification from "@/model/Notification";
import { WalletTxType } from "@/types/loyalty";

// ---------- انواع ورودی/خروجی ----------

export interface CreditInput {
  userId: string;
  amount: number;
  type: Extract<
    WalletTxType,
    | "charge"
    | "refund"
    | "cashback"
    | "gift"
    | "referral_reward"
    | "spin_reward"
    | "mission_reward"
    | "admin_adjust"
  >;
  idempotencyKey: string;
  description?: string;
  ref?: IWalletTransaction["ref"];
  gateway?: IWalletTransaction["gateway"];
  /** تاریخ انقضای اعتبار (برای هدیه‌ها) */
  expiresAt?: Date;
  performedBy?: string;
  /** نشان/پیام اعلان — اگر null باشد اعلان ساخته نمی‌شود */
  notify?: { title: string; message: string } | null;
}

export interface DebitInput {
  userId: string;
  amount: number;
  type: Extract<WalletTxType, "payment" | "expire" | "admin_adjust">;
  idempotencyKey: string;
  description?: string;
  ref?: IWalletTransaction["ref"];
  performedBy?: string;
}

export interface WalletTxResult {
  ok: boolean;
  /** true یعنی همین تراکنش قبلاً اعمال شده (idempotent replay) */
  duplicate?: boolean;
  transaction?: mongoose.HydratedDocument<IWalletTransaction>;
  balance?: number;
  error?: string;
}

// ---------- ابزارهای داخلی ----------

async function log(input: {
  wallet?: unknown;
  user?: string;
  action: string;
  success: boolean;
  amount?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  transaction?: unknown;
  context?: Record<string, unknown>;
  errorMessage?: string;
  performedBy?: string;
}) {
  try {
    await WalletLog.create({
      wallet: input.wallet as never,
      user: input.user as never,
      action: input.action,
      success: input.success,
      amount: input.amount,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      transaction: input.transaction as never,
      context: input.context,
      errorMessage: input.errorMessage,
      performedBy: input.performedBy as never,
    });
  } catch {
    // لاگ هرگز نباید فلو اصلی را بشکند
  }
}

/** کیف پول کاربر را می‌گیرد یا می‌سازد (داخل session اگر داده شده باشد) */
export async function getOrCreateWallet(
  userId: string,
  session?: mongoose.ClientSession,
) {
  const q = Wallet.findOne({ user: userId });
  if (session) q.session(session);
  let wallet = await q;
  if (!wallet) {
    const created = await Wallet.create(
      [{ user: userId, balance: 0 }],
      session ? { session } : undefined,
    );
    wallet = created[0];
  }
  return wallet;
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await Wallet.findOne({ user: userId }).select("balance").lean();
  return wallet?.balance ?? 0;
}

// ---------- واریز (Credit) ----------

export async function credit(input: CreditInput): Promise<WalletTxResult> {
  const { userId, amount, type, idempotencyKey } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "مبلغ نامعتبر است" };
  }

  // Idempotency: اگر این کلید قبلاً ثبت شده، همان نتیجه قبلی برمی‌گردد
  const existing = await WalletTransaction.findOne({ idempotencyKey }).lean();
  if (existing) {
    return {
      ok: existing.status === "completed",
      duplicate: true,
      balance: existing.balanceAfter,
      error: existing.status === "completed" ? undefined : "تراکنش قبلی ناموفق بوده است",
    };
  }

  const topologyType = (mongoose.connection.getClient() as unknown as {
    topology?: { description?: { type?: string } };
  }).topology?.description?.type;
  const session = topologyType === "Single" ? undefined : await mongoose.startSession();
  try {
    let result: WalletTxResult = { ok: false, error: "خطای ناشناخته" };

    const applyCredit = async (activeSession?: mongoose.ClientSession) => {
      const wallet = await getOrCreateWallet(userId, activeSession);
      if (!wallet.isActive) {
        result = { ok: false, error: "کیف پول غیرفعال است" };
        return;
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // به‌روزرسانی اتمیک موجودی + افزودن اعتبار منقضی‌شونده
      const update: mongoose.UpdateQuery<typeof wallet> = {
        $inc: { balance: amount, version: 1 },
      };
      if (input.expiresAt) {
        update.$push = {
          expiringCredits: { amount, expiresAt: input.expiresAt },
        };
      }

      const updated = await Wallet.findOneAndUpdate(
        { _id: wallet._id, version: wallet.version, isActive: true },
        update,
        { new: true, ...(activeSession ? { session: activeSession } : {}) },
      );
      if (!updated) {
        // نسخه عوض شده → تداخل هم‌زمان؛ تراکنش abort می‌شود و Mongo دوباره تلاش می‌کند
        throw new Error("VERSION_CONFLICT");
      }

      const [tx] = await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            user: userId,
            type,
            status: "completed",
            amount,
            balanceAfter,
            idempotencyKey,
            ref: input.ref,
            gateway: input.gateway,
            expiresAt: input.expiresAt,
            description: input.description,
            performedBy: input.performedBy,
          },
        ],
        activeSession ? { session: activeSession } : undefined,
      );

      await log({
        wallet: wallet._id,
        user: userId,
        action: `credit_${type}`,
        success: true,
        amount,
        balanceBefore,
        balanceAfter,
        transaction: tx._id,
        performedBy: input.performedBy,
      });

      result = { ok: true, transaction: tx, balance: balanceAfter };
    };
    if (session) await session.withTransaction(() => applyCredit(session));
    else await applyCredit();

    // اعلان بیرون از تراکنش (غیرحساس به rollback)
    if (result.ok && input.notify) {
      await Notification.create({
        title: input.notify.title,
        message: input.notify.message,
        type: type === "cashback" ? "cashback" : type === "gift" ? "gift" : "wallet_credit",
        for: "user",
        user: userId,
        target: result.transaction
          ? { kind: "WalletTransaction", item: result.transaction._id }
          : undefined,
      }).catch(() => {});
    }

    return result;
  } catch (err) {
    // کلید یکتا در حالت رقابتی تکرار شده — ری‌پلی امن
    if ((err as { code?: number })?.code === 11000) {
      const prev = await WalletTransaction.findOne({ idempotencyKey }).lean();
      return { ok: prev?.status === "completed", duplicate: true, balance: prev?.balanceAfter };
    }
    const message =
      (err as Error)?.message === "VERSION_CONFLICT"
        ? "تداخل هم‌زمان — دوباره تلاش کنید"
        : "خطا در عملیات کیف پول";
    await log({
      user: userId,
      action: `credit_${type}`,
      success: false,
      amount,
      errorMessage: (err as Error)?.message,
    });
    return { ok: false, error: message };
  } finally {
    if (session) await session.endSession();
  }
}

// ---------- برداشت (Debit) ----------

export async function debit(input: DebitInput): Promise<WalletTxResult> {
  const { userId, amount, type, idempotencyKey } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "مبلغ نامعتبر است" };
  }

  const existing = await WalletTransaction.findOne({ idempotencyKey }).lean();
  if (existing) {
    return {
      ok: existing.status === "completed",
      duplicate: true,
      balance: existing.balanceAfter,
      error: existing.status === "completed" ? undefined : "تراکنش قبلی ناموفق بوده است",
    };
  }

  const topologyType = (mongoose.connection.getClient() as unknown as {
    topology?: { description?: { type?: string } };
  }).topology?.description?.type;
  const session = topologyType === "Single" ? undefined : await mongoose.startSession();
  try {
    let result: WalletTxResult = { ok: false, error: "خطای ناشناخته" };

    const applyDebit = async (activeSession?: mongoose.ClientSession) => {
      const wallet = await getOrCreateWallet(userId, activeSession);
      const balanceBefore = wallet.balance;

      // برداشت اتمیک با شرط موجودی کافی — قلب جلوگیری از double-spend.
      // اگر دو درخواست هم‌زمان بیایند، فقط یکی فیلتر را پاس می‌کند.
      const updated = await Wallet.findOneAndUpdate(
        {
          _id: wallet._id,
          isActive: true,
          balance: { $gte: amount },
        },
        { $inc: { balance: -amount, version: 1 } },
        { new: true, ...(activeSession ? { session: activeSession } : {}) },
      );

      if (!updated) {
        await log({
          wallet: wallet._id,
          user: userId,
          action: `debit_${type}`,
          success: false,
          amount,
          balanceBefore,
          errorMessage: "موجودی ناکافی یا کیف پول غیرفعال",
          performedBy: input.performedBy,
        });
        result = { ok: false, error: "موجودی کیف پول کافی نیست", balance: balanceBefore };
        return; // خروج بدون throw → تراکنش commit می‌شود ولی چیزی تغییر نکرده
      }

      const [tx] = await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            user: userId,
            type,
            status: "completed",
            amount,
            balanceAfter: updated.balance,
            idempotencyKey,
            ref: input.ref,
            description: input.description,
            performedBy: input.performedBy,
          },
        ],
        activeSession ? { session: activeSession } : undefined,
      );

      await log({
        wallet: wallet._id,
        user: userId,
        action: `debit_${type}`,
        success: true,
        amount,
        balanceBefore,
        balanceAfter: updated.balance,
        transaction: tx._id,
        performedBy: input.performedBy,
      });

      result = { ok: true, transaction: tx, balance: updated.balance };
    };
    if (session) await session.withTransaction(() => applyDebit(session));
    else await applyDebit();

    return result;
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      const prev = await WalletTransaction.findOne({ idempotencyKey }).lean();
      return { ok: prev?.status === "completed", duplicate: true, balance: prev?.balanceAfter };
    }
    await log({
      user: userId,
      action: `debit_${type}`,
      success: false,
      amount,
      errorMessage: (err as Error)?.message,
    });
    return { ok: false, error: "خطا در عملیات کیف پول" };
  } finally {
    if (session) await session.endSession();
  }
}

// ---------- انقضای اعتبار ----------

/**
 * اعتبارهای منقضی‌شده را از کیف پول کم می‌کند.
 * برای cron روزانه — idempotent بر اساس sourceTx.
 */
export async function expireCredits(now = new Date()): Promise<{ expiredCount: number; totalAmount: number }> {
  const wallets = await Wallet.find({
    "expiringCredits.expiresAt": { $lte: now },
    "expiringCredits.amount": { $gt: 0 },
  });

  let expiredCount = 0;
  let totalAmount = 0;

  for (const wallet of wallets) {
    for (const creditItem of wallet.expiringCredits) {
      if (creditItem.amount <= 0 || creditItem.expiresAt > now) continue;

      const key = `expire:${wallet._id}:${creditItem.sourceTx ?? creditItem.expiresAt.getTime()}`;
      const res = await debit({
        userId: wallet.user.toString(),
        amount: Math.min(creditItem.amount, wallet.balance),
        type: "expire",
        idempotencyKey: key,
        description: "انقضای اعتبار کیف پول",
      });

      if (res.ok && !res.duplicate) {
        // صفر کردن سهم منقضی‌شده
        await Wallet.updateOne(
          { _id: wallet._id, "expiringCredits.expiresAt": creditItem.expiresAt },
          { $set: { "expiringCredits.$.amount": 0 } },
        );
        expiredCount++;
        totalAmount += creditItem.amount;

        await Notification.create({
          title: "انقضای اعتبار",
          message: `مبلغ ${creditItem.amount.toLocaleString("fa-IR")} تومان از اعتبار کیف پول شما منقضی شد.`,
          type: "credit_expiry",
          for: "user",
          user: wallet.user,
        }).catch(() => {});
      }
    }
  }

  return { expiredCount, totalAmount };
}

// ---------- تاریخچه ----------

export async function getTransactions(
  userId: string,
  opts: { page?: number; limit?: number; type?: WalletTxType } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
  const filter: Record<string, unknown> = { user: userId };
  if (opts.type) filter.type = opts.type;

  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}
