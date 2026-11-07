export type SafePrinterDevice = {
  deviceId: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  tokenVersion: number;
  lastSeenAt?: Date | string | null;
  lastRotatedAt?: Date | string | null;
  deactivatedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function serializePrinterDevice(
  device: SafePrinterDevice & Record<string, unknown>,
): SafePrinterDevice {
  return {
    deviceId: String(device.deviceId),
    name: String(device.name),
    scopes: Array.isArray(device.scopes) ? device.scopes.map(String) : [],
    isActive: Boolean(device.isActive),
    tokenVersion: Number(device.tokenVersion),
    lastSeenAt: device.lastSeenAt ?? null,
    lastRotatedAt: device.lastRotatedAt ?? null,
    deactivatedAt: device.deactivatedAt ?? null,
    createdAt: device.createdAt as Date | string | undefined,
    updatedAt: device.updatedAt as Date | string | undefined,
  };
}
