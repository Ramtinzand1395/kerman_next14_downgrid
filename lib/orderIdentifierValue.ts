export function buildOrderIdentifiers(orderId: unknown) {
  const compact = String(orderId).replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  const suffix = compact.slice(-12).padStart(12, "0");

  return {
    invoiceNumber: `KA-I-${suffix}`,
    trackingCode: `KA-O-${suffix}`,
  };
}
