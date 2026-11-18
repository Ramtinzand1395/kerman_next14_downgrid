import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const id = "a".repeat(24);
const mobile = "09123456789";

function load(path, dependencies) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  new Function("require", "module", "exports", outputText)(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), module, module.exports,
  );
  return module.exports;
}

const printPayload = load("./lib/print/payload.ts", {});
const storeOrderPayload = load("./lib/print/store-order-payload.ts", {
  "@/helpers/toPersianDate": load("./helpers/toPersianDate.ts", {}),
});


function loadOrderRoute({ StoreOrder, account, sendStoreOrderReceiptSms, printQueue }) {
  return load("./app/api/admin/store-order/route.ts", {
    "next-auth": { getServerSession: async () => ({ user: { id, role: "admin" } }) },
    "../../auth/[...nextauth]/options": { authOptions: {} },
    "@/lib/mongodb": async () => {},
    "@/model/Appointment": {},
    "@/lib/appointments/store-order": {},
    "@/lib/store-order-identity": {},
    "@/model/StoreOrder": StoreOrder,
    "@/lib/store-customer-barcodes": load("./lib/store-customer-barcodes.ts", {}),
    "@/lib/store-customer-account": account,
    "@/lib/sms/store-order": { sendStoreOrderReceiptSms },
    "@/lib/print/store-order-payload": storeOrderPayload,
    "@/lib/print/queue": printQueue,
  });
}

function request(fields = {}) {
  return new Request("http://localhost/api/admin/store-order", {
    method: "POST",
    headers: { "Idempotency-Key": "manual-order-12345678" },
    body: JSON.stringify({
      customerId: id, price: 1000, consoleType: "ps5",
      list: [{ name: "Game", price: 1000, size: 2 }], ...fields,
    }),
  });
}

function orderHarness({ rejectPrintOnce = false, missingOwner = false } = {}) {
  let savedOrder;
  let orderWrites = 0;
  const receipts = [];
  const printJobs = new Map();
  const owner = {
    _id: id, mobile, firstName: "رامتین", lastName: "ثبت نام",
    birthday: new Date("1996-04-20T00:00:00Z"),
    storeProfile: { lastName: "فروشگاه", birthday: "۱۴۰۵/۰۵/۱۷" },
  };
  const account = {
    ...load("./lib/store-customer-account.ts", { "@/model/User": {} }),
    findStoreCustomer: async () => missingOwner ? null : owner,
  };
  const StoreOrder = {
    findOne: async () => savedOrder,
    init: async () => {},
    async create(fields) {
      if (savedOrder) throw Object.assign(new Error("duplicate order"), { code: 11000 });
      orderWrites++;
      savedOrder = { ...fields, _id: id, createdAt: new Date(), toObject: () => ({ ...fields, _id: id }) };
      return savedOrder;
    },
  };
  const printQueue = load("./lib/print/queue.ts", {
    "@/lib/mongodb": async () => {},
    "@/model/PrintQueue": {
      async create(job) {
        assert.equal(job._id, savedOrder._id);
        if (rejectPrintOnce) {
          rejectPrintOnce = false;
          throw new Error("test printer unavailable");
        }
        if (printJobs.has(job._id)) {
          throw Object.assign(new Error("duplicate print job"), { code: 11000, keyPattern: { _id: 1 } });
        }
        printJobs.set(job._id, job);
      },
    },
    "./payload": printPayload,
    "./queue-store": {},
  });
  const route = loadOrderRoute({
    StoreOrder, account, printQueue,
    sendStoreOrderReceiptSms: async (sms) => receipts.push(sms),
  });
  return {
    submit: (fields) => route.POST(request(fields)),
    get orderWrites() { return orderWrites; },
    get order() { return savedOrder; },
    owner, receipts, printJobs,
  };
}

test("manual ordering uses the website identity and snapshots the registered profile", async () => {
  const flow = orderHarness();
  const result = await flow.submit({ isLegal: true });
  assert.equal(result.status, 201);
  assert.equal(flow.order.userId, id);
  assert.equal(flow.order.customer, undefined);
  assert.equal(flow.order.customerSnapshot.lastName, "ثبت نام");
  assert.notEqual(flow.order.customerSnapshot.birthday, "۱۴۰۵/۰۵/۱۷");
  assert.equal(flow.receipts[0].mobile, mobile);
  assert.equal(flow.printJobs.get(id).payload.receiptType, "ghanooni");
});

test("no manual order is written without a resolved owner or with invalid legal status", async () => {
  const missing = orderHarness({ missingOwner: true });
  assert.equal((await missing.submit()).status, 404);
  assert.equal(missing.orderWrites, 0);
  const invalid = orderHarness();
  assert.equal((await invalid.submit({ isLegal: "true" })).status, 422);
  assert.equal(invalid.orderWrites, 0);
});

test("retry after a print failure preserves the order snapshot and queues one receipt", async () => {
  const flow = orderHarness({ rejectPrintOnce: true });
  const result = await flow.submit();
  assert.equal(result.status, 201);
  assert.equal((await result.json()).printStatus, "failed");
  assert.equal(flow.printJobs.size, 0);

  flow.owner.lastName = "نام جدید";
  const responses = await Promise.all([flow.submit(), flow.submit()]);
  assert.deepEqual(responses.map((r) => r.status), [200, 200]);
  assert.equal(flow.orderWrites, 1);
  assert.equal(flow.receipts.length, 1);
  assert.equal(flow.printJobs.size, 1);
  assert.match(flow.printJobs.get(id).payload.fullName, /ثبت نام/);
});
