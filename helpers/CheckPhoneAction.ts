
"use server";

import dbConnect from "@/lib/mongodb";
import User from "@/model/User";
import { notifyAdmins } from "@/lib/notifications/service";

export async function CheckPhoneAction(mobile: string, referralCode?: string) {
  try {
    await dbConnect();
    let user = await User.findOne({ mobile });
    if (!user) {
      const newUser = await User.create({ mobile });
      await notifyAdmins({
        title: "کاربر جدید",
        message: `کاربر جدید با شماره ${mobile} ثبت‌نام کرد.`,
        type: "USER_REGISTERED",
        category: "account",
        entityType: "User",
        entityId: newUser._id,
        link: "/dashboard/users",
        eventKey: `USER_REGISTERED:${newUser._id}`,
      }).catch((error) => console.error("[notifications] signup event failed:", error));

      // باشگاه مشتریان: XP ثبت‌نام + ساخت کد دعوت
      try {
        const { onUserSignup } = await import("@/lib/loyalty/purchase.hooks");
        await onUserSignup(newUser._id.toString(), referralCode);
      } catch (err) {
        console.error("[loyalty] signup hook failed:", err);
      }
    }
    return true; // در هر صورت true برمی‌گردانیم
  } catch (error) {
    console.error("CheckPhoneAction error:", error);
    return false; // در صورت خطا false برمی‌گردد
  }
}
