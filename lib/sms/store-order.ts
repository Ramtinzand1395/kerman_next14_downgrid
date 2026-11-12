import moment from "moment-jalaali";
import { deliverBusinessSms } from "@/lib/sms/business";

type Receipt = {
  entityType: "StoreOrder" | "Appointment";
  id: string;
  mobile: string;
  lastName: string;
  sex?: string;
  consoleType: string;
  registeredAt: Date;
};

const consoleNames: Record<string, string> = {
  ps4: "پلی استیشن ۴",
  copy: "پلی استیشن ۴",
  ps5: "پلی استیشن ۵",
  ps5Copy: "پلی استیشن ۵",
  xbox: "ایکس باکس",
};

function toPersianDigits(value: string) {
  return value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function sendStoreOrderReceiptSms(receipt: Receipt) {
  const eventType = receipt.entityType === "StoreOrder" ? "STORE_ORDER_CREATED" : "APPOINTMENT_STORE_ORDER_CREATED";
  const eventKey = `${eventType}:${receipt.id}`;
  const registeredAt = moment(receipt.registeredAt).utcOffset(210).locale("en");
  return deliverBusinessSms({
    eventKey,
    eventType,
    entityType: receipt.entityType,
    entityId: receipt.id,
    bodyId: 323165,
    to: receipt.mobile,
    args: [
      receipt.sex === "مرد" ? "جناب آقای" : receipt.sex === "زن" ? "سرکار خانم" : "مشتری گرامی",
      receipt.lastName,
      Object.hasOwn(consoleNames, receipt.consoleType) ? consoleNames[receipt.consoleType] : receipt.consoleType,
      toPersianDigits(registeredAt.format("jYYYY/jMM/jDD")),
      toPersianDigits(registeredAt.format("HH:mm")),
    ],
  }).catch(() => ({ eventKey, state: "failed" as const, providerStatus: null, errorCode: "OUTBOX_UNAVAILABLE" }));
}
