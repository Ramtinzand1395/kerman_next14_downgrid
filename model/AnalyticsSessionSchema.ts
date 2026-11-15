import { Schema } from "mongoose";

export const AnalyticsSessionSchema = new Schema({
  clientId: { type: String, required: true },
  sessionId: Number,
}, { _id: false });
