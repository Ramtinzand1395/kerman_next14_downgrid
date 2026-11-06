import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as policy from './lib/appointments/policy.ts';
const require=createRequire(import.meta.url), id='a'.repeat(24);
function preview({owned=true,reward=false,enabled=true}={}) {
  const deps={
    '@/lib/appointments/policy':policy,
    '@/lib/loyalty/api':{requireUser:async()=>({userId:id})},
    '@/model/Address':{default:{findOne:filter=>{assert.equal(filter.userId,id);return {lean:async()=>owned?{_id:id,city:'کرمان'}:null};}}},
    '@/model/VisitReward':{default:{findOne:()=>({lean:async()=>reward?{snapshot:{eligibleServices:['game_install'],reward:{type:'free_shipping',value:0,maxShippingCost:120000}}}:null})}},
    '@/lib/appointments/settings':{
      getAppointmentSettings:async()=>({courierEnabled:enabled,courierRoundTripMultiplier:2,courierRegions:[]}),
      findCourierRegion:()=>({id:'kerman',city:'کرمان',title:'کرمان',shippingCost:120000}),
    },
  };
  const module={exports:{}};
  const source=ts.transpileModule(readFileSync(new URL('./app/api/profile/appointments/courier-preview/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',source)(name=>{const d=deps[name]??require(name);return 'default' in d?{__esModule:true,...d}:d;},module,module.exports);
  return body=>module.exports.POST(new Request('https://example.test',{method:'POST',body:JSON.stringify({addressId:id,serviceType:'game_install',...body})}));
}

test('courier preview charges only requested routes, ignores forged prices, and applies shipping reward cap',async()=>{
  for(const [route,base,pickup,back] of [['pickup',120000,120000,0],['return',120000,0,120000],['round_trip',240000,120000,120000]]){
    const response=await preview()({courierRoute:route,pickupShippingCost:1,shippingBaseAmount:1});
    assert.equal(response.status,200);const data=await response.json();
    assert.equal(data.pricing.shippingBaseAmount,base);
    assert.equal(data.pricing.pickupShippingCost,pickup);assert.equal(data.pricing.returnShippingCost,back);
    const discounted=await (await preview({reward:true})({courierRoute:route,selectedRewardId:id})).json();
    assert.equal(discounted.pricing.shippingDiscountAmount,120000);
    assert.equal(discounted.pricing.shippingFinalAmount,base-120000);
  }
});
test('courier preview rejects invalid routes and foreign addresses',async()=>{
  assert.equal((await preview()({courierRoute:'anything'})).status,422);
  assert.equal((await preview({owned:false})({courierRoute:'return'})).status,404);
  assert.equal((await (await preview({enabled:false})({courierRoute:'pickup'})).json()).eligible,false);
});
