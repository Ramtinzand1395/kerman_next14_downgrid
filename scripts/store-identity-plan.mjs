import { createHash } from "node:crypto";
import { BSON } from "mongodb";
import { auditStoreReferences, countBrokenReferences, edges, referenceId } from "./store-identity-references.mjs";

export const archiveCollection = "storeidentitymigrationarchive";
const oid = referenceId;
const isStaff = (user) => ["admin", "superadmin"].includes(user?.role);
const cleanMobile = (value) => typeof value === "string" && /^09\d{9}$/.test(value);
const BSONtext = (value) => BSON.EJSON.stringify(value, { relaxed: false });

function storeProfile(customer) {
  return Object.fromEntries(["name", "lastName", "sex", "birthday", "description"]
    .filter((field) => typeof customer[field] === "string")
    .map((field) => [field, customer[field]]));
}

export function planStoreIdentity(source, { cleanup = false } = {}) {
  const state = Object.fromEntries(Object.entries(source).map(([name, rows]) => [
    name, new Map(rows.map((row) => [oid(row._id) ?? String(row._id), row])),
  ]));
  const updates = new Map();
  const blockers = [];
  const summary = {
    collections: Object.keys(source).length, customers: 0, usersBefore: 0,
    usersInserted: 0, usersMatched: 0, mappedOrders: 0, mappedAppointments: 0,
    removedReferences: 0, archived: {}, reversedWalletCreditToman: 0,
  };
  const changeable = () => Object.fromEntries(Object.entries(state).map(([k, docs]) => [k, [...docs.values()]]));
  const docs = (collection) => [...(state[collection]?.values() ?? [])];
  const doc = (collection, id) => state[collection]?.get(oid(id) ?? String(id));
  const block = (message, record) => blockers.push(record ? message + " " + String(record._id) : message);
  const write = (collection, before, after, reason) => {
    const item = after ?? before;
    const id = oid(item._id);
    if (!id) throw new Error("Invalid changed document ID in " + collection);
    const key = collection + "/" + id;
    const previous = updates.get(key);
    const entry = {
      collection, id: item._id, before: previous ? previous.before : before,
      after, reason: previous ? [...previous.reason, reason] : [reason],
    };
    updates.set(key, entry);
    if (!state[collection]) state[collection] = new Map();
    if (after) state[collection].set(id, after);
    else {
      state[collection].delete(id);
      summary.archived[collection] = (summary.archived[collection] || 0) + 1;
    }
  };
  const patch = (collection, row, values, reason, remove = []) => {
    const after = { ...row, ...values };
    remove.forEach((key) => delete after[key]);
    if (BSONtext(row) !== BSONtext(after)) write(collection, row, after, reason);
  };
  const remove = (collection, row, reason) => write(collection, row, null, reason);

  const users = docs("users");
  const customers = docs("customers");
  const byMobile = new Map();
  const barcodeOwners = new Map();
  const legacyOwners = new Map();
  for (const user of users) {
    if (!cleanMobile(user.mobile) || byMobile.has(user.mobile)) block("Invalid or duplicate users.mobile", user);
    byMobile.set(user.mobile, user);
    if (user.legacyCustomerId) {
      const legacyId = oid(user.legacyCustomerId);
      if (!legacyId || legacyOwners.has(legacyId)) block("Invalid or duplicate legacy customer mapping", user);
      legacyOwners.set(legacyId, user);
    }
    for (const barcode of user.barcodes ?? []) {
      if (barcodeOwners.has(barcode) && barcodeOwners.get(barcode) !== oid(user._id)) block("Duplicate users barcode", user);
      barcodeOwners.set(barcode, oid(user._id));
    }
  }
  summary.usersBefore = users.length;
  if (!customers.length) block("No customers exist in the selected database.");
  summary.customers = customers.length;
  const seen = new Set();
  const mapping = new Map();
  for (const customer of customers) {
    if (!cleanMobile(customer.mobile) || seen.has(customer.mobile)) {
      block("Invalid or duplicate customers.mobile", customer);
      continue;
    }
    seen.add(customer.mobile);
    const alreadyMapped = legacyOwners.get(oid(customer._id));
    const existing = alreadyMapped ?? byMobile.get(customer.mobile);
    const collision = doc("users", customer._id);
    if ((existing?.legacyCustomerId && oid(existing.legacyCustomerId) !== oid(customer._id)) ||
        (collision && oid(collision._id) !== oid(existing?._id))) {
      block("Inconsistent customer identity", customer);
      continue;
    }
    const ownerId = existing?._id ?? customer._id;
    mapping.set(oid(customer._id), ownerId);
    if (alreadyMapped) {
      summary.usersMatched++;
      continue;
    }
    const barcodes = [...new Set([...(existing?.barcodes ?? []), ...(customer.barcodes ?? []).map(value =>
      typeof value === "string" ? value.trim() : "")])];
    for (const barcode of barcodes) {
      if (!barcode || barcode.length > 128 || /[\x00-\x1f\x7f]/.test(barcode) ||
          (barcodeOwners.has(barcode) && barcodeOwners.get(barcode) !== oid(ownerId))) {
        block("Invalid or conflicting customer barcode", customer);
      }
      barcodeOwners.set(barcode, oid(ownerId));
    }
    const imported = {
      legacyCustomerId: customer._id,
      storeProfile: { ...storeProfile(customer), ...existing?.storeProfile },
      ...(barcodes.length ? { barcodes } : {}),
    };
    if (existing) {
      patch("users", existing, imported, "link customer to existing website account");
      summary.usersMatched++;
    } else {
      write("users", null, {
        _id: ownerId, mobile: customer.mobile, username: "کاربر", role: "user",
        storeOrderPendingSignup: true, newsletter: false,
        addresses: [], favorites: [], comments: [], orders: [], tempPayments: [],
        totalPurchase: 0, successfulOrders: 0, loyaltyProcessedOrders: [],
        createdAt: customer.createdAt, updatedAt: customer.updatedAt,
        ...imported,
      }, "import store customer pending OTP");
      summary.usersInserted++;
    }
  }

  for (const order of docs("storeorders")) {
    if (!order.customer) continue;
    const customer = doc("customers", order.customer);
    const userId = mapping.get(oid(order.customer));
    if (!userId || !customer || (order.userId && oid(order.userId) !== oid(userId))) {
      block("Manual order has conflicting ownership", order);
      continue;
    }
    if (!order.userId || !order.customerSnapshot) {
      patch("storeorders", order, {
        userId,
        customerSnapshot: order.customerSnapshot ?? { ...storeProfile(customer), mobile: customer.mobile },
      }, "link manual order and retain customer details");
      summary.mappedOrders++;
    }
  }

  for (const appointment of docs("appointments")) {
    if (!appointment.storeOrderCustomer) continue;
    const customer = doc("customers", appointment.storeOrderCustomer);
    if (!customer || oid(mapping.get(oid(customer._id))) !== oid(appointment.user)) {
      block("Appointment customer differs from its website owner", appointment);
      continue;
    }
    if (!appointment.storeOrderCustomerSnapshot) {
      patch("appointments", appointment, {
        storeOrderCustomerSnapshot: { ...storeProfile(customer), mobile: appointment.phone },
      }, "retain previous store-order contact");
      summary.mappedAppointments++;
    }
  }

  if (cleanup) {
    // Customer service stores the recipient mobile separately. An admin actor in history
    // does not make an ordinary customer's request a test.
    const testAppointments = docs("appointments").filter((row) => {
      const owner = doc("users", row.user);
      return row.fulfillment === "courier" && isStaff(owner) && owner.mobile === row.phone;
    });
    const appointmentIds = new Set(testAppointments.map((row) => oid(row._id)));
    const hasTestAppointment = (value) => appointmentIds.has(oid(value));
    for (const reward of docs("visitrewards")) {
      if (hasTestAppointment(reward.sourceAppointment) || hasTestAppointment(reward.reservedFor)) {
        block("A test courier request is directly linked to an active reward", reward);
      }
    }
    for (const reservation of docs("appointmentreservations")) {
      if (hasTestAppointment(reservation.appointment)) {
        remove("appointmentreservations", reservation, "reservation for admin test courier");
      }
    }
    for (const record of testAppointments) remove("appointments", record, "confirmed admin test courier");

    const staffTransactions = docs("wallettransactions").filter((tx) => isStaff(doc("users", tx.user)));
    const removable = [];
    for (const tx of staffTransactions) {
      if (tx.type !== "charge" && tx.type !== "refund") continue;
      const wallet = doc("wallets", tx.wallet);
      const order = tx.ref?.kind === "Order" ? doc("orders", tx.ref.item) : null;
      if (!wallet || oid(wallet.user) !== oid(tx.user) ||
          (tx.type === "refund" && (oid(order?.user) !== oid(tx.user) || order?.status !== "cancelled" ||
          order?.paymentStatus !== "paid" || order.finalPrice !== tx.amount || !isStaff(doc("users", tx.performedBy))))) {
        block("The staff wallet entry has a conflicting owner or payment history", tx);
        continue;
      }
      if (!["pending", "failed", "completed"].includes(tx.status) || tx.expiresAt ||
          wallet.expiringCredits?.some((credit) => oid(credit.sourceTx) === oid(tx._id))) {
        block("Unrecognized staff wallet entry", tx);
        continue;
      }
      removable.push(tx);
    }
    const txIds = new Set(removable.map((tx) => oid(tx._id)));
    for (const temp of docs("temppayments")) {
      if (!txIds.has(oid(temp.walletTransaction))) continue;
      if (!isStaff(doc("users", temp.userId)) || temp.purpose !== "wallet_charge" ||
          oid(temp.userId) !== oid(doc("wallettransactions", temp.walletTransaction)?.user)) {
        block("A test transaction is linked to another user's payment attempt", temp);
        continue;
      }
      remove("temppayments", temp, "payment attempt for admin test wallet charge");
    }
    const walletsToReconcile = new Map();
    for (const tx of removable) {
      if (tx.status === "completed") {
        if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) block("Invalid completed test credit amount", tx);
        else {
          const entries = walletsToReconcile.get(oid(tx.wallet)) ?? [];
          entries.push(tx);
          walletsToReconcile.set(oid(tx.wallet), entries);
        }
      }
      remove("wallettransactions", tx, "confirmed admin test wallet entry");
    }
    for (const [walletId, credits] of walletsToReconcile) {
      const wallet = doc("wallets", walletId);
      const amount = credits.reduce((total, tx) => total + tx.amount, 0);
      const laterLedger = docs("wallettransactions").some((tx) =>
        oid(tx.wallet) === walletId && tx.status === "completed" &&
        credits.some((credit) => tx.createdAt >= credit.createdAt));
      const latest = credits.reduce((a, b) => a.createdAt > b.createdAt ? a : b);
      if (laterLedger || wallet.balance !== latest.balanceAfter ||
          !Number.isSafeInteger(wallet.balance) || wallet.balance < amount) {
        block("Wallet changed since the test credit; automatic adjustment stopped", wallet);
        continue;
      }
      const keys = new Set(credits.map((tx) => tx.idempotencyKey));
      patch("wallets", wallet, {
        balance: wallet.balance - amount, version: (wallet.version ?? 0) + 1,
        ...(wallet.appliedCreditKeys ? { appliedCreditKeys: wallet.appliedCreditKeys.filter((key) => !keys.has(key)) } : {}),
      }, "reverse confirmed test credit");
      summary.reversedWalletCreditToman += amount;
    }

    for (const log of docs("walletlogs")) {
      if (txIds.has(oid(log.transaction))) remove("walletlogs", log, "archived test wallet ledger event");
    }

    // These historical support documents predate authenticated ownership. Never
    // expose the conversation by assigning it to a present-day mobile match.
    for (const contact of docs("contactmessages")) {
      if (contact.user) continue;
      const threads = docs("supportconversations").filter((row) => oid(row.legacyContactMessageId) === oid(contact._id));
      if (threads.some((thread) => thread.customerId || thread.orderId)) continue;
      const threadIds = new Set(threads.map((thread) => oid(thread._id)));
      const replies = docs("supportmessages").filter((row) => threadIds.has(oid(row.conversationId)));
      if (replies.some((reply) => reply.authorType === "customer" && reply.authorId)) continue;
      for (const reply of replies) remove("supportmessages", reply, "historical guest support message");
      for (const thread of threads) remove("supportconversations", thread, "historical guest support conversation");
      remove("contactmessages", contact, "historical guest contact message");
    }

    const missingParents = (collection, row) => edges(collection, row).filter((edge) =>
      edge.absent || !doc(edge.target, edge.value));
    for (const favorite of docs("favorites")) {
      if (missingParents("favorites", favorite).length) remove("favorites", favorite, "orphan favorite");
    }
    for (const address of docs("addresses")) {
      if (!missingParents("addresses", address).length) continue;
      const referenced = ["orders", "temppayments", "appointments", "customergameorders"].some((name) =>
        docs(name).some((row) => edges(name, row).some((edge) =>
          edge.target === "addresses" && oid(edge.value) === oid(address._id))));
      if (referenced) block("Address with missing owner still appears in an active business document", address);
      else remove("addresses", address, "orphan address with no business document");
    }
    for (const user of docs("users")) {
      const clear = {};
      for (const [field, collection] of Object.entries({
        addresses: "addresses", favorites: "favorites", orders: "orders", comments: "comments", tempPayments: "temppayments",
      })) {
        const list = user[field];
        if (!Array.isArray(list)) continue;
        const surviving = list.filter((id) => doc(collection, id));
        if (surviving.length < list.length) {
          clear[field] = surviving;
          summary.removedReferences += list.length - surviving.length;
        }
      }
      if (Object.keys(clear).length) patch("users", user, clear, "detach missing reverse references");
    }
    for (const history of docs("experiencehistories")) {
      if (missingParents("experiencehistories", history).some((edge) => edge.path === "ref.item")) {
        patch("experiencehistories", history, {}, "archive absent event target; retain XP ledger", ["ref"]);
      }
    }
    const removedNotifications = new Set();
    for (const notice of docs("notifications")) {
      const dependent = (notice.entityType === "Appointment" && hasTestAppointment(notice.entityId)) ||
        (notice.entityType === "WalletTransaction" && txIds.has(oid(notice.entityId)));
      if (dependent || missingParents("notifications", notice).some((edge) => ["entityId", "target.item"].includes(edge.path))) {
        remove("notifications", notice, dependent ? "notification for confirmed admin test" : "notification whose target is absent");
        removedNotifications.add(oid(notice._id));
      }
    }
    for (const receipt of docs("notificationreceipts")) {
      if (removedNotifications.has(oid(receipt.notificationId))) remove("notificationreceipts", receipt, "receipt for archived notification");
    }
    for (const delivery of docs("notificationdeliveries")) {
      if (removedNotifications.has(oid(delivery.notificationId))) {
        patch("notificationdeliveries", delivery, { notificationId: null }, "retain campaign delivery history");
      }
    }
    for (const event of docs("businesssmsevents")) {
      if (missingParents("businesssmsevents", event).some((edge) => edge.path === "entityId")) {
        if (["pending", "sending"].includes(event.status)) block("SMS is still queued for an absent or test target", event);
        else remove("businesssmsevents", event, "historical SMS for absent or test target");
      }
    }
  }

  const final = changeable();
  const beforeProblems = auditStoreReferences(source);
  const afterProblems = auditStoreReferences(final);
  const list = [...updates.values()].sort((a, b) =>
    a.collection.localeCompare(b.collection) || oid(a.id).localeCompare(oid(b.id)));
  const existing = new Set(beforeProblems.map((entry) =>
    [entry.collection, entry.id, entry.path, oid(entry.value)].join("/")));
  for (const problem of afterProblems) {
    const key = [problem.collection, problem.id, problem.path, oid(problem.value)].join("/");
    if (!existing.has(key)) blockers.push("New absent reference at " + key);
  }

  return {
    operations: list,
    blockers,
    summary: {
      ...summary, usersAfter: final.users?.length ?? 0,
      brokenBefore: countBrokenReferences(beforeProblems),
      brokenAfter: countBrokenReferences(afterProblems),
      operationCount: list.length,
      digest: createHash("sha256").update(BSONtext(list)).digest("hex"),
    },
  };
}
