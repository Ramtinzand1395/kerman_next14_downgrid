import { storeOrder } from "@/types";
import { useEffect, useMemo, useState } from "react";

interface GameDropdownProps {
  Selectedgames: storeOrder | null;
  setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
}

interface Game {
  platform: string;
  name: string;
}

interface GameData {
  items: Game[];
}
const normalize = (value: string) => value.trim().toLowerCase();
const GameDropdown: React.FC<GameDropdownProps> = ({
  Selectedgames,
  setSelectedgames,
}) => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const getData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();

    
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

        const allGames = gameList.flatMap((game) => game.items || []);
        const uniqueGames = Array.from(
          new Map(
            allGames.map((game) => [normalize(game.name), game]),
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
  }, [ search]);

  const filteredGames = useMemo(() => {
    if (!search.trim()) return games;

    return games.filter((game) =>
      normalize(game.name).includes(normalize(search)),
    );
  }, [search, games]);

  return (
    <div className="relative">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      placeholder="جستجو در همه بازی‌ها"
        disabled={!Selectedgames?.consoleType}
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-indigo-100 focus:ring-4"
      />

      {!loading && search && filteredGames.length > 0 && (
        <div className="absolute top-11 z-20 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredGames.map((game) => (
            <button
              key={game.name}
              type="button"
              onClick={() => {
                setSelectedgames((prevOrder) => {
                  if (!prevOrder) return prevOrder;
                  if (prevOrder.list.includes(game.name)) return prevOrder;

                  return {
                    ...prevOrder,
                    list: [...prevOrder.list, game.name],
                  };
                });
                setSearch("");
              }}
              className="w-full px-3 py-2 text-right text-sm hover:bg-slate-50"
            >
              {game.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameDropdown;
