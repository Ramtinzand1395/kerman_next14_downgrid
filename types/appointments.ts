export type ServiceType = "game_install" | "repair";
export type Fulfillment = "in_store" | "courier";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rejected";

/**
 * Frontend vocabulary for the requested courier experience. The current API
 * does not expose this field yet, so these values are not sent to an endpoint.
 */
export type CourierStatus =
  | "pending"
  | "scheduled"
  | "assigned"
  | "picked_up"
  | "at_store"
  | "return_ready"
  | "returning"
  | "delivered"
  | "cancelled";

export type RewardType = "fixed" | "percent" | "free_game" | "free_shipping";
export type InstallationType = "account" | "copy";
export type RepairIssue =
  | "power"
  | "display"
  | "controller"
  | "sound"
  | "overheating"
  | "other";

export type PricingSummary = {
  known: boolean;
  serviceBaseAmount?: number | null;
  serviceDiscountAmount?: number;
  serviceFinalAmount?: number | null;
  shippingBaseAmount?: number;
  shippingDiscountAmount?: number;
  shippingFinalAmount?: number;
  totalDiscountAmount?: number;
  baseAmount: number | null;
  discountAmount: number;
  finalAmount: number | null;
};

export type RewardDefinition = {
  type: RewardType;
  value: number;
  maxDiscountAmount?: number | null;
  minAmount: number;
  combinable: boolean;
  eligibleDevices: string[];
  eligibleInstallationTypes: InstallationType[];
  shippingRegion: string;
  maxShippingCost?: number | null;
  validityDays: number;
};

export type RewardSummary = {
  _id: string;
  title: string;
  requiredVisits?: number;
  eligibleServices: ServiceType[];
  recurrence?: "once" | "repeat";
  reward: RewardDefinition;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: "available" | "reserved" | "redeemed" | "expired" | "revoked";
  expiresAt?: string;
};

export type CustomerSummary = {
  _id?: string;
  username?: string;
  mobile?: string;
};

export type CourierSummary = {
  status: CourierStatus;
  addressId?: string;
  pickupDate?: string;
  pickupWindow?: { start: string; end: string };
  regionTitle?: string;
  pickupShippingCost?: number;
  returnShippingCost?: number;
  totalShippingCost?: number;
  freeShippingDiscount?: number;
  finalShippingCost?: number;
  addressSnapshot?: {
    recipientName: string;
    recipientPhone: string;
    province?: string;
    city: string;
    address: string;
    plaque?: string;
    unit?: string;
    postalCode?: string;
  };
};

export type CustomerHistorySummary = {
  totalCompletedVisits: number;
  gameInstallVisits: number;
  repairVisits: number;
  lastCompletedVisitAt?: string | null;
};

export type SelectedReward = {
  _id: string;
  status?: "available" | "reserved" | "redeemed" | "expired" | "revoked";
  rewardDescription?: string;
  snapshot?: {
    title: string;
    eligibleServices: ServiceType[];
    reward: RewardDefinition;
  };
};

export type AdminRewardSummary = {
  selectedReward?: SelectedReward | null;
  availableRewards?: SelectedReward[];
  progress?: Array<{
    ruleId: string;
    title: string;
    completedVisits: number;
    requiredVisits: number;
    remaining: number;
    recurrence: "once" | "repeat";
    willEarnOnCompletion: boolean;
    rewardDescription: string;
  }>;
};

export type AppointmentHistoryItem = {
  from?: AppointmentStatus;
  to: AppointmentStatus;
  actorType: "user" | "admin" | "system";
  note?: string;
  at: string;
};

export type AppointmentItem = {
  _id: string;
  trackingCode: string;
  serviceType: ServiceType;
  device: string;
  installationType?: InstallationType | null;
  repairIssue?: RepairIssue | null;
  description?: string;
  customerName: string;
  phone: string;
  startsAt: string;
  endsAt?: string;
  status: AppointmentStatus;
  fulfillment?: Fulfillment;
  user?: CustomerSummary | string;
  selectedReward?: SelectedReward | null;
  pricing?: PricingSummary;
  courier?: CourierSummary;
  courierSummary?: {
    status: CourierStatus;
    pickupDate: string;
    pickupWindow: { start: string; end: string };
    regionTitle: string;
    shippingBaseAmount: number;
    shippingDiscountAmount: number;
    shippingFinalAmount: number;
    address: {
      recipientName: string;
      recipientPhone: string;
      city: string;
      address: string;
    };
  } | null;
  customerSummary?: CustomerHistorySummary;
  rewardSummary?: AdminRewardSummary;
  history?: AppointmentHistoryItem[];
  completedAt?: string | null;
};

export type AppointmentSettings = {
  timezone?: string;
  slotMinutes: number;
  bookingDaysAhead: number;
  workingBlocks: Array<{ start: string; end: string }>;
  closedWeekdays: number[];
  serviceCapacity: Record<ServiceType, number>;
  maxActiveAppointmentsPerUser: number;
  cancellationNoticeMinutes: number;
  closedDates: string[];
  supportedDevices: string[];
  courierEnabled?: boolean;
  courierBookingDaysAhead?: number;
  courierCapacityPerWindow?: number;
  courierWorkingWindows?: Array<{ start: string; end: string }>;
  courierClosedWeekdays?: number[];
  courierClosedDates?: string[];
  courierRegions?: Array<{
    id: string;
    title: string;
    city: string;
    shippingCost: number;
    isActive: boolean;
  }>;
  courierRoundTripMultiplier?: number;
};

export type AppointmentListResponse = {
  items: AppointmentItem[];
  total: number;
  page: number;
  pages: number;
  today?: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    noShow: number;
    inStore: number;
    courier: number;
    courierPickups: number;
    courierReturns: number;
    rewardsRedeemed: number;
  };
};
