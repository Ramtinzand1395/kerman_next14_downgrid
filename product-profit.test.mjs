import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import ts from "typescript";
import {
  calculateSaleProfit,
  missingPurchasePriceExpression,
  posPurchasePriceSnapshot,
  summarizeInventory,
  websiteSaleProfit,
} from "./lib/product-profit.ts";
import "./scripts/pos-test-loader.mjs";

const { buildProductWriteInput } = await import("./lib/productInput.ts");
const { default: Product } = await import("./model/Product.ts");
const { default: Order } = await import("./model/Order.ts");

const productInput = {
  title: "Test product", slug: "test-product", price: 100, discountPrice: 80,
  stock: 3, mainImage: "/product.webp", category: new mongoose.Types.ObjectId(),
};

test("new products require a valid cost, while updates preserve legacy and recorded costs", async () => {
  for (const purchasePrice of [undefined, null, "", -1, 1.5, "60"]) {
    assert.throws(() => buildProductWriteInput({ ...productInput, purchasePrice }, { mode: "create" }), /قیمت خرید/);
  }
  assert.deepEqual(buildProductWriteInput({ ...productInput, purchasePrice: 0 }, { mode: "create" }).purchasePrices, { single: 0 });
  assert.deepEqual(buildProductWriteInput(productInput, { mode: "update" }).purchasePrices, {});
  const existingPurchasePrices = new Map([["single", 50]]);
  assert.deepEqual(buildProductWriteInput(productInput, { mode: "update", existingPurchasePrices }).purchasePrices, { single: 50 });
  assert.throws(() => buildProductWriteInput({ ...productInput, purchasePrice: null }, { mode: "update", existingPurchasePrices }), /قیمت خرید/);
  await assert.rejects(new Product(productInput).validate(), /قیمت خرید/);
  const legacy = Product.hydrate({ ...productInput, _id: new mongoose.Types.ObjectId() });
  await legacy.validate();
});

test("each variant has a separate cost, including a newly added variant on a legacy product", () => {
  const oldId = new mongoose.Types.ObjectId().toString();
  const clientId = new mongoose.Types.ObjectId().toString();
  const body = {
    ...productInput,
    productType: "multi",
    variants: [
      { _id: oldId, title: "Old", price: 100, stock: 2 },
      { clientVariantId: clientId, title: "New", price: 120, stock: 3 },
    ],
    defaultVariantId: clientId,
  };
  const options = { mode: "update", existingVariantIds: [oldId] };
  assert.throws(() => buildProductWriteInput(body, options), /قیمت خرید/);
  body.variants[1].purchasePrice = 80;
  const { productData, purchasePrices } = buildProductWriteInput(body, options);
  const newId = productData.variants[1]._id;
  assert.notEqual(newId, clientId);
  assert.equal(productData.defaultVariantId, newId);
  assert.deepEqual(purchasePrices, { [newId]: 80 });
});

test("inventory uses discounted variant prices and quantities, and excludes incomplete products", () => {
  const variants = [
    { _id: "a", price: 100, discountPrice: 80, stock: 3 },
    { _id: "b", price: 120, discountPrice: 0, stock: 2 },
    { _id: "c", price: 120, stock: 99, isActive: false },
  ];
  const multi = { productType: "multi", price: 80, variants };
  const complete = { ...multi, purchasePrices: { a: 40, b: 10, c: 100 } };
  const incomplete = { ...multi, purchasePrices: { a: 40, c: 100 } };
  const result = summarizeInventory([complete, incomplete, { price: 100, stock: 2 }]);
  assert.equal(result.knownInventoryProfit, 100);
  assert.equal(result.missingPurchasePriceProducts, 2);

  const legacy = summarizeInventory([
    { productType: "multi", price: 100, stock: 6 },
    { productType: "multi", variants: [{ _id: "a", stock: 2 }] },
  ]);
  assert.equal(legacy.inventoryValue, 600);
  assert.equal(legacy.lowStockProducts, 1);
  assert.equal(legacy.missingPurchasePriceProducts, 2);
});

