// lib/loyalty/cashback.service.ts
// !جدید با chat نوشته شده.
import CashbackRule from "@/model/Loyalty Club/CashbackRule";
import User from "@/model/User";
import Order from "@/model/Order";

import { credit } from "./wallet.service";
import { getLevels, getSettings } from "./experience.service";

import { VipTier } from "@/types/loyalty";

// ============================
// Types
// ============================

export interface CashbackCalcInput {
  userId: string;
  orderAmount: number;
  categoryIds?: string[];
  productIds?: string[];
}

export interface CashbackResult {
  amount: number;
  percent: number;
  ruleTitle?: string;
}

// ============================
// Calculate Cashback
// ============================

export async function calculateCashback(
  input: CashbackCalcInput,
): Promise<CashbackResult> {
  const settings = await getSettings();

  // سیستم کش‌بک خاموش است
  if (!settings.cashback.enabled) {
    return {
      amount: 0,
      percent: 0,
    };
  }

  const now = new Date();

  /**
   * دریافت قوانین فعال
   *
   * قوانین:
   * - فعال باشند
   * - حداقل مبلغ سفارش رعایت شود
   * - تاریخ شروع و پایان معتبر باشد
   *
   */
  const rules = await CashbackRule.find({
    isActive: true,

    minOrderAmount: {
      $lte: input.orderAmount,
    },

    $and: [
      {
        $or: [
          {
            startsAt: {
              $exists: false,
            },
          },
          {
            startsAt: null,
          },
          {
            startsAt: {
              $lte: now,
            },
          },
        ],
      },

      {
        $or: [
          {
            endsAt: {
              $exists: false,
            },
          },
          {
            endsAt: null,
          },
          {
            endsAt: {
              $gte: now,
            },
          },
        ],
      },
    ],
  })
    .sort({
      priority: -1,
    })
    .lean();

  // اطلاعات VIP کاربر

  const user = await User.findById(input.userId).select("vipTier").lean();

  const userVip = (user?.vipTier as VipTier | undefined) ?? null;

  const categorySet = new Set(input.categoryIds ?? []);

  const productSet = new Set(input.productIds ?? []);

  /**
   * پیدا کردن بهترین قانون
   *
   * چون sort بر اساس priority انجام شده
   * اولین نتیجه بهترین قانون است
   */

  const matched = rules.find((rule) => {
    // فقط VIP خاص

    if (
      rule.vipTiers.length &&
      (!userVip || !rule.vipTiers.includes(userVip))
    ) {
      return false;
    }

    // دسته بندی

    if (
      rule.categories.length &&
      !rule.categories.some((c) => categorySet.has(c.toString()))
    ) {
      return false;
    }

    // محصول خاص

    if (
      rule.products.length &&
      !rule.products.some((p) => productSet.has(p.toString()))
    ) {
      return false;
    }

    // سقف سفارش

    if (rule.maxOrderAmount && input.orderAmount > rule.maxOrderAmount) {
      return false;
    }

    return true;
  });

  /**
   * اگر قانون پیدا نشد
   * از درصد پیش فرض استفاده کن
   */

  let percent = matched?.percent ?? settings.cashback.defaultPercent;

  /**
   * Bonus مربوط به VIP
   */

  if (userVip) {
    const { vip } = await getLevels();

    const tier = vip.find((item) => item.code === userVip);

    percent += tier?.benefits?.cashbackBonusPercent ?? 0;
  }

  /**
   * محاسبه مبلغ
   */

  let amount = Math.floor((input.orderAmount * percent) / 100);

  /**
   * محدودیت سقف کش‌بک
   */

  if (matched?.maxAmount) {
    amount = Math.min(amount, matched.maxAmount);
  }

  return {
    amount: Math.max(0, amount),

    percent,

    ruleTitle: matched?.title,
  };
}

// ============================
// Grant Cashback
// ============================

export async function grantCashback(input: {
  userId: string;
  orderId: string;
  orderAmount: number;
  categoryIds?: string[];
  productIds?: string[];
}) {
  /**
   * محاسبه کش‌بک
   */

  const cashback = await calculateCashback(input);

  if (cashback.amount <= 0) {
    return {
      ok: true,
      granted: false,
      amount: 0,
    };
  }

  /**
   * جلوگیری از پرداخت دوباره
   *
   * هر Order فقط یک Cashback
   */

  const idempotencyKey = `cashback:${input.orderId}`;

  const result = await credit({
    userId: input.userId,

    amount: cashback.amount,

    type: "cashback",

    idempotencyKey,

    ref: {
      kind: "Order",
      item: input.orderId as never,
    },

    description: `کش‌بک ${cashback.percent}% سفارش`,

    notify: {
      title: "دریافت کش‌بک 🎁",

      message: `${cashback.amount.toLocaleString("fa-IR")}
          تومان کش‌بک سفارش شما به کیف پول اضافه شد.`,
    },
  });

  if (result.ok && !result.duplicate) {
    /**
     * افزایش تعداد استفاده قانون
     */

    if (cashback.ruleTitle) {
      await CashbackRule.updateOne(
        {
          title: cashback.ruleTitle,
        },

        {
          $inc: {
            usageCount: 1,
          },
        },
      );
    }
  }

  return {
    ok: result.ok,
    granted: result.ok,

    amount: result.ok ? cashback.amount : 0,
    error: result.error,
  };
}
