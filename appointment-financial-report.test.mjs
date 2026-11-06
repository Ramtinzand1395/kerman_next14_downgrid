import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => dependencies[name] ?? require(name), module, module.exports);
  return module.exports;
}
const dates = load('./lib/dashboard-date-range.ts');
const range = dates.resolveReportRange({range: 'last7'}, new Date('2026-11-06T12:00:00Z'));
function reportModule(appointmentModel) {
  const models = Object.fromEntries(['Order', 'StoreOrder', 'Appointment', 'Product', 'User', 'VisitReward',
    'Loyalty Club/Referral', 'Loyalty Club/WalletTransaction'].map(name => [`@/model/${name}`, { __esModule: true, default: name === 'Appointment' ? appointmentModel : {} }]));
  return load('./lib/dashboard-report.ts', {...models, '@/lib/dashboard-date-range': dates});
}

test('service receipts are bucketed by payment date and exposed separately from quotations', async () => {
  const pipelines = [];
  const module = reportModule({aggregate: async pipeline => {
    pipelines.push(pipeline);
    if (pipeline[0].$match['payment.status']) return [{_id: '2026-11-06', amount: 920000, count: 1}];
    return [];
  }});
  const result = await module.loadAppointmentsSection(range);
  assert.equal(result.totals.servicePaidAmount, 920000);
  assert.equal(result.totals.paidAppointments, 1);
  assert.equal(result.totals.documentedServiceAmount, 0);
  assert.equal(result.points.reduce((sum, point) => sum + point.servicePaidAmount, 0), 920000);
  const receipts = pipelines.find(pipeline => pipeline[0].$match['payment.status']);
  assert.equal(receipts[0].$match['payment.status'], 'paid');
  assert.deepEqual(receipts[0].$match['payment.paidAt'], {$gte: range.startInclusive, $lt: range.endExclusive});
  assert.equal(receipts[1].$group.amount.$sum, '$payment.amount');
});

const ui = load('./app/(dashboard)/dashboard/appointments/_components/appointment-ui.ts', {
  '@/lib/appointments/courier-policy': load('./lib/appointments/courier-policy.ts'),
});
const {default: Drawer} = load('./app/(dashboard)/dashboard/appointments/_components/AppointmentDetailsDrawer.tsx', {
  '@/app/components/games/InstallationGameSummary': {__esModule: true, default: () => null},
  './appointment-ui': ui,
});
const item = {_id: 'a'.repeat(24), trackingCode: 'KA-REQUEST-123', serviceType: 'game_install',
  device: 'PS5', status: 'completed', customerName: 'مشتری آزمایشی', phone: '09123456789', startsAt: '2026-11-01T10:00:00Z'};

test('admin details render payment reference, captured amount and time independently of pricing or courier', () => {
  const html = renderToStaticMarkup(React.createElement(Drawer, {item: {...item,
    payment: {status: 'paid', amount: 920000, refId: '123456789012', paidAt: '2026-11-06T08:00:00Z'}}, onClose() {}}));
  for (const value of ['پرداخت موفق', 'کد پیگیری پرداخت', '123456789012', 'مبلغ پرداخت‌شده', '۹۲۰٬۰۰۰', 'زمان پرداخت', 'KA-REQUEST-123']) assert.ok(html.includes(value), value);
});

test('admin details distinguish all five payment states and legacy missing payment', () => {
  for (const [status, label] of Object.entries({unpaid:'پرداخت‌نشده', initiating:'در حال آماده‌سازی پرداخت', pending:'در انتظار پرداخت مشتری', paid:'پرداخت موفق', failed:'ناموفق، قابل تلاش مجدد'})) {
    const html = renderToStaticMarkup(React.createElement(Drawer, {item: {...item, payment: {status}}, onClose() {}}));
    assert.ok(html.includes(label), status);
  }
  const legacy = renderToStaticMarkup(React.createElement(Drawer, {item, onClose() {}}));
  assert.ok(legacy.includes('پرداخت‌نشده'));
  assert.ok(legacy.includes('کد پیگیری پرداخت'));
});

test('admin history translates courier and service states, including legacy and unknown entries', () => {
  for (const [to, expected] of Object.entries(ui.courierLabel)) {
    assert.equal(ui.historyStatusLabel({to, note:'تغییر وضعیت پیک: ثبت‌شده'}), expected);
  }
  for (const [to, expected] of Object.entries(ui.statusLabel)) assert.equal(ui.historyStatusLabel({to}), expected);
  assert.equal(ui.historyStatusLabel({to:'assigned'}), ui.courierLabel.assigned);
  for (const to of ['unknown_legacy_state', 'constructor', '__proto__']) assert.equal(ui.historyStatusLabel({to}), 'وضعیت نامشخص');
  const html = renderToStaticMarkup(React.createElement(Drawer, {item: {...item,
    selectedReward:{_id:'reward',status:'redeemed'},
    history:['assigned','picked_up','returning','delivered'].map(to=>({to,actorType:'admin',at:'2026-11-06T08:00:00Z'}))}, onClose() {}}));
  for (const status of ['assigned','picked_up','returning','delivered','redeemed']) assert.ok(!html.includes(status), status);
  for (const label of [ui.courierLabel.assigned,ui.courierLabel.picked_up,ui.rewardStatusLabel.redeemed]) assert.ok(html.includes(label),label);
});

