import { NextRequest, NextResponse } from "next/server";

import GameList from "@/model/GameList";

import dbConnect from "@/lib/mongodb";

import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";

const normalizePlatform = (value?: string | null) => {
  if (!value) return "";

  const map: Record<string, string> = {
    ps5: "ps5",

    ps5copy: "ps5Copy",

    ps5Copy: "ps5Copy",

    ps4: "ps4",

    xbox: "xbox",

    copy: "copy",
  };

  return map[value.trim()] || value.trim();
};

async function checkAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) return false;

  return ["admin", "superadmin"].includes(session.user.role);
}

// =========================
// GET
// =========================

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const platform = normalizePlatform(searchParams.get("platform"));

    const search = searchParams.get("search")?.trim() || "";

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.max(Number(searchParams.get("limit")) || 20, 1);

    if (!platform) {
      return NextResponse.json(
        {
          message: "platform required",
        },
        {
          status: 400,
        },
      );
    }

    const data = await GameList.findOne({
      platform,
    }).lean();

    if (!data) {
      return NextResponse.json({
        success: true,

        gameList: {
          platform,
          items: [],
        },

        pagination: {
          page,

          limit,

          totalItems: 0,

          totalPages: 0,
        },
      });
    }

    let items: any[] = data.items || [];

    if (search) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const totalItems = items.length;

    const totalPages = Math.ceil(totalItems / limit);

    const result = items.slice(
      (page - 1) * limit,

      page * limit,
    );

    return NextResponse.json({
      success: true,

      gameList: {
        platform: data.platform,

        items: result,
      },

      pagination: {
        page,

        limit,

        totalItems,

        totalPages,
      },
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        message: "خطا در دریافت اطلاعات",
      },
      {
        status: 500,
      },
    );
  }
}

// =========================
// POST
// =========================

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json(
      {
        message: "دسترسی غیرمجاز",
      },
      {
        status: 403,
      },
    );
  }

  try {
    await dbConnect();

    const body = await req.json();

    const platform = normalizePlatform(body.platform);

    if (!platform || !body.name) {
      return NextResponse.json(
        {
          message: "اطلاعات ناقص است",
        },
        {
          status: 400,
        },
      );
    }

    const item = {
      name: body.name.trim(),

      size: body.size ? Number(body.size) : null,

      price: body.price ? Number(body.price) : null,

      storage: body.storage || null,
    };

    const updated = await GameList.findOneAndUpdate(
      {
        platform,
      },

      {
        $push: {
          items: item,
        },
      },

      {
        upsert: true,

        new: true,
      },
    );

    return NextResponse.json({
      success: true,

      message: "بازی اضافه شد",

      item: updated.items.at(-1),
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        message: "server error",
      },
      {
        status: 500,
      },
    );
  }
}

// =========================
// PUT
// =========================

export async function PUT(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json(
      {
        message: "دسترسی غیرمجاز",
      },
      {
        status: 403,
      },
    );
  }

  try {
    await dbConnect();

    const body = await req.json();

    const updated = await GameList.findOneAndUpdate(
      {
        platform: normalizePlatform(body.platform),

        "items._id": body.itemId,
      },

      {
        $set: {
          "items.$.name": body.name.trim(),

          "items.$.size": body.size ? Number(body.size) : null,

          "items.$.price": body.price ? Number(body.price) : null,

          "items.$.storage": body.storage || null,
        },
      },

      {
        new: true,
      },
    );

    if (!updated) {
      return NextResponse.json(
        {
          message: "بازی پیدا نشد",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message: "ویرایش شد",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        message: "server error",
      },
      {
        status: 500,
      },
    );
  }
}

// =========================
// DELETE
// =========================

export async function DELETE(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json(
      {
        message: "دسترسی غیرمجاز",
      },
      {
        status: 403,
      },
    );
  }

  try {
    await dbConnect();

    const body = await req.json();

    await GameList.findOneAndUpdate(
      {
        platform: normalizePlatform(body.platform),
      },

      {
        $pull: {
          items: {
            _id: body.itemId,
          },
        },
      },
    );

    return NextResponse.json({
      success: true,

      message: "حذف شد",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        message: "server error",
      },
      {
        status: 500,
      },
    );
  }
}
