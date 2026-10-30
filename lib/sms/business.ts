import senSMS from "@/helpers/CustomerSms";
import BusinessSmsEvent from "@/model/BusinessSmsEvent";

export type BusinessSmsState = "pending" | "sending" | "sent" | "failed";

type BusinessSmsInput = {
  eventKey: string;
  eventType: string;
  entityType: string;
  entityId: string;
  bodyId?: number | null;
  to: string;
  args: string[];
};

export type BusinessSmsResult = {
  eventKey: string;
  state: BusinessSmsState;
  providerStatus: number | null;
  errorCode: string | null;
};

function publicResult(event: {
  eventKey: string;
  status: BusinessSmsState;
  providerStatus?: number | null;
  errorCode?: string | null;
}): BusinessSmsResult {
  return {
    eventKey: event.eventKey,
    state: event.status,
    providerStatus: event.providerStatus ?? null,
    errorCode: event.errorCode ?? null,
  };
}

/**
 * Persists an idempotent business notification before attempting delivery.
 * A given event key is claimed at most once, so request retries cannot resend it.
 * Provider failures are recorded after the business write and never roll it back.
 */
export async function deliverBusinessSms(input: BusinessSmsInput): Promise<BusinessSmsResult> {
  const bodyId = Number(input.bodyId);
  const configured = Number.isSafeInteger(bodyId) && bodyId > 0;
  const inserted = await BusinessSmsEvent.findOneAndUpdate(
    { eventKey: input.eventKey },
    {
      $setOnInsert: {
        eventKey: input.eventKey,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        bodyId: configured ? bodyId : null,
        destination: input.to,
        args: input.args,
        status: configured ? "pending" : "failed",
        failedAt: configured ? null : new Date(),
        errorCode: configured ? null : "TEMPLATE_NOT_CONFIGURED",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  if (!configured || inserted.status !== "pending") {
    return publicResult(inserted);
  }

  const claimed = await BusinessSmsEvent.findOneAndUpdate(
    { _id: inserted._id, status: "pending", attempts: 0 },
    {
      $set: { status: "sending", attemptedAt: new Date() },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  ).select("+destination +args");

  if (!claimed) {
    const current = await BusinessSmsEvent.findById(inserted._id);
    return publicResult(current || inserted);
  }

  const provider = await senSMS({
    bodyId,
    to: claimed.destination,
    args: claimed.args,
  });
  const status: BusinessSmsState = provider.ok ? "sent" : "failed";
  const updated = await BusinessSmsEvent.findByIdAndUpdate(
    claimed._id,
    {
      $set: provider.ok
        ? {
            status,
            sentAt: new Date(),
            providerStatus: provider.status,
            errorCode: null,
          }
        : {
            status,
            failedAt: new Date(),
            providerStatus: provider.status,
            errorCode: provider.status ? "PROVIDER_REJECTED" : "PROVIDER_UNAVAILABLE",
          },
    },
    { returnDocument: "after" },
  );
  return publicResult(updated);
}
