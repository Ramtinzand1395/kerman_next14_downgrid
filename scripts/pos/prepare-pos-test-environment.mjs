import { createHash, generateKeyPairSync, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { MongoClient } from "mongodb";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, "../..");
const SERVER_SECRET_FILE_NAME = ".env.pos-test.local";
const DEVICE_SECRET_FILE_NAME = ".env.pos-test-device.local";
const SERVER_SECRET_FILE = resolve(REPOSITORY_ROOT, SERVER_SECRET_FILE_NAME);
const DEVICE_SECRET_FILE = resolve(REPOSITORY_ROOT, DEVICE_SECRET_FILE_NAME);
const TEST_DATABASE_PATTERN = /(^|[-_.])(test|testing|staging|stage|dev|development)([-_.]|$)/i;
const TEST_DEVICE_ID = "pos-integration-test-01";
const TEST_DEVICE_KEY_ID = "pos-integration-test-01-key-1";
const PROBE_COLLECTION = "PosIntegrationProbe";

class SafePosTestError extends Error {
  constructor(message) {
    super(message);
    this.name = "SafePosTestError";
  }
}

function fail(message) {
  throw new SafePosTestError(message);
}

function parseMongoUri(uri) {
  const value = typeof uri === "string" ? uri.trim() : "";
  const match = /^(mongodb(?:\+srv)?):\/\/([^/]+)(?:\/([^?#]*))?(?:\?[^#]*)?$/.exec(
    value,
  );
  if (!match) fail("MongoDB URI is missing or malformed.");

  const authority = match[2];
  const hostPart = (
    authority.includes("@")
      ? authority.slice(authority.lastIndexOf("@") + 1)
      : authority
  )
    .toLowerCase()
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
    .sort()
    .join(",");
  if (!hostPart) fail("MongoDB URI has no host.");

  let databaseName;
  try {
    databaseName = decodeURIComponent(match[3] ?? "").trim();
  } catch {
    fail("MongoDB database name is not valid percent-encoded text.");
  }
  if (!databaseName || databaseName.includes("/") || /\s/.test(databaseName)) {
    fail("MongoDB URI must include an explicit database name.");
  }

  const normalizedHost = `${match[1]}://${hostPart}`;
  const fingerprint = createHash("sha256")
    .update(`${normalizedHost}|${databaseName.toLowerCase()}`, "utf8")
    .digest("hex");

  return {
    protocol: match[1],
    databaseName,
    normalizedHost,
    fingerprint,
    hasTestMarker: TEST_DATABASE_PATTERN.test(databaseName),
  };
}

function redactedMetadata(uri) {
  if (!uri?.trim()) {
    return {
      present: false,
      protocol: null,
      databaseName: null,
      databaseNameExplicit: false,
      environmentMarker: "UNKNOWN",
      hostFingerprint: null,
    };
  }

  try {
    const parsed = parseMongoUri(uri);
    return {
      present: true,
      protocol: parsed.protocol,
      databaseName: parsed.hasTestMarker ? parsed.databaseName : "<redacted>",
      databaseNameExplicit: true,
      environmentMarker: parsed.hasTestMarker ? "TEST/STAGING/DEV" : "UNKNOWN",
      hostFingerprint: `sha256:${parsed.fingerprint.slice(0, 16)}`,
    };
  } catch {
    return {
      present: true,
      protocol: "UNRECOGNIZED",
      databaseName: null,
      databaseNameExplicit: false,
      environmentMarker: "UNKNOWN",
      hostFingerprint: null,
    };
  }
}

function assertSecretFilesIgnored() {
  for (const fileName of [SERVER_SECRET_FILE_NAME, DEVICE_SECRET_FILE_NAME]) {
    const result = spawnSync(
      "git",
      ["check-ignore", "--quiet", "--", fileName],
      { cwd: REPOSITORY_ROOT, stdio: "ignore", windowsHide: true },
    );
    if (result.status !== 0) {
      fail(`${fileName} is not ignored by Git.`);
    }
  }
}

function pemPair() {
  const pair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return { privateKey: pair.privateKey, publicKey: pair.publicKey };
}

function envValue(value) {
  return JSON.stringify(value);
}

function prepareSecrets() {
  assertSecretFilesIgnored();
  for (const file of [SERVER_SECRET_FILE, DEVICE_SECRET_FILE]) {
    if (existsSync(file)) {
      fail("A POS test secret file already exists; refusing to overwrite test keys.");
    }
  }

  const server = pemPair();
  const device = pemPair();
  const serverLines = [
    "# Local-only POS server test configuration. Never commit this file.",
    "POS_ENVIRONMENT=test",
    "POS_ACCESS_TOKEN_ISSUER=kermanatari-pos",
    "POS_ACCESS_TOKEN_AUDIENCE=kermanatari-api",
    `POS_ACCESS_TOKEN_PRIVATE_KEY=${envValue(server.privateKey)}`,
    `POS_ACCESS_TOKEN_PUBLIC_KEY=${envValue(server.publicKey)}`,
    "MONGODB_POS_TEST_URI=",
    `POS_TEST_DEVICE_ID=${TEST_DEVICE_ID}`,
    `POS_TEST_DEVICE_KEY_ID=${TEST_DEVICE_KEY_ID}`,
    "POS_TEST_DEVICE_SCOPES=catalog:read",
    `POS_TEST_DEVICE_PUBLIC_KEY=${envValue(device.publicKey)}`,
    "",
  ];
  const deviceLines = [
    "# Local-only POS client device credentials. Never load this file into the server.",
    `POS_TEST_DEVICE_ID=${TEST_DEVICE_ID}`,
    `POS_TEST_DEVICE_KEY_ID=${TEST_DEVICE_KEY_ID}`,
    "POS_TEST_DEVICE_SCOPES=catalog:read",
    `POS_TEST_DEVICE_PRIVATE_KEY=${envValue(device.privateKey)}`,
    `POS_TEST_DEVICE_PUBLIC_KEY=${envValue(device.publicKey)}`,
    "",
  ];

  const serverTemporaryFile = `${SERVER_SECRET_FILE}.${process.pid}.${randomUUID()}.tmp`;
  const deviceTemporaryFile = `${DEVICE_SECRET_FILE}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(serverTemporaryFile, serverLines.join("\n"), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    writeFileSync(deviceTemporaryFile, deviceLines.join("\n"), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    renameSync(serverTemporaryFile, SERVER_SECRET_FILE);
    renameSync(deviceTemporaryFile, DEVICE_SECRET_FILE);
    chmodSync(SERVER_SECRET_FILE, 0o600);
    chmodSync(DEVICE_SECRET_FILE, 0o600);
  } catch (error) {
    if (existsSync(serverTemporaryFile)) unlinkSync(serverTemporaryFile);
    if (existsSync(deviceTemporaryFile)) unlinkSync(deviceTemporaryFile);
    if (existsSync(SERVER_SECRET_FILE) && !existsSync(DEVICE_SECRET_FILE)) {
      unlinkSync(SERVER_SECRET_FILE);
    }
    throw error;
  }

  console.log(
    JSON.stringify({
      secretFiles: {
        server: SERVER_SECRET_FILE_NAME,
        deviceClient: DEVICE_SECRET_FILE_NAME,
      },
      gitIgnored: true,
      posEnvironment: "test",
      serverSigningKeys: "READY",
      testDevice: {
        deviceId: TEST_DEVICE_ID,
        scopes: ["catalog:read"],
        privateKeyStoredInMongoDb: false,
        status: "READY",
      },
      dedicatedDatabaseUri: "NOT CONFIGURED",
    }),
  );
}

function assertSafeTestDatabaseConfiguration() {
  if (process.env.POS_ENVIRONMENT !== "test") {
    fail("POS_ENVIRONMENT must equal test.");
  }

  const testUri = process.env.MONGODB_POS_TEST_URI?.trim();
  if (!testUri) {
    fail("MONGODB_POS_TEST_URI is required; MONGODB_URI is never used as fallback.");
  }
  const test = parseMongoUri(testUri);
  if (!test.hasTestMarker) {
    fail("Test database name must explicitly contain test, staging, or dev.");
  }

  const currentUri = process.env.MONGODB_URI?.trim();
  if (currentUri) {
    const current = parseMongoUri(currentUri);
    if (current.normalizedHost === test.normalizedHost) {
      fail("Dedicated test MongoDB host must differ from the current project host.");
    }
  }

  return { testUri, test };
}

function sameIndexKey(left, right) {
  return JSON.stringify(Object.entries(left)) === JSON.stringify(Object.entries(right));
}

function sameRequiredOptions(actual, expected) {
  if (Boolean(actual.unique) !== Boolean(expected.unique)) return false;
  if ("expireAfterSeconds" in expected) {
    return actual.expireAfterSeconds === expected.expireAfterSeconds;
  }
  return true;
}

async function expectedPosAuthIndexes() {
  const [{ default: PosDevice }, { default: PosAuthChallenge }, { default: PosAuthRateLimit }] =
    await Promise.all([
      import("../../model/PosDevice.ts"),
      import("../../model/PosAuthChallenge.ts"),
      import("../../model/PosAuthRateLimit.ts"),
    ]);

  return [PosDevice, PosAuthChallenge, PosAuthRateLimit].map((model) => ({
    modelName: model.modelName,
    collectionName: model.collection.collectionName,
    indexes: model.schema.indexes(),
  }));
}

async function verifyPosAuthIndexes(database) {
  const results = [];
  for (const model of await expectedPosAuthIndexes()) {
    const collection = database.collection(model.collectionName);
    let actual = [];
    try {
      actual = await collection.listIndexes().toArray();
    } catch (error) {
      if (error?.codeName !== "NamespaceNotFound") throw error;
    }

    for (const [key, options] of model.indexes) {
      const sameKey = actual.find((index) => sameIndexKey(index.key, key));
      if (sameKey && !sameRequiredOptions(sameKey, options)) {
        fail(`Index options do not match the ${model.modelName} schema.`);
      }
      let match = actual.find(
        (index) => sameIndexKey(index.key, key) && sameRequiredOptions(index, options),
      );
      let status = "EXISTS";
      if (!match) {
        const createOptions = {};
        if (options.unique) createOptions.unique = true;
        if ("expireAfterSeconds" in options) {
          createOptions.expireAfterSeconds = options.expireAfterSeconds;
        }
        const name = await collection.createIndex(key, createOptions);
        status = "CREATED IN TEST";
        match = { name };
      }
      results.push({ model: model.modelName, key, status, name: match.name });
    }
  }
  return results;
}

async function assertDatabaseIsolation(database) {
  const forbidden = /product|order|user|payment|wallet|catalogchange|inventoryoperation/i;
  const collections = await database.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    if (!forbidden.test(name)) continue;
    const count = await database.collection(name).estimatedDocumentCount();
    if (count > 0) {
      fail("Dedicated test database contains populated business collections.");
    }
  }
}

async function transactionProbe(client, database, topology) {
  if (topology !== "replica-set" && topology !== "sharded") {
    return { status: "TRANSACTIONS UNSUPPORTED", topology };
  }

  const existing = await database
    .listCollections({ name: PROBE_COLLECTION }, { nameOnly: true })
    .hasNext();
  if (!existing) await database.createCollection(PROBE_COLLECTION);

  const probeId = `pos-tx-probe-${randomUUID()}`;
  const collection = database.collection(PROBE_COLLECTION);
  const session = client.startSession();
  try {
    session.startTransaction();
    await collection.insertOne({ _id: probeId, createdAt: new Date() }, { session });
    const inside = await collection.findOne({ _id: probeId }, { session });
    if (!inside) fail("Transaction probe could not read its own test document.");
    await session.abortTransaction();
    const persisted = await collection.findOne({ _id: probeId });
    if (persisted) fail("Transaction probe document remained after abort.");
    return { status: "TRANSACTIONS VERIFIED", topology, persistedAfterAbort: false };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction().catch(() => undefined);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function verifyDatabase() {
  const { testUri, test } = assertSafeTestDatabaseConfiguration();
  const client = new MongoClient(testUri, { appName: "kermanatari-pos-test-verifier" });
  try {
    await client.connect();
    const database = client.db(test.databaseName);
    const hello = await database.admin().command({ hello: 1 });
    const topology =
      hello.msg === "isdbgrid"
        ? "sharded"
        : typeof hello.setName === "string" && hello.setName
          ? "replica-set"
          : "standalone";

    await assertDatabaseIsolation(database);
    const transactions = await transactionProbe(client, database, topology);
    const indexes = await verifyPosAuthIndexes(database);

    console.log(
      JSON.stringify({
        environmentGuard: "PASS",
        database: {
          marker: "TEST/STAGING/DEV",
          fingerprint: `sha256:${test.fingerprint.slice(0, 16)}`,
        },
        transactions,
        indexes,
        authE2eExecuted: false,
      }),
    );
  } finally {
    await client.close();
  }
}

async function main() {
  const command = process.argv[2];
  if (command === "inspect-current") {
    console.log(JSON.stringify(redactedMetadata(process.env.MONGODB_URI)));
    return;
  }
  if (command === "prepare") {
    prepareSecrets();
    return;
  }
  if (command === "verify-db") {
    await verifyDatabase();
    return;
  }

  fail("Usage: prepare-pos-test-environment.mjs <inspect-current|prepare|verify-db>");
}

main().catch((error) => {
  const safeMessage =
    error instanceof SafePosTestError
      ? error.message
      : "POS test preparation failed without exposing connection details.";
  console.error(
    JSON.stringify({
      status: "BLOCKED",
      errorType: error instanceof Error ? error.name : "UnknownError",
      message: safeMessage,
    }),
  );
  process.exitCode = 1;
});