// Only synthetic data on an ephemeral loopback MongoDB; never reads MONGODB_URI.
test('real MongoDB service payment report reconciles payment evidence across dates and states', {
  skip: process.env.APPOINTMENT_LOCAL_REPORT_TESTS !== 'true', timeout: 180000,
}, async t => {
  const {MongoMemoryServer} = await import('mongodb-memory-server');
  const {MongoClient} = await import('mongodb');
  const mongo = await MongoMemoryServer.create({binary: {version: '7.0.24'}, instance: {ip: '127.0.0.1', args: ['--nounixsocket']}});
  const uri = mongo.getUri('synthetic_service_report');
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const appointments = client.db().collection('appointments');
    const report = reportModule({aggregate: pipeline => appointments.aggregate(pipeline).toArray()});
    const inside = new Date(range.startInclusive.getTime() + 3600000);
    const before = new Date(range.startInclusive.getTime() - 1);
    const base = {serviceType:'game_install', status:'completed', startsAt:before, completedAt:before,
      pricing:{known:true, serviceFinalAmount:800000, shippingFinalAmount:120000, finalAmount:920000}};
    const paid = (amount, paidAt = inside, extra = {}) => ({...base, payment:{status:'paid',amount,paidAt}, ...extra});
    const get = () => report.loadAppointmentsSection(range);
    await t.test('recorded captured amount includes shipping exactly once, regardless of quotation or completion date', async () => {
      await appointments.insertMany([paid(920000), paid(250000, inside, {serviceType:'repair', fulfillment:'in_store', pricing:{known:true,finalAmount:999999}})]);
      const result = await get();
      assert.equal(result.totals.servicePaidAmount, 1170000);
      assert.equal(result.totals.paidAppointments, 2);
      assert.equal(result.totals.appointmentCount, 0);
      assert.equal(result.totals.documentedServiceAmount, 0);
      assert.equal(result.points.reduce((sum, point) => sum + point.servicePaidAmount, 0), 1170000);
    });
    await appointments.deleteMany({});
    await t.test('only verified paid receipts count; missing amount/date never falls back to the quote', async () => {
      await appointments.insertMany([
        ...['unpaid','initiating','pending','failed'].map(status => ({...paid(900000),payment:{status,amount:900000,paidAt:inside}})),
        {...base}, {...base,payment:{status:'paid',paidAt:inside}},
        {...base,payment:{status:'paid',amount:900000}}, paid(-10),
        {...base,completedAt:inside,startsAt:inside},
      ]);
      const result = await get();
      assert.equal(result.totals.servicePaidAmount, 0);
      assert.equal(result.totals.paidAppointments, 0);
      assert.equal(result.totals.documentedServiceAmount, 800000);
    });
    await appointments.deleteMany({});
    await t.test('half-open boundaries and Tehran midnight put a receipt in exactly one day', async () => {
      const midnight = new Date('2026-11-05T20:30:00Z'); // 00:00 Asia/Tehran
      await appointments.insertMany([paid(100, range.startInclusive), paid(200,before), paid(400,range.endExclusive), paid(1000,new Date(midnight.getTime()-1)), paid(2000,midnight)]);
      const result = await get();
      assert.equal(result.totals.servicePaidAmount, 3100);
      assert.equal(result.totals.paidAppointments, 3);
      const day = start => result.points.find(point => point.startInclusive === start.toISOString());
      assert.equal(day(midnight).servicePaidAmount, 2000);
      assert.equal(day(new Date(midnight.getTime()-86400000)).servicePaidAmount, 1000);
    });
    await appointments.deleteMany({});
    await t.test('empty report is zero-filled and payment remains counted after administrative status changes', async () => {
      assert.equal((await get()).totals.servicePaidAmount, 0);
      const inserted = await appointments.insertOne(paid(50000));
      await appointments.updateOne({_id:inserted.insertedId}, {$set:{status:'cancelled'}});
      const result = await get();
      assert.equal(result.totals.servicePaidAmount, 50000);
      assert.equal(result.totals.paidAppointments, 1);
    });
  } finally {
    await client.close();
    await mongo.stop();
  }
});
