import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

function deploymentTarget(env) {
  const inferred = env.NEXT_DEPLOY_VALIDATED_SHA ? "production" : "local";
  const raw = (env.PRINT_DEPLOYMENT_TARGET || env.VERCEL_ENV || inferred)
    .trim()
    .toLowerCase();
  if (raw === "preview") return "staging";
  if (raw === "development") return "local";
  return raw;
}

function loadBuildEnvironment() {
  for (const path of [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env",
  ]) {
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function validatePrintDeploymentEnv(env) {
  const target = deploymentTarget(env);
  const configured = [
    env.PRINT_API_AUTH_MODE,
    env.PRINT_TOKEN_PEPPER,
    env.PRINT_CLIENT_AUTH_READY,
  ].some((value) => Boolean(value));

  if (target === "local" && !configured) {
    return {
      ok: true,
      skipped: true,
      messages: ["Local build: printer deployment preflight skipped."],
    };
  }

  const errors = [];
  const mode = env.PRINT_API_AUTH_MODE?.trim().toLowerCase();
  if (mode !== "compatibility" && mode !== "required") {
    errors.push("PRINT_API_AUTH_MODE must be compatibility or required.");
  }

  if (Buffer.byteLength(env.PRINT_TOKEN_PEPPER?.trim() || "", "utf8") < 32) {
    errors.push("PRINT_TOKEN_PEPPER must contain at least 32 bytes.");
  }

  const clientReady = env.PRINT_CLIENT_AUTH_READY?.trim().toLowerCase();
  if (clientReady !== "true" && clientReady !== "false") {
    errors.push("PRINT_CLIENT_AUTH_READY must be explicitly true or false.");
  }
  if (mode === "required" && clientReady !== "true") {
    errors.push("required mode needs PRINT_CLIENT_AUTH_READY=true.");
  }

  const stagingOrigin = httpsOrigin(env.PRINT_STAGING_BASE_URL);
  const productionOrigin = httpsOrigin(env.PRINT_PRODUCTION_BASE_URL);
  if (!stagingOrigin) {
    errors.push("PRINT_STAGING_BASE_URL must be an HTTPS origin.");
  }
  if (!productionOrigin) {
    errors.push("PRINT_PRODUCTION_BASE_URL must be an HTTPS origin.");
  }
  if (stagingOrigin && productionOrigin && stagingOrigin === productionOrigin) {
    errors.push("Staging and production printer origins must be different.");
  }

  if (target === "production") {
    const acknowledgement = env.PRINT_PRODUCTION_ROLLOUT_ACK?.trim();
    const expected =
      mode === "required"
        ? "authenticated-client-verified"
        : "legacy-client-verified";
    if (acknowledgement !== expected) {
      errors.push(`PRINT_PRODUCTION_ROLLOUT_ACK must equal ${expected}.`);
    }
  } else if (!['staging', 'local'].includes(target)) {
    errors.push("PRINT_DEPLOYMENT_TARGET must be local, staging, or production.");
  }

  return { ok: errors.length === 0, skipped: false, messages: errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadBuildEnvironment();
  const result = validatePrintDeploymentEnv(process.env);
  if (!result.ok) {
    console.error("Printer deployment preflight failed:");
    for (const message of result.messages) console.error(`- ${message}`);
    process.exitCode = 1;
  } else {
    console.log(result.messages[0] || "Printer deployment preflight passed.");
  }
}
