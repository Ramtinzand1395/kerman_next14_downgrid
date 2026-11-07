import test from "node:test";
import assert from "node:assert/strict";
import { validatePrintDeploymentEnv } from "./scripts/preflight-print-api.mjs";

const base = {
  PRINT_DEPLOYMENT_TARGET: "staging",
  PRINT_API_AUTH_MODE: "required",
  PRINT_TOKEN_PEPPER: "x".repeat(32),
  PRINT_CLIENT_AUTH_READY: "true",
  PRINT_STAGING_BASE_URL: "https://printer-staging.example.test",
  PRINT_PRODUCTION_BASE_URL: "https://printer.example.test",
};

test("local builds without printer deploy configuration remain available", () => {
  assert.equal(validatePrintDeploymentEnv({}).ok, true);
  assert.equal(validatePrintDeploymentEnv({}).skipped, true);
});

test("deployment fails closed when printer mode or pepper is missing", () => {
  const result = validatePrintDeploymentEnv({
    NEXT_DEPLOY_VALIDATED_SHA: "a".repeat(40),
  });
  assert.equal(result.ok, false);
  assert.match(result.messages.join(" "), /PRINT_API_AUTH_MODE/);
  assert.match(result.messages.join(" "), /PRINT_TOKEN_PEPPER/);
});

test("required mode needs an authenticated client acknowledgement", () => {
  const result = validatePrintDeploymentEnv({
    ...base,
    PRINT_DEPLOYMENT_TARGET: "production",
    PRINT_CLIENT_AUTH_READY: "false",
    PRINT_PRODUCTION_ROLLOUT_ACK: "legacy-client-verified",
  });
  assert.equal(result.ok, false);
  assert.match(result.messages.join(" "), /PRINT_CLIENT_AUTH_READY=true/);
  assert.match(result.messages.join(" "), /authenticated-client-verified/);
});

test("production compatibility rollout requires explicit legacy verification", () => {
  const result = validatePrintDeploymentEnv({
    ...base,
    PRINT_DEPLOYMENT_TARGET: "production",
    PRINT_API_AUTH_MODE: "compatibility",
    PRINT_CLIENT_AUTH_READY: "false",
    PRINT_PRODUCTION_ROLLOUT_ACK: "legacy-client-verified",
  });
  assert.equal(result.ok, true);
});

test("staging and production origins cannot be the same", () => {
  const result = validatePrintDeploymentEnv({
    ...base,
    PRINT_PRODUCTION_BASE_URL: base.PRINT_STAGING_BASE_URL,
  });
  assert.equal(result.ok, false);
  assert.match(result.messages.join(" "), /must be different/);
});