test("sales use historical costs, net merchandise revenue and full quantities", () => {
  const items = [{ quantity: 3 }, { quantity: 1 }];
  const order = {
    paymentStatus: "paid", totalPrice: 300, couponDiscount: 30,
    shippingCost: 100, finalPrice: 370, items,
  };
  assert.equal(websiteSaleProfit({ ...order, salePurchasePrices: [40, 0] }), 150);
  assert.equal(websiteSaleProfit(order), null);
  assert.equal(websiteSaleProfit({ ...order, salePurchasePrices: [40, null] }), null);
  assert.equal(websiteSaleProfit({ ...order, items: undefined, salePurchasePrices: [40, 0] }), null);
  assert.equal(websiteSaleProfit({ ...order, salePurchasePrices: [40, 0], status: "cancelled" }), null);
  assert.equal(calculateSaleProfit(items, [40, 0], 100), -20);
  const product = { purchasePrices: { single: 40 }, purchasePricesUpdatedAt: new Date("2026-11-11") };
  assert.deepEqual(posPurchasePriceSnapshot(product, null, new Date("2026-11-12")), { price: 40, estimated: false });
  assert.deepEqual(posPurchasePriceSnapshot(product, null, new Date("2026-11-10")), { price: 40, estimated: true });
});

test("model JSON removes private data even on newly created documents", () => {
  const product = new Product({ ...productInput, purchasePrices: { single: 50 }, purchasePricesUpdatedAt: new Date() });
  const order = new Order({ salePurchasePrices: [50] });
  assert.equal(JSON.parse(JSON.stringify(product)).purchasePrices, undefined);
  assert.equal(JSON.parse(JSON.stringify(product)).purchasePricesUpdatedAt, undefined);
  assert.equal(JSON.parse(JSON.stringify(order)).salePurchasePrices, undefined);
});

