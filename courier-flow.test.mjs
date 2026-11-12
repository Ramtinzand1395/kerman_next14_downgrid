import test from 'node:test';
import assert from 'node:assert/strict';
import { canCourierTransition, courierStatusAfterService, COURIER_RETURN_DELIVERY_STAGES, courierReturnDeliveryProgress } from './lib/appointments/courier-policy.ts';

test('pickup, receipt and return are the three courier actions in order', () => {
  assert.equal(COURIER_RETURN_DELIVERY_STAGES.length, 3);
  assert.equal(canCourierTransition('pending', 'assigned'), true);
  assert.equal(canCourierTransition('pending', 'at_store'), false);
  assert.equal(canCourierTransition('assigned', 'at_store'), true);
  assert.equal(canCourierTransition('picked_up', 'returning'), false);
  assert.equal(courierStatusAfterService('picked_up', 'completed'), 'return_ready');
  assert.equal(canCourierTransition('return_ready', 'returning'), true);
  assert.equal(canCourierTransition('returning', 'delivered'), true);
  assert.equal(canCourierTransition('returning', 'assigned'), false);
  for (const [state, progress] of [['pending',0],['assigned',1],['picked_up',1],['at_store',2],['return_ready',2],['returning',3],['delivered',3]]) {
    assert.equal(courierReturnDeliveryProgress(state), progress);
  }
});

test('old scheduled and picked_up records remain actionable without migration', () => {
  assert.equal(canCourierTransition('scheduled', 'assigned'), true);
  assert.equal(courierStatusAfterService('at_store', 'completed'), 'return_ready');
  assert.equal(canCourierTransition('at_store', 'return_ready'), true);
  assert.equal(canCourierTransition('picked_up', 'assigned'), false);
  assert.equal(canCourierTransition('picked_up', 'at_store'), true);
  assert.equal(canCourierTransition('assigned', 'picked_up'), false);
});

test('service corrections preserve courier facts and terminal history', () => {
  assert.equal(courierStatusAfterService('return_ready', 'confirmed'), 'at_store');
  for (const status of ['cancelled', 'rejected', 'no_show']) {
    assert.equal(courierStatusAfterService('pending', status), 'cancelled');
    assert.equal(courierStatusAfterService('return_ready', status), 'cancelled');
    assert.equal(courierStatusAfterService('delivered', status), 'delivered');
  }
  for (const status of ['return_ready', 'returning', 'delivered', 'cancelled']) {
    assert.equal(courierStatusAfterService(status, 'completed'), status);
  }
});
