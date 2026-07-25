import { GameItem, storeOrder } from "@/types";
import { useEffect, useMemo, useState } from "react";

interface GameDropdownProps {
  Selectedgames: storeOrder | null;
  setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
}

interface GameData {
  items: GameItem[];
}

const normalize = (value: string) => value.trim().toLowerCase();

const calcTotals = (list: GameItem[]) => {
  const totalSize = list.reduce((sum, item) => sum + (item.size || 0), 0);
  const totalPrice = list.reduce((sum, item) => sum + (item.price || 0), 0);

  return {
    totalSize,
    totalPrice,
  };
};

const GameDropdown: React.FC<GameDropdownProps> = ({
  Selectedgames,
  setSelectedgames,
}) => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<GameItem[]>([]);

  useEffect(() => {
    if (!Selectedgames?.consoleType) {
      setGames([]);
      return;
    }

    const controller = new AbortController();

    const getData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        params.set("platform", Selectedgames.consoleType);

        if (search.trim()) {
          params.set("search", search.trim());
          params.set("limit", "100");
        } else {
          params.set("limit", "5000");
        }

        const res = await fetch(
          `/api/admin/store-order/game-list?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          setGames([]);
          return;
        }

        const data = await res.json();

        const gameList = (data.gameList || []) as GameData[];

        const allGames = gameList.flatMap((item) => item.items || []);

        const uniqueGames = Array.from(
          new Map(
            allGames.map((game) => [game._id ?? normalize(game.name), game]),
          ).values(),
        );

        setGames(uniqueGames);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error(err);
          setGames([]);
        }
      } finally {
        setLoading(false);
      }
    };

    getData();

    return () => controller.abort();
  }, [search, Selectedgames?.consoleType]);

  const filteredGames = useMemo(() => {
    if (!search.trim()) return games;

    return games.filter((game) =>
      normalize(game.name).includes(normalize(search)),
    );
  }, [games, search]);

  return (
    <div className="relative">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جستجوی بازی"
        disabled={!Selectedgames?.consoleType}
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-indigo-100 focus:ring-4"
      />

      {!loading && search && filteredGames.length > 0 && (
        <div className="absolute top-11 z-20 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredGames.map((game) => (
            <button
              key={game._id}
              type="button"
              onClick={() => {
                setSelectedgames((prev) => {
                  if (!prev) return prev;

                  const exists = prev.list.some(
                    (item) =>
                      (item._id && game._id && item._id === game._id) ||
                      normalize(item.name) === normalize(game.name),
                  );

                  if (exists) return prev;

                  const newList = [...prev.list, game];
                  const { totalPrice, totalSize } = calcTotals(newList);

                  return {
                    ...prev,
                    list: newList,
                    totalPrice,
                    totalSize,
                    price: totalPrice,
                  };
                });

                setSearch("");
              }}
              className="w-full px-3 py-2 text-right hover:bg-slate-50"
            >
              {game.name}
              <span className="mr-2 text-xs text-gray-500">
                ({game.size} MB)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameDropdown;
