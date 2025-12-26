// app/api/admin/tag/route.ts
import { NextResponse } from "next/server";
import Tag from "@/model/Tag";
import dbConnect from "@/lib/mongodb";


export async function GET() {
  try {
    await dbConnect();
    const tags = await Tag.find().sort({ name: 1 });
    return NextResponse.json(tags);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در دریافت تگ‌ها" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, slug } = await req.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "نام و اسلاگ الزامی است" }, { status: 400 });
    }

    // بررسی تکراری بودن اسلاگ
    const exists = await Tag.findOne({ slug });
    if (exists) {
      return NextResponse.json({ error: "این اسلاگ قبلاً استفاده شده" }, { status: 400 });
    }

    const tag = await Tag.create({ name, slug });
    return NextResponse.json(tag);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در افزودن تگ" }, { status: 500 });
  }
}

