import mongoose from "mongoose";

const gameItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: Number,
      default: null,
    },

    price: {
      type: Number,
      default: null,
    },

    storage: {
      type: String,
      default: null,
      trim: true,
    },
  },

  {
    _id: true,
  },
);

const gameListSchema = new mongoose.Schema(
  {
    platform: {
      type: String,

      required: true,

      unique: true,

      index: true,
    },

    items: [gameItemSchema],
  },

  {
    timestamps: true,
  },
);

export default mongoose.models.GameList ||
  mongoose.model("GameList", gameListSchema);
