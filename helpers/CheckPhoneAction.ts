"use server";

import dbConnect from "@/lib/mongodb";
import User from "@/model/User";

export async function CheckPhoneAction(mobile: string) {
  try {
    await dbConnect();
    let user = await User.findOne({ mobile });
    if (!user) {
      user = await User.create({ mobile });
    }
    return true; // در هر صورت true برمی‌گردانیم
  } catch (error) {
    console.error("CheckPhoneAction error:", error);
    return false; // در صورت خطا false برمی‌گردد
  }
}
