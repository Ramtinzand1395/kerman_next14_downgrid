import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import GameList from "@/model/GameList";
import dbConnect from "@/lib/mongodb";
import { gameInput, gameUpdateInput, gameItemId, gamePlatform } from "@/lib/game-list-validation";
import {
  catalogPlatformAliases,
  installationCatalogPage,
  installationPlatforms,
  mapInstallationCatalog,
  type GameCatalogDocument,
  type GameCatalogItem,
} from "@/lib/appointments/games";
import type { GameItem } from "@/types";

type StoreOrderCatalogItem = GameCatalogItem & { price?: number | null; storage?: string };

async function authorized() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user && ["admin", "superadmin"].includes(session.user.role));
}
const forbidden = () => NextResponse.json({ message: "دسترسی غیرمجاز" }, { status: 403 });
const invalid = (message = "اطلاعات بازی معتبر نیست") => NextResponse.json({ message }, { status: 400 });

async function getInstallationGames(params: URLSearchParams) {
  const platforms = installationPlatforms(params.get("device") || "", params.get("installationType"));
  if (!platforms.length) return invalid("دستگاه یا نوع نصب نامعتبر است.");

  try {
    await dbConnect();
    const docs = await GameList.find({ platform: { $in: catalogPlatformAliases(platforms) } })
      .select("platform items._id items.name items.size items.imageUrl items.imageAlt items.price items.storage")
      .lean() as GameCatalogDocument<StoreOrderCatalogItem>[];
    const catalog = mapInstallationCatalog(docs, platforms, (game, item) => ({
      ...game,
      item: {
        _id: game.gameId,
        name: game.name,
        size: game.sizeGB ?? 0,
        imageUrl: game.imageUrl,
        imageAlt: game.imageAlt,
        price: item.price ?? 0,
        storage: item.storage,
      } satisfies GameItem,
    }));
    const page = installationCatalogPage(catalog, params);

    return NextResponse.json({
      ...page,
      games: page.games.map(({ version, sizeGB, item }) => ({ version, sizeGB, item })),
    });
  } catch (error) {
    console.error("Store order installation catalog failed", error);
    return NextResponse.json({ message: "فهرست بازی‌ها دریافت نشد" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorized())) return forbidden();
  const params = req.nextUrl.searchParams;
  if (params.get("catalog") === "installation") return getInstallationGames(params);

  const platform = gamePlatform.safeParse(params.get("platform"));
  if (!platform.success) return invalid("پلتفرم معتبر انتخاب کنید");
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 5000) return invalid();
  try {
    await dbConnect();
    const data = await GameList.findOne({ platform: platform.data }).lean();
    const search = (params.get("search") || "").trim().toLowerCase();
    const items = (data?.items || []).filter((item: { name: string }) => !search || item.name.toLowerCase().includes(search));
    return NextResponse.json({ success: true, gameList: { platform: platform.data, items: items.slice((page - 1) * limit, page * limit) }, pagination: { page, limit, totalItems: items.length, totalPages: Math.ceil(items.length / limit) } });
  } catch (error) {
    console.error("Game list read failed", error);
    return NextResponse.json({ message: "فهرست بازی‌ها دریافت نشد" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorized())) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = gameInput.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { platform, ...item } = parsed.data;
  if (!item.imageUrl && (item.imageAlt || item.imagePublicId)) return invalid("ابتدا آدرس کاور را وارد کنید");
  try {
    await dbConnect();
    const updated = await GameList.findOneAndUpdate({ platform }, { $push: { items: item } }, { upsert: true, returnDocument: "after", runValidators: true });
    return NextResponse.json({ success: true, message: "بازی اضافه شد", item: updated.items.at(-1) }, { status: 201 });
  } catch (error) {
    console.error("Game creation failed", error);
    return NextResponse.json({ message: "بازی ذخیره نشد" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await authorized())) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = gameUpdateInput.safeParse(body);
  const id = gameItemId.safeParse(body?.itemId);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  if (!id.success) return invalid("شناسه بازی معتبر نیست");
  const { platform, ...item } = parsed.data;
  if (item.imageUrl === "") { item.imageAlt = ""; item.imagePublicId = ""; }
  const fields = Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined).map(([key, value]) => [`items.$.${key}`, value]));
  try {
    await dbConnect();
    const updated = await GameList.findOneAndUpdate({ platform, "items._id": id.data }, { $set: fields }, { returnDocument: "after", runValidators: true });
    if (!updated) return NextResponse.json({ message: "بازی پیدا نشد" }, { status: 404 });
    return NextResponse.json({ success: true, message: "ویرایش شد", item: updated.items.id(id.data) });
  } catch (error) {
    console.error("Game update failed", error);
    return NextResponse.json({ message: "تغییرات بازی ذخیره نشد" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await authorized())) return forbidden();
  const body = await req.json().catch(() => null);
  const platform = gamePlatform.safeParse(body?.platform);
  const id = gameItemId.safeParse(body?.itemId);
  if (!platform.success || !id.success) return invalid();
  try {
    await dbConnect();
    const result = await GameList.updateOne({ platform: platform.data, "items._id": id.data }, { $pull: { items: { _id: id.data } } });
    if (!result.modifiedCount) return NextResponse.json({ message: "بازی پیدا نشد" }, { status: 404 });
    // Covers may be shared between platforms. Removing a record never destroys the asset.
    return NextResponse.json({ success: true, message: "حذف شد" });
  } catch (error) {
    console.error("Game deletion failed", error);
    return NextResponse.json({ message: "بازی حذف نشد" }, { status: 500 });
  }
}
