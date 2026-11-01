import { NextResponse } from "next/server";
import { requireUser } from "@/lib/loyalty/api";
import GameList from "@/model/GameList";
import { catalogPlatformAliases, installationCatalog, installationPlatforms, type GameCatalogDocument } from "@/lib/appointments/games";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const params = new URL(req.url).searchParams;
  const platforms = installationPlatforms(params.get("device") || "", params.get("installationType"));
  if (!platforms.length) return NextResponse.json({ error: "دستگاه یا نوع نصب نامعتبر است." }, { status: 422 });
  const integer = (key: string, fallback: number, max: number) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value > 0 ? Math.min(value, max) : fallback;
  };
  const page = integer("page", 1, 10000);
  const limit = integer("limit", 24, 48);
  const search = (params.get("search") || "").trim().slice(0, 250).toLocaleLowerCase();
  try {
    const docs = await GameList.find({ platform: { $in: catalogPlatformAliases(platforms) } })
      .select("platform items._id items.name items.size items.imageUrl items.imageAlt").lean() as GameCatalogDocument[];
    const games = installationCatalog(docs, platforms).filter((game) => !search || game.name.toLocaleLowerCase().includes(search));
    return NextResponse.json({ games: games.slice((page - 1) * limit, page * limit), total: games.length, pages: Math.max(1, Math.ceil(games.length / limit)), page });
  } catch (error) {
    console.error("Installation catalog failed", error);
    return NextResponse.json({ error: "فهرست بازی‌ها دریافت نشد؛ دوباره تلاش کنید." }, { status: 500 });
  }
}
