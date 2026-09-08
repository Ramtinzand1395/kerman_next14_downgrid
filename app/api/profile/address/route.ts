
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Address from "@/model/Address";
import User from "@/model/User";
import {
  detachAddressReferences,
  preserveAddressSnapshots,
} from "@/lib/addressReferences";
import mongoose from "mongoose";

// ===== GET Addresses =====
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
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
      { status: 500 },
    );
  }
}

// ===== POST Add Address =====
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
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
    // اضافه کردن به آرایه addresses کاربر
    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: { addresses: newAddress._id },
    });
    return NextResponse.json(newAddress, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در افزودن آدرس" }, { status: 500 });
  }
}

// ===== PUT Update Address =====
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    await dbConnect();

    const { id, _id, province, city, address, plaque, unit, postalCode } =
      await req.json();

    const addressId = id ?? _id;
    if (!addressId) {
      return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(String(addressId))) {
      return NextResponse.json({ error: "شناسه آدرس نامعتبر است" }, { status: 400 });
    }

    const addressToUpdate = await Address.findOne({
      _id: addressId,
      userId: session.user.id,
    }).lean();
    if (!addressToUpdate) {
      return NextResponse.json(
        { error: "آدرسی برای بروزرسانی پیدا نشد" },
        { status: 404 },
      );
    }

    // Capture the old value for records created before snapshots were added.
    await preserveAddressSnapshots(addressToUpdate);

    const updated = await Address.findByIdAndUpdate(
      addressToUpdate._id,
      { province, city, address, plaque, unit, postalCode },
      { returnDocument: "after" },
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "خطا در بروزرسانی آدرس" },
      { status: 500 },
    );
  }
}

// ===== DELETE Address =====
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    await dbConnect();

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id الزامی است" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "شناسه آدرس نامعتبر است" }, { status: 400 });
    }

    const addressToDelete = await Address.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!addressToDelete) {
      return NextResponse.json({ error: "آدرس پیدا نشد" }, { status: 404 });
    }

    // Preserve every dependent record, then remove dangling references.
    await preserveAddressSnapshots(addressToDelete);
    await detachAddressReferences(addressToDelete._id);

    await Address.deleteOne({ _id: addressToDelete._id });
    await User.findByIdAndUpdate(session.user.id, {
      $pull: { addresses: id },
    });

    return NextResponse.json({ message: "آدرس حذف شد" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در حذف آدرس" }, { status: 500 });
  }
}
