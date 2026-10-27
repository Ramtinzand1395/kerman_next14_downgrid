import mongoose from "mongoose";

const SupportMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      index: true,
    },
    authorType: { type: String, enum: ["customer", "admin"], required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    adminReadAt: { type: Date, default: null },
    customerReadAt: { type: Date, default: null },
    legacyContactMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactMessage",
      default: null,
    },
  },
  { timestamps: true },
);

SupportMessageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });
SupportMessageSchema.index(
  { legacyContactMessageId: 1 },
  { unique: true, partialFilterExpression: { legacyContactMessageId: { $type: "objectId" } } },
);

export default mongoose.models.SupportMessage ||
  mongoose.model("SupportMessage", SupportMessageSchema);
