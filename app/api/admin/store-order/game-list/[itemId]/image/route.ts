import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import {
  deleteUnusedCloudinaryImages,
  uploadCloudinaryImage,
} from "@/lib/cloudinary";
import { normalizeGamePlatform, parseGameItemId } from "@/lib/gameListAdmin";
import dbConnect from "@/lib/mongodb";
import GameList from "@/model/GameList";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const authorize = async () => {
  const session = await getServerSession(authOptions);
  return Boolean(
    session?.user && ["admin", "superadmin"].includes(session.user.role),
  );
};

type Context = { params: { itemId: string } };

export async function POST(request: Request, { params }: Context) {
  if (!(await authorize())) {
    return NextResponse.json({ message: "دسترسی غیرمجاز" }, { status: 403 });
  }

  let uploadedUrl: string | null = null;
  try {
    const itemId = parseGameItemId(params.itemId);
    const formData = await request.formData();
    const platform = normalizeGamePlatform(formData.get("platform"));
    const file = formData.get("file");
    if (!platform) throw new Error("پلتفرم معتبر نیست.");
    if (!(file instanceof File)) throw new Error("فایل کاور ارسال نشده است.");
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("فرمت کاور باید JPG، PNG یا WebP باشد.");
    }
    if (!file.size || file.size > MAX_IMAGE_SIZE) {
      throw new Error("حجم کاور باید کمتر از ۵ مگابایت باشد.");
    }

    await dbConnect();
    const current = await GameList.findOne(
      { platform, "items._id": itemId },
      { "items.$": 1 },
    ).lean();
    const game = current?.items?.[0];
    if (!game) {
      return NextResponse.json({ message: "بازی پیدا نشد." }, { status: 404 });
    }

    const uploaded = await uploadCloudinaryImage(
      Buffer.from(await file.arrayBuffer()),
      { folder: "kermanatari/game-covers", publicId: `${itemId}-${randomUUID()}` },
    );
    uploadedUrl = uploaded.url;

    const result = await GameList.updateOne(
      { platform, "items._id": itemId },
      {
        $set: {
          "items.$.imageUrl": uploaded.url,
          "items.$.imagePublicId": uploaded.publicId,
          "items.$.imageAlt": game.name,
        },
      },
      { runValidators: true },
    );
    if (!result.modifiedCount) {
      await deleteUnusedCloudinaryImages([uploaded.url]);
      return NextResponse.json({ message: "کاور ذخیره نشد." }, { status: 409 });
    }

    if (game.imageUrl && game.imageUrl !== uploaded.url) {
      try {
        await deleteUnusedCloudinaryImages([game.imageUrl], {
          excludeGameItemId: itemId,
        });
      } catch (cleanupError) {
        console.error("Previous game cover cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json({
      success: true,
      message: "کاور ذخیره شد.",
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
    });
  } catch (error) {
    if (uploadedUrl) {
      try {
        await deleteUnusedCloudinaryImages([uploadedUrl]);
      } catch (cleanupError) {
        console.error("Uploaded game cover cleanup failed:", cleanupError);
      }
    }
    const message = error instanceof Error ? error.message : "آپلود کاور ناموفق بود.";
    const status = /فرمت|حجم|فایل|پلتفرم|شناسه/.test(message) ? 400 : 500;
    console.error("Game cover upload failed:", error);
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (!(await authorize())) {
    return NextResponse.json({ message: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const itemId = parseGameItemId(params.itemId);
    const { platform: rawPlatform } = await request.json();
    const platform = normalizeGamePlatform(rawPlatform);
    if (!platform) throw new Error("پلتفرم معتبر نیست.");

    await dbConnect();
    const current = await GameList.findOne(
      { platform, "items._id": itemId },
      { "items.$": 1 },
    ).lean();
    const game = current?.items?.[0];
    if (!game) {
      return NextResponse.json({ message: "بازی پیدا نشد." }, { status: 404 });
    }

    await GameList.updateOne(
      { platform, "items._id": itemId },
      {
        $set: {
          "items.$.imageUrl": null,
          "items.$.imagePublicId": null,
          "items.$.imageAlt": game.name,
        },
      },
    );
    if (game.imageUrl) {
      try {
        await deleteUnusedCloudinaryImages([game.imageUrl], {
          excludeGameItemId: itemId,
        });
      } catch (cleanupError) {
        console.error("Removed game cover cleanup failed:", cleanupError);
      }
    }
    return NextResponse.json({ success: true, message: "کاور حذف شد." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "حذف کاور ناموفق بود.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
