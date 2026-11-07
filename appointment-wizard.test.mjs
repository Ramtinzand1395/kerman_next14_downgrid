import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { validateAppointmentWizard, normalizeAppointmentPhone } from './lib/appointments/wizard-validation.ts';
import { saveAppointmentDraft, readAppointmentDraft } from './lib/appointments/draft.ts';

const valid = { serviceType:'game_install',device:'ps5',installationType:'account',repairIssue:'',description:'',gameCount:2,fulfillment:'courier',hasAddress:true,previewLoading:false,previewEligible:true,previewError:'',selectedDate:'2026-11-05',hasTime:true,timeLoading:false,timeError:'' };
test('a complete order has no hidden contact-field blocker', () => {
  assert.deepEqual(validateAppointmentWizard(valid), []);
  assert.deepEqual(validateAppointmentWizard({...valid,fulfillment:'in_store',hasAddress:false,previewEligible:false}), []);
});
test('missing and unavailable fields identify their own step and correction', () => {
  assert.deepEqual(validateAppointmentWizard({...valid,hasAddress:false,selectedDate:'',gameCount:0}).map(({field,step})=>({field,step})), [{field:'selectedGames',step:2},{field:'addressId',step:4},{field:'selectedDate',step:4}]);
  assert.match(validateAppointmentWizard({...valid,previewEligible:false,previewError:'خارج از محدوده'})[0].message,/خارج از محدوده/);
  assert.equal(validateAppointmentWizard({...valid,hasTime:false})[0].field,'time');
  assert.equal(validateAppointmentWizard({...valid,serviceType:'repair',repairIssue:'other',description:' '})[0].field,'description');
  assert.deepEqual(validateAppointmentWizard({...valid,device:'xbox',installationType:''}), []);
});
test('Persian and Arabic account mobile digits normalize without discarding invalid letters', () => {
  assert.equal(normalizeAppointmentPhone('۰۹۱۲ ۳۴۵ ۶۷۸۹'),'09123456789');
  assert.equal(normalizeAppointmentPhone('٠٩١٢٣٤٥٦٧٨٩'),'09123456789');
  assert.equal(normalizeAppointmentPhone('0912a3456789'),'0912a3456789');
});
test('both delivery modes preserve selections through a login round trip', () => {
  const values = new Map(); const storage = { getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key) };
  for (const fulfillment of ['courier','in_store']) {
    const input={...valid,step:5,fulfillment,selectedGames:[{gameId:'a'.repeat(24),platform:'ps5'}],selectedSlot:{startsAt:'2026-11-05T10:00:00Z'},selectedCourierWindow:{start:'10:00',end:'12:00'},selectedAddressId:'a'.repeat(24),selectedRewardId:'',customerName:'',phone:'',idempotencyKey:'request-1'};
    saveAppointmentDraft(storage,input);
    const restored=readAppointmentDraft(storage);
    assert.equal(restored.step,5); assert.equal(restored.fulfillment,fulfillment);
    assert.deepEqual(restored.selectedGames,input.selectedGames);
  }
});

function routeHarness({auth={userId:'owned-user'},user={username:'نام حساب',mobile:'۰۹۱۲۳۴۵۶۷۸۹'}}={}) {
  let received, lookups=0;
  const deps={
    'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})}},
    '@/model/Appointment':{default:{}},
    '@/model/User':{default:{findById(id){lookups++;assert.equal(id,'owned-user');return {select:()=>({lean:async()=>user})};}}},
    '@/lib/loyalty/api':{requireUser:async()=>auth},
    '@/helpers/stripHtmlTags':{stripHtmlTags:value=>value.replace(/<[^>]*>/g,'')},
    '@/lib/appointments/wizard-validation':{normalizeAppointmentPhone},
    '@/validations/appointment.validation':{appointmentCreateSchema:{safeParse:data=>({success:true,data})}},
    '@/lib/appointments/service':{createAppointment:async(id,data)=>{received={id,data};return {appointment:{trackingCode:'KA1'}};}},
  };
  const module={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL('./app/api/profile/appointments/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(name=>{
    const dep=deps[name];assert.ok(dep,`Unexpected dependency ${name}`);
    return 'default' in dep ? {__esModule:true,...dep} : dep;
  },module,module.exports);
  return {post:body=>module.exports.POST({json:async()=>body,headers:new Headers()}),get received(){return received;},get lookups(){return lookups;}};
}
test('server binds order and courier contact to authenticated database user, ignoring spoofed fields',async()=>{
  const h=routeHarness(); const result=await h.post({description:"",fulfillment:'courier',customerName:'دیگری',phone:'09999999999',recipientName:'دیگری',recipientPhone:'09999999999'});
  assert.equal(result.status,201);assert.equal(h.received.id,'owned-user');
  assert.equal(h.received.data.customerName,'نام حساب');assert.equal(h.received.data.phone,'09123456789');
  assert.equal(h.received.data.recipientName,'نام حساب');assert.equal(h.received.data.recipientPhone,'09123456789');
});
test('server rejects unauthenticated or missing accounts and invalid stored mobiles before creation',async()=>{
  const unauth=routeHarness({auth:{error:{status:401}}});assert.equal((await unauth.post({})).status,401);assert.equal(unauth.lookups,0);
  for (const user of [null,{mobile:'invalid'}]) {
    const h=routeHarness({user});assert.ok([401,422].includes((await h.post({})).status));assert.equal(h.received,undefined);
  }
});
