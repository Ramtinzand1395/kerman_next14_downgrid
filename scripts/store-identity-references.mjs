// Explicit document links. Snapshot values, device-local POS IDs and request keys are not links.
const models = {
  User: "users", Address: "addresses", Order: "orders", TempPayment: "temppayments",
  Customer: "customers", StoreOrder: "storeorders", CustomerGameOrder: "customergameorders",
  Appointment: "appointments", VisitReward: "visitrewards", ContactMessage: "contactmessages",
  SupportConversation: "supportconversations", Comment: "comments", Product: "products",
  Wallet: "wallets", WalletTransaction: "wallettransactions", Mission: "missions",
  SpinHistory: "spinhistories", Referral: "referrals", Campaign: "campaigns",
  Coupon: "coupons", PromotionModal: "promotionmodals", Notification: "notifications",
  NotificationCampaign: "notificationcampaigns",
};

const links = {
  users: {
    addresses: "addresses", favorites: "favorites", orders: "orders", comments: "comments",
    tempPayments: "temppayments", firstSuccessfulOrder: "orders",
    legacyCustomerId: "customers", referredBy: "users",
  },
  addresses: { userId: "users" },
  appointments: {
    user: "users", "history.actor": "users", "courier.addressId": "addresses",
    selectedReward: "visitrewards", storeOrderCustomer: "customers",
  },
  appointmentreservations: { user: "users", appointment: "appointments" },
  appointmentsettings: { updatedBy: "users" },
  storeorders: { userId: "users", customer: "customers" },
  orders: { user: "users", address: "addresses", "items.product": "products" },
  temppayments: {
    userId: "users", address: "addresses", "items.product": "products",
    walletTransaction: "wallettransactions",
  },
  customergameorders: { user: "users", addressRef: "addresses" },
  favorites: { userId: "users", productId: "products" },
  comments: { user: "users", product: "products" },
  products: { category: "categories", tags: "tags", comments: "comments" },
  categories: { parent: "categories" },
  promotionmodals: { coupon: "coupons" },
  wallets: { user: "users", "expiringCredits.sourceTx": "wallettransactions" },
  wallettransactions: { user: "users", wallet: "wallets", performedBy: "users" },
  walletpaymentattempts: { user: "users", order: "orders" },
  walletlogs: { user: "users", wallet: "wallets", transaction: "wallettransactions", performedBy: "users" },
  experiences: { user: "users" },
  experiencehistories: { user: "users", performedBy: "users" },
  membershiphistories: { user: "users", performedBy: "users" },
  coupons: { createdBy: "users", allowedUsers: "users", products: "products", categories: "categories" },
  couponusages: { user: "users", coupon: "coupons", order: "orders" },
  campaigns: { createdBy: "users" },
  cashbackrules: { products: "products", categories: "categories" },
  loyaltysettings: { updatedBy: "users" },
  loginstreaks: { user: "users" },
  missions: { createdBy: "users", "reward.coupon": "coupons" },
  missionprogresses: { user: "users", mission: "missions" },
  referrals: { referrer: "users", referee: "users", firstOrder: "orders" },
  userachievements: { user: "users", achievement: "achievements" },
  spinhistories: { user: "users", prize: "spinprizes", "reward.coupon": "coupons" },
  visitrewards: {
    user: "users", rule: "visitrewardrules", sourceAppointment: "appointments",
    reservedFor: "appointments",
  },
  visitrewardrules: { updatedBy: "users" },
  notificationcampaigns: {
    createdBy: "users", "audience.userIds": "users",
    "audience.productId": "products", "audience.categoryId": "categories",
  },
  notifications: { user: "users", senderId: "users", recipientId: "users", handledBy: "users" },
  notificationreceipts: { notificationId: "notifications", recipientId: "users" },
  notificationdeliveries: {
    campaignId: "notificationcampaigns", recipientId: "users", notificationId: "notifications",
  },
  contactmessages: { user: "users" },
  supportconversations: {
    customerId: "users", orderId: "orders", legacyContactMessageId: "contactmessages", closedBy: "users",
  },
  supportmessages: {
    conversationId: "supportconversations", authorId: "users", legacyContactMessageId: "contactmessages",
  },
  printqueues: { createdBy: "users", "recoveryHistory.actorUserId": "users" },
  printerdevices: { createdBy: "users" },
  posdevices: { createdBy: "users" },
  poscatalogchanges: { productId: "products" },
  possales: { "items.productId": "products" },
  posinventorymovements: { posSale: "possales", productId: "products" },
  storeshippingsettings: { updatedBy: "users" },
};

const needed = {
  addresses: ["userId"], appointments: ["user"], appointmentreservations: ["user", "appointment"],
  storeorders: ["userId"], orders: ["user"], temppayments: ["userId"],
  favorites: ["userId", "productId"], comments: ["user", "product"],
  wallets: ["user"], wallettransactions: ["user", "wallet"],
  contactmessages: ["user"], supportconversations: ["customerId"], supportmessages: ["authorId", "conversationId"],
  notificationreceipts: ["recipientId", "notificationId"],
  notificationdeliveries: ["recipientId", "campaignId"],
};

export const referenceId = (value) => {
  const text = typeof value === "string" ? value : value?.toHexString?.();
  return /^[a-f\d]{24}$/i.test(text ?? "") ? text.toLowerCase() : null;
};

export function pathValues(value, path) {
  if (Array.isArray(value)) return value.flatMap((item) => pathValues(item, path));
  if (!path.length) return value == null ? [] : [value];
  return Object.hasOwn(value ?? {}, path[0])
    ? pathValues(value[path[0]], path.slice(1)) : [];
}

export function edges(collection, record) {
  const recordLinks = { ...links[collection] };
  if (collection === "notifications" || collection === "businesssmsevents") {
    recordLinks.entityId = models[record.entityType];
  }
  if (collection === "notifications") recordLinks["target.item"] = models[record.target?.kind];
  if (collection === "wallettransactions" || collection === "experiencehistories") {
    recordLinks["ref.item"] = models[record.ref?.kind];
  }
  return Object.entries(recordLinks).flatMap(([path, target]) => {
    if (!target) return [];
    const values = pathValues(record, path.split("."));
    if (!values.length && needed[collection]?.includes(path)) return [{ path, target, absent: true }];
    return values.map((value) => ({ path, target, value }));
  });
}

export function auditStoreReferences(collections) {
  const indexes = Object.fromEntries(Object.entries(collections).map(([name, docs]) => [
    name, new Set(docs.map((doc) => referenceId(doc._id)).filter(Boolean)),
  ]));
  const problems = [];
  for (const [collection, rows] of Object.entries(collections)) {
    for (const row of rows) {
      for (const edge of edges(collection, row)) {
        if (!edge.absent && indexes[edge.target]?.has(referenceId(edge.value))) continue;
        problems.push({ collection, id: referenceId(row._id), ...edge });
      }
    }
  }
  return problems;
}

export function countBrokenReferences(problems) {
  const result = {};
  for (const { collection, path, target } of problems) {
    const key = collection + "." + path + " -> " + target;
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
