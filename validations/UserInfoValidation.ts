import * as yup from "yup";

// export const userInfoValidationSchema = yup.object().shape({
//   address: yup.object().shape({
//     address: yup.string().required("آدرس الزامی است."),
//     city: yup.string().required("شهر الزامی است."),
//     provider: yup.string().required("استان الزامی است."),
//     plaque: yup.string().required("پلاک الزامی است."),
//     unit: yup.string().required("واحد الزامی است."),
//     postalCode: yup
//       .string()
//       .matches(/^\d{10}$/, "کد پستی باید 10 رقم باشد")
//       .required("کد پستی الزامی است."),
//   }),
//   firstName: yup.string().required("نام الزامی است."),
//   lastName: yup.string().required("نام خانوادگی الزامی است."),
//   phone: yup
//     .string()
//     .matches(/^09\d{9}$/, "شماره تماس باید 11 رقم باشد و با 09 شروع شود")
//     .required("شماره تماس الزامی است."),
// });

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
