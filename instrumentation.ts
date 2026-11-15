export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.APPOINTMENT_PAYMENT_RECOVERY === "true"
  ) {
    const { startAppointmentPaymentRecovery } = await import("./lib/appointments/payment-recovery-worker");
    startAppointmentPaymentRecovery();
  }
}
