import mongoose from "mongoose";
import moment from "moment-jalaali";
import User from "@/model/User";
import type { Customer } from "@/types";

export function asciiDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function storeCustomerMobile(value: unknown) {
  if (typeof value !== "string") return null;
  const mobile = asciiDigits(value)
    .replace(/[\s()-]/g, "")
    .replace(/^(?:\+98|0098|98)(?=9\d{9}$)/, "0");
  return /^09\d{9}$/.test(mobile) ? mobile : null;
}

export const storeCustomerFields = "mobile username firstName lastName gender birthday createdAt updatedAt role phoneVerifiedAt registrationCompletedAt storeOrderPendingSignup +storeProfile +barcodes +legacyCustomerId";

type StoreProfile = Partial<Pick<Customer, "name" | "lastName" | "sex" | "birthday" | "description">>;
type UserForStore = {
  _id: unknown;
  mobile: string;
  createdAt?: Date;
  updatedAt?: Date;
  username?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthday?: Date | null;
  role?: string;
  storeOrderPendingSignup?: boolean;
  phoneVerifiedAt?: Date;
  registrationCompletedAt?: Date;
  storeProfile?: StoreProfile;
  barcodes?: string[];
};

export function parseStoreProfile(value: Record<string, unknown>): StoreProfile | null {
  const limits = { name: 80, lastName: 80, sex: 8, birthday: 32, description: 2000 } as const;
  const profile: StoreProfile = {};
  for (const [key, limit] of Object.entries(limits) as [keyof StoreProfile, number][]) {
    const text = value[key];
    if (text === undefined) continue;
    if (typeof text !== "string" || text.trim().length > limit) return null;
    profile[key] = text.trim();
  }
  if (profile.sex && !["مرد", "زن"].includes(profile.sex)) return null;
  return profile;
}

export function canEditStoreMobile(user: UserForStore) {
  return user.role === "user" && user.storeOrderPendingSignup === true &&
    !user.phoneVerifiedAt && !user.registrationCompletedAt;
}

export function toStoreCustomer(user: UserForStore): Customer {
  const profile = user.storeProfile ?? {};
  const verifiedBirthday = user.birthday instanceof Date && Number.isFinite(user.birthday.getTime())
    ? moment.utc(user.birthday).locale("en").format("jYYYY/jMM/jDD")
    : "";
  const fallbackName = user.username && user.username !== "کاربر" ? user.username : "";
  const hasRegisteredName = Boolean(user.firstName || user.lastName || fallbackName);

  return {
    _id: String(user._id),
    mobile: user.mobile,
    name: user.firstName || (hasRegisteredName ? fallbackName : profile.name) || "",
    lastName: user.lastName || (hasRegisteredName ? "" : profile.lastName) || "",
    sex: user.gender || profile.sex || "",
    birthday: verifiedBirthday || (user.birthday === undefined ? profile.birthday : "") || "",
    description: profile.description || "",
    barcodes: user.barcodes ?? [],
    createdAt: user.createdAt?.toISOString() ?? "",
    updatedAt: user.updatedAt?.toISOString() ?? "",
    canEditMobile: canEditStoreMobile(user),
    canEditName: !hasRegisteredName,
    canEditGender: !user.gender,
    canEditBirthday: user.birthday === undefined,
  };
}

export function storeCustomerSnapshot(customer: Customer) {
  const { name, lastName, mobile, sex, birthday, description } = customer;
  return { name, lastName, mobile, sex, birthday, description };
}

export function findStoreCustomer(id: unknown) {
  if (typeof id !== "string" || !mongoose.isObjectIdOrHexString(id)) return null;
  return User.findOne({ $or: [{ _id: id }, { legacyCustomerId: id }] })
    .select(storeCustomerFields).lean<UserForStore>().exec();
}

export function storeSmsName(customer: Pick<Customer, "name" | "lastName">) {
  return customer.lastName || customer.name || "مشتری";
}
