import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import {
  isCustomerBarcode,
  isCustomerDuplicateKey,
  normalizeCustomerBarcode,
} from "@/lib/store-customer-barcodes";
import { mobileSchema } from "@/validations/validation";
import Customer from "@/model/Customer";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/* ---------------- GET CUSTOMER ---------------- */

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (!["admin", "superadmin"].includes(session.user.role))
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get("mobile");

    const barcode = normalizeCustomerBarcode(searchParams.get("barcode") ?? "");
    if (barcode && !isCustomerBarcode(barcode)) {
      return NextResponse.json({ message: "بارکد معتبر نیست." }, { status: 400 });
    }

    if (!mobile && !barcode) {
      const page = Number(searchParams.get("page")) || 1;
      const parsedLimit = Number(searchParams.get("limit"));
      const limit =
        Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
      const query = searchParams.get("query")?.trim();
      const escapedQuery = query?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const skip = (page - 1) * limit;

      const filter = escapedQuery
        ? {
            $or: [
              { name: { $regex: escapedQuery, $options: "i" } },
              { lastName: { $regex: escapedQuery, $options: "i" } },
              { mobile: { $regex: escapedQuery, $options: "i" } },
              { barcodes: { $regex: escapedQuery, $options: "i" } },
            ],
          }
        : {};

      const [customers, total] = await Promise.all([
        Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Customer.countDocuments(filter),
      ]);

      return NextResponse.json(
        {
          message: "لیست مشتریان دریافت شد.",
          data: customers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
          status: 200,
        },
        { status: 200 },
      );
    }

    const [byMobile, byBarcode] = await Promise.all([
      mobile ? Customer.findOne({ mobile }) : null,
      barcode ? Customer.findOne({ barcodes: barcode }) : null,
    ]);

    if (
      byBarcode &&
      ((byMobile && !byMobile._id.equals(byBarcode._id)) ||
        (mobile && byBarcode.mobile && byBarcode.mobile !== mobile))
    ) {
      return NextResponse.json(
        { message: "بارکد ثبت‌شده با شماره موبایل واردشده مطابقت ندارد." },
        { status: 409 },
      );
    }

    const customer = byBarcode ?? byMobile;

    if (!customer) {
      return NextResponse.json(
        { message: "خریدار پیدا نشد." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "خریدار پیدا شد.",
        data: customer,
        status: 200,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "جستجوی مشتری انجام نشد؛ دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}

/* ---------------- CREATE CUSTOMER ---------------- */

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (!["admin", "superadmin"].includes(session.user.role))
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const body = await req.json();
    const { _id, mobile, lastName, sex, birthday, description } = body;
    const barcode = typeof body.barcode === "string"
      ? normalizeCustomerBarcode(body.barcode)
      : body.barcode;

    if (typeof mobile !== "string" || !mobileSchema.isValidSync(mobile)) {
      return NextResponse.json(
        { message: "شماره موبایل معتبر الزامی است." },
        { status: 400 },
      );
    }
    if (barcode !== undefined && barcode !== "" && !isCustomerBarcode(barcode)) {
      return NextResponse.json({ message: "بارکد معتبر نیست." }, { status: 400 });
    }

    // Wait for the unique indexes before assigning a barcode or creating a customer.
    await Customer.init();

    const existing = _id
      ? await Customer.findById(_id)
      : await Customer.findOne({ mobile });

    if (_id && !existing) {
      return NextResponse.json({ message: "خریدار پیدا نشد." }, { status: 404 });
    }

    if (existing) {
      if (existing.mobile && existing.mobile !== mobile) {
        return NextResponse.json(
          { message: "شماره موبایل پرونده تغییر کرده است. دوباره جست‌وجو کنید." },
          { status: 409 },
        );
      }
      const customer = barcode || !existing.mobile
        ? await Customer.findOneAndUpdate(
            { _id: existing._id, mobile: { $in: [mobile, "", null] } },
            {
              $set: { mobile },
              ...(barcode ? { $addToSet: { barcodes: barcode } } : {}),
            },
            { new: true, runValidators: true },
          )
        : existing;

      if (!customer) {
        return NextResponse.json(
          { message: "اطلاعات مشتری تغییر کرده است. دوباره جست‌وجو کنید." },
          { status: 409 },
        );
      }

      return NextResponse.json({
        message: "اطلاعات مشتری تأیید شد.",
        data: customer,
      });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const customer = await Customer.create({
      name: name || "کاربر بی نام",
      mobile,
      lastName,
      sex,
      birthday,
      description,
      ...(barcode ? { barcodes: [barcode] } : {}),
    });

    return NextResponse.json(
      {
        message: "خریدار اضافه شد.",
        data: customer,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isCustomerDuplicateKey(err)) {
      return NextResponse.json(
        { message: "این شماره یا بارکد قبلاً ثبت شده است. دوباره جست‌وجو کنید." },
        { status: 409 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { message: "مشتری ثبت نشد؛ دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
