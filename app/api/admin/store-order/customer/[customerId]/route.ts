import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
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

    await customer.save();

    return NextResponse.json(
      {
        message: "خریدار ویرایش شد.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "خطای سرور" }, { status: 500 });
  }
}
