import { NextRequest, NextResponse } from "next/server";
import GameList from "@/model/GameList";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

type GameListDoc = {
  platform: string;
  items: { _id: string; name: string }[];
};

const normalizePlatform = (value: string | null) => {
  if (!value) return "";
  return value.trim().toLowerCase();
};

const filterItems = (items: GameListDoc["items"], search: string) => {
  if (!search) return items;
  return items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
};

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const platform = searchParams.get("platform") || "";
    const limit = Number(searchParams.get("limit")) || 100;

    const filter: any = {};

    if (platform) {
      filter.platform = platform;
    }

    const gameList = await GameList.find(filter)
      .select("platform items")
      .lean();

    let result = gameList;

    if (search) {
      const keyword = search.toLowerCase();

      result = gameList.map((doc: any) => ({
        ...doc,
        items: doc.items.filter((item: any) =>
          item.name.toLowerCase().includes(keyword),
        ),
      }));
    }

    return NextResponse.json({
      success: true,
      gameList: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت بازی‌ها",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (!["admin", "superadmin"].includes(session.user.role))
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const body = await req.json();
    const platform = normalizePlatform(body.platform);
    const name = body.name?.trim();

    if (!platform || !name) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }

    const updated = await GameList.findOneAndUpdate(
      { platform },
      { $push: { items: { name } } },
      { returnDocument: "after", upsert: true },
    );

    return NextResponse.json({
      message: "بازی جدید اضافه شد",
      item: updated?.items?.[updated.items.length - 1],
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (!["admin", "superadmin"].includes(session.user.role))
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const { platform, itemId, name } = await req.json();
    if (!platform || !itemId || !name) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }

    await GameList.findOneAndUpdate(
      { platform: normalizePlatform(platform), "items._id": itemId },
      {
        $set: {
          "items.$.name": name.trim(),
        },
      },
      { returnDocument: "after" },
    );

    return NextResponse.json({
      message: "بازی ویرایش شد.",
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (!["admin", "superadmin"].includes(session.user.role))
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const { platform, itemId } = await req.json();
    if (!platform || !itemId) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }

    await GameList.findOneAndUpdate(
      { platform: normalizePlatform(platform), "items._id": itemId },
      { $pull: { items: { _id: itemId } } },
      { returnDocument: "after" },
    );

    return NextResponse.json({
      message: "بازی حذف شد.",
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}
