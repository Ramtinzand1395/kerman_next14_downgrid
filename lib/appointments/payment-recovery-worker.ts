import dbConnect from "@/lib/mongodb";
import Appointment from "@/model/Appointment";
import { reconcileAppointmentPayment, sendAppointmentPaidNotices } from "./payment-recovery";

const minute = 60_000;
const batchSize = 12;

export function startAppointmentPaymentRecovery() {
  if (!process.env.ZARINPAL_MERCHANT_ID?.trim()) return;

  async function run() {
    try {
      await dbConnect();
      const now = new Date();
      const pending = {
        "payment.status": "pending",
        "payment.authority": { $type: "string" },
        "payment.nextCheckAt": { $lte: now },
      };
      const selection = "user fulfillment trackingCode payment";
      const [payments, notices] = await Promise.all([
        Appointment.find(pending).sort({ "payment.nextCheckAt": 1 }).limit(batchSize).select(selection).lean(),
        Appointment.find({ "payment.status": "paid", "payment.notificationPending": true })
          .sort({ "payment.paidAt": 1 }).limit(batchSize).select(selection).lean(),
      ]);

      for (const appointment of payments) {
        // Lease this attempt before talking to the gateway. A restart can pick it
        // up again after the lease expires, including after a successful verify.
        const age = +now - +(appointment.payment?.startedAt ?? now);
        const delay = age < 30 * minute ? minute : age < 24 * 60 * minute ? 10 * minute : 60 * minute;
        const claimed = await Appointment.updateOne(
          { ...pending, _id: appointment._id, "payment.authority": appointment.payment?.authority },
          { $set: { "payment.nextCheckAt": new Date(Date.now() + delay) } },
          { timestamps: false },
        );
        if (claimed.modifiedCount) await reconcileAppointmentPayment(appointment);
      }
      const attempted = await Promise.allSettled(notices.map(sendAppointmentPaidNotices));
      if (attempted.some((notice) => notice.status === "rejected")) {
        console.error("appointment.payment.notification_retry");
      }
    } catch {
      console.error("appointment.payment.recovery_retry");
    } finally {
      setTimeout(() => void run(), minute).unref();
    }
  }

  // Existing pending attempts predate nextCheckAt. Seed them without
  // touching updatedAt, which the appointment editor uses for concurrency.
  async function start() {
    try {
      await dbConnect();
      await Appointment.updateMany(
        { "payment.status": "pending", "payment.authority": { $type: "string" }, "payment.nextCheckAt": null },
        { $set: { "payment.nextCheckAt": new Date(0) } },
        { timestamps: false },
      );
    } catch {
      console.error("appointment.payment.recovery_init_retry");
      setTimeout(() => void start(), minute).unref();
      return;
    }
    void run();
  }

  void start();
}
