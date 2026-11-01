import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as games from './lib/appointments/games.ts';
import * as policy from './lib/appointments/policy.ts';
import * as draft from './lib/appointments/draft.ts';
const require = createRequire(import.meta.url);
const id4 = '4'.repeat(24), id5 = '5'.repeat(24), idX = 'a'.repeat(24);
const fixtures = [
  { platform: 'ps4', items: [{ _id: id4, name: 'Same Game', size: 40, imageUrl: 'https://res.cloudinary.com/aeylqy7h/image/upload/game.webp' }] },
  { platform: 'ps5', items: [{ _id: id5, name: 'Same Game', size: 60.25 }] },
  { platform: 'copy', items: [{ _id: id4, name: 'PS4 Copy', size: null }] },
  { platform: 'ps5Copy', items: [{ _id: id5, name: 'PS5 Copy', size: 0 }] },
  { platform: 'xbox', items: [{ _id: idX, name: 'Xbox Game', size: 20 }] },
];
const refs = [{ platform: 'ps4', gameId: id4 }, { platform: 'ps5', gameId: id5 }];
const legal = games.installationCatalog(fixtures, games.installationPlatforms('ps5', 'account'));

function loadModule(path, deps) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => deps[name] && Object.hasOwn(deps[name], 'default') ? {__esModule:true,...deps[name]} : deps[name] ?? require(name), module, module.exports);
  return module.exports;
}
const validation = loadModule('./validations/appointment.validation.ts', { '@/lib/appointments/policy': policy });
const base = () => ({
  fulfillment: 'in_store', clientRequestKey: 'test-request-key', serviceType: 'game_install',
  device: 'ps5', installationType: 'account', selectedGames: refs,
  description: '', customerName: 'Test User', phone: '09123456789', startsAt: new Date(Date.now() + 86400_000),
});

test('installation compatibility matrix separates legal, copy and Xbox catalogs', () => {
  assert.deepEqual(policy.supportedDevicesForService('game_install', []), ['ps5', 'ps4', 'xbox']);
  for (const [device, type, expected] of [
    ['ps5', 'account', ['ps5', 'ps4']], ['ps5', 'copy', ['ps5Copy', 'copy']],
    ['ps4', 'account', ['ps4']], ['ps4', 'copy', ['copy']], ['xbox', null, ['xbox']],
    ['xbox', 'account', []], ['ps5', null, []], ['ps2', 'copy', []],
  ]) assert.deepEqual(games.installationPlatforms(device, type), expected);
  assert.equal(legal.length, 2);
  assert.deepEqual(new Set(legal.map(game => game.version)), new Set(['PS4', 'PS5']));
  assert.notEqual(games.gameKey(legal[0]), games.gameKey(legal[1]));
});

test('copy aliases retain PS4/PS5 tags and unknown sizes do not masquerade as zero', () => {
  const aliases = [{platform: 'ps4copy', items: [{_id: id4, name:'Old Copy', size: -1}]}, fixtures[3]];
  const catalog = games.installationCatalog(aliases, ['copy', 'ps5Copy']);
  assert.equal(catalog.find(game => game.platform === 'copy').version, 'PS4');
  assert.deepEqual(games.installationSize(catalog), {totalSizeGB: 0, unknownSizeCount: 1});
  assert.deepEqual(games.installationSize(legal), {totalSizeGB: 100.25, unknownSizeCount: 0});
  assert.ok(games.catalogPlatformAliases(['copy']).includes('ps4copy'));
});

test('snapshot resolution rejects duplicate, deleted, incompatible and excessive selections', () => {
  assert.equal(games.resolveInstallationGames(refs, legal).length, 2);
  for (const bad of [[], [refs[0], refs[0]], [{platform: 'xbox', gameId: idX}], [{...refs[0], gameId: idX}], Array(101).fill(refs[0])]) {
    assert.throws(() => games.resolveInstallationGames(bad, legal));
  }
});

test('appointment validation accepts references only and discards client metadata and forged totals', () => {
  const parsed = validation.appointmentCreateSchema.parse({...base(), totalSizeGB: 1, selectedGames: [{...refs[0], name: 'forged', sizeGB: 1}]});
  assert.deepEqual(parsed.selectedGames, [refs[0]]);
  assert.equal(parsed.totalSizeGB, undefined);
  assert.equal(validation.appointmentCreateSchema.safeParse({...base(), selectedGames: [{platform:'bad',gameId:'bad'}]}).success, false);
});

