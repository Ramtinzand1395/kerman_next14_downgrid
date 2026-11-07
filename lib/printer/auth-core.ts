import {
  getDeviceClientIp,
  readBearerToken,
} from "../device-auth/request.ts";
import type { PrintAuthMode, PrinterScope } from "./constants.ts";
import { isValidPrinterTokenFormat } from "./token.ts";

export type PrinterAuthDevice = {
  deviceId: string;
  name: string;
  scopes: PrinterScope[];
  isActive: boolean;
  tokenVersion: number;
};

export type PrinterAuthFailure = {
  ok: false;
  status: 401 | 403 | 429 | 500 | 503;
  code:
    | "PRINTER_UNAUTHORIZED"
    | "PRINTER_SCOPE_FORBIDDEN"
    | "PRINTER_RATE_LIMITED"
    | "PRINTER_AUTH_UNAVAILABLE"
    | "PRINT_AUTH_MODE_UNCONFIGURED";
  retryAfterSeconds?: number;
};

export type PrinterAuthSuccess = {
  ok: true;
  status: 200;
  device: PrinterAuthDevice;
  compatibilityMode: boolean;
};

export type PrinterAuthResult = PrinterAuthFailure | PrinterAuthSuccess;

export type PrinterAuthDependencies = {
  authMode: () => PrintAuthMode | null;
  hashToken: (token: string) => string;
  findDevice: (tokenHash: string) => Promise<PrinterAuthDevice | null>;
  consumeRequestLimit: (
    key: string,
  ) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  consumeFailureLimit: (
    key: string,
  ) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  touchDevice: (deviceId: string) => Promise<void>;
};

const LEGACY_DEVICE: PrinterAuthDevice = {
  deviceId: "legacy-kerman-printer",
  name: "Legacy kermanPrinter compatibility client",
  scopes: ["queue:read", "queue:ack"],
  isActive: true,
  tokenVersion: 0,
};

const unauthorized = (): PrinterAuthFailure => ({
  ok: false,
  status: 401,
  code: "PRINTER_UNAUTHORIZED",
});

async function recordFailure(
  key: string,
  dependencies: PrinterAuthDependencies,
): Promise<PrinterAuthFailure> {
  const failureLimit = await dependencies.consumeFailureLimit(key);
  if (!failureLimit.allowed) {
    return {
      ok: false,
      status: 429,
      code: "PRINTER_RATE_LIMITED",
      retryAfterSeconds: failureLimit.retryAfterSeconds,
    };
  }
  return unauthorized();
}

export async function authenticatePrinterRequestCore(
  request: Request,
  requiredScopes: readonly PrinterScope[],
  dependencies: PrinterAuthDependencies,
): Promise<PrinterAuthResult> {
  const mode = dependencies.authMode();
  if (!mode) {
    return {
      ok: false,
      status: 503,
      code: "PRINT_AUTH_MODE_UNCONFIGURED",
    };
  }

  const clientIp = getDeviceClientIp(request);

  try {
    const requestLimit = await dependencies.consumeRequestLimit(clientIp);
    if (!requestLimit.allowed) {
      return {
        ok: false,
        status: 429,
        code: "PRINTER_RATE_LIMITED",
        retryAfterSeconds: requestLimit.retryAfterSeconds,
      };
    }

    const authorizationSupplied = request.headers.has("authorization");
    const token = readBearerToken(request);

    if (mode === "compatibility" && !authorizationSupplied) {
      return {
        ok: true,
        status: 200,
        device: LEGACY_DEVICE,
        compatibilityMode: true,
      };
    }

    if (!token || !isValidPrinterTokenFormat(token)) {
      return recordFailure(clientIp, dependencies);
    }

    const device = await dependencies.findDevice(dependencies.hashToken(token));
    if (!device || !device.isActive) {
      return recordFailure(clientIp, dependencies);
    }

    if (requiredScopes.some((scope) => !device.scopes.includes(scope))) {
      return {
        ok: false,
        status: 403,
        code: "PRINTER_SCOPE_FORBIDDEN",
      };
    }

    await dependencies.touchDevice(device.deviceId);
    return {
      ok: true,
      status: 200,
      device,
      compatibilityMode: false,
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "PRINTER_AUTH_UNAVAILABLE",
    };
  }
}

export function printerAuthResponse(result: PrinterAuthFailure): Response {
  const headers = new Headers({ "cache-control": "no-store" });
  if (result.retryAfterSeconds) {
    headers.set("retry-after", String(result.retryAfterSeconds));
  }
  return Response.json(
    { success: false, error: { code: result.code } },
    { status: result.status, headers },
  );
}
