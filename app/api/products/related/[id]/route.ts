import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import {
  buildRelatedProductsPipeline,
  createRelatedProductSelection,
  isValidRelatedProductId,
  type RelatedProductSource,
} from "@/lib/relatedProductQuery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  // بررسی وجود id
  if (!id) {
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // بررسی معتبر بودن ObjectId
  if (!isValidRelatedProductId(id)) {
    return json({ error: "Invalid Product ID" }, 400);
  }

  try {
    await dbConnect();

    const product = await Product.findOne({
      _id: id,
      status: "published",
      deletedAt: null,
    })
      .select("category tags")
      .lean<RelatedProductSource | null>();

    if (!product) {
      return json({ error: "Product not found" }, 404);
    }

    const selection = createRelatedProductSelection(id, product);
    if (!selection) return json({ relatedProducts: [] });

    const relatedProducts = await Product.aggregate(
      buildRelatedProductsPipeline(selection),
    );

    return json({ relatedProducts });
  } catch (err) {
    console.error("Error fetching product:", err);
    return json({ error: "Server error" }, 500);
  }
}
