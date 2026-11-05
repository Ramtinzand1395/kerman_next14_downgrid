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
import { notifyUser } from "@/lib/notifications/service";
import { WalletTxType } from "@/types/loyalty";
import { spendExpiringCreditFirst, zeroExpiredCredits } from "./wallet-credit.policy";

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
  /** برای هماهنگ‌کردن برداشت با transaction سفارش */
  session?: mongoose.ClientSession;
}

export interface WalletTxResult {
  ok: boolean;
  /** true یعنی همین تراکنش قبلاً اعمال شده (idempotent replay) */
  duplicate?: boolean;
  transaction?: mongoose.HydratedDocument<IWalletTransaction>;
  balance?: number;
  error?: string;
}

// Version 0 was absent in a few historical wallets. Compare safely before
// any write so an old document cannot block all future payments.
function walletVersionFilter(version: number | undefined) {
  return !version
    ? { $or: [{ version: 0 }, { version: { $exists: false } }] }
    : { version };
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
  session?: mongoose.ClientSession;
}) {
  try {
    await WalletLog.create(
      [
        {
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
        },
      ],
      input.session ? { session: input.session } : undefined,
    );
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
    try {
      const created = await Wallet.create(
        [{ user: userId, balance: 0 }],
        session ? { session } : undefined,
      );
      wallet = created[0];
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      const retry = Wallet.findOne({ user: userId });
      if (session) retry.session(session);
      wallet = await retry;
      if (!wallet) throw error;
    }
  }
  return wallet;
}

