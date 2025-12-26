import mongoose from "mongoose";

const gameListSchema = new mongoose.Schema({
  items: [
    {
      name: {
        type: String,
        required: true,
      },
    },
  ],
  platform: {
    type: String,
  },
});

export default 
  mongoose.models.GameList || mongoose.model("GameList", gameListSchema);
