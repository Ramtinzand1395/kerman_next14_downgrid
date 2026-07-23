"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import AddGameListModal from "./AddGameListModal";
import GameListTable from "./GameListTable";
import { GameList } from "@/types";

const LIMIT = 20;
const PLATFORM_OPTIONS = ["all", "ps5", "ps5Copy", "ps4", "xbox", "copy"];

const platformLabel: Record<string, string> = {
  all: "همه پلتفرم‌ها",
  ps5: "PS5",
  ps5Copy: "پلی استیشن 5 کپی خور",
  ps4: "PS4",
  copy: "پلی استیشن 4 کپی خور",
  xbox: "Xbox",
};

export default function AllGameList() {
  const [loading, setLoading] = useState(false);
  const [gameList, setGameList] = useState<GameList[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");

  // pagination per platform
  const [pageMap, setPageMap] = useState<Record<string, number>>({});
  const [totalPagesMap, setTotalPagesMap] = useState<Record<string, number>>(
    {},
  );

  const fetchGameLists = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ limit: String(LIMIT) });
      if (selectedPlatform !== "all") params.set("platform", selectedPlatform);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/store-order/game-list?${params}`);
      if (!res.ok) throw new Error("خطا در دریافت لیست بازی‌ها");

      const data = await res.json();
      setGameList(data.gameList || []);
      setTotalPagesMap(data.totalPages || {});

      const initialPages: Record<string, number> = {};
      (data.gameList || []).forEach((platformData: GameList) => {
        initialPages[platformData.platform] = 1;
      });
      setPageMap(initialPages);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedPlatform]);

  useEffect(() => {
    fetchGameLists();
  }, [fetchGameLists]);

  const handlePageChange = async (platform: string, newPage: number) => {
    if (newPage < 1 || newPage > (totalPagesMap[platform] || 1)) return;

    try {
      setLoading(true);

      const params = new URLSearchParams({
        platform,
        page: String(newPage),
        limit: String(LIMIT),
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/store-order/game-list?${params}`);
      if (!res.ok) throw new Error("خطا در صفحه‌بندی");

      const data = await res.json();
      const updatedItems = data.gameList?.[0]?.items || [];

      setGameList((prev) =>
        prev.map((list) =>
          list.platform === platform ? { ...list, items: updatedItems } : list,
        ),
      );

      setPageMap((prev) => ({ ...prev, [platform]: newPage }));
      setTotalPagesMap((prev) => ({ ...prev, ...data.totalPages }));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const hasData = useMemo(() => gameList.length > 0, [gameList]);

  return (
    <section className="mx-2 rounded-2xl bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-800">
            مدیریت لیست بازی‌ها
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            بازی‌ها را بر اساس پلتفرم مدیریت، جستجو و صفحه‌بندی کنید.
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Plus size={16} /> افزودن بازی
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بین نام بازی‌ها..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pr-10 pl-3 text-sm outline-none ring-emerald-500 transition focus:ring"
          />
        </div>

        <select
          title="filter-platform"
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none ring-emerald-500 transition focus:ring"
        >
          {PLATFORM_OPTIONS.map((platform) => (
            <option key={platform} value={platform}>
              {platformLabel[platform]}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="mt-6 text-sm text-gray-500">در حال دریافت اطلاعات...</p>
      )}

      {!loading && !hasData && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          نتیجه‌ای پیدا نشد.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {gameList.map((list) => (
          <div
            key={list.platform}
            className="rounded-2xl border border-gray-100 bg-gray-50/40 p-3"
          >
            <GameListTable
              title={platformLabel[list.platform] || list.platform}
              platform={list.platform}
              list={list.items}
              onChanged={fetchGameLists}
            />

            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={(pageMap[list.platform] || 1) <= 1}
                onClick={() =>
                  handlePageChange(
                    list.platform,
                    (pageMap[list.platform] || 1) - 1,
                  )
                }
              >
                قبلی
              </button>

              <span className="rounded-lg bg-white px-3 py-1 text-xs text-gray-600">
                {pageMap[list.platform] || 1} /{" "}
                {totalPagesMap[list.platform] || 1}
              </span>

              <button
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  (pageMap[list.platform] || 1) >=
                  (totalPagesMap[list.platform] || 1)
                }
                onClick={() =>
                  handlePageChange(
                    list.platform,
                    (pageMap[list.platform] || 1) + 1,
                  )
                }
              >
                بعدی
              </button>
            </div>
          </div>
        ))}
      </div>

      {openModal && (
        <AddGameListModal
          setOpenModal={setOpenModal}
          onAdded={fetchGameLists}
        />
      )}
    </section>
  );
}
