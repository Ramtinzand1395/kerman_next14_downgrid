export type AddressSnapshot = {
  province: string;
  city: string;
  address: string;
  plaque?: string;
  unit?: string;
  postalCode?: string;
  recipientName?: string;
  recipientMobile?: string;
};

type AddressLike = {
  province?: unknown;
  city?: unknown;
  address?: unknown;
  plaque?: unknown;
  unit?: unknown;
  postalCode?: unknown;
  recipientName?: unknown;
  recipientMobile?: unknown;
};

/** Creates an immutable, plain-object copy for historical order records. */
export function createAddressSnapshot(
  address: AddressLike,
  recipient?: { name?: unknown; mobile?: unknown },
): AddressSnapshot {
  return {
    province: String(address.province ?? ""),
    city: String(address.city ?? ""),
    address: String(address.address ?? ""),
    plaque: String(address.plaque ?? ""),
    unit: String(address.unit ?? ""),
    postalCode: String(address.postalCode ?? ""),
    recipientName: String(address.recipientName ?? recipient?.name ?? ""),
    recipientMobile: String(address.recipientMobile ?? recipient?.mobile ?? ""),
  };
}
