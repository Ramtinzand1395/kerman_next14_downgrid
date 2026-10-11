
"use server";

export async function CheckPhoneAction(mobile: string) {
  // این اکشن عمداً هیچ Userای نمی سازد. ایجاد کاربر فقط پس از تأیید OTP
  // در سرور انجام می شود تا درخواست پیامک با ثبت نام اشتباه نشود.
  return /^09\d{9}$/.test(mobile.trim());
}
