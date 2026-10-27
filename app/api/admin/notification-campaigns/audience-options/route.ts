import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Category from "@/model/Category";
import Product from "@/model/Product";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const kind = req.nextUrl.searchParams.get("kind");
  const query = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) || "";
  await dbConnect();
  const search = query ? new RegExp(escapeRegExp(query), "i") : undefined;
  if (kind === "categories") {
    const items = await Category.find(search ? { name: search } : {}).select("name slug").sort({ name: 1 }).limit(30).lean();
    return NextResponse.json({ items });
  }
  if (kind === "products") {
    const items = await Product.find({ ...(search ? { title: search } : {}), deletedAt: null }).select("title slug sku").sort({ createdAt: -1 }).limit(30).lean();
    return NextResponse.json({ items });
  }
  return NextResponse.json({ error: "نوع گزینه نامعتبر است." }, { status: 400 });
}
