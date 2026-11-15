import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const id = 'a'.repeat(24);

function load(path, deps, fetch) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', 'fetch', code)(name => {
    const dep = deps[name] ?? require(name);
    return Object.hasOwn(dep, 'default') ? {__esModule: true, ...dep} : dep;
  }, module, module.exports, fetch);
  return module.exports;
}
function harness({ current, claim = true, auth = {userId: id}, gatewayError = false, check = false } = {}) {
  const calls = [], writes = [];
  const fixture = current === undefined
    ? {_id:id, user:id, status:'completed', trackingCode:'KA1', phone:'09123456789', pricing:{known:true,finalAmount:125000}, payment:{status:'unpaid'}}
    : current;
  const Appointment = {
    findOne: filter => { calls.push(['read',filter]); return {lean:async()=>fixture}; },
    findOneAndUpdate: async filter => { calls.push(['claim',filter]); return claim ? {payment:{startedAt:new Date(0)}} : null; },
    updateOne: async (filter, update) => { writes.push({filter,update}); return {modifiedCount:1}; },
  };
  const gateway = async (url,options) => {
    calls.push(['gateway',JSON.parse(options.body)]);
    if (gatewayError) throw new Error('network');
    return {ok:true,json:async()=>({data:{code:100,authority:'Atest123'}})};
  };
  const recovery = load('./lib/appointments/payment-recovery.ts', {
    '@/model/Appointment': {default:Appointment},
    '@/lib/notifications/service': {},
  }, gateway);
  const payment = load('./lib/appointments/payment-link.ts', {
    mongoose: {default:{isValidObjectId:()=>true}},
    '@/model/Appointment': {default:Appointment},
    '@/lib/mongodb': {default:async()=>{}},
    '@/lib/baseUrl': {getSiteUrl:()=> 'https://example.test'},
    './payment-recovery': recovery,
  }, gateway);
  const route = load('./app/api/profile/appointments/[id]/payment/route.ts', {
    '@/lib/loyalty/api': {requireUser: async()=>auth, withRateLimit:()=>null, fail:(error,status)=>({error,status}), ok:data=>({status:200,data})},
    '@/lib/appointments/payment-link': {createAppointmentPaymentLink:payment.createAppointmentPaymentLink},
  }, gateway);
  return {post:()=>route.POST(new Request(check ? 'https://example.test?check=1' : 'https://example.test', {method:'POST',body:'{"amount":1}'}), {params:{id}}),calls,writes};
}

test('payment checks session, ownership, reviewed amount and duplicate initiation', async () => {
  process.env.ZARINPAL_MERCHANT_ID = 'test-merchant';
  assert.equal((await harness({auth:{error:{status:401}}}).post()).status,401);
  assert.equal((await harness({current:null}).post()).status,404);
  assert.equal((await harness({current:{status:'confirmed'}}).post()).status,409);
  assert.equal((await harness({current:{payment:{status:'paid'}}}).post()).data.paymentStatus,'paid');
  const locked=harness({claim:false});
  assert.equal((await locked.post()).status,409);
  assert.equal(locked.calls.some(([kind])=>kind==='gateway'),false);
});

test('payment uses server toman total converted to rial and stores authority before redirect', async () => {
  const h=harness();
  const result=await h.post();
  assert.equal(result.status,200);
  assert.equal(h.calls.find(([kind])=>kind==='gateway')[1].amount,1250000);
  assert.equal(h.writes[0].update.$set['payment.status'],'pending');
  assert.match(result.data.url,/StartPay\/Atest123$/);
});

test('pending attempts and check-only requests never start another payment', async () => {
  const h=harness({current:{status:'completed',pricing:{known:true,finalAmount:125000},payment:{status:'pending',authority:'Aexisting'}}});
  assert.deepEqual((await h.post()).data,{paymentStatus:'pending'});
  assert.equal(h.calls.length,1);
  const checkOnly = harness({check:true});
  assert.deepEqual((await checkOnly.post()).data,{paymentStatus:'unpaid'});
  assert.equal(checkOnly.calls.length,1);
  const failed=harness({gatewayError:true});
  assert.equal((await failed.post()).status,502);
  assert.equal(failed.writes[0].filter['payment.status'],'initiating');
  assert.equal(failed.writes[0].update.$set['payment.status'],'failed');
});

