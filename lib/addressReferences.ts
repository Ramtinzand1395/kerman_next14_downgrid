import { createAddressSnapshot } from "@/lib/addressSnapshot";
import CustomerGameOrder from "@/model/CustomerGameOrder";
import Order from "@/model/Order";
import TempPayment from "@/model/TempPayment";

type PersistedAddress = Parameters<typeof createAddressSnapshot>[0] & {
  _id: unknown;
};

/**
 * Backfills immutable address data before the source address is changed or
 * removed. Existing snapshots are deliberately never overwritten.
 */
export async function preserveAddressSnapshots(address: PersistedAddress) {
  const addressSnapshot = createAddressSnapshot(address);
  const missingSnapshot = {
    $or: [{ addressSnapshot: { $exists: false } }, { addressSnapshot: null }],
  };

  await Promise.all([
    Order.updateMany(
      { address: address._id, ...missingSnapshot },
      { $set: { addressSnapshot } },
    ),
    TempPayment.updateMany(
      { address: address._id, ...missingSnapshot },
      { $set: { addressSnapshot } },
    ),
    CustomerGameOrder.updateMany(
      { addressRef: address._id, ...missingSnapshot },
      { $set: { addressSnapshot } },
    ),
  ]);
}

/** Removes references only after their historical snapshots are persisted. */
export async function detachAddressReferences(addressId: unknown) {
  await Promise.all([
    Order.updateMany({ address: addressId }, { $set: { address: null } }),
    TempPayment.updateMany(
      { address: addressId },
      { $set: { address: null } },
    ),
    CustomerGameOrder.updateMany(
      { addressRef: addressId },
      { $set: { addressRef: null } },
    ),
  ]);
}
