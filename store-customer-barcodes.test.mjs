import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import mongoose from "mongoose";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadRoute(path, dependencies) {
  const module = { exports: {} };
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  new Function("require", "module", "exports", outputText)(
    (name) => dependencies[name] ?? require(name),
    module,
    module.exports,
  );
  return module.exports;
}

test("manual orders use one customer record and enforce unique device barcodes in MongoDB", {
  skip: process.env.STORE_CUSTOMER_LOCAL_MONGO_TESTS !== "true",
  timeout: 180_000,
}, async (t) => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.24" },
    instance: { ip: "127.0.0.1", args: ["--nounixsocket"] },
  });
  t.after(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      await mongo.stop();
    }
  });
  await mongoose.connect(mongo.getUri("store_customer_test"));

  const { default: Customer } = await import("./model/Customer.ts");
  const dependencies = {
    "@/model/Customer": Customer,
    "@/lib/mongodb": async () => {},
    "@/lib/store-customer-barcodes": await import("./lib/store-customer-barcodes.ts"),
    "@/validations/validation": await import("./validations/validation.ts"),
    "@/app/api/auth/[...nextauth]/options": { authOptions: {} },
    "next-auth": { getServerSession: async () => ({ user: { role: "admin" } }) },
  };
  const { GET, POST } = loadRoute("./app/api/admin/store-order/customer/route.ts", dependencies);
  const { PUT } = loadRoute("./app/api/admin/store-order/customer/[customerId]/route.ts", dependencies);

  const url = "http://localhost/api/admin/store-order/customer";
  const request = (method, body) => new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const first = { mobile: "09123456789", lastName: "آزمایشی", sex: "مرد" };
  const second = { ...first, mobile: "09123456788" };
  const firstResponse = await POST(request("POST", first));
  assert.equal(firstResponse.status, 201);
  assert.equal((await POST(request("POST", second))).status, 201);
  const { data: customer } = await firstResponse.json();

  for (const barcode of ["000A", "B-02", "000A"]) {
    assert.equal((await POST(request("POST", { mobile: first.mobile, barcode }))).status, 200);
  }
  assert.equal(await Customer.countDocuments(), 2);
  const lookup = await GET(new Request(url + "?barcode=000A"));
  assert.equal(lookup.status, 200);
  assert.equal((await lookup.json()).data._id, customer._id);
  assert.equal((await POST(request("POST", { mobile: second.mobile, barcode: "000A" }))).status, 409);

  const params = { params: Promise.resolve({ customerId: customer._id }) };
  const update = await PUT(request("PUT", {
    customer: { ...customer, barcodes: ["C-03"] },
    previousBarcodes: ["000A", "B-02"],
  }), params);
  assert.equal(update.status, 200);
  assert.deepEqual((await update.json()).data.barcodes, ["C-03"]);
  assert.equal((await GET(new Request(url + "?barcode=000A"))).status, 400);
  assert.equal((await POST(request("POST", { mobile: second.mobile, barcode: "000A" }))).status, 200);

  const staleUpdate = await PUT(request("PUT", {
    customer: { ...customer, barcodes: [] },
    previousBarcodes: ["000A", "B-02"],
  }), params);
  assert.equal(staleUpdate.status, 409);
});
