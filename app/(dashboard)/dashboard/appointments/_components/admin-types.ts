import type {
  AppointmentItem,
  AppointmentStatus,
  CourierStatus,
} from "@/types/appointments";

export type AdminTab = "appointments" | "courier" | "settings" | "rewards";

export type AppointmentFiltersState = {
  status: string;
  serviceType: string;
  courierStatus: string;
  date: string;
  search: string;
  page: number;
};

export type TransitionRequest =
  | {
      kind: "appointment";
      item: AppointmentItem;
      nextStatus: AppointmentStatus;
    }
  | {
      kind: "courier";
      item: AppointmentItem;
      nextStatus: CourierStatus;
    };

