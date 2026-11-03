import test from 'node:test';
import assert from 'node:assert/strict';
import { canCourierTransition, courierStatusAfterService, COURIER_RETURN_DELIVERY_STAGES, courierReturnDeliveryProgress } from './lib/appointments/courier-policy.ts';

test('a newly registered courier request reaches delivery without pickup administration', () => {
  let courier = 'pending';
  assert.equal(courierReturnDeliveryProgress(courier), 0);
  assert.equal(courierStatusAfterService(courier, 'confirmed'), 'pending');
  courier = courierStatusAfterService(courier, 'completed');
  assert.equal(courier, 'return_ready');
  assert.equal(courierReturnDeliveryProgress(courier), 1);
  assert.equal(canCourierTransition(courier, 'delivered'), false);
  assert.equal(canCourierTransition(courier, 'returning'), true);
  assert.equal(canCourierTransition('returning', 'delivered'), true);
  assert.equal(canCourierTransition('delivered', 'returning'), false);
  assert.equal(COURIER_RETURN_DELIVERY_STAGES.length, 3);
});

test('legacy pickup stages can finish service directly and cannot create more pickup work', () => {
  const legacy = ['pending', 'scheduled', 'assigned', 'picked_up', 'at_store'];
  for (const from of legacy) {
    assert.equal(courierStatusAfterService(from, 'completed'), 'return_ready');
    assert.equal(canCourierTransition(from, 'return_ready'), true);
    for (const to of legacy.filter(value => value !== from)) {
      assert.equal(canCourierTransition(from, to), false);
    }
  }
});

test('service corrections preserve dispatch facts and never resurrect cancelled deliveries', () => {
  assert.equal(courierStatusAfterService('return_ready', 'confirmed'), 'pending');
  for (const status of ['cancelled', 'rejected', 'no_show']) {
    assert.equal(courierStatusAfterService('pending', status), 'cancelled');
    assert.equal(courierStatusAfterService('return_ready', status), 'cancelled');
    assert.equal(courierStatusAfterService('delivered', status), 'delivered');
  }
  for (const status of ['return_ready', 'returning', 'delivered', 'cancelled']) {
    assert.equal(courierStatusAfterService(status, 'completed'), status);
  }
});