function serviceHarness({ docs = fixtures } = {}) {
  const writes = [], notifications = [];
  let saved;
  const Appointment = {
    init: async () => {}, findOne: async () => saved || null, countDocuments: async () => 0,
    create: async data => {
      saved = {...data, _id: idX, save: async () => {}, toObject() { const {save,toObject,...data} = this; return data; }};
      writes.push(data);
      return saved;
    },
  };
  const Reservation = {
    init: async () => {}, updateMany: async () => {}, findOne: async () => null,
    create: async () => ({_id:idX}), updateOne: async () => {},
  };
  const deps = {
    '@/model/GameList': {default: { find: () => ({select: () => ({lean: async () => docs})}) }},
    '@/model/Appointment': {default:Appointment}, '@/model/AppointmentReservation': {default:Reservation},
    '@/model/Address': {default:{findOne: () => ({lean: async()=> ({city:'Kerman', address:'Test address 1234'})})}},
    '@/model/User': {default:{findById: () => ({select: async () => ({_id:idX})})}},
    '@/lib/notifications/service': {notifyAdmins: async () => notifications.push('admin'), notifyUser: async () => notifications.push('user')},
    './games': games, './policy': policy,
    './settings': {
      getAppointmentSettings: async () => ({supportedDevices:[],bookingDaysAhead:21,slotMinutes:30,serviceCapacity:{game_install:2,repair:2},maxActiveAppointmentsPerUser:3,courierEnabled:true,courierRoundTripMultiplier:2}),
      tehranDateKey: () => '2026-11-03', slotIsConfigured: () => true,
      findCourierRegion: () => ({id:'kerman', title:'Kerman', shippingCost:50000}),
      courierWindowIsConfigured: () => true, isWindowInPast: () => false,
      tehranDateTime: () => new Date(Date.now()+86400_000),
    },
    './rewards.service': {reserveVisitReward:async()=>null,releaseVisitReward:async()=>{}},
  };
  return { service: loadModule('./lib/appointments/service.ts', deps), writes, notifications };
}

test('registration stores server snapshots and total; admin/user responses contain the same games', async () => {
  const {service,writes,notifications} = serviceHarness();
  const result = await service.createAppointment(idX, {...base(), selectedGames: refs.map(ref => ({...ref, sizeGB:1, name:'forged'}))});
  assert.equal(result.reused, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].totalSizeGB, 100.25);
  assert.deepEqual(writes[0].selectedGames.map(game => game.name), ['Same Game','Same Game']);
  assert.deepEqual(result.appointment.selectedGames, writes[0].selectedGames);
  assert.deepEqual(notifications.sort(), ['admin','user']);
});

test('registration accepts Xbox without install type and rejects incompatible refs before create', async () => {
  const xbox = serviceHarness();
  const result = await xbox.service.createAppointment(idX, {...base(), device:'xbox',installationType:null,selectedGames:[{platform:'xbox',gameId:idX}]});
  assert.ok(result.appointment);
  assert.equal(xbox.writes[0].installationType, null);
  for (const patch of [
    {selectedGames:[]}, {selectedGames:[refs[0],refs[0]]},
    {device:'ps4',selectedGames:[refs[1]]},
    {device:'xbox',installationType:'copy'},
    {serviceType:'repair',installationType:null,repairIssue:'power',selectedGames:refs},
  ]) {
    const harness = serviceHarness();
    assert.equal((await harness.service.createAppointment(idX,{...base(),...patch})).status,422);
    assert.equal(harness.writes.length,0);
    assert.equal(harness.notifications.length,0);
  }
});

test('idempotency hashes selected references, ignores their order, and preserves historical snapshots', async () => {
  const docs = structuredClone(fixtures);
  const {service,writes} = serviceHarness({docs});
  const input = base();
  const first = await service.createAppointment(idX,input);
  docs.length = 0; // A completed retry must not re-resolve edited/deleted catalog items.
  const second = await service.createAppointment(idX,{...input,selectedGames:[...refs].reverse()});
  assert.equal(first.reused,false);
  assert.equal(second.reused,true);
  assert.equal(writes.length,1);
  assert.equal((await service.createAppointment(idX,{...input,selectedGames:[refs[0]]})).status,409);
});

