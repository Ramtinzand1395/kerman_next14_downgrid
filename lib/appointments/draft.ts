import type {
  Fulfillment,
  InstallationType,
  RepairIssue,
  ServiceType,
} from "@/types/appointments";

export const APPOINTMENT_DRAFT_KEY = "appointment-wizard-draft:v1";
export const APPOINTMENT_DRAFT_VERSION = 1;
const MAX_DRAFT_AGE_MS = 2 * 60 * 60 * 1000;

export type AppointmentWizardDraft = {
  version: 1;
  savedAt: number;
  returnTo: string;
  step: 1 | 2 | 3 | 4;
  serviceType: ServiceType | null;
  device: string;
  installationType: InstallationType | "";
  repairIssue: RepairIssue | "";
  fulfillment: Fulfillment | null;
  description: string;
  selectedDate: string;
  selectedSlot: { startsAt: string; endsAt: string; time: string } | null;
  selectedCourierWindow: { start: string; end: string } | null;
  selectedAddressId: string;
  selectedRewardId: string;
  customerName: string;
  phone: string;
  idempotencyKey: string;
  newAddressId?: string;
};

type DraftInput = Omit<AppointmentWizardDraft, "version" | "savedAt" | "returnTo">;

export function saveAppointmentDraft(storage: Storage, input: DraftInput) {
  const draft: AppointmentWizardDraft = {
    ...input,
    version: APPOINTMENT_DRAFT_VERSION,
    savedAt: Date.now(),
    returnTo: "/my-profile?step=6&fulfillment=courier&resume=address",
  };
  storage.setItem(APPOINTMENT_DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export function readAppointmentDraft(storage: Storage): AppointmentWizardDraft | null {
  const raw = storage.getItem(APPOINTMENT_DRAFT_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AppointmentWizardDraft>;
    const valid =
      value.version === APPOINTMENT_DRAFT_VERSION &&
      typeof value.savedAt === "number" &&
      Date.now() - value.savedAt <= MAX_DRAFT_AGE_MS &&
      value.fulfillment === "courier" &&
      [1, 2, 3, 4].includes(Number(value.step)) &&
      value.returnTo === "/my-profile?step=6&fulfillment=courier&resume=address";
    if (!valid) throw new Error("INVALID_DRAFT");
    return value as AppointmentWizardDraft;
  } catch {
    storage.removeItem(APPOINTMENT_DRAFT_KEY);
    return null;
  }
}

export function attachNewAddressToAppointmentDraft(storage: Storage, addressId: string) {
  const draft = readAppointmentDraft(storage);
  if (!draft || !addressId) return null;
  const updated = { ...draft, newAddressId: addressId, selectedAddressId: addressId, savedAt: Date.now() };
  storage.setItem(APPOINTMENT_DRAFT_KEY, JSON.stringify(updated));
  return updated;
}

export function clearAppointmentDraft(storage: Storage) {
  storage.removeItem(APPOINTMENT_DRAFT_KEY);
}
