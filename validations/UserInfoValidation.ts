import * as yup from "yup";

export const addressSchema = yup.object({
  province: yup.string().required("انتخاب استان الزامی است"),

  city: yup.string().required("انتخاب شهر الزامی است"),

  address: yup
    .string()
    .min(10, "آدرس حداقل باید ۱۰ کاراکتر باشد")
    .required("آدرس الزامی است"),

  plaque: yup
    .string()
    .required(" پلاک الزامی است.")
    .matches(/^\d{1,5}$/, "پلاک باید عددی باشد"),

  unit: yup
    .string()
    .required(" واحد الزامی است.")
    .matches(/^\d{1,5}$/, "واحد باید عددی باشد"),

  postalCode: yup
    .string()
    .matches(/^\d{10}$/, "کدپستی باید ۱۰ رقم باشد")
    .required("کدپستی الزامی است"),
});
