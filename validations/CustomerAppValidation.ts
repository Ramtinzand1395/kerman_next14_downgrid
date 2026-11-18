import * as Yup from "yup";

export const customerSchema = Yup.object().shape({
  lastName: Yup.string().max(80, "نام خانوادگی حداکثر ۸۰ نویسه است"),
  mobile: Yup.string()
    .required("شماره موبایل الزامی است")
    .matches(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
  sex: Yup.string().oneOf(["", "مرد", "زن"], "جنسیت معتبر نیست"),
});

export const orderSchema = Yup.object().shape({
  list: Yup.array().min(1, "حداقل یک مورد باید ثبت شود لیست کامل نیست").required(),
  price: Yup.number().required("قیمت الزامی است").min(1, "قیمت معتبر نیست"),
  consoleType: Yup.string().required("نوع کنسول الزامی است"),
  description: Yup.string().optional(),
});
