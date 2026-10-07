export interface ShippingDestination {
  province: unknown;
  city: unknown;
}

export class InvalidShippingDestinationError extends Error {
  constructor() {
    super("آدرس ارسال معتبر نیست.");
    this.name = "InvalidShippingDestinationError";
  }
}

interface ShippingRate {
  province: string;
  city: string;
  cost: number;
}

// No province/city-specific rates currently exist in the project. Keep the
// existing checkout policy (free shipping) server-side until business rates
// are defined; future rates belong in this single table, not payment routes.
const SHIPPING_RATES: readonly ShippingRate[] = [];
const DEFAULT_SHIPPING_COST = 0;

export function calculateShippingCost(
  destination: ShippingDestination,
): number {
  const province =
    typeof destination.province === "string"
      ? destination.province.trim()
      : "";
  const city =
    typeof destination.city === "string" ? destination.city.trim() : "";

  if (!province || !city) {
    throw new InvalidShippingDestinationError();
  }

  const configuredRate = SHIPPING_RATES.find(
    (rate) => rate.province === province && rate.city === city,
  );

  return configuredRate?.cost ?? DEFAULT_SHIPPING_COST;
}
