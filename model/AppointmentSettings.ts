import mongoose, { Schema } from "mongoose";

const WorkingBlockSchema = new Schema(
  {
    start: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    end: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  },
  { _id: false },
);

const CourierWindowSchema = new Schema(
  {
    start: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    end: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  },
  { _id: false },
);

const CourierRegionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    shippingCost: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const AppointmentSettingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },
    timezone: { type: String, default: "Asia/Tehran" },
    slotMinutes: { type: Number, default: 30, min: 15, max: 180 },
    bookingDaysAhead: { type: Number, default: 30, min: 1, max: 120 },
    workingBlocks: {
      type: [WorkingBlockSchema],
      default: [
        { start: "09:00", end: "12:00" },
        { start: "16:00", end: "20:00" },
      ],
    },
    closedWeekdays: { type: [Number], default: [5] },
    closedDates: { type: [String], default: [] },
    serviceCapacity: {
      game_install: { type: Number, default: 2, min: 1, max: 50 },
      repair: { type: Number, default: 2, min: 1, max: 50 },
    },
    maxActiveAppointmentsPerUser: { type: Number, default: 3, min: 1, max: 20 },
    cancellationNoticeMinutes: { type: Number, default: 120, min: 0, max: 43200 },
    supportedDevices: { type: [String], default: ["ps5", "ps4", "xbox-series", "xbox-one"] },

    // Courier Settings
    courierEnabled: { type: Boolean, default: true },
    courierBookingDaysAhead: { type: Number, default: 14, min: 1, max: 60 },
    courierCapacityPerWindow: { type: Number, default: 3, min: 1, max: 50 },
    courierWorkingWindows: {
      type: [CourierWindowSchema],
      default: [
        { start: "09:00", end: "13:00" },
        { start: "15:00", end: "19:00" },
      ],
    },
    courierClosedWeekdays: { type: [Number], default: [5] },
    courierClosedDates: { type: [String], default: [] },
    courierRegions: {
      type: [CourierRegionSchema],
      default: [
        {
          id: "kerman_city",
          title: "شهر کرمان",
          city: "کرمان",
          shippingCost: 50_000,
          isActive: true,
        },
      ],
    },
    courierRoundTripMultiplier: { type: Number, default: 2, min: 1, max: 2 },

    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.models.AppointmentSettings || mongoose.model("AppointmentSettings", AppointmentSettingsSchema);

