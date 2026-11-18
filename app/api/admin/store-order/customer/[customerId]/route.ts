import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import {
  canEditStoreMobile, findStoreCustomer, parseStoreProfile, storeCustomerFields,
  storeCustomerMobile, toStoreCustomer,
} from "@/lib/store-customer-account";
import {
  isCustomerBarcode, isCustomerDuplicateKey, normalizeCustomerBarcode,
} from "@/lib/store-customer-barcodes";
import User from "@/model/User";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return fail("کاربر وارد نشده", 401);
  if (!["admin", "superadmin"].includes(session.user.role)) return fail("دسترسی غیرمجاز", 403);

  try {
    const { customerId } = await params;
    const body = await req.json();
    if (!body?.customer || typeof body.customer !== "object" || Array.isArray(body.customer)) {
      return fail("اطلاعات مشتری معتبر نیست.", 400);
    }
    const profile = parseStoreProfile(body.customer);
    const mobile = storeCustomerMobile(body.customer.mobile);
    if (!profile || !mobile) return fail("اطلاعات یا شماره موبایل مشتری معتبر نیست.", 400);
    const rawBarcodes: unknown = body.customer.barcodes;
    const previousBarcodes: unknown = body.previousBarcodes;
    const barcodes = rawBarcodes === undefined ? undefined
      : Array.isArray(rawBarcodes) && rawBarcodes.every((value) =>
          typeof value === "string" && isCustomerBarcode(normalizeCustomerBarcode(value)))
        ? [...new Set(rawBarcodes.map(normalizeCustomerBarcode))] : null;
    if (barcodes === null || (barcodes && (!Array.isArray(previousBarcodes) ||
        !previousBarcodes.every(isCustomerBarcode)))) return fail("فهرست بارکدها معتبر نیست.", 400);

    await dbConnect();
    const user = await findStoreCustomer(customerId);
    if (!user) return fail("کاربر پیدا نشد.", 404);
    if (mobile !== user.mobile && !canEditStoreMobile(user)) {
      return fail("تغییر شمارهٔ ورود این حساب به تأیید مالک شماره نیاز دارد.", 409);
    }

    const customer = toStoreCustomer(user);
    // Keep the original store values when the UI displays user-entered fields.
    if (!customer.canEditName) {
      delete profile.name;
      delete profile.lastName;
    }
    if (!customer.canEditGender) delete profile.sex;
    if (!customer.canEditBirthday) delete profile.birthday;

    await User.init();
    const filter: Record<string, unknown> = { _id: user._id, mobile: user.mobile };
    const changes = Object.fromEntries(Object.entries(profile).map(([key, value]) => ["storeProfile." + key, value]));
    if (mobile !== user.mobile) {
      Object.assign(filter, {
        role: "user", storeOrderPendingSignup: true,
        phoneVerifiedAt: null, registrationCompletedAt: null,
      });
      changes.mobile = mobile;
    }
    if (barcodes) {
      const expected = previousBarcodes as string[];
      Object.assign(filter, expected.length ? { barcodes: { $eq: expected } } : { "barcodes.0": { $exists: false } });
    }
    const updated = await User.findOneAndUpdate(filter, {
      $set: { ...changes, ...(barcodes ? { barcodes } : {}) },
    }, { new: true, runValidators: true }).select(storeCustomerFields).lean();

    return updated
      ? NextResponse.json({ message: "اطلاعات مشتری ویرایش شد.", data: toStoreCustomer(updated) })
      : fail("اطلاعات حساب یا بارکدها تغییر کرده‌اند. صفحه را دوباره باز کنید.", 409);
  } catch (error) {
    if (isCustomerDuplicateKey(error)) return fail("این شماره یا بارکد به مشتری دیگری تعلق دارد.", 409);
    console.error("[store-customer] update failed", error instanceof Error ? error.name : typeof error);
    return fail("اطلاعات مشتری ذخیره نشد؛ دوباره تلاش کنید.", 500);
  }
}
