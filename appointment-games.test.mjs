import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as games from './lib/appointments/games.ts';
import * as policy from './lib/appointments/policy.ts';
import { saveAppointmentDraft, readAppointmentDraft, attachNewAddressToAppointmentDraft } from './lib/appointments/draft.ts';
const require = createRequire(import.meta.url);
const ids = ['a'.repeat(24), 'b'.repeat(24), 'c'.repeat(24)];
const catalog = [
  { gameId: ids[0], platform: 'ps4', name: 'PS4 title' },
  { gameId: ids[1], platform: 'ps5', name: 'PS5 title' },
  { gameId: ids[2], platform: 'xbox', name: 'Xbox title' },
];
const docs = catalog.map(game => ({ platform: game.platform, items: [{ _id: game.gameId, name: game.name }] }));
function load(path, deps) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => deps[name] ?? require(name), module, module.exports);
  return module.exports;
}
const asDefault = value => ({ __esModule: true, default: value });

test('device and installation type select compatible catalogs; PS5 includes both generations', () => {
  assert.deepEqual(games.installationGamePlatforms('ps5', 'account'), ['ps5', 'ps4']);
  assert.deepEqual(games.installationGamePlatforms('ps5', 'copy'), ['ps5Copy', 'copy']);
  assert.deepEqual(games.installationGamePlatforms('ps4', 'account'), ['ps4']);
  assert.deepEqual(games.installationGamePlatforms('ps4', 'copy'), ['copy']);
  for (const device of ['xbox', 'xbox-one', 'xbox-series']) {
    assert.deepEqual(games.installationGamePlatforms(device), ['xbox']);
    assert.equal(games.requiresInstallationType(device), false);
  }
  assert.deepEqual(games.installationGamePlatforms('ps2', 'copy'), []);
  assert.deepEqual(games.installationGamePlatforms('ps5'), []);
  assert.ok(policy.supportedDevicesForService('game_install', []).includes('xbox'));
  assert.equal(games.gameVersionLabel('copy'), 'نسخه PS4');
  assert.equal(games.gameVersionLabel('ps5Copy'), 'نسخه PS5');
});

test('selection validation rejects wrong platform, missing games, duplicate references and oversized lists', () => {
  const refs = catalog.slice(0, 2).map(({gameId, platform}) => ({gameId, platform}));
  assert.deepEqual(games.validateGameSelections(refs, ['ps5','ps4'], catalog), catalog.slice(0, 2));
  for (const input of [[], [refs[0], refs[0]], [catalog[2]], [{...refs[0], gameId:'d'.repeat(24)}], Array(101).fill(refs[0])]) {
    assert.equal(games.validateGameSelections(input, ['ps5', 'ps4'], catalog), null);
  }
});

function serviceHarness() {
  const writes = [], notifications = [];
  const Appointment = {
    init: async () => {}, findOne: async () => null, countDocuments: async () => 0,
    create: async input => { writes.push(input); return { _id: 'appointment', ...input, save: async () => {}, toObject() { return this; } }; },
  };
  const Reservation = { init:async()=>{}, updateMany:async()=>{}, findOne:async()=>null, create:async()=>({_id:'seat'}), updateOne:async()=>{} };
  const settings = { supportedDevices: ['ps4','ps5','xbox'], bookingDaysAhead: 30, maxActiveAppointmentsPerUser: 5, slotMinutes: 30, serviceCapacity: { game_install: 5, repair: 5 }, courierEnabled: true, courierBookingDaysAhead: 30 };
  const service = load('./lib/appointments/service.ts', {
    '@/model/Appointment': asDefault(Appointment), '@/model/AppointmentReservation': asDefault(Reservation),
    '@/model/GameList': asDefault({find: query => ({select:()=>({lean:async()=>docs.filter(doc=>query.platform.$in.includes(doc.platform))})})}),
    '@/model/Address': asDefault({findOne:()=>({lean:async()=>({city:'کرمان', address:'آدرس', recipientName:'تست',recipientPhone:'09123456789'})})}),
    '@/model/User': asDefault({findById:()=>({select:async()=>({_id:'user'})})}),
    '@/lib/notifications/service': { notifyAdmins:async input=>notifications.push(input), notifyUser:async input=>notifications.push(input) },
    './policy': policy, './games': games,
    './settings': { getAppointmentSettings:async()=>settings, slotIsConfigured:()=>true, tehranDateKey:()=> '2099-01-01', tehranDateTime:date=>new Date(date+'T12:00:00+03:30'), findCourierRegion:()=>({id:'kerman',title:'کرمان',shippingCost:10}), courierWindowIsConfigured:()=>true, isWindowInPast:()=>false },
    './rewards.service': {releaseVisitReward:async()=>{}, reserveVisitReward:async()=>null},
  });
  return { service, writes, notifications };
}
const input = { fulfillment:'in_store', serviceType:'game_install', clientRequestKey:'request-1', device:'ps5', installationType:'account', selectedGames:catalog.slice(0,2), customerName:'کاربر تست', phone:'09123456789', startsAt:new Date(Date.now()+86400000) };

