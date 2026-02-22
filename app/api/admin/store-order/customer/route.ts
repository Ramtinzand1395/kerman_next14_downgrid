import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Customer from "@/model/Customer";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/* ---------------- GET CUSTOMER ---------------- */

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (session.user.role !== "superadmin")
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get("mobile");

    if (!mobile) {
       const page = Number(searchParams.get("page")) || 1;
     const parsedLimit = Number(searchParams.get("limit"));
     const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
     const query = searchParams.get("query")?.trim();
     const skip = (page - 1) * limit;
 
     const filter = query
       ? {
           $or: [
             { name: { $regex: query, $options: "i" } },
             { lastName: { $regex: query, $options: "i" } },
             { mobile: { $regex: query, $options: "i" } },
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
        { status: 200},
      );
    }

    const customer = await Customer.findOne({ mobile });

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
      { status: 200},
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "خطای سرور" }, { status: 500 });
  }
}

/* ---------------- CREATE CUSTOMER ---------------- */

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (session.user.role !== "superadmin")
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const body = await req.json();
    let { name, mobile, lastName, sex, birthday, description } = body;

    if (!mobile) {
      return NextResponse.json(
        { message: "شماره موبایل الزامی است." },
        { status: 400 },
      );
    }

    const existingCustomer = await Customer.findOne({ mobile });
    if (existingCustomer) {
      return NextResponse.json(
        { message: "خریدار قبلاً ثبت شده است." },
        { status: 202 },
      );
    }

    if (!name || name.trim() === "") {
      name = "کاربر بی نام";
    }

    const customer = new Customer({
      name,
      mobile,
      lastName,
      sex,
      birthday,
      description,
    });

    await customer.save();

    return NextResponse.json(
      {
        message: "خریدار اضافه شد.",
        data: customer,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "خطای سرور" }, { status: 500 });
  }
}
