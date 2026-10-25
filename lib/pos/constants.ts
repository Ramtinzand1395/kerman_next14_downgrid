export const POS_SCOPES = [
  "catalog",
  "inventory",
  "sales",
  "orders",
  "refunds",
] as const;

export type PosScope = (typeof POS_SCOPES)[number];

export const POS_DEVICE_ID_HEADER = "x-pos-device-id";
export const POS_TOKEN_PREFIX = "kpos_v1_";
export const POS_DEVICE_ID_PATTERN =
  /^pos_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPosScope(value: unknown): value is PosScope {
  return (
    typeof value === "string" &&
    (POS_SCOPES as readonly string[]).includes(value)
  );
}
