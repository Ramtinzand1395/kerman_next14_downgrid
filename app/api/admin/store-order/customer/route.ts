import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import {
  findStoreCustomer, parseStoreProfile, storeCustomerFields, storeCustomerMobile, toStoreCustomer,
} from "@/lib/store-customer-account";
import {
  isCustomerBarcode, isCustomerDuplicateKey, normalizeCustomerBarcode,
} from "@/lib/store-customer-barcodes";
import User from "@/model/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });
const isStaff = (role: string) => ["admin", "superadmin"].includes(role);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return fail("کاربر وارد نشده", 401);
  if (!isStaff(session.user.role)) return fail("دسترسی غیرمجاز", 403);

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const rawMobile = searchParams.get("mobile");
    const mobile = storeCustomerMobile(rawMobile);
    const barcode = normalizeCustomerBarcode(searchParams.get("barcode") ?? "");
    if (rawMobile && !mobile) return fail("شماره موبایل معتبر نیست.", 400);
    if (barcode && !isCustomerBarcode(barcode)) return fail("بارکد معتبر نیست.", 400);

    if (mobile || barcode) {
      const [byMobile, byBarcode] = await Promise.all([
        mobile ? User.findOne({ mobile }).select(storeCustomerFields).lean() : null,
        barcode ? User.findOne({ barcodes: barcode }).select(storeCustomerFields).lean() : null,
      ]);
      if (byBarcode && mobile && byBarcode.mobile !== mobile) {
        return fail("بارکد ثبت‌شده با شماره موبایل واردشده مطابقت ندارد.", 409);
      }
      const user = byBarcode ?? byMobile;
      return user
        ? NextResponse.json({ data: toStoreCustomer(user) })
        : fail("خریدار پیدا نشد.", 404);
    }

    const pageValue = Number(searchParams.get("page"));
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limitValue = Number(searchParams.get("limit"));
    const limit = Number.isSafeInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 10;
    const query = searchParams.get("query")?.trim().slice(0, 100);
    const pattern = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
    const filter = pattern ? {
      $or: ["username", "firstName", "lastName", "storeProfile.name", "storeProfile.lastName", "mobile", "barcodes"]
        .map((field) => ({ [field]: pattern })),
    } : {};
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit).limit(limit).select(storeCustomerFields).lean(),
      User.countDocuments(filter),
    ]);
    return NextResponse.json({
      data: users.map(toStoreCustomer),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("[store-customer] search failed", error instanceof Error ? error.name : typeof error);
    return fail("جست‌وجوی مشتری انجام نشد؛ دوباره تلاش کنید.", 500);
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return fail("کاربر وارد نشده", 401);
  if (!isStaff(session.user.role)) return fail("دسترسی غیرمجاز", 403);

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail("اطلاعات معتبر نیست.", 400);
    const mobile = storeCustomerMobile(body.mobile);
    const barcode = typeof body.barcode === "string" ? normalizeCustomerBarcode(body.barcode) : body.barcode;
    if (!mobile) return fail("شماره موبایل معتبر الزامی است.", 400);
    if (barcode !== undefined && barcode !== "" && !isCustomerBarcode(barcode)) {
      return fail("بارکد معتبر نیست.", 400);
    }
    const profile = parseStoreProfile(body);
    if (!profile) return fail("اطلاعات مشتری معتبر نیست.", 400);
    await dbConnect();
    await User.init();

    const existing = body._id
      ? await findStoreCustomer(body._id)
      : await User.findOne({ mobile }).select(storeCustomerFields).lean();
    if (body._id && !existing) return fail("خریدار پیدا نشد.", 404);
    if (existing && existing.mobile !== mobile) return fail("شماره موبایل پرونده تغییر کرده است.", 409);
    const filter = existing ? { _id: existing._id, mobile } : { mobile };
    if (!existing && (!profile.lastName || !profile.sex)) {
      return fail("نام خانوادگی و جنسیت مشتری را کامل کنید.", 400);
    }

    const update = {
      $setOnInsert: { mobile, role: "user", storeOrderPendingSignup: true, storeProfile: profile },
      ...(barcode ? { $addToSet: { barcodes: barcode } } : {}),
    };
    // The same unique mobile index arbitrates manual creation and OTP signup.
    const save = (upsert: boolean) => User.findOneAndUpdate(filter, update, {
      upsert, returnDocument: "after", runValidators: true, includeResultMetadata: true,
    }).select(storeCustomerFields).lean();
    let result;
    try {
      result = await save(!existing);
    } catch (error) {
      if (!isCustomerDuplicateKey(error) || existing) throw error;
      result = await save(false);
      if (!result.value) throw error;
    }
    if (!result.value) return fail("اطلاعات مشتری تغییر کرده است. دوباره جست‌وجو کنید.", 409);
    return NextResponse.json(
      { message: "اطلاعات مشتری تأیید شد.", data: toStoreCustomer(result.value) },
      { status: result.lastErrorObject?.upserted ? 201 : 200 },
    );
  } catch (error) {
    if (isCustomerDuplicateKey(error)) return fail("این شماره یا بارکد قبلاً ثبت شده است.", 409);
    console.error("[store-customer] save failed", error instanceof Error ? error.name : typeof error);
    return fail("مشتری ثبت نشد؛ دوباره تلاش کنید.", 500);
  }
}
