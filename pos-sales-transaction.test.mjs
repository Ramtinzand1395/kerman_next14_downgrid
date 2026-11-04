import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { spawnSync } from 'node:child_process';

// Never accepts an external MongoDB URI. Only synthetic data on a private loopback replica set.
test('POS local replica-set integration', { skip: process.env.POS_LOCAL_TRANSACTION_TESTS !== 'true', timeout: 180000 }, async (t) => {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  const repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.24' }, replSet: { count: 1, ip: '127.0.0.1', args: ['--nounixsocket'] } });
  const savedEnv = Object.fromEntries(['MONGODB_URI', 'POS_TOKEN_PEPPER', 'POS_SALES_ENABLED', 'POS_OFFLINE_SALE_REVIEW_AFTER_MINUTES'].map(key => [key, process.env[key]]));
  process.env.MONGODB_URI = repl.getUri('pos_synthetic_test');
  process.env.POS_OFFLINE_SALE_REVIEW_AFTER_MINUTES = '15';
  assert.match(process.env.MONGODB_URI, /^mongodb:\/\/127\.0\.0\.1:/);
  try {
    await import('./scripts/pos-test-loader.mjs');
    const { default: dbConnect } = await import('./lib/mongodb.ts');
    await dbConnect();
    const { default: Product } = await import('./model/Product.ts');
    const { default: Category } = await import('./model/Category.ts');
    const { default: Sale } = await import('./model/PosSale.ts');
    const { default: Movement } = await import('./model/PosInventoryMovement.ts');
    const { default: Change } = await import('./model/PosCatalogChange.ts');
    const { default: Counter } = await import('./model/PosCatalogCounter.ts');
    const { registerPosSale } = await import('./lib/pos/sales-service.ts');
    const { generatePosDeviceId, generatePosToken, hashPosToken } = await import('./lib/pos/token.ts');
    await Promise.all([Product, Category, Sale, Movement, Change, Counter].map(model => model.init()));
    const category = await Category.create({ name: 'Synthetic', slug: 'synthetic' });
    const makeProduct = (slug, extra = {}) => Product.create({ title: slug, slug, price: 100, stock: 10,
      mainImage: '/synthetic.webp', category: category._id, status: 'published', productType: 'single', ...extra });
    const single = await makeProduct('single');
    const multi = await makeProduct('multi', { productType: 'multi', variants: [
      { title: 'A', sku: 'synthetic-a', price: 100, stock: 8, isActive: true },
      { title: 'B', sku: 'synthetic-b', price: 100, stock: 6, isActive: true },
    ] });
    const line = (product, quantity = 1, variantId = null) => ({ productId: String(product._id), variantId, quantity, unitPriceToman: 100, discountToman: 0 });
    const payload = (saleId, items, extra = {}) => {
      const total = items.reduce((sum, item) => sum + item.quantity * (item.unitPriceToman - item.discountToman), 0);
      return { saleId, soldAtUtc: new Date().toISOString(), items, finalAmountToman: total,
        paymentMethods: [{ method: 'cash', amountToman: total }], cashier: { cashierId: 'synthetic', name: 'Synthetic' }, ...extra };
    };
    const context = { deviceId: generatePosDeviceId() };
    const counts = async () => Promise.all([Sale.countDocuments(), Movement.countDocuments(), Change.countDocuments()]);
    let first;
    await t.test('single stock, movement, version and outbox commit together', async () => {
      const body = payload('single-1', [line(single, 2)]);
      first = { body, result: await registerPosSale(body, context) };
      assert.equal(first.result.replayed, false);
      const product = await Product.findById(single._id);
      assert.equal(product.stock, 8); assert.equal(product.inventoryVersion, single.inventoryVersion + 1);
      assert.deepEqual(await counts(), [1, 1, 1]);
      const movement = await Movement.findOne({ saleId: 'single-1' });
      assert.equal(movement.quantityDelta, -2); assert.equal(movement.itemStockAfter, 8);
    });
    await t.test('identical replay returns same receipt without inventory or outbox changes', async () => {
      const before = await counts();
      const result = await registerPosSale(first.body, context);
      assert.equal(result.replayed, true); assert.equal(result.sale.siteSaleId, first.result.sale.siteSaleId);
      assert.deepEqual(await counts(), before); assert.equal((await Product.findById(single._id)).stock, 8);
    });
    await t.test('same saleId with changed payload is rejected without writes', async () => {
      const before = await counts();
      await assert.rejects(registerPosSale(payload('single-1', [line(single, 3)]), context), { name: 'PosSaleIdempotencyConflictError' });
      assert.deepEqual(await counts(), before);
    });
    await t.test('specific variant decreases, sibling untouched, parent stock recomputed', async () => {
      await registerPosSale(payload('multi-1', [line(multi, 3, String(multi.variants[0]._id))]), context);
      const product = await Product.findById(multi._id);
      assert.equal(product.variants[0].stock, 5); assert.equal(product.variants[1].stock, 6); assert.equal(product.stock, 11);
    });
    await t.test('multiple products in one invoice', async () => {
      await registerPosSale(payload('mixed-1', [line(single), line(multi, 2, String(multi.variants[1]._id))]), context);
      assert.equal((await Product.findById(single._id)).stock, 7);
      assert.equal((await Product.findById(multi._id)).variants[1].stock, 4);
      assert.equal(await Movement.countDocuments({ saleId: 'mixed-1' }), 2);
    });
    await t.test('insufficient stock aborts whole invoice', async () => {
      const before = await counts();
      await assert.rejects(registerPosSale(payload('insufficient', [line(single), line(multi, 100, String(multi.variants[0]._id))]), context));
      assert.deepEqual(await counts(), before); assert.equal((await Product.findById(single._id)).stock, 7);
    });
    await t.test('failure after product, outbox and sale writes rolls back everything', async () => {
      const before = await counts(); const original = Movement.create;
      Movement.create = async () => { throw new Error('synthetic mid-transaction failure'); };
      try { await assert.rejects(registerPosSale(payload('rollback', [line(single)]), context), /synthetic/); }
      finally { Movement.create = original; }
      assert.deepEqual(await counts(), before); assert.equal((await Product.findById(single._id)).stock, 7);
    });
    await t.test('price mismatch and offline delay flag review without rewriting site price', async () => {
      const result = await registerPosSale(payload('review', [{ ...line(single), unitPriceToman: 90 }], {
        soldAtUtc: new Date(Date.now() - 86400000).toISOString(),
      }), context);
      assert.equal(result.sale.syncStatus, 'review_required');
      assert.deepEqual(result.sale.reviewReasons, ['offline_delay', 'price_mismatch']);
      assert.equal((await Product.findById(single._id)).price, 100);
    });
    await t.test('concurrent identical submissions deduct once', async () => {
      const body = payload('race', [line(single)]); const before = (await Product.findById(single._id)).stock;
      const results = await Promise.all([registerPosSale(body, context), registerPosSale(body, context)]);
      assert.equal(results[0].sale.siteSaleId, results[1].sale.siteSaleId);
      assert.equal((await Product.findById(single._id)).stock, before - 1);
      assert.equal(await Sale.countDocuments({ saleId: 'race' }), 1);
    });
    await t.test('real GET route: auth, scope, isolation, safe DTO, no writes and disabled submission gate', async () => {
      const { GET } = await import('./app/api/pos/v1/sales/[saleId]/route.ts');
      const { default: Device } = await import('./model/PosDevice.ts');
      process.env.POS_TOKEN_PEPPER = 'synthetic-test-pepper-32-bytes-only';
      process.env.POS_SALES_ENABLED = 'false';
      const token = generatePosToken(); const otherId = generatePosDeviceId();
      await Device.init();
      await Device.create({ deviceId: context.deviceId, name: 'Synthetic', scopes: ['sales'], tokenHash: hashPosToken(token), createdBy: new mongoose.Types.ObjectId() });
      const before = await counts(); const beforeStock = (await Product.findById(single._id)).stock;
      const query = (headers, id = 'single-1') => GET(new Request('http://localhost/api/pos/v1/sales/' + id, { headers }), { params: { saleId: id } });
      const headers = { authorization: `Bearer ${token}`, 'X-POS-Device-ID': context.deviceId };
      assert.equal((await query({})).status, 401);
      const found = await query(headers);
      assert.equal(found.status, 200); assert.match(found.headers.get('cache-control'), /no-store/);
      const body = await found.json();
      assert.equal(body.registrationStatus, 'registered');
      assert.equal(body.sale.siteSaleId, first.result.sale.siteSaleId);
      assert.deepEqual(Object.keys(body.sale).sort(), ['saleId', 'siteSaleId', 'invoiceNumber', 'soldAtUtc', 'syncedAtUtc', 'finalAmountToman', 'syncStatus', 'reviewReasons'].sort());
      assert.equal((await query(headers, 'missing')).status, 404);
      assert.equal((await query(headers, '../invalid')).status, 400);
      const otherToken = generatePosToken();
      await Device.create({ deviceId: otherId, name: 'Other', scopes: ['sales'], tokenHash: hashPosToken(otherToken), createdBy: new mongoose.Types.ObjectId() });
      assert.equal((await query({ authorization: `Bearer ${otherToken}`, 'X-POS-Device-ID': otherId })).status, 404);
      await Device.updateOne({ deviceId: context.deviceId }, { $set: { scopes: ['catalog'] } });
      assert.equal((await query(headers)).status, 403);
      await Device.updateOne({ deviceId: context.deviceId }, { $set: { scopes: ['sales'], isActive: false } });
      assert.equal((await query(headers)).status, 401);
      assert.deepEqual(await counts(), before); assert.equal((await Product.findById(single._id)).stock, beforeStock);
    });
    await t.test('first snapshot in fresh process populates Category; Changes exposes decreased stock', async () => {
      const run = code => spawnSync(process.execPath, ['--import', './scripts/pos-test-loader.mjs', '--input-type=module', '-e', code], {
        cwd: process.cwd(), env: { ...process.env, MONGODB_URI: repl.getUri('pos_synthetic_test') }, encoding: 'utf8', timeout: 30000,
      });
      const cold = run(`
        import { getCatalogSnapshotPage } from './lib/pos/catalog-repository.ts';
        import mongoose from 'mongoose';
        const snapshot = await getCatalogSnapshotPage({ limit: 100, cursorId: null });
        if (!snapshot.items.some(item => item.category?.name === 'Synthetic')) throw new Error('Category not populated');
        console.log('COLD_SNAPSHOT_OK'); await mongoose.disconnect();
      `);
      assert.equal(cold.status, 0, cold.stderr); assert.match(cold.stdout, /COLD_SNAPSHOT_OK/);
      const changes = run(`
        import { getCatalogChangesPage } from './lib/pos/catalog-changes-repository.ts';
        import mongoose from 'mongoose';
        const result = await getCatalogChangesPage({ limit: 100, afterSequence: 0 });
        if (!result.ok || !result.items.some(item => item.product?.centralStock < 10)) throw new Error(JSON.stringify(result));
        console.log('CHANGES_OK'); await mongoose.disconnect();
      `);
      assert.equal(changes.status, 0, changes.stderr); assert.match(changes.stdout, /CHANGES_OK/);
    });
  } finally {
    await mongoose.disconnect(); await repl.stop();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
