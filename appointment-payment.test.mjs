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
function harness({ current, claim = true, auth = {userId: id}, gatewayError = false } = {}) {
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
  // The route delegates gateway work to this shared server-side module.
  // Load both modules through the same mock harness to exercise the real payment logic.
  const payment = load('./lib/appointments/payment-link.ts', {
    mongoose: {default:{isValidObjectId:()=>true}},
    '@/model/Appointment': {default:Appointment},
    '@/lib/mongodb': {default:async()=>{}},
    '@/lib/baseUrl': {getSiteUrl:()=> 'https://example.test'},
  }, gateway);
  const route = load('./app/api/profile/appointments/[id]/payment/route.ts', {
    '@/lib/loyalty/api': {requireUser: async()=>auth, withRateLimit:()=>null, fail:(error,status)=>({error,status}), ok:data=>({status:200,data})},
    '@/lib/appointments/payment-link': {createAppointmentPaymentLink:payment.createAppointmentPaymentLink},
  }, gateway);
  return {post:()=>route.POST(new Request('https://example.test', {method:'POST',body:'{"amount":1}'}), {params:{id}}),calls,writes};
}

test('payment checks session, ownership, reviewed amount and duplicate initiation', async () => {
  process.env.ZARINPAL_MERCHANT_ID = 'test-merchant';
  assert.equal((await harness({auth:{error:{status:401}}}).post()).status,401);
  assert.equal((await harness({current:null}).post()).status,404);
  assert.equal((await harness({current:{status:'confirmed'}}).post()).status,409);
  assert.equal((await harness({current:{payment:{status:'paid'}}}).post()).status,409);
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

test('pending payment reuses authority and gateway failure releases only its own lock', async () => {
  const h=harness({current:{status:'completed',pricing:{known:true,finalAmount:125000},payment:{status:'pending',authority:'Aexisting'}}});
  assert.match((await h.post()).data.url,/Aexisting$/);
  assert.equal(h.calls.length,1);
  const failed=harness({gatewayError:true});
  assert.equal((await failed.post()).status,502);
  assert.equal(failed.writes[0].filter['payment.status'],'initiating');
  assert.equal(failed.writes[0].update.$set['payment.status'],'failed');
});

test('gateway callback verifies stored amount and duplicate callbacks do not repeat notifications', async () => {
  let paid=false, notices=0, amount;
  const route=load('./app/api/appointments/payment/verify/route.ts', {
    '@/lib/mongodb': {default:async()=>{}}, '@/lib/baseUrl':{getSiteUrl:()=> 'https://example.test'},
    'next/server':{NextResponse:{redirect:url=>({url:String(url)})}},
    '@/lib/notifications/service':{notifyUser:async()=>{notices++;},notifyAdmins:async()=>{notices++;}},
    '@/model/Appointment':{default:{
      findOne:()=>({lean:async()=>({_id:id,user:id,trackingCode:'KA1',payment:{amount:125000,status:paid?'paid':'pending'}})}),
      findOneAndUpdate:async()=>{if(paid)return null;paid=true;return {_id:id};},
    }},
  },async (_url,options)=>{amount=JSON.parse(options.body).amount;return {ok:true,json:async()=>({data:{code:100,ref_id:42}})};});
  const req=new Request('https://example.test?Authority=Atest123&Status=OK');
  assert.match((await route.GET(req)).url,/servicePayment=paid/);
  assert.equal(amount,1250000);
  await route.GET(req);
  assert.equal(notices,2);
});
