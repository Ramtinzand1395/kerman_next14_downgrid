import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import CustomerGameOrder from "@/model/CustomerGameOrder";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { customerOrderUpdateSchema } from "@/validations/validation";
import { stripHtmlTags } from "@/helpers/stripHtmlTags";
import mongoose from "mongoose";

async function requireSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return null;
}

/* ================= GET ================= */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperadmin();
  if (guard) return guard;

  try {
    await dbConnect();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "شناسه سفارش معتبر نیست." },
        { status: 400 },
      );
    }

    const order = await CustomerGameOrder.findById(id)
      .populate("user", "username mobile")
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: "سفارش مورد نظر پیدا نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Customer order fetch failed:", error);
    return NextResponse.json(
      { error: "خطایی در دریافت سفارش رخ داد." },
      { status: 500 },
    );
  }
}

/* ================= PUT ================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperadmin();
  if (guard) return guard;

  try {
    await dbConnect();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "شناسه سفارش معتبر نیست." },
        { status: 400 },
      );
    }

    const existingOrder = await CustomerGameOrder.findById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: "سفارش مورد نظر پیدا نشد." },
        { status: 404 },
      );
    }

    const body = await req.json();

    const sanitizedBody: Record<string, unknown> = {};
    if (body.status !== undefined) sanitizedBody.status = body.status;
    if (body.phone !== undefined)
      sanitizedBody.phone = String(body.phone).trim();
    if (body.address !== undefined)
      sanitizedBody.address = stripHtmlTags(body.address);
    if (body.message !== undefined)
      sanitizedBody.message = stripHtmlTags(body.message || "");
    if (body.totalPrice !== undefined) {

      const totalPrice = Number(body.totalPrice);

      if (!Number.isFinite(totalPrice)) {

        return NextResponse.json(

          { error: "مبلغ کل باید یک عدد معتبر باشد." },

          { status: 400 },

        );

      }

      sanitizedBody.totalPrice = totalPrice;

    }
    try {
      await customerOrderUpdateSchema.validate(sanitizedBody, {
        abortEarly: false,
      });
    } catch (validationError: unknown) {
      const err = validationError as { errors?: Array<{ message: string }> };
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: err.errors?.map((e) => e.message),
        },
        { status: 400 },
      );
    }

    const updatedOrder = await CustomerGameOrder.findByIdAndUpdate(
      id,
      { $set: sanitizedBody },
      { new: true, runValidators: true },
    ).lean();

    return NextResponse.json(
      { message: "سفارش با موفقیت بروزرسانی شد.", order: updatedOrder },
      { status: 200 },
    );
  } catch (error) {
    console.error("Customer order update failed:", error);
    return NextResponse.json(
      { error: "خطایی در بروزرسانی سفارش رخ داد." },
      { status: 500 },
    );
  }
}

/* ================= DELETE ================= */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperadmin();
  if (guard) return guard;

  try {
    await dbConnect();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "شناسه سفارش معتبر نیست." },
        { status: 400 },
      );
    }

    const deletedOrder = await CustomerGameOrder.findByIdAndDelete(id);

    if (!deletedOrder) {
      return NextResponse.json(
        { error: "سفارش مورد نظر پیدا نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "سفارش با موفقیت حذف شد." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Customer order delete failed:", error);
    return NextResponse.json(
      { error: "خطایی در حذف سفارش رخ داد." },
      { status: 500 },
    );
  }
}
