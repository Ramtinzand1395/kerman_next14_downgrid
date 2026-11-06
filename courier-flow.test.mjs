import test from 'node:test';
import assert from 'node:assert/strict';
import { courierShippingCosts, courierStages, courierStageProgress, canCourierTransition, courierStatusAfterService, COURIER_RETURN_DELIVERY_STAGES, courierReturnDeliveryProgress } from './lib/appointments/courier-policy.ts';

test('pickup, receipt and return are the three courier actions in order', () => {
  assert.equal(COURIER_RETURN_DELIVERY_STAGES.length, 3);
  assert.equal(canCourierTransition('pending', 'assigned'), true);
  assert.equal(canCourierTransition('pending', 'picked_up'), false);
  assert.equal(canCourierTransition('assigned', 'picked_up'), true);
  assert.equal(canCourierTransition('picked_up', 'returning'), false);
  assert.equal(courierStatusAfterService('picked_up', 'completed'), 'return_ready');
  assert.equal(canCourierTransition('return_ready', 'returning'), true);
  assert.equal(canCourierTransition('returning', 'delivered'), false);
  assert.equal(canCourierTransition('returning', 'assigned'), false);
  for (const [state, progress] of [['pending',0],['assigned',1],['picked_up',2],['return_ready',2],['returning',3],['delivered',3]]) {
    assert.equal(courierReturnDeliveryProgress(state), progress);
  }
});

test('old scheduled and at_store records remain actionable without migration', () => {
  assert.equal(canCourierTransition('scheduled', 'assigned'), true);
  assert.equal(courierStatusAfterService('at_store', 'completed'), 'return_ready');
  assert.equal(canCourierTransition('at_store', 'return_ready'), true);
  assert.equal(canCourierTransition('picked_up', 'assigned'), false);
});

test('service corrections preserve courier facts and terminal history', () => {
  assert.equal(courierStatusAfterService('return_ready', 'confirmed'), 'picked_up');
  for (const status of ['cancelled', 'rejected', 'no_show']) {
    assert.equal(courierStatusAfterService('pending', status), 'cancelled');
    assert.equal(courierStatusAfterService('return_ready', status), 'cancelled');
    assert.equal(courierStatusAfterService('delivered', status), 'delivered');
  }
  for (const status of ['return_ready', 'returning', 'delivered', 'cancelled']) {
    assert.equal(courierStatusAfterService(status, 'completed'), status);
  }
});


test('route-specific progress and legacy pricing retain historical behavior',()=>{
  assert.deepEqual(courierShippingCosts(120000,'pickup'),{pickupShippingCost:120000,returnShippingCost:0,totalShippingCost:120000});
  assert.deepEqual(courierShippingCosts(120000,'return'),{pickupShippingCost:0,returnShippingCost:120000,totalShippingCost:120000});
  assert.equal(courierShippingCosts(120000,'round_trip',1).totalShippingCost,240000);
  assert.equal(courierShippingCosts(120000,undefined,1).totalShippingCost,120000);
  assert.equal(courierStages('pickup').length,2);
  assert.equal(courierStageProgress('picked_up','pickup'),2);
  assert.deepEqual(courierStages('return').map(s=>s.status),['return_ready','returning']);
  assert.equal(courierStageProgress('return_ready','return'),1);
  assert.equal(courierStatusAfterService('return_ready','confirmed','return'),'pending');
  assert.equal(courierStageProgress('cancelled','return'),0);
});
