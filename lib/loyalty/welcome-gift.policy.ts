// Pure policy for the 72-hour welcome-wallet promotion.
export interface WelcomeGiftPolicyInput {
  enabled: boolean;
  amount: number;
  startAt?: string;
  endAt?: string;
  registeredAt: Date;
  now: Date;
}

export function welcomeGiftOffer(input: WelcomeGiftPolicyInput): {
  amount: number;
  expiresAt: Date;
} | null {
  if (!input.enabled || !Number.isSafeInteger(input.amount) ||
      input.amount < 1_000 || input.amount > 200_000) return null;
  // Start date is mandatory to avoid retroactive grants to existing accounts.
  if (!input.startAt) return null;
  const start = new Date(input.startAt);
  const registered = new Date(input.registeredAt.getTime());
  const now = new Date(input.now.getTime());
  if (![start, registered, now].every((d) => Number.isFinite(d.getTime()))) return null;
  if (registered.getTime() < start.getTime() || registered.getTime() > now.getTime()) return null;
  if (input.endAt) {
    const end = new Date(input.endAt);
    if (!Number.isFinite(end.getTime()) || registered.getTime() >= end.getTime()) return null;
  }
  const expiresAt = new Date(registered.getTime() + 72 * 60 * 60 * 1000);
  if (expiresAt.getTime() <= now.getTime()) return null;
  return { amount: input.amount, expiresAt };
}
