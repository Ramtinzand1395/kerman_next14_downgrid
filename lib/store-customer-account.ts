import type { ClientSession } from "mongoose";
import User from "@/model/User";

type StoreCustomer = {
  mobile: string;
  name?: string;
  lastName?: string;
};

export async function provisionStoreCustomerAccount(customer: StoreCustomer, session?: ClientSession) {
  const mobile = customer.mobile.trim();
  if (!/^09\d{9}$/.test(mobile)) return;

  const name = customer.name?.trim();
  const firstName = name === "کاربر بی نام" ? undefined : name;
  const lastName = customer.lastName?.trim();
  const username = [firstName, lastName].filter(Boolean).join(" ");

  const now = new Date();
  await User.updateOne(
    { mobile },
    {
      $setOnInsert: {
        mobile,
        createdAt: now,
        updatedAt: now,
        role: "user",
        storeOrderPendingSignup: true,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(username ? { username } : {}),
      },
    },
    { upsert: true, runValidators: true, timestamps: false, session },
  );
}
