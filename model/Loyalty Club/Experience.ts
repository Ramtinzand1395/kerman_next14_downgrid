// model/Experience.ts
// وضعیت فعلی XP کاربر — مجموع امتیاز و سطح فعلی.
// تاریخچه کامل در ExperienceHistory نگهداری می‌شود.
import mongoose, { Schema, model, Document } from "mongoose";
import { LEVEL_CODES, LevelCode } from "@/types/loyalty";

interface IExperience extends Document {
  user: mongoose.Types.ObjectId;
  /** مجموع XP فعلی (هرگز منفی نمی‌شود) */
  totalXp: number;
  /** XP کسب‌شده در ماه جاری (برای رتبه‌بندی/گزارش) */
  monthlyXp: number;
  level: LevelCode;
  /** کلیدهای XP اعمال شده برای idempotency در MongoDB standalone */
  appliedXpKeys: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ExperienceSchema = new Schema<IExperience>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    totalXp: { type: Number, default: 0, min: 0 },
    monthlyXp: { type: Number, default: 0, min: 0 },
    level: { type: String, enum: LEVEL_CODES, default: "rookie" },
    appliedXpKeys: { type: [String], default: [] },
  },
  { timestamps: true },
);

const Experience =
  mongoose.models.Experience || model<IExperience>("Experience", ExperienceSchema);
export default Experience;
