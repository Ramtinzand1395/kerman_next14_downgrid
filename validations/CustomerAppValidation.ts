// validationSchemas.ts
import * as Yup from "yup";

export const searchSchema = Yup.object().shape({
  mobile: Yup.string()
    .required("شماره موبایل الزامی است")
    .matches(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
});

export const customerSchema = Yup.object().shape({
  lastName: Yup.string().required("نام خانوادگی الزامی است"),
  mobile: Yup.string()
    .required("شماره موبایل الزامی است")
    .matches(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
  sex: Yup.string().required(" جنسیت الزامی است"),
});

export const orderSchema = Yup.object().shape({
  list: Yup.array().min(1, "حداقل یک مورد باید ثبت شود لیست کامل نیست").required(),
  price: Yup.number().required("قیمت الزامی است").min(1, "قیمت معتبر نیست"),
  consoleType: Yup.string().required("نوع کنسول الزامی است"),
  description: Yup.string().optional(),
});
