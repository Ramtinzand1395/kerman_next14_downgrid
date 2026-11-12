import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const id = "a".repeat(24);
const sessionFor = (role) => role === null ? null : { user: { id, role } };

function filesUnder(directory) {
  return readdirSync(new URL(directory, import.meta.url), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

// Execute the actual handlers and auth helper, replacing only their I/O dependencies.
function load(path, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)((name) => {
    if (Object.hasOwn(deps, name)) return deps[name];
    if (name === "@/lib/dashboard-access") return load("./lib/dashboard-access.ts");
    if (name === "@/types/loyalty") return load("./types/loyalty.ts");
    // Unused business dependencies must never be reached by denied requests.
    if (name.startsWith("@/")) return { __esModule: true, default: {} };
    return require(name);
  }, module, module.exports);
  return module.exports;
}

function authHarness(session) {
  let connections = 0;
  const deps = {
    "next-auth": { getServerSession: async () => session },
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/mongodb": async () => { connections++; },
  };
  const api = load("./lib/loyalty/api.ts", deps);
  return { api, deps: { ...deps, "@/lib/loyalty/api": api }, get connections() { return connections; } };
}

test("staff cannot invoke shipping management despite being redirected from its page", async () => {
  const h = authHarness(sessionFor("admin"));
  let reads = 0;
  const route = load("./app/api/admin/shipping-settings/route.ts", {
    ...h.deps,
    "@/lib/shippingSettings": { getStoreShippingSettings: async () => { reads++; return {}; } },
  });
  assert.equal((await route.GET()).status, 403);
  assert.equal(reads, 0);
});

test("staff cannot grant loyalty XP through a direct POST", async () => {
  const h = authHarness(sessionFor("admin"));
  let grants = 0;
  const route = load("./app/api/admin/loyalty/xp/route.ts", {
    ...h.deps,
    "@/lib/loyalty/experience.service": { grantXp: async () => { grants++; return { ok: true, totalXp: 100, level: 1 }; } },
  });
  const response = await route.POST(new Request("https://example.test/api/admin/loyalty/xp", {
    method: "POST", body: JSON.stringify({ userId: id, amount: 100, description: "Test grant" }),
  }));
  assert.equal(response.status, 403);
  assert.equal(grants, 0);
});

test("superadmin can still read settings and grant XP through actual handlers", async () => {
  const h = authHarness(sessionFor("superadmin"));
  let grants = 0;
  const settings = load("./app/api/admin/shipping-settings/route.ts", {
    ...h.deps, "@/lib/shippingSettings": { getStoreShippingSettings: async () => ({ version: 1 }) },
  });
  assert.equal((await settings.GET()).status, 200);
  const xp = load("./app/api/admin/loyalty/xp/route.ts", {
    ...h.deps,
    "@/lib/loyalty/experience.service": { grantXp: async () => { grants++; return { ok: true, totalXp: 100, level: 1 }; } },
  });
  const response = await xp.POST(new Request("https://example.test", {
    method: "POST", body: JSON.stringify({ userId: id, amount: 100, description: "Test grant" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(grants, 1);
});

test("staff online-order access is restricted to their own orders", async () => {
  for (const role of ["admin", "user", "superadmin"]) {
    let filter;
    const viewer = load("./lib/orderAccess.ts", {
      "@/model/Order": { findOne(query) {
        filter = query;
        const chain = { populate: () => chain, lean: async () => null };
        return chain;
      } },
    });
    await viewer.getOrderForViewer({ orderId: id, userId: "viewer-id", role, paidOnly: true });
    assert.equal(filter.user, role === "superadmin" ? undefined : "viewer-id", role);
    assert.equal(filter.paymentStatus, "paid");
  }
});

const managementRoutes = filesUnder("./app/api/admin").filter((path) =>
  path.endsWith("/route.ts") && /\b(?:requireAdmin|requireAppointmentOperator)\(/.test(readFileSync(new URL(path, import.meta.url), "utf8")),
);

for (const path of managementRoutes) {
  test(`all exported methods reject unauthorized sessions before I/O: ${path}`, async () => {
    const allowedStaff = path.startsWith("./app/api/admin/appointments/");
    const deniedRoles = [null, "user", "courier", "unknown", undefined, ...(allowedStaff ? [] : ["admin"])];
    for (const role of deniedRoles) {
      const h = authHarness(sessionFor(role));
      const route = load(path, h.deps);
      const methods = Object.keys(route).filter((method) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(method));
      assert.ok(methods.length > 0);
      for (const method of methods) {
        const { NextRequest } = require("next/server");
        const req = new NextRequest("https://example.test/api/admin/test", {
          method, ...(method === "GET" ? {} : { body: "{}" }),
        });
        const response = await route[method](req, { params: Promise.resolve({ id }) });
        assert.equal(response.status, role === null ? 401 : 403, `${method}, role=${role}`);
      }
      assert.equal(h.connections, 0, "denied requests must not connect to MongoDB");
    }
  });
}

test("management auth accepts only identified superadmins", async () => {
  for (const session of [null, { user: { role: "superadmin" } }, sessionFor("admin"), sessionFor("superadmin")]) {
    const h = authHarness(session);
    const result = await h.api.requireAdmin();
    if (!session?.user?.id) assert.equal(result.error.status, 401);
    else if (session.user.role !== "superadmin") assert.equal(result.error.status, 403);
    else assert.equal(result.userId, id);
    assert.equal(h.connections, session?.user?.id && session.user.role === "superadmin" ? 1 : 0);
  }
});

test("appointment operations admit staff while settings and reward rules stay owner-only", async () => {
  for (const role of [null, "user", "courier", "admin", "superadmin"]) {
    const h = authHarness(sessionFor(role));
    const operations = await h.api.requireAppointmentOperator();
    if (role === "admin" || role === "superadmin") assert.equal(operations.userId, id);
    else assert.equal(operations.error.status, role === null ? 401 : 403);
    if (role === "admin") {
      for (const path of ["appointment-settings", "visit-reward-rules"]) {
        const route = load(`./app/api/admin/${path}/route.ts`, h.deps);
        assert.equal((await route.GET()).status, 403);
      }
    }
  }
});

test("middleware enforces the role matrix on every dashboard page and exact path boundaries", () => {
  const middleware = load("./middleware.ts", {
    "next-auth/middleware": { withAuth: (handler, options) => {
      assert.equal(options.callbacks.authorized({ token: null }), false);
      assert.equal(options.callbacks.authorized({ token: { role: "admin" } }), true);
      return handler;
    } },
  }).default;
  const pages = filesUnder("./app/(dashboard)/dashboard").filter((path) => path.endsWith("/page.tsx"))
    .map((path) => path.replace("./app/(dashboard)", "").replace("/page.tsx", ""));
  pages.push("/dashboard/store-order-export", "/dashboard/notifications-legacy");
  for (const role of ["superadmin", "admin", "user", "courier", undefined]) {
    for (const pathname of pages) {
      const allowed = role === "superadmin" || (role === "admin" && (
        pathname === "/dashboard/notifications" || pathname === "/dashboard/store-order" ||
        pathname === "/dashboard/appointments" ||
        pathname.startsWith("/dashboard/store-order/")
      ));
      const response = middleware({ nextauth: { token: { role } }, nextUrl: { pathname }, url: `https://example.test${pathname}` });
      assert.equal(response.status, allowed ? 200 : 307, `${role}: ${pathname}`);
      if (!allowed) assert.equal(new URL(response.headers.get("location")).pathname, role === "admin" ? "/dashboard/store-order" : "/");
    }
  }
});

test("staff and superadmin retain in-store order editing; other sessions are rejected", async () => {
  for (const role of ["admin", "superadmin", "user", null]) {
    const h = authHarness(sessionFor(role));
    let saves = 0;
    const route = load("./app/api/admin/store-order/[orderId]/route.ts", {
      ...h.deps,
      "@/model/StoreOrder": { findById: async () => ({ save: async () => { saves++; } }) },
    });
    const response = await route.PUT(new Request("https://example.test", {
      method: "PUT", body: JSON.stringify({ list: [], price: 100000, consoleType: "PS5" }),
    }), { params: Promise.resolve({ orderId: id }) });
    const allowed = role === "admin" || role === "superadmin";
    assert.equal(response.status, allowed ? 200 : role === null ? 401 : 403);
    assert.equal(saves, allowed ? 1 : 0);
  }
});

test("online order API hides another customer's order while preserving owner and superadmin access", async () => {
  const order = { _id: id, user: "customer-id", paymentStatus: "pending" };
  for (const [role, viewerId, status] of [
    ["admin", "staff-id", 404], ["user", "other-id", 404],
    ["admin", "customer-id", 200], ["user", "customer-id", 200], ["superadmin", "owner-id", 200],
  ]) {
    const viewer = load("./lib/orderAccess.ts", {
      "@/model/Order": { findOne(query) {
        const chain = { populate: () => chain, lean: async () => query.user && query.user !== order.user ? null : order };
        return chain;
      } },
      "@/lib/orderDto": { toOrderDto: (value) => value },
    });
    const h = authHarness({ user: { id: viewerId, role } });
    const route = load("./app/api/profile/orders/[orderId]/route.ts", {
      ...h.deps, "@/lib/orderAccess": viewer,
    });
    const response = await route.GET(new Request("https://example.test"), { params: { orderId: id } });
    assert.equal(response.status, status, `${role}: ${viewerId}`);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  }
});
