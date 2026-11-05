// Run after npm run build. Uses only a local server and synthetic signed sessions.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { encode } = require("next-auth/jwt");
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://127.0.0.1:3107";
const secret = randomBytes(32).toString("hex");
const id = "a".repeat(24);

function files(directory) {
  return readdirSync(`${root}${directory}`, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(path) : [path];
  });
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3107", "-H", "127.0.0.1"], {
  cwd: root,
  env: {
    ...process.env,
    NEXTAUTH_URL: base,
    NEXTAUTH_SECRET: secret,
    // Never allow a regression in authorization to reach a real database.
    MONGODB_URI: "mongodb://127.0.0.1:1/admin_access_synthetic?serverSelectionTimeoutMS=1000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (data) => { logs += data; });
server.stderr.on("data", (data) => { logs += data; });

try {
  for (let i = 0; i < 100 && !logs.includes("Ready in") && server.exitCode === null; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(logs.includes("Ready in"), `Local server failed to start:\n${logs}`);
  const cookies = {};
  for (const role of ["admin", "user", "superadmin"]) {
    cookies[role] = `next-auth.session-token=${await encode({ secret, token: { id, role }, maxAge: 600 })}`;
  }

  let apiChecks = 0;
  let pageChecks = 0;
  for (const path of files("app/api/admin").filter((path) => path.endsWith("/route.ts"))) {
    const source = readFileSync(`${root}${path}`, "utf8");
    if (!/\brequireAdmin\(/.test(source)) continue;
    const url = `${base}/${path.replace(/^app\//, "").replace(/\/route.ts$/, "").replaceAll("[id]", id)}`;
    for (const [, method] of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)) {
      for (const role of ["admin", "user", null]) {
        const response = await fetch(url, {
          method, redirect: "manual",
          headers: { ...(role ? { cookie: cookies[role] } : {}), "Content-Type": "application/json" },
          ...(method === "GET" ? {} : { body: "{}" }),
        });
        assert.equal(response.status, role === null ? 401 : 403, `${role}: ${method} ${url}`);
        await response.arrayBuffer();
        apiChecks++;
      }
    }
  }
  for (const path of ["/dashboard/loyalty", "/dashboard/appointments", "/dashboard/shipping", "/dashboard/orders"]) {
    const response = await fetch(base + path, { headers: { cookie: cookies.admin }, redirect: "manual" });
    assert.equal(response.status, 307, path);
    assert.equal(new URL(response.headers.get("location")).pathname, "/dashboard/store-order");
    await response.arrayBuffer();
    pageChecks++;
  }
  for (const role of ["admin", "superadmin"]) {
    for (const path of ["/dashboard/store-order", "/dashboard/notifications"]) {
      const response = await fetch(base + path, { headers: { cookie: cookies[role] }, redirect: "manual" });
      assert.equal(response.status, 200, `${role}: ${path}`);
      await response.arrayBuffer();
      pageChecks++;
    }
  }
  console.log(JSON.stringify({ apiChecks, pageChecks, sessions: "synthetic JWTs verified by NextAuth" }));
} finally {
  server.kill("SIGTERM");
}