test('server rejects incompatible game references and Xbox installation types before appointment or notification writes', async()=>{
  for (const patch of [{selectedGames:[catalog[2]]}, {selectedGames:[]}, {installationType:null}, {device:'xbox'}, {device:'ps4',selectedGames:[catalog[1]]}, {serviceType:'repair', installationType:null, repairIssue:'power'}]) {
    const {service,writes,notifications}=serviceHarness();
    const result=await service.createAppointment('user',{...input,...patch});
    assert.equal(result.status,422);
    assert.equal(writes.length,0);
    assert.equal(notifications.length,0);
  }
});

test('server saves authoritative game snapshots for PS5 and Xbox in store and courier bookings',async()=>{
  for (const fulfillment of ['in_store','courier']) {
    for (const xbox of [false,true]) {
      const {service,writes}=serviceHarness();
      const result=await service.createAppointment('user',{
        ...input, fulfillment,
        ...(fulfillment==='courier'?{addressId:'address',pickupDate:new Date(Date.now()+86400000).toISOString().slice(0,10),pickupWindow:{start:'10:00',end:'12:00'}}:{}),
        ...(xbox?{device:'xbox',installationType:null,selectedGames:[{...catalog[2],name:'forged name'}]}:{selectedGames:catalog.slice(0,2).map(game=>({...game,name:'forged name'}))}),
      });
      assert.ok(result.appointment,JSON.stringify(result));
      assert.deepEqual(writes[0].selectedGames,xbox?[catalog[2]]:catalog.slice(0,2));
      assert.equal(writes[0].installationType,xbox?null:'account');
      assert.equal(writes[0].pricing.known,false);
    }
  }
});

test('courier address round trip retains game versions, IDs and the five-step position',()=>{
  const data=new Map();
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  saveAppointmentDraft(storage,{...input,step:4,fulfillment:'courier',selectedGames:catalog.slice(0,2)});
  attachNewAddressToAppointmentDraft(storage,'new-address');
  const restored=readAppointmentDraft(storage);
  assert.equal(restored.step,4);
  assert.equal(restored.selectedAddressId,'new-address');
  assert.deepEqual(restored.selectedGames,catalog.slice(0,2));
});

test('catalog endpoint authenticates, validates parameters, searches and limits results to compatible platforms',async()=>{
  const queried=[];
  const deps={
    'next/server':{NextResponse:{json:(data,init={})=>({data,status:init.status||200})}},
    '@/lib/loyalty/api':{requireUser:async()=>({userId:'user'})},
    '@/lib/appointments/games':games,
    '@/model/GameList':asDefault({find:query=>{queried.push(query);return {select:()=>({lean:async()=>docs.filter(doc=>query.platform.$in.includes(doc.platform))})};}}),
  };
  const route=load('./app/api/profile/appointments/games/route.ts',deps);
  let result=await route.GET(new Request('https://test/api?device=ps5&installationType=account'));
  assert.equal(result.status,200);
  assert.deepEqual(queried[0],{platform:{$in:['ps5','ps4']}});
  assert.equal(result.data.items.length,2);
  result=await route.GET(new Request('https://test/api?device=xbox&search=Xbox'));
  assert.equal(result.data.items[0].platform,'xbox');
  assert.equal((await route.GET(new Request('https://test/api?device=ps2'))).status,422);
  assert.equal((await route.GET(new Request('https://test/api?device=xbox&page=1.5'))).status,422);
  const blocked=load('./app/api/profile/appointments/games/route.ts',{...deps,'@/lib/loyalty/api':{requireUser:async()=>({error:{status:401}})}});
  const count=queried.length;
  assert.equal((await blocked.GET(new Request('https://test/api?device=xbox'))).status,401);
  assert.equal(queried.length,count);
});