export async function getBalance(userId: string): Promise<number> {
  await expireWalletCreditsForUser(userId);
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

  // بازیابی قطع عملیات standalone: ممکن است موجودی اعمال شده باشد ولی ساخت
  // WalletTransaction پیش از پایان پردازش قطع شده باشد.
  const appliedWallet = await Wallet.findOne({
    user: userId,
    appliedCreditKeys: idempotencyKey,
  });
  if (appliedWallet) {
    let recovered;
    try {
      recovered = await WalletTransaction.create({
        wallet: appliedWallet._id,
        user: userId,
        type,
        status: "completed",
        amount,
        balanceAfter: appliedWallet.balance,
        idempotencyKey,
        ref: input.ref,
        gateway: input.gateway,
        expiresAt: input.expiresAt,
        description: input.description,
        performedBy: input.performedBy,
      });
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      recovered = await WalletTransaction.findOne({ idempotencyKey });
    }
    return {
      ok: true,
      duplicate: true,
      transaction: recovered ?? undefined,
      balance: appliedWallet.balance,
    };
  }

  const topologyType = (mongoose.connection.getClient() as unknown as {
    topology?: { description?: { type?: string } };
  }).topology?.description?.type;
  if (topologyType === "Single") {
    try {
      const wallet = await getOrCreateWallet(userId);
      if (!wallet.isActive) return { ok: false, error: "کیف پول غیرفعال است" };

      const updated = await Wallet.findOneAndUpdate(
        {
          _id: wallet._id,
          isActive: true,
          appliedCreditKeys: { $ne: idempotencyKey },
        },
        {
          $inc: { balance: amount, version: 1 },
          $addToSet: { appliedCreditKeys: idempotencyKey },
          ...(input.expiresAt
            ? {
                $push: {
                  expiringCredits: { amount, expiresAt: input.expiresAt, sourceKey: idempotencyKey },
                },
              }
            : {}),
        },
        { returnDocument: "after" },
      );

      const appliedWallet =
        updated ??
        (await Wallet.findOne({
          _id: wallet._id,
          appliedCreditKeys: idempotencyKey,
        }));
      if (!appliedWallet) {
        return { ok: false, error: "کیف پول غیرفعال است" };
      }

      let transaction = await WalletTransaction.findOne({ idempotencyKey });
      if (!transaction) {
        try {
          transaction = await WalletTransaction.create({
            wallet: wallet._id,
            user: userId,
            type,
            status: "completed",
            amount,
            balanceAfter: appliedWallet.balance,
            idempotencyKey,
            ref: input.ref,
            gateway: input.gateway,
            expiresAt: input.expiresAt,
            description: input.description,
            performedBy: input.performedBy,
          });
        } catch (error) {
          if ((error as { code?: number })?.code !== 11000) throw error;
          transaction = await WalletTransaction.findOne({ idempotencyKey });
        }
      }

      if (updated) {
        await log({
          wallet: wallet._id,
          user: userId,
          action: `credit_${type}`,
          success: true,
          amount,
          balanceBefore: updated.balance - amount,
          balanceAfter: updated.balance,
          transaction: transaction?._id,
          performedBy: input.performedBy,
        });
      }

      if (updated && input.notify) {
        await notifyUser({
          userId,
          title: input.notify.title,
          message: input.notify.message,
          type:
            type === "cashback"
              ? "cashback"
              : type === "gift"
                ? "gift"
                : type === "refund"
                  ? "WALLET_REFUNDED"
                  : type === "charge"
                    ? "WALLET_CHARGED"
                    : "wallet_credit",
          category: "wallet",
          entityType: transaction ? "WalletTransaction" : undefined,
          entityId: transaction?._id,
          link: "/my-profile?step=8",
          eventKey: transaction
            ? `WALLET_CREDIT:${transaction._id}`
            : idempotencyKey,
        }).catch(() => {});
      }

      return {
        ok: true,
        duplicate: !updated,
        transaction: transaction ?? undefined,
        balance: appliedWallet.balance,
      };
    } catch (error) {
      await log({
        user: userId,
        action: `credit_${type}`,
        success: false,
        amount,
        errorMessage: (error as Error)?.message,
      });
      return { ok: false, error: "خطا در عملیات کیف پول" };
    }
  }
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
          expiringCredits: { amount, expiresAt: input.expiresAt, sourceKey: idempotencyKey },
        };
      }

      const updated = await Wallet.findOneAndUpdate(
        { _id: wallet._id, version: wallet.version, isActive: true },
        update,
        {
          returnDocument: "after",
          ...(activeSession ? { session: activeSession } : {}),
        },
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
      await notifyUser({
        userId,
        title: input.notify.title,
        message: input.notify.message,
        type:
          type === "cashback"
            ? "cashback"
            : type === "gift"
              ? "gift"
              : type === "refund"
                ? "WALLET_REFUNDED"
                : type === "charge"
                  ? "WALLET_CHARGED"
                  : "wallet_credit",
        category: "wallet",
        entityType: result.transaction ? "WalletTransaction" : undefined,
        entityId: result.transaction?._id,
        link: "/my-profile?step=8",
        eventKey: result.transaction ? `WALLET_CREDIT:${result.transaction._id}` : input.idempotencyKey,
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

  // A stale cron must never make an expired signup gift spendable.
  // Expire before accepting a payment, even on servers without a scheduled cron.
  if (type !== "expire" && !input.session) {
    try {
      await expireWalletCreditsForUser(userId);
    } catch (error) {
      console.error("[wallet] lazy expiry failed", error);
      return { ok: false, error: "بررسی اعتبار کیف پول ناموفق بود؛ دوباره تلاش کنید" };
    }
  }

  const existingQuery = WalletTransaction.findOne({ idempotencyKey });
  if (input.session) existingQuery.session(input.session);
  const existing = await existingQuery.lean();
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
  const ownsSession = !input.session && topologyType !== "Single";
  const session =
    input.session ?? (ownsSession ? await mongoose.startSession() : undefined);
  try {
    let result: WalletTxResult = { ok: false, error: "خطای ناشناخته" };

    const applyDebit = async (activeSession?: mongoose.ClientSession) => {
      let wallet = await getOrCreateWallet(userId, activeSession);
      let updated: typeof wallet | null = null;
      let balanceBefore = wallet.balance;

      // Consume the earliest expiring gifts before purchased wallet funds.
      // Updating balance AND remaining bonus buckets under the same version
      // lock means checkout and expiry cannot spend the same credit twice.
      for (let attempt = 0; attempt < 4; attempt++) {
        balanceBefore = wallet.balance;
        if (!wallet.isActive || balanceBefore < amount) {
          await log({
            wallet: wallet._id,
            user: userId,
            action: `debit_${type}`,
            success: false,
            amount,
            balanceBefore,
            errorMessage: "موجودی ناکافی یا کیف پول غیرفعال",
            performedBy: input.performedBy,
            session: activeSession,
          });
          result = { ok: false, error: "موجودی کیف پول کافی نیست", balance: balanceBefore };
          return;
        }

        const buckets = (wallet.expiringCredits ?? []).map((bucket) => ({
          amount: bucket.amount,
          expiresAt: bucket.expiresAt,
          sourceTx: bucket.sourceTx,
          sourceKey: bucket.sourceKey,
        }));
        const nextBuckets = type === "expire"
          ? buckets
          : spendExpiringCreditFirst(buckets, amount, new Date());
        updated = await Wallet.findOneAndUpdate(
          {
            _id: wallet._id,
            ...walletVersionFilter(wallet.version),
            isActive: true,
            balance: { $gte: amount },
          },
          {
            $inc: { balance: -amount, version: 1 },
            $set: { expiringCredits: nextBuckets },
          },
          {
            returnDocument: "after",
            ...(activeSession ? { session: activeSession } : {}),
          },
        );
        if (updated) break;
        wallet = await getOrCreateWallet(userId, activeSession);
      }
      if (!updated) throw new Error("WALLET_VERSION_CONFLICT");

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
        session: activeSession,
      });

      result = { ok: true, transaction: tx, balance: updated.balance };
    };
    if (input.session) await applyDebit(input.session);
    else if (session) await session.withTransaction(() => applyDebit(session));
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
    if (ownsSession && session) await session.endSession();
  }
}

