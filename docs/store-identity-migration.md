# Customer and user migration

The order desk and account registration use the same User ID. The migration adds that ID to existing manual orders and retains their Customer ID and a receipt snapshot. Existing user profile fields and verified numbers keep priority. The original customers collection remains available to the previous application version and as migration evidence.

Run the commands from a checkout of the reviewed branch with dependencies installed. Use the VPS application's existing environment file and the MongoDB hostname inspected in Atlas. The first command builds a plan from current data. It prints counts and a digest.

```bash
node --env-file=/path/to/app/.env scripts/migrate-store-identities.mjs --db test --host atlas-hostname --cleanup
```

Verify the destination and the proposed counts, especially wallet credits and courier requests. Pause manual edits to customers and test payments for the short apply window. Use the digest from the reviewed run for the transaction.

```bash
node --env-file=/path/to/app/.env scripts/migrate-store-identities.mjs --db test --host atlas-hostname --cleanup --apply --expect reviewed-digest
```

A concurrent change to a planned record invalidates the digest. Run the plan again and verify the new counts. In a successful apply, the process reports an empty broken-reference map and zero remaining operations. The live version can still read its existing Customer links. Recheck the plan before switching the app to the branch because older versions can still write customers and manual orders.

The cleanup moves confirmed staff test couriers, matching reservations and notices, test wallet entries, and orphaned historical data into `storeidentitymigrationarchive`. A customer request handled by a staff member keeps its original owner. Reversing a completed test credit checks the wallet and its ledger before changing the balance. The original paid online order remains in `orders`. The migration does not send payment, SMS, or print requests.

After switching, test a verified website user in manual order search, a store customer completing their first OTP signup, barcode search and editing, a historical receipt, a store receipt retry, and online courier intake. Test using a separate database or test accounts.

A failed transaction rolls back the document edits as a unit. The archive stores before and after documents for each committed change. To reverse a committed batch, compare the saved after document against the current record before applying each inverse change. Review any account signed up or order created after the batch individually to retain those records and their owners.
