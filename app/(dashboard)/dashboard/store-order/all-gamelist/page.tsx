"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Search } from "lucide-react";

import GameFormModal from "./AddGameListModal";
import GameListTable from "./GameListTable";

import { GameItem, GameList } from "@/types";

const LIMIT = 20;

const PLATFORM_OPTIONS = ["ps5", "ps5Copy", "ps4", "xbox", "copy"];

const platformLabel: Record<string, string> = {
  ps5: "PlayStation 5",

  ps5Copy: "PlayStation 5 کپی خور",

  ps4: "PlayStation 4",

  xbox: "Xbox",

  copy: "PlayStation 4 کپی خور",
};

export default function AllGameList() {
  const [platform, setPlatform] = useState("ps5");

  const [data, setData] = useState<GameList | null>(null);

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const [editGame, setEditGame] = useState<GameItem | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        platform,

        page: String(page),

        limit: String(LIMIT),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/admin/store-order/game-list?${params}`);

      const result = await res.json();

      setData(result.gameList);

      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [platform, page, search]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const changePlatform = (value: string) => {
    setPlatform(value);

    setPage(1);
  };

  return (
    <section
      className="
mx-3
rounded-3xl
bg-white
p-6
shadow-sm
"
    >
      {/* Header */}

      <div
        className="
flex
flex-col
gap-4
border-b
pb-5
md:flex-row
md:items-center
md:justify-between
"
      >
        <div>
          <h1
            className="
text-2xl
font-black
text-gray-800
"
          >
            مدیریت لیست بازی‌ها
          </h1>

          <p
            className="
mt-2
text-sm
text-gray-500
"
          >
            مدیریت قیمت، حجم و اطلاعات بازی‌ها
          </p>
        </div>

        <button
          onClick={() => {
            setEditGame(null);

            setOpenModal(true);
          }}
          className="
flex
items-center
justify-center
gap-2
rounded-xl
bg-emerald-600
px-5
py-3
font-bold
text-white
hover:bg-emerald-700
transition
"
        >
          <Plus size={18} />
          افزودن بازی
        </button>
      </div>

      {/* Platforms */}

      <div
        className="
mt-6
flex
flex-wrap
gap-3
"
      >
        {PLATFORM_OPTIONS.map((item) => (
          <button
            key={item}
            onClick={() => changePlatform(item)}
            className={`
rounded-xl
px-5
py-2
text-sm
font-bold
transition

${
  platform === item
    ? "bg-blue-600 text-white"
    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
}

`}
          >
            {platformLabel[item]}
          </button>
        ))}
      </div>

      {/* Search */}

      <div
        className="
mt-6
relative
"
      >
        <Search
          size={18}
          className="
absolute
right-4
top-3.5
text-gray-400
"
        />

        <input
          value={search}
          onChange={(e) => {
            setPage(1);

            setSearch(e.target.value);
          }}
          placeholder="
جستجو بین بازی‌ها...
"
          className="
h-12
w-full
rounded-xl
border
border-gray-200
pr-12
pl-4
outline-none
focus:ring-2
focus:ring-blue-500
"
        />
      </div>

      {loading && (
        <div
          className="
mt-6
text-center
text-gray-500
"
        >
          در حال دریافت اطلاعات...
        </div>
      )}

      {!loading && data && (
        <div
          className="
mt-6
overflow-hidden
rounded-2xl
border
"
        >
          <GameListTable
            title={platformLabel[data.platform]}
            platform={data.platform}
            list={data.items}
            onChanged={fetchGames}
            onEdit={(game) => {
              setEditGame(game);

              setOpenModal(true);
            }}
          />
        </div>
      )}

      {/* Pagination */}

      <div
        className="
mt-6
flex
items-center
justify-center
gap-4
"
      >
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="
rounded-xl
border
px-5
py-2
disabled:opacity-40
"
        >
          قبلی
        </button>

        <div
          className="
rounded-xl
bg-gray-100
px-5
py-2
font-bold
"
        >
          {page}/{totalPages}
        </div>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="
rounded-xl
border
px-5
py-2
disabled:opacity-40
"
        >
          بعدی
        </button>
      </div>

      {openModal && (
        <GameFormModal
          platform={platform}
          editGame={editGame}
          close={() => setOpenModal(false)}
          refresh={fetchGames}
        />
      )}
    </section>
  );
}