// ---------- انقضای اعتبار ----------

/**
 * On-demand expiry is authoritative: no cron is required for correctness.
 * An optimistic version lock atomically clears expired buckets and adjusts
 * only the remaining unspent gift portion. Paid wallet credit is not expired.
 */
export async function expireWalletCreditsForUser(
  userId: string,
  now = new Date(),
): Promise<{ expiredCount: number; totalAmount: number }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return { expiredCount: 0, totalAmount: 0 };

    const buckets = (wallet.expiringCredits ?? []).map((bucket) => ({
      amount: bucket.amount,
      expiresAt: bucket.expiresAt,
      sourceTx: bucket.sourceTx,
      sourceKey: bucket.sourceKey,
    }));
    const expired = zeroExpiredCredits(buckets, now);
    if (expired.amount <= 0) return { expiredCount: 0, totalAmount: 0 };

    const deduction = Math.min(Math.max(0, wallet.balance), expired.amount);
    const updated = await Wallet.findOneAndUpdate(
      { _id: wallet._id, ...walletVersionFilter(wallet.version) },
      {
        $inc: { balance: -deduction, version: 1 },
        $set: { expiringCredits: expired.credits },
      },
      { returnDocument: "after" },
    );
    if (!updated) continue;

    if (deduction > 0) {
      const key = `expire:${wallet._id}:v${wallet.version}`;
      try {
        const transaction = await WalletTransaction.create({
          wallet: wallet._id,
          user: wallet.user,
          type: "expire",
          status: "completed",
          amount: deduction,
          balanceAfter: updated.balance,
          idempotencyKey: key,
          description: "انقضای مانده اعتبارهای هدیه",
        });
        await log({
          wallet: wallet._id,
          user: String(wallet.user),
          action: "debit_expire",
          success: true,
          amount: deduction,
          balanceBefore: wallet.balance,
          balanceAfter: updated.balance,
          transaction: transaction._id,
        });
      } catch (error) {
        // The balance and bucket change have already committed. Never retry a
        // debit just because writing the auxiliary ledger record failed.
        console.error("[wallet] expiration ledger write failed", error);
      }
      await notifyUser({
        userId: wallet.user,
        title: "انقضای اعتبار هدیه",
        message: `${deduction.toLocaleString("fa-IR")} تومان اعتبار استفاده‌نشده کیف پول منقضی شد.`,
        type: "credit_expiry",
        category: "wallet",
        link: "/my-profile?step=8",
        eventKey: key,
      }).catch(() => undefined);
    }
    return {
      expiredCount: buckets.filter((bucket) => bucket.amount > 0 && bucket.expiresAt.getTime() <= now.getTime()).length,
      totalAmount: deduction,
    };
  }
  throw new Error("WALLET_EXPIRY_VERSION_CONFLICT");
}

/** Background cleanup; user-facing reads and debits also expire lazily. */
export async function expireCredits(now = new Date()): Promise<{ expiredCount: number; totalAmount: number }> {
  const wallets = await Wallet.find({
    expiringCredits: {
      $elemMatch: {
        expiresAt: { $lte: now },
        amount: { $gt: 0 },
        sourceKey: { $exists: true },
      },
    },
  }).select("user").lean();
  let expiredCount = 0;
  let totalAmount = 0;
  for (const wallet of wallets) {
    try {
      const result = await expireWalletCreditsForUser(String(wallet.user), now);
      expiredCount += result.expiredCount;
      totalAmount += result.totalAmount;
    } catch (error) {
      console.error("[wallet] scheduled expiry failed for user", String(wallet.user), error);
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
