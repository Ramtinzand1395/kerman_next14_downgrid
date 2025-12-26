// models/Favorite.ts
import mongoose, { Schema, models } from "mongoose";

const FavoriteSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// جلوگیری از ثبت تکراری علاقه‌مندی
FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default models.Favorite || mongoose.model("Favorite", FavoriteSchema);
