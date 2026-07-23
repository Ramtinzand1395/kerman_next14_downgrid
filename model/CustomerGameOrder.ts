import mongoose from "mongoose";
 
const CustomerGameOrderStatusEnum = [
  "pending",
  "confirmed",
  "rejected",
  "completed",
] as const;
 
const customerGameOrderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, "نام مشتری الزامی است"],
      trim: true,
      minlength: [2, "نام مشتری باید حداقل ۲ کاراکتر باشد"],
      maxlength: [100, "نام مشتری نباید بیشتر از ۱۰۰ کاراکتر باشد"],
    },
 
    phone: {
      type: String,
      required: [true, "شماره تماس الزامی است"],
      trim: true,
      match: [/^09\d{9}$/, "شماره تماس معتبر نیست"],
    },
 
    address: {
      type: String,
      required: [true, "آدرس الزامی است"],
      trim: true,
      minlength: [10, "آدرس باید حداقل ۱۰ کاراکتر باشد"],
      maxlength: [500, "آدرس نباید بیشتر از ۵۰۰ کاراکتر باشد"],
    },

      // کاربر مالک سفارش (نوتیفیکیشن و ادمین از طریق userId به این ارجاع وصل می‌شوند)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ارجاع به آدرس انتخاب‌شده از دفترچه آدرس کاربر
    addressRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
 
 
    message: {
      type: String,
      trim: true,
      maxlength: [1000, "پیام نباید بیشتر از ۱۰۰۰ کاراکتر باشد"],
    },
 
    products: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          platform: { type: String, trim: true },
          price: { type: Number },
          size: { type: Number },
        },
      ],
      required: [true, "حداقل یک محصول الزامی است"],
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: "حداقل یک محصول باید انتخاب شود",
      },
    },
 
    totalPrice: {
      type: Number,
      required: [true, "مجموع قیمت الزامی است"],
      min: [0, "مجموع قیمت نمی‌تواند منفی باشد"],
    },
 
    status: {
      type: String,
      enum: {
        values: CustomerGameOrderStatusEnum,
        message: "وضعیت نامعتبر است",
      },
      default: "pending",
    },
  },
  { timestamps: true },
);
 
customerGameOrderSchema.index({ status: 1, createdAt: -1 });
customerGameOrderSchema.index({ phone: 1 });
customerGameOrderSchema.index({ customerName: "text" });
 
export default mongoose.models.CustomerGameOrder ||
  mongoose.model("CustomerGameOrder", customerGameOrderSchema);
 