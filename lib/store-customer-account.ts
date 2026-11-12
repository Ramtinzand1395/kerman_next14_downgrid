import type { ClientSession } from "mongoose";
import User from "@/model/User";

type StoreCustomer = {
  mobile: string;
  name?: string;
  lastName?: string;
};

export function storeCustomerMobile(value: string) {
  const mobile = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\s()-]/g, "")
    .replace(/^(?:\+98|0098|98)(?=9\d{9}$)/, "0");
  return /^09\d{9}$/.test(mobile) ? mobile : null;
}

function importableName(value?: string) {
  const name = value?.trim();
  return name && name.length <= 80 ? name : undefined;
}

export async function provisionStoreCustomerAccount(customer: StoreCustomer, session?: ClientSession) {
  const mobile = storeCustomerMobile(customer.mobile);
  if (!mobile) return false;

  const name = importableName(customer.name);
  const firstName = name === "کاربر بی نام" ? undefined : name;
  const lastName = importableName(customer.lastName);
  const username = [firstName, lastName].filter(Boolean).join(" ");

  const now = new Date();
  const result = await User.updateOne(
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
  if (result.upsertedCount === 0) {
    for (const [field, value] of Object.entries({ firstName, lastName })) {
      if (!value) continue;
      await User.updateOne(
        { mobile, role: "user", [field]: { $in: [null, ""] } },
        { $set: { [field]: value } },
        { runValidators: true, session },
      );
    }
  }
  return true;
}
