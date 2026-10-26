import test from "node:test";
import assert from "node:assert/strict";

const testUri = process.env.MONGODB_TEST_URI;

function testDatabaseName(uri) {
  try {
    return decodeURIComponent(new URL(uri).pathname.replace(/^\//, ""));
  } catch {
    return "";
  }
}

function requestBody({ saleId, productId, variantId = null, quantity = 1, unitPriceToman = 1_000, discountToman = 0, soldAtUtc = "2020-01-01T00:00:00.000Z" }) {
  const finalAmountToman = (unitPriceToman - discountToman) * quantity;
  return {
    saleId,
    soldAtUtc,
    items: [
      { productId, variantId, quantity, unitPriceToman, discountToman },
    ],
    finalAmountToman,
    paymentMethods: [{ method: "card", amountToman: finalAmountToman }],
    customer: null,
    cashier: { cashierId: "integration-cashier", name: "Integration Cashier" },
  };
}

test(
  "transactional POS sales integration",
  async (suite) => {
    let memoryReplicaSet = null;
    let runtimeTestUri = testUri;
    if (!runtimeTestUri) {
      const { MongoMemoryReplSet } = await import("mongodb-memory-server");
      memoryReplicaSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: "wiredTiger" },
      });
      runtimeTestUri = memoryReplicaSet.getUri("kerman_pos_test");
    }

    let mongooseRuntime = null;
    suite.after(async () => {
      if (mongooseRuntime) await mongooseRuntime.disconnect();
      if (memoryReplicaSet) await memoryReplicaSet.stop();
    });

    const databaseName = testDatabaseName(runtimeTestUri);
    assert.match(
      databaseName,
      /test/i,
      "MONGODB_TEST_URI must explicitly name a test database",
    );
    assert.notEqual(
      runtimeTestUri,
      process.env.MONGODB_URI,
      "MONGODB_TEST_URI must not equal MONGODB_URI",
    );
    process.env.MONGODB_URI = runtimeTestUri;

    const mongoose = (await import("mongoose")).default;
    mongooseRuntime = mongoose;
    const { registerPosSale, PosSaleConflictError, PosSaleIdempotencyConflictError } =
      await import("./lib/pos/sales-service.ts");
    const Product = (await import("./model/Product.ts")).default;
    const PosSale = (await import("./model/PosSale.ts")).default;
    const PosInventoryMovement = (
      await import("./model/PosInventoryMovement.ts")
    ).default;
    const PosCatalogChange = (
      await import("./model/PosCatalogChange.ts")
    ).default;
    const PosCatalogCounter = (
      await import("./model/PosCatalogCounter.ts")
    ).default;
    const dbConnect = (await import("./lib/mongodb.ts")).default;
    await dbConnect();

    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    assert.ok(
      hello.setName || hello.msg === "isdbgrid",
      "MONGODB_TEST_URI must point to a replica set or sharded cluster",
    );
    await Promise.all([
      Product.syncIndexes(),
      PosSale.syncIndexes(),
      PosInventoryMovement.syncIndexes(),
      PosCatalogChange.syncIndexes(),
      PosCatalogCounter.syncIndexes(),
    ]);

    const deviceId = "pos_integration-device-0001";
    const categoryId = new mongoose.Types.ObjectId();
    const now = new Date("2020-01-01T00:01:00.000Z");

    async function clean() {
      await PosInventoryMovement.deleteMany({});
      await PosSale.deleteMany({});
      await PosCatalogChange.deleteMany({});
      await PosCatalogCounter.deleteMany({});
      await Product.deleteMany({});
    }

    async function single(overrides = {}) {
      const suffix = new mongoose.Types.ObjectId().toHexString();
      return Product.create({
        title: "Integration single",
        slug: `integration-single-${suffix}`,
        sku: `INT-${suffix}`,
        barcode: `BAR-${suffix}`,
        status: "published",
        productType: "single",
        price: 1_000,
        discountPrice: null,
        stock: 3,
        catalogRevision: 1,
        inventoryVersion: 1,
        mainImage: "https://example.test/product.jpg",
        category: categoryId,
        ...overrides,
      });
    }

    async function multi(overrides = {}) {
      const suffix = new mongoose.Types.ObjectId().toHexString();
      return Product.create({
        title: "Integration multi",
        slug: `integration-multi-${suffix}`,
        sku: `MULTI-${suffix}`,
        status: "published",
        productType: "multi",
        price: 1_000,
        stock: 5,
        catalogRevision: 1,
        inventoryVersion: 1,
        mainImage: "https://example.test/product.jpg",
        category: categoryId,
        variants: [
          {
            title: "A",
            sku: `A-${suffix}`,
            barcode: `A-BAR-${suffix}`,
            price: 1_000,
            stock: 2,
            isActive: true,
          },
          {
            title: "B",
            sku: `B-${suffix}`,
            barcode: `B-BAR-${suffix}`,
            price: 1_500,
            stock: 3,
            isActive: true,
          },
        ],
        ...overrides,
      });
    }

    await suite.test("single item sale is atomic and audited", async () => {
      await clean();
      const product = await single();
      const result = await registerPosSale(
        requestBody({ saleId: "single-1", productId: String(product._id) }),
        { deviceId },
        { now },
      );
      assert.equal(result.replayed, false);
      assert.equal(result.sale.deviceId, deviceId);
      assert.equal(result.sale.syncStatus, "synced");
      assert.equal((await Product.findById(product._id)).stock, 2);
      assert.equal(await PosSale.countDocuments(), 1);
      assert.equal(await PosInventoryMovement.countDocuments(), 1);
      assert.equal(await PosCatalogChange.countDocuments({ source: "pos" }), 1);
    });

    await suite.test("variant sale keeps parent stock equal to active variants", async () => {
      await clean();
      const product = await multi();
      const variantId = String(product.variants[0]._id);
      await registerPosSale(
        requestBody({
          saleId: "variant-1",
          productId: String(product._id),
          variantId,
        }),
        { deviceId },
        { now },
      );
      const updated = await Product.findById(product._id);
      assert.equal(updated.variants[0].stock, 1);
      assert.equal(updated.stock, 4);
      assert.equal(
        updated.stock,
        updated.variants.filter((variant) => variant.isActive).reduce((sum, variant) => sum + variant.stock, 0),
      );
    });

    await suite.test("multi-item sale commits all lines together", async () => {
      await clean();
      const first = await single({ stock: 2 });
      const second = await single({ stock: 4, price: 2_000 });
      const payload = {
        saleId: "multi-item-1",
        soldAtUtc: "2020-01-01T00:00:00.000Z",
        items: [
          { productId: String(first._id), variantId: null, quantity: 1, unitPriceToman: 1_000, discountToman: 0 },
          { productId: String(second._id), variantId: null, quantity: 2, unitPriceToman: 2_000, discountToman: 0 },
        ],
        finalAmountToman: 5_000,
        paymentMethods: [{ method: "cash", amountToman: 5_000 }],
        cashier: { cashierId: "cashier", name: "Cashier" },
      };
      await registerPosSale(payload, { deviceId }, { now });
      assert.equal((await Product.findById(first._id)).stock, 1);
      assert.equal((await Product.findById(second._id)).stock, 2);
      assert.equal(await PosInventoryMovement.countDocuments(), 2);
    });

    await suite.test("insufficient stock leaves every line unchanged", async () => {
      await clean();
      const first = await single({ stock: 2 });
      const second = await single({ stock: 0, price: 2_000 });
      const payload = {
        saleId: "insufficient-1",
        soldAtUtc: "2020-01-01T00:00:00.000Z",
        items: [
          { productId: String(first._id), variantId: null, quantity: 1, unitPriceToman: 1_000, discountToman: 0 },
          { productId: String(second._id), variantId: null, quantity: 1, unitPriceToman: 2_000, discountToman: 0 },
        ],
        finalAmountToman: 3_000,
        paymentMethods: [{ method: "cash", amountToman: 3_000 }],
        cashier: { cashierId: "cashier", name: "Cashier" },
      };
      await assert.rejects(
        registerPosSale(payload, { deviceId }, { now }),
        (error) => error instanceof PosSaleConflictError && error.code === "POS_SALE_INVENTORY_CONFLICT",
      );
      assert.equal((await Product.findById(first._id)).stock, 2);
      assert.equal((await Product.findById(second._id)).stock, 0);
      assert.equal(await PosSale.countDocuments(), 0);
      assert.equal(await PosInventoryMovement.countDocuments(), 0);
    });

    await suite.test("two concurrent buyers cannot both consume the final unit", async () => {
      await clean();
      const product = await single({ stock: 1 });
      const attempts = await Promise.allSettled([
        registerPosSale(requestBody({ saleId: "race-1", productId: String(product._id) }), { deviceId }, { now }),
        registerPosSale(requestBody({ saleId: "race-2", productId: String(product._id) }), { deviceId }, { now }),
      ]);
      assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((result) => result.status === "rejected").length, 1);
      assert.equal((await Product.findById(product._id)).stock, 0);
      assert.equal(await PosSale.countDocuments(), 1);
    });

    await suite.test("identical replay returns the committed invoice without another decrement", async () => {
      await clean();
      const product = await single({ stock: 2 });
      const payload = requestBody({ saleId: "replay-1", productId: String(product._id) });
      const first = await registerPosSale(payload, { deviceId }, { now });
      const replay = await registerPosSale(payload, { deviceId }, { now: new Date(now.getTime() + 60_000) });
      assert.equal(replay.replayed, true);
      assert.equal(replay.sale.siteSaleId, first.sale.siteSaleId);
      assert.equal((await Product.findById(product._id)).stock, 1);
      assert.equal(await PosSale.countDocuments(), 1);
      assert.equal(await PosInventoryMovement.countDocuments(), 1);
    });

    await suite.test("same device saleId with different content is a 409 conflict", async () => {
      await clean();
      const product = await single({ stock: 3 });
      const payload = requestBody({ saleId: "collision-1", productId: String(product._id) });
      await registerPosSale(payload, { deviceId }, { now });
      await assert.rejects(
        registerPosSale({ ...payload, cashier: { cashierId: "other", name: "Other" } }, { deviceId }, { now }),
        PosSaleIdempotencyConflictError,
      );
      assert.equal((await Product.findById(product._id)).stock, 2);
      assert.equal(await PosSale.countDocuments(), 1);
    });

    await suite.test("failure after stock save rolls the whole transaction back", async () => {
      await clean();
      const product = await single({ stock: 2 });
      await assert.rejects(
        registerPosSale(
          requestBody({ saleId: "rollback-1", productId: String(product._id) }),
          { deviceId },
          { now, testHooks: { afterInventorySaved: () => { throw new Error("INJECTED_TRANSACTION_FAILURE"); } } },
        ),
        /INJECTED_TRANSACTION_FAILURE/,
      );
      assert.equal((await Product.findById(product._id)).stock, 2);
      assert.equal(await PosSale.countDocuments(), 0);
      assert.equal(await PosInventoryMovement.countDocuments(), 0);
      assert.equal(await PosCatalogChange.countDocuments(), 0);
    });

    await suite.test("late offline price mismatch is preserved for review", async () => {
      await clean();
      const product = await single({ price: 1_000, stock: 2 });
      const result = await registerPosSale(
        requestBody({ saleId: "offline-1", productId: String(product._id), unitPriceToman: 800 }),
        { deviceId },
        { now: new Date("2020-01-02T00:00:00.000Z") },
      );
      assert.equal(result.sale.syncStatus, "review_required");
      assert.deepEqual(result.sale.reviewReasons, ["offline_delay", "price_mismatch"]);
      assert.equal(result.sale.items[0].priceSnapshot.siteEffectivePriceToman, 1_000);
      assert.equal(result.sale.items[0].priceSnapshot.posNetUnitPriceToman, 800);
    });

    await suite.test("retry after a lost HTTP response observes the prior commit", async () => {
      await clean();
      const product = await single({ stock: 2 });
      const payload = requestBody({ saleId: "lost-response-1", productId: String(product._id) });
      await registerPosSale(payload, { deviceId }, { now });
      const recovered = await registerPosSale(payload, { deviceId }, { now });
      assert.equal(recovered.replayed, true);
      assert.equal((await Product.findById(product._id)).stock, 1);
      assert.equal(await PosSale.countDocuments(), 1);
    });

  },
);