test('selected games survive the courier address detour with the new step numbering', () => {
  const values = new Map();
  const storage = {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  draft.saveAppointmentDraft(storage,{...base(), step:4,fulfillment:'courier',selectedGames:legal});
  draft.attachNewAddressToAppointmentDraft(storage,idX);
  const restored = draft.readAppointmentDraft(storage);
  assert.equal(restored.step,4);
  assert.equal(restored.selectedAddressId,idX);
  assert.deepEqual(restored.selectedGames,legal);
});

const routeDeps = {
  'next/server': {NextResponse:{json:(data,init={})=>({data,status:init.status||200})}},
  '@/lib/loyalty/api': {requireUser:async()=>({userId:idX})},
  '@/lib/appointments/games':games,
  '@/model/GameList':{default:{find:query=>({select:()=>({lean:async()=>fixtures.filter(doc=>query.platform.$in.includes(doc.platform))})})}},
};

test('catalog API combines both generations before search/pagination and requires authentication',async()=>{
  const route = loadModule('./app/api/profile/appointments/games/route.ts',routeDeps);
  const url = 'https://example.test/api/profile/appointments/games?device=ps5&installationType=account&limit=1';
  const first = await route.GET({url});
  const second = await route.GET({url:url+'&page=2'});
  assert.equal(first.data.total,2);
  assert.equal(first.data.pages,2);
  assert.notEqual(first.data.games[0].version,second.data.games[0].version);
  assert.equal((await route.GET({url:url+'&search=missing'})).data.games.length,0);
  assert.equal((await route.GET({url:url.replace('device=ps5','device=xbox')})).status,422);
  const denied = loadModule('./app/api/profile/appointments/games/route.ts',{...routeDeps,'@/lib/loyalty/api':{requireUser:async()=>({error:{status:401}})}});
  assert.equal((await denied.GET({url})).status,401);
});

test('courier registrations persist the same game snapshots as in-store registrations', async () => {
  const {service,writes} = serviceHarness();
  const result = await service.createAppointment(idX, {...base(),fulfillment:'courier',addressId:idX,pickupDate:'2026-11-03',pickupWindow:{start:'10:00',end:'12:00'}});
  assert.ok(result.appointment);
  assert.equal(writes[0].fulfillment,'courier');
  assert.equal(writes[0].selectedGames.length,2);
  assert.equal(writes[0].totalSizeGB,100.25);
  assert.ok(writes[0].courier.addressSnapshot);
});

test('Mongoose preserves game snapshots and legacy appointments can still validate without selections', async () => {
  const { default: Appointment } = loadModule('./model/Appointment.ts', {'@/lib/appointments/policy':policy});
  const data = {...base(),user:idX,trackingCode:'KA-TEST',requestHash:'a'.repeat(64),endsAt:new Date(Date.now()+86400_000+1800000),slotKey:'test',selectedGames:legal,totalSizeGB:100.25};
  const instance = new Appointment(data);
  await instance.validate();
  assert.equal(instance.toObject().selectedGames[0].gameId,legal[0].gameId);
  assert.equal(instance.toObject().selectedGames[0].version,legal[0].version);
  assert.equal(instance.toObject().totalSizeGB,100.25);
  const legacy = new Appointment({...data,selectedGames:undefined,totalSizeGB:undefined});
  await legacy.validate();
  assert.deepEqual(legacy.toObject().selectedGames,[]);
});


test('unnamed legacy placeholders never appear in the installation catalog or resolve as selections', () => {
  const placeholderId = 'b'.repeat(24);
  const valid = { _id: id4, name: 'Valid game without a cover', size: 0 };
  const catalog = games.installationCatalog([{platform:'ps4',items:[
    {_id:placeholderId,name:'',size:0},
    {_id:'c'.repeat(24),name:' \t\n ',size:50},
    {_id:'d'.repeat(24),size:10},
    {_id:'e'.repeat(24),name:null,size:10},
    {_id:'f'.repeat(24),name:123,size:10},
    null,
    valid,
  ]}], ['ps4']);
  assert.equal(catalog.length,1);
  assert.equal(catalog[0].name,valid.name);
  assert.equal(catalog[0].sizeGB,0);
  assert.equal(catalog[0].imageUrl,'');
  assert.throws(()=>games.resolveInstallationGames([{platform:'ps4',gameId:placeholderId}],catalog));
});

test('combined catalog pagination and search exclude blank imported rows before counting', async () => {
  const route = loadModule('./app/api/profile/appointments/games/route.ts',{
    ...routeDeps,
    '@/model/GameList':{default:{find:()=>({select:()=>({lean:async()=>[
      ...fixtures,
      {platform:'ps4',items:[{_id:'b'.repeat(24),name:'',size:0},{_id:'c'.repeat(24),name:'   ',size:0}]},
    ]})})}},
  });
  const url='https://example.test/api/profile/appointments/games?device=ps5&installationType=account&limit=1';
  const first=await route.GET({url});
  const second=await route.GET({url:url+'&page=2'});
  assert.equal(first.status,200);
  assert.equal(first.data.total,2);
  assert.equal(first.data.pages,2);
  assert.ok(first.data.games[0].name.trim());
  assert.ok(second.data.games[0].name.trim());
  assert.equal((await route.GET({url:url+'&search=Same'})).data.total,2);
});
