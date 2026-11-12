import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as policy from './lib/appointments/policy.ts';
import * as games from './lib/appointments/games.ts';
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
  current.updatedAt = new Date('2026-11-12T11:00:00.000Z');
  current.device = 'ps5';
  current.installationType = 'account';
  const route=load('./app/api/admin/appointments/[id]/route.ts',{
    '@/lib/appointments/policy':policy,'@/lib/appointments/courier-policy':courier,
    '@/validations/appointment.validation':validation,
    '@/lib/loyalty/api':{requireAppointmentOperator:async()=>({userId:id}),ok:data=>({status:200,data}),fail:(error,status)=>({status,error})},
    '@/lib/appointments/service':{rescheduleAppointment:async()=>{}},
    '@/lib/appointments/rewards.service':{issueVisitRewards:async()=>{},redeemVisitReward:async()=>{redeemed++;return {discount:0,shippingDiscount:0};},releaseVisitReward:async()=>{}},
    '@/lib/appointments/games':games,
    '@/model/Customer':{default:{exists:async({mobile})=>mobile==='09123456789'}},
    '@/model/GameList':{default:{
      find:()=>({select:()=>({lean:async()=>[{platform:'ps5',items:[{_id:id,name:'Test Game',size:27.5}]}]})}),
    }},
    '@/model/VisitReward' :{default:{}},'@/model/AppointmentReservation':{default:{}},
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
        current.updatedAt = new Date(current.updatedAt.getTime() + 1);
        return {...structuredClone(current),toObject:()=>structuredClone(current)};
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
  assert.equal((await h.patch({courierStatus:'picked_up'})).status,422);
  assert.equal((await h.patch({courierStatus:'at_store'})).status,200);
  assert.ok(h.current.courier.arrivedAtStoreAt);
  assert.equal((await h.patch({status:'completed',baseAmount:800000})).status,409);
  assert.equal((await h.patch({registerStoreOrder:true,baseAmount:800000})).status,200);
  assert.ok(h.current.storeOrderRegisteredAt);
  assert.equal(h.current.pricing.finalAmount,920000);
  assert.equal((await h.patch({status:'completed',baseAmount:800000})).status,200);
  assert.equal(h.redeemed,1);
  assert.equal(h.current.pricing.finalAmount,920000);
  assert.equal(h.current.courier.status,'return_ready');
  assert.ok(h.notices.some(n=>n.message.includes('۹۲۰٬۰۰۰')&&n.link.includes('ordersTab=games#appointment-')));
  assert.equal((await h.patch({courierStatus:'returning'})).status,200);
  assert.equal(h.current.courier.status,'returning');
  assert.equal((await h.patch({courierStatus:'delivered'})).status,200);
  assert.ok(h.current.courier.deliveredAt);
});

test('completed legacy requests can return without replaying pickup or overwriting history',async()=>{
  const h=harness();
  h.current.status='completed';h.current.pricing={known:true,finalAmount:920000};
  assert.equal((await h.patch({courierStatus:'returning'})).status,200);
  assert.equal(h.current.courier.status,'returning');
});

test('courier game edits validate the catalog, update the shared amount, and notify the customer', async () => {
  const h = harness();
  const game = { platform: 'ps5', gameId: id };
  const oldRevision = h.current.updatedAt.toISOString();
  assert.equal((await h.patch({ selectedGames: [game, game] })).status, 422);
  const edited = await h.patch({ selectedGames: [game], baseAmount: 200000, expectedUpdatedAt: oldRevision });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.gamesNotificationStatus, 'sent');
  assert.equal(h.current.totalSizeGB, 27.5);
  assert.equal(h.current.selectedGames[0].name, 'Test Game');
  assert.equal(h.current.pricing.finalAmount, 320000);
  assert.equal(h.notices.filter((notice) => notice.eventKey.startsWith('APPOINTMENT_GAMES:')).length, 1);
  assert.equal((await h.patch({ selectedGames: [game], baseAmount: 300000, expectedUpdatedAt: oldRevision })).status, 409);
  h.current.payment.status = 'paid';
  assert.equal((await h.patch({ selectedGames: [game] })).status, 409);
  assert.equal(h.current.pricing.finalAmount, 320000);
});

test('legacy picked-up orders can be received and registered at the shop', async () => {
  const h = harness();
  h.current.status = 'confirmed';
  h.current.courier.status = 'picked_up';
  assert.equal((await h.patch({ registerStoreOrder: true, baseAmount: 800000 })).status, 409);
  assert.equal((await h.patch({ courierStatus: 'at_store' })).status, 200);
  assert.equal((await h.patch({ registerStoreOrder: true, baseAmount: 800000 })).status, 200);
  const firstRegistration = h.current.storeOrderRegisteredAt.getTime();
  assert.equal((await h.patch({ registerStoreOrder: true, baseAmount: 810000 })).status, 200);
  assert.equal(h.current.storeOrderRegisteredAt.getTime(), firstRegistration);
  assert.equal(h.current.pricing.finalAmount, 930000);
});

test('website in-store orders register and complete through the manual stages with the original customer', async () => {
  const h = harness();
  h.current.fulfillment = 'in_store';
  h.current.courier = null;
  h.current.pricing = {known:false, shippingBaseAmount:0};
  assert.equal((await h.patch({registerStoreOrder:true,baseAmount:500000})).status,409);
  assert.equal((await h.patch({status:'confirmed'})).status,200);
  assert.equal((await h.patch({status:'completed',baseAmount:500000})).status,409);
  assert.equal((await h.patch({registerStoreOrder:true,storeOrderCustomerId:id,baseAmount:500000,
    storeOrderDescription:'اطلاعات سفارش', selectedGames:[{platform:'ps5',gameId:id}]})).status,200);
  assert.equal(h.current.storeOrderCustomer,id);
  assert.equal(h.current.description,'اطلاعات سفارش');
  assert.equal(h.current.pricing.finalAmount,500000);
  assert.equal((await h.patch({deliverStoreOrder:true})).status,409);
  assert.equal((await h.patch({status:'completed',baseAmount:500000})).status,200);
  assert.equal((await h.patch({deliverStoreOrder:true})).status,200);
  assert.ok(h.current.storeOrderDeliveredAt);
  assert.equal((await h.patch({deliverStoreOrder:true})).status,200);
  assert.equal(h.notices.filter(n=>n.eventKey.startsWith('APPOINTMENT_STORE_DELIVERED:')).length,1);
});
