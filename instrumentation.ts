export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" &&
      process.env.NEXT_PHASE !== "phase-production-build" &&
      process.env.GA4_API_SECRET?.trim()) {
    const { startPurchaseAnalyticsWorker } = await import("./lib/analytics/purchase-worker");
    startPurchaseAnalyticsWorker();
  }
}
