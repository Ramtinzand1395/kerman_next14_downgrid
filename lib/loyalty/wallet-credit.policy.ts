// Allocation is kept independent of MongoDB so expiry and purchase logic can be tested.
export interface ExpiringCreditBucket {
  amount: number;
  expiresAt: Date;
  sourceKey?: string;
}

export function spendExpiringCreditFirst<T extends ExpiringCreditBucket>(
  credits: T[],
  amount: number,
  now: Date,
): T[] {
  const next = credits.map((item) => ({ ...item }));
  let remaining = Math.max(0, amount);
  const order = next.map((_, i) => i).sort(
    (a, b) => next[a].expiresAt.getTime() - next[b].expiresAt.getTime(),
  );
  for (const index of order) {
    if (remaining <= 0) break;
    const bucket = next[index];
    if (bucket.amount <= 0 || bucket.expiresAt.getTime() <= now.getTime()) continue;
    const used = Math.min(bucket.amount, remaining);
    bucket.amount -= used;
    remaining -= used;
  }
  return next;
}

export function zeroExpiredCredits<T extends ExpiringCreditBucket>(
  credits: T[],
  now: Date,
): { credits: T[]; amount: number } {
  let amount = 0;
  const next = credits.map((item) => {
    if (item.amount <= 0 || item.expiresAt.getTime() > now.getTime()) return { ...item };
    amount += item.amount;
    return { ...item, amount: 0 };
  });
  return { credits: next, amount };
}
