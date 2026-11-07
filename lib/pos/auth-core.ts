import {
  POS_DEVICE_ID_HEADER,
  POS_DEVICE_ID_PATTERN,
  type PosScope,
} from "./constants.ts";
import { isValidPosTokenFormat } from "./token.ts";
import {
  getDeviceClientIp,
  readBearerToken,
} from "../device-auth/request.ts";

export type PosAuthDevice = {
  deviceId: string;
  name: string;
  scopes: PosScope[];
  isActive: boolean;
  tokenVersion: number;
};

export type PosAuthFailure = {
  ok: false;
  status: 401 | 403 | 429 | 500;
  code:
    | "POS_UNAUTHORIZED"
    | "POS_SCOPE_FORBIDDEN"
    | "POS_RATE_LIMITED"
    | "POS_AUTH_UNAVAILABLE";
  retryAfterSeconds?: number;
};

export type PosAuthSuccess = {
  ok: true;
  status: 200;
  device: PosAuthDevice;
};

export type PosAuthResult = PosAuthFailure | PosAuthSuccess;

export type PosAuthDependencies = {
  hashToken: (token: string) => string;
  findDevice: (
    deviceId: string,
    tokenHash: string,
  ) => Promise<PosAuthDevice | null>;
  consumeRequestLimit: (
    key: string,
  ) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  consumeFailureLimit: (
    key: string,
  ) => Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
  touchDevice: (deviceId: string) => Promise<void>;
};

const unauthorized = (): PosAuthFailure => ({
  ok: false,
  status: 401,
  code: "POS_UNAUTHORIZED",
});

export async function authenticatePosRequestCore(
  request: Request,
  requiredScopes: readonly PosScope[],
  dependencies: PosAuthDependencies,
): Promise<PosAuthResult> {
  const suppliedDeviceId = request.headers.get(POS_DEVICE_ID_HEADER)?.trim();
  const clientIp = getDeviceClientIp(request);
  // Key the pre-authentication limiter by source, not by attacker-controlled
  // device ids, so rotating fake ids cannot bypass brute-force protection.
  const rateLimitKey = clientIp;

  try {
    const requestLimit = await dependencies.consumeRequestLimit(rateLimitKey);
    if (!requestLimit.allowed) {
      return {
        ok: false,
        status: 429,
        code: "POS_RATE_LIMITED",
        retryAfterSeconds: requestLimit.retryAfterSeconds,
      };
    }

    const token = readBearerToken(request);
    if (
      !suppliedDeviceId ||
      !POS_DEVICE_ID_PATTERN.test(suppliedDeviceId) ||
      !token ||
      !isValidPosTokenFormat(token)
    ) {
      const failureLimit = await dependencies.consumeFailureLimit(rateLimitKey);
      if (!failureLimit.allowed) {
        return {
          ok: false,
          status: 429,
          code: "POS_RATE_LIMITED",
          retryAfterSeconds: failureLimit.retryAfterSeconds,
        };
      }
      return unauthorized();
    }

    const tokenHash = dependencies.hashToken(token);
    const device = await dependencies.findDevice(suppliedDeviceId, tokenHash);

    if (!device || !device.isActive) {
      const failureLimit = await dependencies.consumeFailureLimit(rateLimitKey);
      if (!failureLimit.allowed) {
        return {
          ok: false,
          status: 429,
          code: "POS_RATE_LIMITED",
          retryAfterSeconds: failureLimit.retryAfterSeconds,
        };
      }
      return unauthorized();
    }

    const missingScope = requiredScopes.some(
      (scope) => !device.scopes.includes(scope),
    );
    if (missingScope) {
      return {
        ok: false,
        status: 403,
        code: "POS_SCOPE_FORBIDDEN",
      };
    }

    await dependencies.touchDevice(device.deviceId);

    return { ok: true, status: 200, device };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "POS_AUTH_UNAVAILABLE",
    };
  }
}

export function posAuthResponse(result: PosAuthResult): Response {
  if (!result.ok) {
    const headers = new Headers({ "cache-control": "no-store" });
    if (result.retryAfterSeconds) {
      headers.set("retry-after", String(result.retryAfterSeconds));
    }
    return Response.json(
      { error: { code: result.code } },
      { status: result.status, headers },
    );
  }

  return Response.json(
    {
      apiVersion: "v1",
      device: {
        deviceId: result.device.deviceId,
        name: result.device.name,
        scopes: result.device.scopes,
        tokenVersion: result.device.tokenVersion,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
