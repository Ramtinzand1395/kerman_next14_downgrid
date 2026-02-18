// import { storeOrder } from "@/types";
// import { useEffect, useMemo, useState } from "react";

// interface GameDropdownProps {
//   Selectedgames: storeOrder | null;
//   setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
// }

// interface Game {
//   name: string;
// }

// interface GameData {
//   items: Game[];
// }

// const GameDropdown: React.FC<GameDropdownProps> = ({
//   Selectedgames,
//   setSelectedgames,
// }) => {
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [gameData, setGameData] = useState<GameData>({ items: [] });

//   useEffect(() => {
//     if (!Selectedgames?.consoleType) {
//       setGameData({ items: [] });
//       return;
//     }

//     const getData = async () => {
//       setLoading(true);
//       try {
//         const res = await fetch(
//           `/api/admin/store-order/game-list?consoleType=${Selectedgames.consoleType}`,
//         );

//         const data = await res.json();
//         setGameData(data.gameList?.[0] || { items: [] });
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     getData();
//   }, [Selectedgames?.consoleType]);

//   const filteredGames = useMemo(() => {
//     const list = gameData?.items || [];
//     return list.filter((game) =>
//       game.name.toLowerCase().includes(search.toLowerCase()),
//     );
//   }, [search, gameData]);

//   return (
//     <div className="relative">
//       <input
//         type="search"
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         placeholder={
//           Selectedgames?.consoleType ? "جستجوی بازی" : "ابتدا دستگاه را انتخاب کنید"
//         }
//         disabled={!Selectedgames?.consoleType}
//         className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-indigo-100 focus:ring-4 disabled:bg-slate-100"
//       />

//       {!loading && search && filteredGames.length > 0 && (
//         <div className="absolute top-11 z-20 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
//           {filteredGames.map((game) => (
//             <button
//               key={game.name}
//               type="button"
//               onClick={() => {
//                 setSelectedgames((prevOrder) => {
//                   if (!prevOrder) return prevOrder;
//                   if (prevOrder.list.includes(game.name)) return prevOrder;

//                   return {
//                     ...prevOrder,
//                     list: [...prevOrder.list, game.name],
//                   };
//                 });
//                 setSearch("");
//               }}
//               className="w-full px-3 py-2 text-right text-sm hover:bg-slate-50"
//             >
//               {game.name}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default GameDropdown;

import { storeOrder } from "@/types";
import { useEffect, useMemo, useState } from "react";

interface GameDropdownProps {
  Selectedgames: storeOrder | null;
  setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
}

interface Game {
  name: string;
}

interface GameData {
  platform: string;
  items: Game[];
}

const GameDropdown: React.FC<GameDropdownProps> = ({
  Selectedgames,
  setSelectedgames,
}) => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "5000" });

        if (Selectedgames?.consoleType) {
          params.set("platform", Selectedgames.consoleType);
        }

        const res = await fetch(
          `/api/admin/store-order/game-list?${params}`
        );

        const data = await res.json();
        const gameList = (data.gameList || []) as GameData[];

        const allGames = gameList.flatMap(
          (game) => game.items || []
        );

        const uniqueGames = Array.from(
          new Map(allGames.map((game) => [game.name, game])).values()
        );

        setGames(uniqueGames);
      } catch (err) {
        console.error(err);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [Selectedgames?.consoleType]);

  const filteredGames = useMemo(() => {
    return games.filter((game) =>
      game.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, games]);

  return (
    <div className="relative">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={
          Selectedgames?.consoleType
            ? "جستجوی بازی همان دستگاه"
            : "جستجو در همه بازی‌ها"
        }
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-indigo-100 focus:ring-4 disabled:bg-slate-100"
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
