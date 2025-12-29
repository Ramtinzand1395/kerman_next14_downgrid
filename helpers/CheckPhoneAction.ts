"use server";

import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import User from "@/model/User";

export async function CheckPhoneAction(mobile: string) {
  try {
    await dbConnect();
    let user = await User.findOne({ mobile });
    if (!user) {
      const user = await User.create({ mobile });
      console.log(user);
      await Notification.create({
        title: "کاربر جدید",
        message: "یک کاربر جدید ثبت نام شد",
        type: "user",
        target: {
          kind: "User",
          item: user._id,
        },
      });
    }
    return true; // در هر صورت true برمی‌گردانیم
  } catch (error) {
    console.error("CheckPhoneAction error:", error);
    return false; // در صورت خطا false برمی‌گردد
  }
}
