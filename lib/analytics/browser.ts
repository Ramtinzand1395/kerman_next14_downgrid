import { ecommerceParams, parseAnalyticsSession, type AnalyticsSession } from "./ecommerce";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
export const GA_READY_EVENT = "kerman:ga-ready";

type GoogleTag = (...args: unknown[]) => void;

function googleTag() {
  return (window as Window & { gtag?: GoogleTag }).gtag;
}

export function trackEvent(name: string, params: Record<string, unknown>) {
  if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId) || typeof window === "undefined") return;

  const send = () => {
    try {
      googleTag()?.("event", name, { ...params, send_to: measurementId });
    } catch {
      // Analytics must not interrupt checkout or appointment submission.
    }
  };
  if (googleTag()) send();
  else window.addEventListener(GA_READY_EVENT, send, { once: true });
}

export function trackCommerce(
  name: "view_item" | "add_to_cart" | "begin_checkout",
  lines: Parameters<typeof ecommerceParams>[0],
) {
  const params = ecommerceParams(lines);
  if (params.items.length) trackEvent(name, params);
}

export async function readAnalyticsSession(): Promise<AnalyticsSession | undefined> {
  if (!measurementId || typeof window === "undefined") return;
  const tag = googleTag();
  if (!tag) return;

  return new Promise((resolve) => {
    let clientId: unknown;
    let sessionId: unknown;
    let responses = 0;
    const finish = () => {
      window.clearTimeout(timeout);
      resolve(parseAnalyticsSession({ clientId, sessionId }));
    };
    const timeout = window.setTimeout(finish, 350);
    try {
      tag("get", measurementId, "client_id", (value: unknown) => {
        clientId = value;
        if (++responses === 2) finish();
      });
      tag("get", measurementId, "session_id", (value: unknown) => {
        sessionId = value;
        if (++responses === 2) finish();
      });
    } catch {
      finish();
    }
  });
}
