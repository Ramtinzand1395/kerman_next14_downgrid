import mongoose from "mongoose";
import {
  CONTACT_HTML_MARKUP_REGEX,
  CONTACT_LIMITS,
  CONTACT_PHONE_REGEX,
} from "@/validations/contactValidation";

const plainTextValidator = {
  validator: (value: string) => !CONTACT_HTML_MARKUP_REGEX.test(value),
  message: "HTML is not allowed in contact messages.",
};

const ContactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: CONTACT_LIMITS.name.min,
      maxlength: CONTACT_LIMITS.name.max,
      validate: plainTextValidator,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: CONTACT_LIMITS.email.max,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: CONTACT_LIMITS.phone.min,
      maxlength: CONTACT_LIMITS.phone.max,
      match: CONTACT_PHONE_REGEX,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: CONTACT_LIMITS.subject.min,
      maxlength: CONTACT_LIMITS.subject.max,
      validate: plainTextValidator,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: CONTACT_LIMITS.message.min,
      maxlength: CONTACT_LIMITS.message.max,
      validate: plainTextValidator,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", ContactMessageSchema);
