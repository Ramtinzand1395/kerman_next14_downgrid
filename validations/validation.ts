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

const productVariantValidationSchema = yup.object({
  title: yup.string().trim().required("نام مدل الزامی است"),
  sku: yup.string().trim().optional(),
  price: yup
    .number()
    .typeError("قیمت مدل باید عدد باشد")
    .positive("قیمت مدل باید بزرگ‌تر از صفر باشد")
    .required("قیمت مدل الزامی است"),
  discountPrice: yup
    .number()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || Number.isNaN(value) ? null : value,
    )
    .min(0, "تخفیف مدل نمی‌تواند منفی باشد")
    .test(
      "less-than-variant-price",
      "تخفیف مدل باید کمتر از قیمت اصلی مدل باشد",
      function (value) {
        return value == null || value < this.parent.price;
      },
    ),
  stock: yup
    .number()
    .typeError("موجودی مدل باید عدد باشد")
    .min(0, "موجودی مدل نمی‌تواند منفی باشد")
    .required("موجودی مدل الزامی است"),
});

export const productValidationSchema = yup.object().shape({
  status: yup
    .mixed<"draft" | "published">()
    .oneOf(["draft", "published"], "وضعیت محصول نامعتبر است")
    .required("وضعیت محصول الزامی است"),
  productType: yup
    .mixed<"single" | "multi">()
    .oneOf(["single", "multi"], "نوع محصول نامعتبر است")
    .required("نوع محصول الزامی است"),
  title: yup.string().trim().required("عنوان محصول الزامی است"),

  slug: yup.string().trim().required("اسلاگ الزامی است"),
  seoTitle: yup.string().trim().required("عنوان سئو الزامی است"),
  brand: yup.string().trim().default(""),
  shortDesc: yup.string().trim().default(""),

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
    .transform((value, originalValue) =>
      originalValue === "" || Number.isNaN(value) ? null : value,
    )
    .min(0, "تخفیف نمی‌تواند منفی باشد")
    .test(
      "less-than-price",
      "تخفیف باید کمتر از قیمت اصلی باشد",
      function (value) {
        return value == null || value < this.parent.price;
      },
    ),

  stock: yup
    .number()
    .typeError("موجودی باید عدد باشد")
    .min(0, "موجودی نمی‌تواند منفی باشد")
    .required("موجودی الزامی است"),

  category: yup.string().required("انتخاب دسته‌بندی الزامی است"),
  tags: yup.array().default([]),

  mainImage: yup.string().required("تصویر اصلی محصول الزامی است"),
  mainImageAlt: yup.string().trim().required("متن ALT تصویر اصلی الزامی است"),
  description: yup.string().trim().required("توضیحات محصول الزامی است"),
  galleryImages: yup.array().default([]),
  specifications: yup.array().default([]),
  faqs: yup.array().default([]),
  variants: yup
    .array()
    .of(productVariantValidationSchema)
    .when("productType", {
      is: "multi",
      then: (schema) =>
        schema
          .min(1, "برای محصول چند مدلی حداقل یک مدل وارد کنید")
          .required("مدل‌های محصول الزامی است"),
      otherwise: (schema) => schema.default([]),
    }),
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
