import { NextRequest, NextResponse } from "next/server";
import GameList from "@/model/GameList";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

type GameListDoc = {
  platform: string;
  items: {
    _id: string;
    name: string;
    size?: number;
  }[];
};

const normalizePlatform = (value: string | null) => {
  if (!value) return "";
  const platform = value.trim().toLowerCase();
  return platform === "ps5copy" ? "ps5Copy" : platform;
};

const filterItems = (items: GameListDoc["items"], search: string) => {
  if (!search) return items;
  return items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "20", 10), 1);
    const platform = normalizePlatform(searchParams.get("platform"));
    const search = (searchParams.get("search") || "").trim();

    const query = platform ? { platform } : {};
    const docs = (await GameList.find(query).lean()) as GameListDoc[];

    const gameList = docs.map((doc) => {
      const filteredItems = filterItems(doc.items || [], search);
      const start = (page - 1) * limit;
      const paginatedItems = filteredItems.slice(start, start + limit);

      return {
        _id: (doc as { _id?: string })._id,
        platform: doc.platform,
        items: paginatedItems,
      };
    });

    const totalPages = docs.reduce<Record<string, number>>((acc, doc) => {
      const filteredItems = filterItems(doc.items || [], search);
      acc[doc.platform] = Math.max(Math.ceil(filteredItems.length / limit), 1);
      return acc;
    }, {});

    return NextResponse.json({ gameList, totalPages, currentPage: page });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}
