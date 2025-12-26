import { NextRequest, NextResponse } from "next/server";
import GameList from "@/model/GameList";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET /api/game-list/:consoleType
// export async function GET(req: NextRequest) {
//   const session = await getServerSession(authOptions);
//   if (!session?.user)
//     return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

//   if (session.user.role !== "superadmin")
//     return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
//   await dbConnect();
//   try {
//     const gameList = await GameList.find();

//     return NextResponse.json(gameList);
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ message: "server error" }, { status: 500 });
//   }
// }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  if (session.user.role !== "superadmin")
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const gameList = await GameList.aggregate([
      {
        $project: {
          platform: 1,
          items: { $slice: ["$items", (page - 1) * limit, limit] },
        },
      },
    ]);

    // برای کل صفحات، می‌توان تعداد آیتم‌ها را جداگانه گرفت
    const counts = await GameList.aggregate([
      { $project: { platform: 1, totalItems: { $size: "$items" } } },
    ]);

    const totalPages = counts.map((c) => Math.ceil(c.totalItems / limit));

    return NextResponse.json({ gameList, totalPages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  if (session.user.role !== "superadmin")
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const { platform, name } = await req.json();
    if (!platform || !name) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }

    // بررسی اینکه platform موجود هست یا نه
    const existingPlatform = await GameList.findOne({ platform });

    const newItem = { name }; // MongoDB خودش _id میده

    // اضافه کردن بازی جدید به آرایه items
    existingPlatform.items.push(newItem);
    await existingPlatform.save();

    return NextResponse.json({
      message: "بازی جدید اضافه شد",
      item: newItem,
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

  if (session.user.role !== "superadmin")
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const { platform, itemId, name } = await req.json();
    if (!platform || !itemId || !name) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }

    await GameList.findOneAndUpdate(
      { platform, "items._id": itemId },
      {
        $set: {
          "items.$.name": name,
        },
      },
      { new: true }
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

  if (session.user.role !== "superadmin")
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  await dbConnect();

  try {
    const { platform, itemId } = await req.json();
    if (!platform || !itemId) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }

    await GameList.findOneAndUpdate(
      { platform, "items._id": itemId },
      { $pull: { items: { _id: itemId } } },
      { new: true }
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
