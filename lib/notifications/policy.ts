export const NOTIFICATION_MAX_PAGE_SIZE = 50;
export const NOTIFICATION_DEFAULT_PAGE_SIZE = 12;

export function normalizePage(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
}

export function normalizePageSize(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(NOTIFICATION_MAX_PAGE_SIZE, Math.max(1, Math.floor(parsed)))
    : NOTIFICATION_DEFAULT_PAGE_SIZE;
}

export function calculateBackoffMs(attempt: number) {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** (safeAttempt - 1));
}

export function canCancelCampaign(status: string) {
  return status === "draft" || status === "scheduled" || status === "queued";
}

export function shouldRetryDelivery(status: string, attempts: number, maxAttempts: number) {
  return status === "failed" && attempts < maxAttempts;
}
