import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

function load(path, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  new Function("require", "module", "exports", code)(
    (name) => (Object.hasOwn(deps, name) ? deps[name] : require(name)),
    module,
    module.exports,
  );
  return module.exports;
}

const printPayload = load("./lib/print/store-order-payload.ts", {
  "@/helpers/toPersianDate": { toPersianDate: () => "1405/08/17" },
});
const toastCalls = [];
const printClient = load("./helpers/sendPdfToBackend.ts", {
  "react-toastify": {
    toast: {
      warning: (message) => toastCalls.push(["warning", message]),
      info: (message) => toastCalls.push(["info", message]),
      success: (message) => toastCalls.push(["success", message]),
      error: (message) => toastCalls.push(["error", message]),
    },
  },
  "@/lib/print/store-order-payload": printPayload,
});

const baseOrder = {
  _id: "order-1",
  list: [{ _id: "game-1", name: "Game", size: 20, price: 100 }],
  price: 100,
  description: "",
  consoleType: "ps5",
  deliveryStatus: "دریافت از مشتری",
  createdAt: "2026-11-08T00:00:00.000Z",
  updatedAt: "2026-11-08T00:00:00.000Z",
  deliveryCode: "12345",
  deliveryDate: "تحویل داده نشده",
};

test("client print payload keeps textual storage and defaults old orders to empty text", () => {
  const textual = printPayload.buildPrintPayload(
    {
      ...baseOrder,
      list: [{ ...baseOrder.list[0], storage: "اکسترنال مشتری" }],
    },
    null,
  );
  assert.equal(textual.games[0].storage, "اکسترنال مشتری");
  assert.equal(typeof textual.games[0].storage, "string");

  const oldOrder = printPayload.buildPrintPayload(baseOrder, null);
  assert.equal(oldOrder.games[0].storage, "");

  const legacyNumericValue = printPayload.buildPrintPayload(
    {
      ...baseOrder,
      list: [{ ...baseOrder.list[0], storage: 2 }],
    },
    null,
  );
  assert.equal(legacyNumericValue.games[0].storage, "2");
  assert.equal(typeof legacyNumericValue.games[0].storage, "string");
});

test("API error objects are converted to understandable Persian messages", () => {
  const message = printClient.getPrintErrorMessage(
    { error: { code: "INVALID_PRINT_PAYLOAD" } },
    400,
  );
  assert.match(message, /اطلاعات سفارش/);
  assert.doesNotMatch(message, /\[object Object\]/);

  const unavailable = printClient.getPrintErrorMessage(
    { error: { code: "PRINT_QUEUE_UNAVAILABLE" } },
    500,
  );
  assert.match(unavailable, /صف چاپ/);
});

test("repeated clicks create only one in-flight print request per order", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  let resolveFetch;
  const pendingResponse = new Promise((resolve) => {
    resolveFetch = resolve;
  });

  globalThis.fetch = async () => {
    fetchCalls += 1;
    return pendingResponse;
  };

  try {
    const first = printClient.sendPdfToBackend(baseOrder, null);
    await Promise.resolve();
    const second = await printClient.sendPdfToBackend(baseOrder, null);

    assert.equal(second, false);
    assert.equal(fetchCalls, 1);

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    assert.equal(await first, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
