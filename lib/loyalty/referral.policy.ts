export const REFERRAL_CODE_PATTERN = /^KA-[A-Z0-9]{6}$/;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export function restoredReferralCode(input: {
  urlCode?: string | null;
  savedOtpCode?: string | null;
}): string {
  return normalizeReferralCode(input.savedOtpCode || input.urlCode || "");
}

export function shouldClearReferralForMobileChange(
  boundMobile: string | null,
  nextMobile: string,
): boolean {
  return Boolean(boundMobile && boundMobile !== nextMobile);
}

export function isValidReferralCode(code: string): boolean {
  return REFERRAL_CODE_PATTERN.test(normalizeReferralCode(code));
}

export function referralAttachmentError(input: {
  code: string;
  pendingCode?: string | null;
  alreadyAttached: boolean;
  newUserId: string;
  referrerId?: string | null;
}): string | null {
  const normalized = normalizeReferralCode(input.code);
  if (!normalized) return "کد دعوت خالی است";
  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    return "فرمت کد دعوت باید به شکل KA-XXXXXX باشد";
  }
  if (input.alreadyAttached) {
    return "این کاربر قبلاً با کد دعوت ثبت شده است";
  }
  if (input.pendingCode !== normalized) {
    return "کد دعوت فقط در همان جریان معتبر تکمیل ثبت‌نام قابل استفاده است";
  }
  if (!input.referrerId) return "کد دعوت معتبر نیست";
  if (input.referrerId === input.newUserId) {
    return "امکان استفاده از کد دعوت خودتان وجود ندارد";
  }
  return null;
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

export function pendingReferralRewardSteps(input: {
  referrerRewardedAt?: Date | null;
  refereeRewardedAt?: Date | null;
  xpRewardedAt?: Date | null;
}): Array<"referrer" | "referee" | "xp"> {
  const pending: Array<"referrer" | "referee" | "xp"> = [];
  if (!input.referrerRewardedAt) pending.push("referrer");
  if (!input.refereeRewardedAt) pending.push("referee");
  if (!input.xpRewardedAt) pending.push("xp");
  return pending;
}