function recoveryHarness({ verify = {code:100, ref_id:42}, inquiry, networkError = false, noticeFailure = false, verifyErrorStatus } = {}) {
  const appointment = {
    _id: id, user:id, fulfillment:'courier', trackingCode:'KA1',
    payment:{amount:125000,status:'pending',authority:'Atest123'},
  };
  const calls = [], notices = [];
  const read = () => ({lean:async()=>structuredClone(appointment)});
  const Appointment = {
    findOne:read,
    findOneAndUpdate:(filter, update)=>({lean:async()=>{
      assert.equal(filter['payment.authority'], 'Atest123');
      assert.equal(filter['payment.amount'], 125000);
      if (appointment.payment.status !== filter['payment.status']) return null;
      appointment.payment.status = update.$set['payment.status'];
      appointment.payment.refId = update.$set['payment.refId'];
      appointment.payment.notificationPending = update.$set['payment.notificationPending'];
      return structuredClone(appointment);
    }}),
    findById:()=>({select:read}),
    updateOne:async (filter, update)=>{
      if (appointment.payment.status !== filter['payment.status']) return {modifiedCount:0};
      if (update.$set) appointment.payment.status = update.$set['payment.status'];
      if (update.$unset?.['payment.notificationPending']) delete appointment.payment.notificationPending;
      return {modifiedCount:1};
    },
  };
  const gateway = async (url, options)=>{
    const method = url.split('/').at(-1).split('.')[0];
    calls.push([method, JSON.parse(options.body)]);
    if (networkError) throw new Error('timeout');
    if (method === 'verify' && verifyErrorStatus) return {ok:false,status:verifyErrorStatus,json:async()=>({data:[],errors:{code:-51}})};
    return {ok:true,json:async()=>({data:method === 'verify' ? verify : inquiry})};
  };
  const record = async (notice)=>{
    notices.push(notice);
    if (noticeFailure) throw new Error('notification unavailable');
  };
  const model = {'@/model/Appointment':{default:Appointment}};
  const recovery = load('./lib/appointments/payment-recovery.ts', {
    ...model,
    '@/lib/notifications/service':{notifyUser:record,notifyAdmins:record},
  }, gateway);
  const route = load('./app/api/appointments/payment/verify/route.ts', {
    ...model,
    '@/lib/appointments/payment-recovery':recovery,
    '@/lib/mongodb':{default:async()=>{}}, '@/lib/baseUrl':{getSiteUrl:()=> 'https://example.test'},
    'next/server':{NextResponse:{redirect:url=>({url:String(url)})}},
  }, gateway);
  return {
    appointment, notices, calls,
    check:()=>recovery.reconcileAppointmentPayment(structuredClone(appointment)),
    callback:status=>route.GET(new Request(`https://example.test?Authority=Atest123&Status=${status}`)),
  };
}

test('a disconnected client payment is recovered with its stored amount even after an earlier verify', async () => {
  const h = recoveryHarness({verify:{code:101,ref_id:42}});
  assert.equal(await h.check(), 'paid');
  assert.deepEqual(h.calls[0], ['verify',{authority:'Atest123',amount:1250000,merchant_id:'test-merchant'}]);
  assert.equal(h.appointment.payment.refId, '42');
  assert.equal(h.notices.length, 2);
  assert.match(h.notices[1].link,/fulfillment=courier/);
  assert.match((await h.callback('OK')).url,/servicePayment=paid/);
  assert.equal(h.calls.length, 1);
});

test('concurrent callback and recovery confirm once even with an untrusted callback Status', async () => {
  const h = recoveryHarness();
  const [callback, status] = await Promise.all([h.callback('NOK'), h.check()]);
  assert.match(callback.url,/servicePayment=paid/);
  assert.equal(status, 'paid');
  assert.equal(h.notices.length, 2);
});

test('only a conclusive gateway outcome unlocks another attempt', async () => {
  for (const status of ['IN_BANK', 'PAID', 'VERIFIED', 'UNKNOWN']) {
    const h = recoveryHarness({verify:{code:-51}, inquiry:{code:100,status}});
    assert.equal(await h.check(), 'pending');
    assert.equal(h.appointment.payment.status, 'pending');
  }
  for (const options of [{networkError:true}, {verify:{code:101,ref_id:null}}]) {
    const h = recoveryHarness(options);
    assert.equal(await h.check(), 'pending');
    assert.equal(h.appointment.payment.status, 'pending');
  }
  const failed = recoveryHarness({verifyErrorStatus:422, inquiry:{code:100,status:'FAILED'}});
  assert.equal(await failed.check(), 'failed');
  assert.equal(failed.appointment.payment.status, 'failed');
});

test('successful payment survives notification failure and stays queued for retry', async () => {
  const h = recoveryHarness({noticeFailure:true});
  assert.equal(await h.check(), 'paid');
  assert.equal(h.appointment.payment.notificationPending, true);
});
