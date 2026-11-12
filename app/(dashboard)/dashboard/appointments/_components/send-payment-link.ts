export async function sendAppointmentPaymentLink(itemId: string): Promise<string> {
  const response = await fetch(`/api/admin/appointments/${itemId}/payment`, { method: "POST" });
  const payload = await response.json().catch(() => ({})) as {
    data?: { url: string; smsStatus?: string; notificationStatus?: string };
    error?: string;
  };
  if (!response.ok || !payload.data?.url) {
    throw new Error(payload.error || "لینک پرداخت ساخته نشد.");
  }
  try {
    await navigator.clipboard.writeText(payload.data.url);
  } catch {
    // The link is still shown in the notice if clipboard permission is denied.
  }
  return `لینک پرداخت: ${payload.data.url} · اعلان: ${payload.data.notificationStatus === "sent" ? "ارسال شد" : "ناموفق"} · پیامک: ${payload.data.smsStatus === "sent" ? "ارسال شد" : "ارسال نشد یا الگوی پیامک تنظیم نیست"}`;
}
