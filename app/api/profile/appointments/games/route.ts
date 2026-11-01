import { NextResponse } from "next/server";
import GameList from "@/model/GameList";
import { requireUser } from "@/lib/loyalty/api";
import { installationGamePlatforms } from "@/lib/appointments/games";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const params = new URL(req.url).searchParams;
  const platforms = installationGamePlatforms(params.get("device") || "", params.get("installationType"));
  if (!platforms.length) return NextResponse.json({ error: "دستگاه و نوع نصب را انتخاب کنید." }, { status: 422 });
  const page = Math.max(1, Number(params.get("page")) || 1);
  if (!Number.isSafeInteger(page)) return NextResponse.json({ error: "صفحه نامعتبر است." }, { status: 422 });
  const search = (params.get("search") || "").trim().slice(0, 250).toLowerCase();
  try {
    const docs = await GameList.find({ platform: { $in: platforms } }).select("platform items._id items.name items.imageUrl items.imageAlt items.size").lean();
    const games = docs.flatMap(doc => doc.items.map((item: { _id: unknown; name: string; imageUrl?: string; imageAlt?: string; size?: number }) => ({
      gameId: String(item._id), platform: doc.platform as string, name: item.name,
      imageUrl: item.imageUrl || "", imageAlt: item.imageAlt || item.name, size: item.size,
    }))).filter(game => game.name.toLowerCase().includes(search));
    games.sort((a, b) => platforms.indexOf(a.platform) - platforms.indexOf(b.platform) || a.name.localeCompare(b.name));
    const limit = 24;
    return NextResponse.json({ items: games.slice((page - 1) * limit, page * limit), page, pages: Math.max(1, Math.ceil(games.length / limit)), total: games.length });
  } catch {
    return NextResponse.json({ error: "فهرست بازی‌ها دریافت نشد؛ دوباره تلاش کنید." }, { status: 500 });
  }
}
