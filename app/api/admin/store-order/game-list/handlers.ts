import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { deleteUnusedCloudinaryImages } from "@/lib/cloudinary";
import {
  normalizeGamePlatform,
  parseGameInput,
  parseGameItemId,
} from "@/lib/gameListAdmin";
import dbConnect from "@/lib/mongodb";
import CustomerGameOrder from "@/model/CustomerGameOrder";
import GameList from "@/model/GameList";
import StoreOrder from "@/model/StoreOrder";

const authorize = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false as const, status: 401 };
  if (!["admin", "superadmin"].includes(session.user.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
};

const denied = (status: number) =>
  NextResponse.json(
    { message: status === 401 ? "ابتدا وارد حساب شوید." : "دسترسی غیرمجاز" },
    { status },
  );

const badRequest = (error: unknown) =>
  NextResponse.json(
    { message: error instanceof Error ? error.message : "درخواست نامعتبر است." },
    { status: 400 },
  );

export async function GET(req: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return denied(auth.status);

  try {
    const { searchParams } = new URL(req.url);
    const platform = normalizeGamePlatform(searchParams.get("platform"));
    if (!platform) return badRequest(new Error("پلتفرم معتبر الزامی است."));

    const search = (searchParams.get("search") || "").trim().toLocaleLowerCase();
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      100,
    );

    await dbConnect();
    const data = await GameList.findOne({ platform }).lean();
    const allItems = Array.isArray(data?.items) ? data.items : [];
    const filteredItems = search
      ? allItems.filter((item: { name?: string }) =>
          (item.name || "").toLocaleLowerCase().includes(search),
        )
      : allItems;
    const totalItems = filteredItems.length;
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = Math.min(page, totalPages);
    const items = filteredItems.slice((safePage - 1) * limit, safePage * limit);

    return NextResponse.json({
      success: true,
      gameList: { platform, items },
      pagination: { page: safePage, limit, totalItems, totalPages },
    });
  } catch (error) {
    console.error("Game list GET failed:", error);
    return NextResponse.json(
      { message: "فهرست بازی‌ها دریافت نشد؛ دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return denied(auth.status);

  try {
    const input = parseGameInput(await req.json());
    await dbConnect();
    const item = {
      name: input.name,
      size: input.size,
      price: input.price,
      storage: input.storage,
      imageUrl: null,
      imagePublicId: null,
      imageAlt: input.name,
    };
    const updated = await GameList.findOneAndUpdate(
      { platform: input.platform },
      { $push: { items: item } },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    return NextResponse.json(
      { success: true, message: "بازی اضافه شد.", item: updated.items.at(-1) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error) {
      if (!(error as { name?: string }).name?.includes("Mongo")) {
        return badRequest(error);
      }
    }
    console.error("Game list POST failed:", error);
    return NextResponse.json({ message: "بازی ذخیره نشد." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return denied(auth.status);

  try {
    const body = await req.json();
    const input = parseGameInput(body);
    const itemId = parseGameItemId(body.itemId);
    await dbConnect();
    const updated = await GameList.findOneAndUpdate(
      { platform: input.platform, "items._id": itemId },
      {
        $set: {
          "items.$.name": input.name,
          "items.$.size": input.size,
          "items.$.price": input.price,
          "items.$.storage": input.storage,
          "items.$.imageAlt": input.name,
        },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!updated) {
      return NextResponse.json({ message: "بازی پیدا نشد." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "ویرایش شد." });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorize();
  if (!auth.ok) return denied(auth.status);

  try {
    const body = await req.json();
    const platform = normalizeGamePlatform(body.platform);
    const itemId = parseGameItemId(body.itemId);
    if (!platform) throw new Error("پلتفرم معتبر نیست.");

    await dbConnect();
    const gameList = await GameList.findOne(
      { platform, "items._id": itemId },
      { "items.$": 1 },
    ).lean();
    const game = gameList?.items?.[0];
    if (!game) {
      return NextResponse.json({ message: "بازی پیدا نشد." }, { status: 404 });
    }

    const [storeOrder, customerOrder] = await Promise.all([
      StoreOrder.exists({ consoleType: platform, "list.name": game.name }),
      CustomerGameOrder.exists({
        products: { $elemMatch: { name: game.name, platform } },
      }),
    ]);
    if (storeOrder || customerOrder) {
      return NextResponse.json(
        { message: "این بازی در سابقه سفارش استفاده شده و قابل حذف نیست." },
        { status: 409 },
      );
    }

    const result = await GameList.updateOne(
      { platform, "items._id": itemId },
      { $pull: { items: { _id: itemId } } },
    );
    if (!result.modifiedCount) {
      return NextResponse.json({ message: "بازی پیدا نشد." }, { status: 404 });
    }

    if (game.imageUrl) {
      try {
        await deleteUnusedCloudinaryImages([game.imageUrl], {
          excludeGameItemId: itemId,
        });
      } catch (cleanupError) {
        console.error("Deleted game cover cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json({ success: true, message: "حذف شد." });
  } catch (error) {
    return badRequest(error);
  }
}
