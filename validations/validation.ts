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
