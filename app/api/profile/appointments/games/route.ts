import { NextResponse } from "next/server";
import { requireUser } from "@/lib/loyalty/api";
import GameList from "@/model/GameList";
import { catalogPlatformAliases, installationCatalog, installationCatalogPage, installationPlatforms, type GameCatalogDocument } from "@/lib/appointments/games";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const params = new URL(req.url).searchParams;
  const platforms = installationPlatforms(params.get("device") || "", params.get("installationType"));
  if (!platforms.length) return NextResponse.json({ error: "دستگاه یا نوع نصب نامعتبر است." }, { status: 422 });
  try {
    const docs = await GameList.find({ platform: { $in: catalogPlatformAliases(platforms) } })
      .select("platform items._id items.name items.size items.imageUrl items.imageAlt").lean() as GameCatalogDocument[];
    return NextResponse.json(installationCatalogPage(installationCatalog(docs, platforms), params));
  } catch (error) {
    console.error("Installation catalog failed", error);
    return NextResponse.json({ error: "فهرست بازی‌ها دریافت نشد؛ دوباره تلاش کنید." }, { status: 500 });
  }
}
