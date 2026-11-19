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
const orderDetails = load('./lib/appointments/store-order-details.ts', { './games': games });
const receiptPayload = load('./lib/print/store-order-payload.ts', {
  '@/helpers/toPersianDate': load('./helpers/toPersianDate.ts', {}),
});
function harness({ printFailure = false, smsState = "sent", catalogPrice, installationType = 'account' } = {}){
  let current={_id:id,user:id,phone:'09123456789',trackingCode:'KA1',serviceType:'game_install',fulfillment:'courier',status:'pending',pricing:{known:false,shippingBaseAmount:120000},courier:{status:'pending',addressSnapshot:{city:'کرمان'}},payment:{status:'unpaid'}};
  const prints=[];
  const notices=[]; const messages=[]; let redeemed=0;
  const smsTransport = {deliverBusinessSms:async (message)=>{
    messages.push({ ...message, registered: Boolean(current.storeOrderRegisteredAt), status:current.status, notices: notices.length });
    return {state:smsState};
  }};
  const receiptSms = load('./lib/sms/store-order.ts',{'@/lib/sms/business':smsTransport});
  const orderPatterns = load('./lib/sms/order-patterns.ts',{'@/lib/sms/business':smsTransport,'@/lib/orderIdentifierValue':{}});
  current.updatedAt = new Date('2026-11-12T11:00:00.000Z');
  current.device = 'ps5';
  current.installationType = installationType;
  const route=load('./app/api/admin/appointments/[id]/route.ts',{
    '@/lib/appointments/policy':policy,'@/lib/appointments/courier-policy':courier,
    '@/validations/appointment.validation':validation,
    '@/lib/loyalty/api':{requireAppointmentOperator:async()=>({userId:id}),ok:data=>({status:200,data}),fail:(error,status)=>({status,error})},
    '@/lib/appointments/service':{rescheduleAppointment:async()=>{}},
    '@/lib/appointments/rewards.service':{issueVisitRewards:async()=>{},redeemVisitReward:async()=>{redeemed++;return {discount:0,shippingDiscount:0};},releaseVisitReward:async()=>{}},
    '@/lib/appointments/games':games,
    '@/lib/appointments/store-order-details': orderDetails,
    '@/lib/print/store-order-payload': receiptPayload,
    '@/lib/print/queue': { ensureStoreOrderPrintJob: async (key, payload, actor) => {
      assert.ok(current.storeOrderRegisteredAt);
      if (printFailure) throw new Error('queue unavailable');
      prints.push({ key, payload, actor });
    } },
    '@/lib/store-customer-account': {
      findStoreCustomer: async (id) => ({_id:id,mobile:'09123456789',lastName:'آزمایشی',sex:'مرد'}),
      storeCustomerSnapshot: ({lastName,sex,mobile}) => ({lastName,sex,mobile}),
      toStoreCustomer: user => user,
      storeSmsName: customer => customer.lastName,
    },
    '@/model/GameList':{default:{
      find:()=>({select:()=>({lean:async()=>[{platform:installationType === 'copy' ? 'ps5Copy' : 'ps5',items:[{_id:id,name:'Test Game',size:27.5,price:catalogPrice}]}]})}),
    }},
    '@/model/VisitReward' :{default:{}},'@/model/AppointmentReservation':{default:{}},
    '@/lib/sms/business':smsTransport,
    '@/lib/sms/store-order':receiptSms,
    '@/lib/sms/order-patterns':orderPatterns,
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
  const paymentRoute = load('./app/api/admin/appointments/[id]/payment/route.ts',{
    '@/lib/loyalty/api':{requireAppointmentOperator:async()=>({userId:id}),ok:data=>({status:200,data}),fail:(error,status)=>({status,error}),withRateLimit:()=>null},
    '@/lib/appointments/payment-link':{createAppointmentPaymentLink:async()=>({url:'https://example.test/pay'})},
    '@/lib/notifications/service':{notifyUser:async n=>{notices.push(n);}},
    '@/lib/sms/order-patterns':orderPatterns,
    '@/lib/sms/business':smsTransport,
    '@/model/Appointment':{default:{findById:()=>({lean:async()=>current})}},
    '@/model/BusinessSmsEvent':{default:{findOne:({eventKey})=>({select:()=>({lean:async()=>
      messages.some(message=>message.eventKey===eventKey) ? {status:smsState} : null
    })})}},
  });
  return {patch:body=>route.PATCH(new Request('https://example.test',{method:'PATCH',body:JSON.stringify(body)}),{params:{id}}),payment:()=>paymentRoute.POST(new Request("https://example.test",{method:"POST"}),{params:{id}}),get current(){return current;},notices,messages,prints,get redeemed(){return redeemed;}};
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

test('admin prices courier copy orders from the catalog and keeps account pricing manual', async () => {
  const h = harness({ installationType:'copy', catalogPrice:150_000 });
  const game = { platform: 'ps5Copy', gameId: id };
  assert.equal((await h.patch({ selectedGames: [game] })).status, 200);
  assert.equal(h.current.selectedGames[0].price, 150_000);
  assert.equal(h.current.pricing.serviceBaseAmount, 150_000);
  assert.equal(h.current.pricing.finalAmount, 270_000);

  const account = harness({ catalogPrice:1_350_000 });
  assert.equal((await account.patch({ selectedGames:[{platform:'ps5',gameId:id}] })).status, 200);
  assert.equal(account.current.selectedGames[0].price, undefined);
  assert.equal(account.current.pricing.known, false);
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
  assert.equal(h.current.user,id);
  assert.equal(h.current.storeOrderCustomerSnapshot.lastName,'آزمایشی');
  assert.equal(h.current.storeOrderCustomer,undefined);
  assert.equal(h.current.description,'اطلاعات سفارش');
  assert.equal(h.current.pricing.finalAmount,500000);
  assert.equal((await h.patch({deliverStoreOrder:true})).status,409);
  assert.equal((await h.patch({status:'completed',baseAmount:500000})).status,200);
  assert.equal((await h.patch({deliverStoreOrder:true})).status,200);
  assert.ok(h.current.storeOrderDeliveredAt);
  assert.equal((await h.patch({deliverStoreOrder:true})).status,200);
  assert.equal(h.notices.filter(n=>n.eventKey.startsWith('APPOINTMENT_STORE_DELIVERED:')).length,1);
});

test('courier shop registration and ready send the two matching SMS templates once', async () => {
  const h = harness();
  h.current.status = 'confirmed';
  h.current.courier.status = 'assigned';
  assert.equal((await h.patch({courierStatus:'at_store'})).status,200);
  assert.equal(h.messages.length,0);
  const receipt = await h.patch({registerStoreOrder:true,storeOrderCustomerId:id,baseAmount:700000});
  assert.equal(receipt.data.storeOrderSmsStatus,'sent');
  assert.deepEqual(h.messages[0].args.slice(0,3),['جناب آقای','آزمایشی','پلی استیشن ۵']);
  assert.equal(h.messages[0].registered,true);
  assert.equal(h.messages[0].bodyId,323165);
  assert.equal(h.messages[0].to,'09123456789');
  assert.equal((await h.patch({registerStoreOrder:true,storeOrderCustomerId:id,baseAmount:710000})).status,200);
  const ready = await h.patch({status:'completed',baseAmount:710000});
  assert.equal(ready.data.storeOrderSmsStatus,'sent');
  assert.equal(h.messages[1].bodyId,577164);
  assert.equal(h.messages[1].status,'completed');
  assert.deepEqual(h.messages[1].args,['KA1']);
  assert.equal(h.messages[1].notices,h.notices.length);
  assert.equal((await h.payment()).data.smsStatus,'sent');
  assert.equal((await h.payment()).data.smsStatus,'sent');
  assert.equal((await h.patch({status:'completed',baseAmount:710000})).status,200);
  assert.deepEqual(h.messages.map(m=>m.bodyId),[323165,577164]);
});

test('SMS provider failure leaves courier registration and completion saved', async () => {
  const h = harness({smsState:'failed'});
  h.current.status = 'confirmed';
  h.current.courier.status = 'at_store';
  assert.equal((await h.patch({registerStoreOrder:true,baseAmount:700000})).data.storeOrderSmsStatus,'failed');
  assert.ok(h.current.storeOrderRegisteredAt);
  assert.equal((await h.patch({status:'completed',baseAmount:700000})).data.storeOrderSmsStatus,'failed');
  assert.equal(h.current.status,'completed');
});

test('only the first successful website registration queues the saved receipt for the shop printer', async () => {
  for (const fulfillment of ['in_store', 'courier']) {
    const h = harness({ installationType: 'copy', catalogPrice: 150000 });
    const isCourier = fulfillment === 'courier';
    Object.assign(h.current, {
      fulfillment, customerName: 'مشتری سایت', courier: isCourier ? h.current.courier : null,
      pricing: { known: false, shippingBaseAmount: isCourier ? 120000 : 0 },
    });
    if (isCourier) h.current.courier.status = 'at_store';
    const registration = {
      registerStoreOrder: true, baseAmount: 150000, selectedGames: [{ platform: 'ps5Copy', gameId: id }],
      storeOrderDescription: 'رسید دستگاه', ...(isCourier && { storeOrderCustomerId: id }),
    };
    assert.equal((await h.patch(registration)).status, 409);
    assert.equal(h.prints.length, 0);
    h.current.status = 'confirmed';
    const response = await h.patch(registration);
    assert.equal(response.data.printStatus, 'queued');
    assert.equal(h.prints.length, 1);
    const [{ key, payload, actor }] = h.prints;
    assert.equal(key, id);
    assert.equal(actor, id);
    assert.equal(payload.receiptType, 'ps5Copy');
    assert.equal(payload.price, isCourier ? 270000 : 150000);
    assert.equal(payload.fullName, isCourier ? 'آزمایشی' : 'مشتری سایت');
    assert.equal(payload.mobile, h.current.phone);
    assert.equal(payload.customerDescription, 'رسید دستگاه');
    assert.equal(payload.totalSizeGB, 27.5);
    assert.deepEqual(payload.games, [{ name: 'Test Game', sizeGB: 27.5, price: isCourier ? 150000 : 0, storage: '' }]);
    const edit = await h.patch({ ...registration, storeOrderDescription: 'ویرایش' });
    assert.equal(edit.status, 200);
    assert.equal(edit.data.printStatus, undefined);
    assert.equal(h.prints.length, 1);
  }
});

test('a printer queue failure leaves registration saved and reports the manual print fallback', async () => {
  const h = harness({ printFailure: true });
  h.current.status = 'confirmed';
  h.current.courier.status = 'at_store';
  const response = await h.patch({ registerStoreOrder: true, baseAmount: 700000 });
  assert.equal(response.status, 200);
  assert.equal(response.data.printStatus, 'failed');
  assert.equal(response.data.storeOrderSmsStatus, 'sent');
  assert.ok(h.current.storeOrderRegisteredAt);
});
