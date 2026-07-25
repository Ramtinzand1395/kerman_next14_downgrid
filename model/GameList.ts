import mongoose from "mongoose";

const gameListSchema = new mongoose.Schema({
  items: [
    {
      name: {
        type: String,
        required: true,
      },
      size: {
        type: Number, // مثلا حجم به گیگ
        required: false,
      },
      price: {
        type: Number,
        required: false,
      },
      storage: {
        type: String,
        required: false,
      },
    },
  ],
  platform: {
    type: String,
  },
});

export default mongoose.models.GameList ||
  mongoose.model("GameList", gameListSchema);
