export const REFERRAL_CODE_PATTERN = /^KA-[A-Z0-9]{6}$/;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidReferralCode(code: string): boolean {
  return REFERRAL_CODE_PATTERN.test(normalizeReferralCode(code));
}

export function isRewardOrderEligible(input: {
  firstOrderId?: string | null;
  orderId: string;
  orderAmount: number;
  minimumAmount: number;
}): boolean {
  return (
    input.firstOrderId === input.orderId &&
    Number.isFinite(input.orderAmount) &&
    input.orderAmount >= input.minimumAmount
  );
}

export function referralRewardKeys(referralId: string) {
  return {
    referrer: `referral:referrer:${referralId}`,
    referee: `referral:referee:${referralId}`,
    xp: `xp:referral:${referralId}`,
  } as const;
}
