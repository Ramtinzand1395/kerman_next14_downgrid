import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import {
  isCustomerBarcode,
  isCustomerDuplicateKey,
  normalizeCustomerBarcode,
} from "@/lib/store-customer-barcodes";
import { mobileSchema } from "@/validations/validation";
import Customer from "@/model/Customer";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }
  if (!["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  await dbConnect();

  try {
    const { customerId } = await params;
    const body = await req.json();
    const { name, mobile, lastName, sex, birthday, description } =
      body.customer;

    const rawBarcodes: unknown = body.customer.barcodes;
    const previousBarcodes: unknown = body.previousBarcodes;
    if (typeof mobile !== "string" || !mobileSchema.isValidSync(mobile)) {
      return NextResponse.json({ message: "شماره موبایل معتبر الزامی است." }, { status: 400 });
    }

    let barcodes: string[] | undefined;
    if (rawBarcodes !== undefined) {
      if (
        !Array.isArray(rawBarcodes) ||
        !rawBarcodes.every((value) =>
          typeof value === "string" && isCustomerBarcode(normalizeCustomerBarcode(value)),
        ) ||
        !Array.isArray(previousBarcodes) ||
        !previousBarcodes.every(isCustomerBarcode)
      ) {
        return NextResponse.json({ message: "فهرست بارکدها معتبر نیست." }, { status: 400 });
      }
      barcodes = [...new Set(rawBarcodes.map(normalizeCustomerBarcode))];
      await Customer.init();
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ message: "کاربر پیدا نشد." }, { status: 404 });
    }

    customer.name = name;
    customer.mobile = mobile;
    customer.lastName = lastName;
    customer.sex = sex;
    customer.description = description;
    customer.birthday = birthday;

    let updated = customer;
    if (barcodes === undefined) {
      await customer.save();
    } else {
      await customer.validate();
      // Do not overwrite a barcode added after the edit form was opened.
      const expected = previousBarcodes as string[];
      const filter = expected.length
        ? { _id: customerId, barcodes: { $eq: expected } }
        : { _id: customerId, "barcodes.0": { $exists: false } };
      updated = await Customer.findOneAndUpdate(
        filter,
        { $set: { name, mobile, lastName, sex, description, birthday, barcodes } },
        { new: true, runValidators: true },
      );
      if (!updated) {
        return NextResponse.json(
          { message: "بارکدها تغییر کرده‌اند. صفحه را تازه‌سازی و دوباره تلاش کنید." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        message: "خریدار ویرایش شد.",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    if (isCustomerDuplicateKey(error)) {
      return NextResponse.json(
        { message: "این شماره یا بارکد به مشتری دیگری تعلق دارد." },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { message: "اطلاعات مشتری ذخیره نشد؛ دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
