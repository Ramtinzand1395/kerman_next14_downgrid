import mongoose, { Schema, model, type Model, type Types } from "mongoose";

export interface IPromotionModal {
  name: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  dismissLabel: string;
  coupon: Types.ObjectId;
  isActive: boolean;
  priority: number;
  deletedAt: Date | null;
}

const schema = new Schema<IPromotionModal>({
  name: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  ctaLabel: { type: String, required: true, trim: true },
  ctaHref: { type: String, required: true },
  dismissLabel: { type: String, default: "فعلاً نه" },
  coupon: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
  isActive: { type: Boolean, default: false },
  priority: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ isActive: 1, deletedAt: 1, priority: -1 });

export default (mongoose.models.PromotionModal as Model<IPromotionModal> | undefined)
  || model<IPromotionModal>("PromotionModal", schema);
