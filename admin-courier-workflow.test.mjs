import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as policy from './lib/appointments/policy.ts';
import * as courier from './lib/appointments/courier-policy.ts';
const require=createRequire(import.meta.url), id='a'.repeat(24);
function load(path,deps){
  const module={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(name=>{const d=deps[name]??require(name);return Object.hasOwn(d,'default')?{__esModule:true,...d}:d;},module,module.exports);
  return module.exports;
}
const validation=load('./validations/appointment.validation.ts',{'@/lib/appointments/policy':policy});
function harness(){
  let current={_id:id,user:id,phone:'09123456789',trackingCode:'KA1',serviceType:'game_install',fulfillment:'courier',status:'pending',pricing:{known:false,shippingBaseAmount:120000},courier:{status:'pending',addressSnapshot:{city:'کرمان'}},payment:{status:'unpaid'}};
  const notices=[]; let redeemed=0;
  const route=load('./app/api/admin/appointments/[id]/route.ts',{
    '@/lib/appointments/policy':policy,'@/lib/appointments/courier-policy':courier,
    '@/validations/appointment.validation':validation,
    '@/lib/loyalty/api':{requireAdmin:async()=>({userId:id}),ok:data=>({status:200,data}),fail:(error,status)=>({status,error})},
    '@/lib/appointments/service':{rescheduleAppointment:async()=>{}},
    '@/lib/appointments/rewards.service':{issueVisitRewards:async()=>{},redeemVisitReward:async()=>{redeemed++;return {discount:0,shippingDiscount:0};},releaseVisitReward:async()=>{}},
    '@/model/VisitReward':{default:{}},'@/model/AppointmentReservation':{default:{}},
    '@/lib/sms/business':{deliverBusinessSms:async()=>{}},
    '@/lib/notifications/service':{notifyUser:async n=>{notices.push(n);},notifyAdmins:async()=>{}},
    '@/model/Appointment':{default:{
      findById:async()=>structuredClone(current),
      findOneAndUpdate:async(filter,update)=>{
        assert.equal(filter.status,current.status);
        for(const [key,value] of Object.entries(update.$set)){
          const parts=key.split('.');let target=current;
          for(const part of parts.slice(0,-1))target=target[part]??=( {} );
          target[parts.at(-1)]=value;
        }
        return structuredClone(current);
      },
    }},
  });
  return {patch:body=>route.PATCH(new Request('https://example.test',{method:'PATCH',body:JSON.stringify(body)}),{params:{id}}),get current(){return current;},notices,get redeemed(){return redeemed;}};
}

test('admin request pricing, pickup, completion and return match customer five-step workflow',async()=>{
  const h=harness();
  assert.equal((await h.patch({courierStatus:'assigned'})).status,409);
  assert.equal((await h.patch({status:'confirmed',baseAmount:700000})).status,200);
  assert.equal(h.redeemed,0,'initial price must not redeem the reward');
  assert.equal((await h.patch({status:'completed',baseAmount:800000})).status,409);
  assert.equal((await h.patch({courierStatus:'assigned'})).status,200);
  assert.equal((await h.patch({courierStatus:'returning'})).status,409);
  assert.equal((await h.patch({courierStatus:'picked_up'})).status,200);
  assert.equal((await h.patch({status:'completed',baseAmount:800000})).status,200);
  assert.equal(h.redeemed,1);
  assert.equal(h.current.pricing.finalAmount,920000);
  assert.equal(h.current.courier.status,'return_ready');
  assert.ok(h.notices.some(n=>n.message.includes('۹۲۰٬۰۰۰')&&n.link.includes('ordersTab=games#appointment-')));
  assert.equal((await h.patch({courierStatus:'returning'})).status,200);
  assert.equal(h.current.courier.status,'returning');
});

test('completed legacy requests can return without replaying pickup or overwriting history',async()=>{
  const h=harness();
  h.current.status='completed';h.current.pricing={known:true,finalAmount:920000};
  assert.equal((await h.patch({courierStatus:'returning'})).status,200);
  assert.equal(h.current.courier.status,'returning');
});