test("local MongoDB verifies legacy filtering, private projections and role gates", {
  skip: process.env.PRODUCT_PROFIT_LOCAL_TESTS !== "true",
}, async () => {
  const { MongoMemoryReplSet } = await import("mongodb-memory-server");
  const mongo = await MongoMemoryReplSet.create({
    binary: { version: "7.0.24" },
    replSet: { count: 1, ip: "127.0.0.1", args: ["--nounixsocket"] },
  });
  const previousUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = mongo.getUri("product_profit_test");
  const authModule = "data:text/javascript,export const getServerSession = async () => globalThis.testProfitUser; export const authOptions = {};";
  const root = new URL("./", import.meta.url).href;
  const hooks = registerHooks({
    load(url, context, nextLoad) {
      if (url.startsWith(root) && url.endsWith(".ts") && !url.includes("/node_modules/")) {
        const source = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
        }).outputText;
        return { format: "module", shortCircuit: true, source };
      }
      return nextLoad(url, context);
    },
    resolve(specifier, context, nextResolve) {
      if (specifier === "next-auth" || specifier.endsWith("[...nextauth]/options")) {
        return nextResolve(authModule, context);
      }
      if (specifier === "next/server") return nextResolve("next/server.js", context);
      return nextResolve(specifier, context);
    },
  });
  try {
    const { default: dbConnect } = await import("./lib/mongodb.ts");
    const { default: Category } = await import("./model/Category.ts");
    await dbConnect();
    const category = await Category.create({ name: "Local test", slug: "local-test" });
    const base = { ...productInput, category: category._id, status: "published", deletedAt: null };
    await Product.collection.insertMany(Array.from({ length: 11 }, (_, i) => ({
      ...base, slug: `legacy-${i}`, createdAt: new Date(2026, 0, i + 1),
    })));
    const product = await Product.create({ ...base, purchasePrices: { single: 0 } });
    const variantId = new mongoose.Types.ObjectId();
    await Product.collection.insertOne({
      ...base, slug: "partial", productType: "multi",
      variants: [{ _id: variantId, price: 100, stock: 2 }],
    });
    assert.equal(await Product.countDocuments({ $expr: missingPurchasePriceExpression }), 12);
    assert.equal((await Product.findById(product._id).lean()).purchasePrices, undefined);
    const { snapshotOrderPurchasePrices } = await import("./lib/order-purchase-prices.ts");
    const session = await mongoose.startSession();
    try {
      assert.deepEqual(await snapshotOrderPurchasePrices([
        { product: product._id }, { product: product._id, variantId },
      ], session), [0, null]);
    } finally {
      await session.endSession();
    }

    const { GET: publicList } = await import("./app/api/products/all_products/route.ts");
    for (const query of ["", "?sort=newest"]) {
      const response = await publicList(new Request(`https://example.test/api/products/all_products${query}`));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.ok(body.products.length > 0);
      assert.doesNotMatch(JSON.stringify(body), /purchasePrices|purchasePrice|inventoryProfit/);
    }

    const { GET: adminProducts } = await import("./app/api/admin/product/route.ts");
    const { GET: adminReport } = await import("./app/api/admin/dashboard/statistics/route.ts");
    const productsRequest = new Request("https://example.test/api/admin/product?missingPurchasePrice=true&page=2");
    for (const role of [null, "user", "admin", "superadmin"]) {
      globalThis.testProfitUser = role ? { user: { role } } : null;
      const expected = role === null ? 401 : role === "superadmin" ? 200 : 403;
      const response = await adminProducts(productsRequest);
      assert.equal(response.status, expected);
      if (role === "superadmin") {
        const data = await response.json();
        assert.equal(data.total, 12);
        assert.equal(data.page, 2);
        assert.equal(data.products.length, 2);
        assert.equal(data.stats.knownInventoryProfit, 240);
        assert.equal(data.stats.missingPurchasePriceProducts, 12);

        const now = new Date();
        const order = {
          items: [{ product: product._id, price: 100, total: 80, quantity: 1 }],
          totalPrice: 80, finalPrice: 170, shippingCost: 100, couponDiscount: 10,
          paymentStatus: "paid", paymentVerifiedAt: now,
        };
        const sold = await Order.create({ ...order, salePurchasePrices: [0] });
        await Order.create(order);
        await Order.create({ ...order, status: "cancelled", salePurchasePrices: [0] });
        assert.equal((await Order.findById(sold._id).lean()).salePurchasePrices, undefined);
        const { default: PosSale } = await import("./model/PosSale.ts");
        await PosSale.collection.insertMany([
          { soldAtUtc: now, items: [{ quantity: 1 }], finalAmountToman: 90, salePurchasePrices: [30], purchasePricesEstimated: false },
          { soldAtUtc: now, items: [{ quantity: 2 }], finalAmountToman: 180, salePurchasePrices: [30], purchasePricesEstimated: true },
          { soldAtUtc: now, items: [{ quantity: 1 }], finalAmountToman: 90 },
        ].map((sale, index) => ({
          ...sale, deviceId: "test", saleId: `test-${index}`,
          siteSaleId: `test-${index}`, invoiceNumber: `test-${index}`,
        })));
        const reportResponse = await adminReport(new Request("https://example.test/api/admin/dashboard/statistics?range=last7"));
        assert.equal(reportResponse.status, 200);
        const report = await reportResponse.json();
        assert.deepEqual(report.sections.productProfit, {
          status: "ok",
          data: {
            knownInventoryProfit: 240,
            missingPurchasePriceProducts: 12,
            website: { knownProfit: 70, unknownSales: 1 },
            pos: { knownProfit: 60, estimatedProfit: 120, estimatedSales: 1, unknownSales: 1 },
            knownSalesProfit: 130,
          },
        });
      } else {
        assert.equal((await adminReport(new Request("https://example.test/api/admin/dashboard/statistics"))).status, expected);
      }
    }
  } finally {
    delete globalThis.testProfitUser;
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
    hooks.deregister();
    await mongoose.disconnect();
    await mongo.stop();
  }
});
