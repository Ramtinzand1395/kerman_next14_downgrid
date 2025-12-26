import mongoose from "mongoose";

const gameListSchema = new mongoose.Schema(
  {
    items: [
      {
        // _id: false,
        name: {
          type: String,
          required: true,
        },
      },
    ],
    platform: {
      type: String,
    },
  },
  { timestamps: true } // optional: adds createdAt & updatedAt
);

module.exports =
  mongoose.models.GameList || mongoose.model("GameList", gameListSchema);
