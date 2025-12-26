import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },

    rating: {
      type: Number,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: false }
);

export default mongoose.models.Comment ||
  mongoose.model("Comment", commentSchema);
