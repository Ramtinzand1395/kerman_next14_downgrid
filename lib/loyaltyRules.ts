import LoyaltyRule from "@/model/LoyaltyRule";

type Rules = {
  orderEarnPer100k: number; // 10
  repairEarnPer100k: number; // 12
  referrerBonus: number; // 50
  referredWelcome: number; // 20
  expireMonths: number; // 12
  redeem100PointsToToman: number; // 10000
  redeemCapPercent: number; // 20
};

const defaults: Rules = {
  orderEarnPer100k: 10,
  repairEarnPer100k: 12,
  referrerBonus: 50,
  referredWelcome: 20,
  expireMonths: 12,
  redeem100PointsToToman: 10000,
  redeemCapPercent: 20,
};

export async function getRules(): Promise<Rules> {
  // اگر LoyaltyRule رو هنوز نساختی، فقط defaults رو برگردون
  try {
    const docs = await LoyaltyRule.find({ active: true }).lean();
    const map = new Map<string, any>();
    for (const d of docs) map.set(d.key, d);

    return {
      orderEarnPer100k:
        map.get("ORDER_EARN_PER_100K")?.valueNumber ??
        defaults.orderEarnPer100k,
      repairEarnPer100k:
        map.get("REPAIR_EARN_PER_100K")?.valueNumber ??
        defaults.repairEarnPer100k,
      referrerBonus:
        map.get("REFERRER_BONUS_POINTS")?.valueNumber ?? defaults.referrerBonus,
      referredWelcome:
        map.get("REFERRED_WELCOME_POINTS")?.valueNumber ??
        defaults.referredWelcome,
      expireMonths:
        map.get("POINTS_EXPIRE_MONTHS")?.valueNumber ?? defaults.expireMonths,
      redeem100PointsToToman:
        map.get("REDEEM_100_POINTS_TO_TOMAN")?.valueNumber ??
        defaults.redeem100PointsToToman,
      redeemCapPercent:
        map.get("REDEEM_CAP_PERCENT")?.valueNumber ?? defaults.redeemCapPercent,
    };
  } catch {
    return defaults;
  }
}
