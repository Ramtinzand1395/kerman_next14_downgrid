export function tomanToIrr(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("مبلغ تومان باید یک عدد صحیح و ایمن باشد.");
  }
  const rial = value * 10;
  if (!Number.isSafeInteger(rial)) {
    throw new Error("مبلغ ریال از محدوده عدد صحیح ایمن خارج است.");
  }
  return rial;
}
