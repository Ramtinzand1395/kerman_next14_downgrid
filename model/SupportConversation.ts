import mongoose from "mongoose";

const SupportConversationSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    contactSnapshot: {
      name: { type: String, trim: true, maxlength: 100 },
      email: { type: String, trim: true, maxlength: 254 },
      phone: { type: String, trim: true, maxlength: 20 },
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    status: {
      type: String,
      enum: ["waiting_store", "waiting_customer", "closed"],
      default: "waiting_store",
      index: true,
    },
    lastMessageAt: { type: Date, required: true, default: Date.now, index: true },
    unreadByAdmin: { type: Number, default: 1, min: 0 },
    unreadByCustomer: { type: Number, default: 0, min: 0 },
    legacyContactMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactMessage",
      default: null,
    },
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

SupportConversationSchema.index(
  { legacyContactMessageId: 1 },
  { unique: true, partialFilterExpression: { legacyContactMessageId: { $type: "objectId" } } },
);
SupportConversationSchema.index({ customerId: 1, lastMessageAt: -1 });
SupportConversationSchema.index({ status: 1, lastMessageAt: -1 });

export default mongoose.models.SupportConversation ||
  mongoose.model("SupportConversation", SupportConversationSchema);
