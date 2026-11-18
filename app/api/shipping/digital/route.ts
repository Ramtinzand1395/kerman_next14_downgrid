import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(id => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id))) {
    return NextResponse.json({ digitalOnly: false }, { status: 400 });
  }
  await dbConnect();
  const count = await Product.countDocuments({ _id: { $in: ids }, status: "published", deletedAt: null, isDigital: true });
  return NextResponse.json({ digitalOnly: count === new Set(ids).size });
}
