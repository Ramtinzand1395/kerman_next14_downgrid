import * as yup from "yup";
// اعتبارسنجی شماره موبایل
export const mobileSchema = yup
  .string()
  .matches(/^09\d{9}$/, "شماره تماس باید 11 رقم باشد و با 09 شروع شود")
  .required("شماره تماس الزامی است.");

// اعتبارسنجی OTP
export const otpSchema = yup
  .string()
  .required("کد تایید الزامی است")
  .length(5, "کد تایید 5 رقمی است");

export const productValidationSchema = yup.object().shape({
  title: yup.string().trim().required("عنوان محصول الزامی است"),

  slug: yup.string().trim().required("اسلاگ الزامی است"),
  seoTitle: yup.string().trim().required("عنوان سئو الزامی است"),

  metaDescription: yup
    .string()
    .trim()
    .required("متا توضیحات الزامی است")
    .max(160, "متا توضیحات باید حداکثر 160 کاراکتر باشد"),

  price: yup
    .number()
    .typeError("قیمت باید عدد باشد")
    .positive("قیمت باید بزرگ‌تر از صفر باشد")
    .required("قیمت الزامی است"),

  discountPrice: yup
    .number()
    .nullable()
    .transform((value) => (isNaN(value) ? null : value))
    .min(0, "تخفیف نمی‌تواند منفی باشد")
    .max(yup.ref("price"), "تخفیف باید کمتر از قیمت اصلی باشد"),

  stock: yup
    .number()
    .typeError("موجودی باید عدد باشد")
    .min(0, "موجودی نمی‌تواند منفی باشد")
    .required("موجودی الزامی است"),

  category: yup.string().required("انتخاب دسته‌بندی الزامی است"),

  mainImage: yup.string().required("تصویر اصلی محصول الزامی است"),
  mainImageAlt: yup.string().trim().required("متن ALT تصویر اصلی الزامی است"),
  description: yup.string().trim().required("توضیحات محصول الزامی است"),
});

export const newsletterSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required("لطفاً ایمیل خود را وارد کنید.")
    .email("لطفاً یک ایمیل معتبر وارد کنید."),
});


export const customerGameOrderSchema = yup.object().shape({
  customerName: yup
    .string()
    .trim()
    .required("نام مشتری الزامی است")
    .min(2, "نام مشتری باید حداقل ۲ کاراکتر باشد")
    .max(100, "نام مشتری نباید بیشتر از ۱۰۰ کاراکتر باشد"),

  phone: yup
    .string()
    .trim()
    .required("شماره تماس الزامی است")
    .matches(/^09\d{9}$/, "شماره تماس باید ۱۱ رقم باشد و با 09 شروع شود"),

  // آدرس از دفترچه آدرس کاربر انتخاب می‌شود
  addressId: yup
    .string()
    .trim()
    .required("انتخاب یک آدرس الزامی است"),

  message: yup
    .string()
    .trim()
    .max(1000, "پیام نباید بیشتر از ۱۰۰۰ کاراکتر باشد")
    .optional()
    .default(""),

  products: yup
    .array()
    .of(
      yup.object().shape({
        name: yup.string().trim().required("نام محصول الزامی است"),
        platform: yup.string().trim().optional().default(""),
        size: yup
          .number()
          .min(0, "حجم بازی نمی‌تواند منفی باشد")
          .optional()
          .default(0),
        gameType: yup
          .string()
          .trim()
          .default("")
          .when("platform", {
            is: (platform?: string) =>
               platform === "ps5",
            then: (schema) =>
              schema
                .required("نوع بازی برای PS5 الزامی است")
                .oneOf(
                  ["capacity1", "capacity2", "capacity3", "offline", "legal"],
                  "نوع بازی برای PS5 الزامی است",
                ),
            otherwise: (schema) =>
              schema
                .notRequired()
                .oneOf(
                  [
                    "capacity1",
                    "capacity2",
                    "capacity3",
                    "offline",
                    "legal",
                    "",
                  ],
                  "نوع بازی نامعتبر است",
                ),
          }),
      }),
    )
    .min(1, "حداقل یک محصول باید انتخاب شود")
    .required("حداقل یک محصول الزامی است"),

  totalPrice: yup
    .number()
    .min(0, "مجموع قیمت نمی‌تواند منفی باشد")
    .required("مجموع قیمت الزامی است"),
});

export const customerOrderUpdateSchema = yup.object().shape({
  totalPrice: yup
    .number()
    .min(0, "مبلغ کل نمی‌تواند منفی باشد")
    .optional(),

  status: yup
    .string()
    .oneOf(["pending", "confirmed", "rejected", "completed"], "وضعیت نامعتبر است")
    .optional(),

  phone: yup
    .string()
    .trim()
    .matches(/^09\d{9}$/, "شماره تماس باید ۱۱ رقم باشد و با 09 شروع شود")
    .optional(),

  address: yup
    .string()
    .trim()
    .min(10, "آدرس باید حداقل ۱۰ کاراکتر باشد")
    .max(500, "آدرس نباید بیشتر از ۵۰۰ کاراکتر باشد")
    .optional(),

  message: yup
    .string()
    .trim()
    .max(1000, "پیام نباید بیشتر از ۱۰۰۰ کاراکتر باشد")
    .optional(),
});
