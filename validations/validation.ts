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
});
