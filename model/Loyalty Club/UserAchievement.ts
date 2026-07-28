// model/UserAchievement.ts
// نشان‌های کسب‌شده توسط هر کاربر — یکتایی (user, achievement) جلوی اعطای تکراری.
import mongoose, { Schema, model, Document } from "mongoose";

export interface IUserAchievement extends Document {
  user: mongoose.Types.ObjectId;
  achievement: mongoose.Types.ObjectId;
  /** اسنپ‌شات عنوان و آیکون برای نمایش سریع بدون join */
  snapshot: { code: string; title: string; icon?: string };
  createdAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    achievement: { type: Schema.Types.ObjectId, ref: "Achievement", required: true },
    snapshot: {
      _id: false,
      code: { type: String, required: true },
      title: { type: String, required: true },
      icon: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

UserAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

const UserAchievement =
  mongoose.models.UserAchievement ||
  model<IUserAchievement>("UserAchievement", UserAchievementSchema);
export default UserAchievement;
