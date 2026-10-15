export const POS_CATALOG_READ_SCOPE = "catalog:read" as const;

export type PosDevicePrincipal = {
  deviceId: string;
  scopes: readonly string[];
};

export type PosAuthorizationResult =
  | {
      ok: true;
      principal: PosDevicePrincipal;
    }
  | {
      ok: false;
      status: 401 | 403;
      code: "UNAUTHORIZED" | "FORBIDDEN";
      message: string;
    };

export type PosCredentialVerifier = {
  verify(token: string): Promise<PosDevicePrincipal | null>;
};

const unconfiguredPosCredentialVerifier: PosCredentialVerifier = {
  async verify() {
    return null;
  },
};

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match || match[1].length > 4096) return null;

  return match[1];
}

export async function requirePosDeviceScope(
  request: Request,
  requiredScope: string,
  verifier: PosCredentialVerifier = unconfiguredPosCredentialVerifier,
): Promise<PosAuthorizationResult> {
  const token = readBearerToken(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Valid POS credentials are required.",
    };
  }

  let principal: PosDevicePrincipal | null = null;
  try {
    principal = await verifier.verify(token);
  } catch {
    // Credential details and tokens must never be logged here.
    principal = null;
  }

  if (!principal || !principal.deviceId) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Valid POS credentials are required.",
    };
  }

  if (!principal.scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "The POS credential does not have the required scope.",
    };
  }

  return { ok: true, principal };
}
