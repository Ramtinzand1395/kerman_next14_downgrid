import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Address from "@/model/Address";


// ===== GET Addresses =====
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "کاربر وارد نشده" },
        { status: 401 }
      );
    }

    await dbConnect();

    const addresses = await Address.find({
      userId: session.user.id,
    }).sort({ createdAt: -1 });

    return NextResponse.json(addresses);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در دریافت آدرس‌ها" },
      { status: 500 }
    );
  }
}


// ===== POST Add Address =====
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "کاربر وارد نشده" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { province, city, address, plaque, unit, postalCode } =
      await req.json();

    const newAddress = await Address.create({
      userId: session.user.id,
      province,
      city,
      address,
      plaque,
      unit,
      postalCode,
    });

    return NextResponse.json(newAddress, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در افزودن آدرس" },
      { status: 500 }
    );
  }
}


// ===== PUT Update Address =====
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "کاربر وارد نشده" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id, province, city, address, plaque, unit, postalCode } =
      await req.json();

    const updated = await Address.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { province, city, address, plaque, unit, postalCode },
      { new: true }
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در بروزرسانی آدرس" },
      { status: 500 }
    );
  }
}


// ===== DELETE Address =====
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "کاربر وارد نشده" },
        { status: 401 }
      );
    }

    await dbConnect();

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id الزامی است" },
        { status: 400 }
      );
    }

    await Address.deleteOne({
      _id: id,
      userId: session.user.id,
    });

    return NextResponse.json({ message: "آدرس حذف شد" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در حذف آدرس" },
      { status: 500 }
    );
  }
}
