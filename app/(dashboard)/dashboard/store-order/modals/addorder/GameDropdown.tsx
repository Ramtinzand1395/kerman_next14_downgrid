// import { storeOrder } from "@/types";
// import { useEffect, useMemo, useState } from "react";

// interface GameDropdownProps {
//   Selectedgames: storeOrder | null;
//   setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
// }

// interface Game {
//   platform: string;
//   name: string;
//   size: number;
//   price: number;
// }

// interface GameData {
//   items: Game[];
// }
// const normalize = (value: string) => value.trim().toLowerCase();
// const GameDropdown: React.FC<GameDropdownProps> = ({
//   Selectedgames,
//   setSelectedgames,
// }) => {
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [games, setGames] = useState<Game[]>([]);

//   useEffect(() => {
//     const controller = new AbortController();

//     const getData = async () => {
//       setLoading(true);
//       try {
//         const params = new URLSearchParams();

//         if (search.trim()) {
//           params.set("search", search.trim());
//           params.set("limit", "100");
//         } else {
//           params.set("limit", "5000");
//         }

//         const res = await fetch(
//           `/api/admin/store-order/game-list?${params.toString()}`,
//           {
//             signal: controller.signal,
//           },
//         );

//         if (!res.ok) {
//           setGames([]);
//           return;
//         }
//         const data = await res.json();
//         const gameList = (data.gameList || []) as GameData[];

//         const allGames = gameList.flatMap((game) => game.items || []);
//         const uniqueGames = Array.from(
//           new Map(
//             allGames.map((game) => [normalize(game.name), game]),
//           ).values(),
//         );

//         setGames(uniqueGames);
//       } catch (err) {
//         if ((err as Error).name !== "AbortError") {
//           console.error(err);
//           setGames([]);
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     getData();
//     return () => controller.abort();
//   }, [search]);

//   const filteredGames = useMemo(() => {
//     if (!search.trim()) return games;

//     return games.filter((game) =>
//       normalize(game.name).includes(normalize(search)),
//     );
//   }, [search, games]);

//   return (
//     <div className="relative">
//       <input
//         type="search"
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         placeholder="جستجو در همه بازی‌ها"
//         disabled={!Selectedgames?.consoleType}
//         className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-indigo-100 focus:ring-4"
//       />

//       {!loading && search && filteredGames.length > 0 && (
//         <div className="absolute top-11 z-20 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
//           {filteredGames.map((game) => (
//             <button
//               key={game.name}
//               type="button"
//               onClick={() => {
//                 // setSelectedgames((prevOrder) => {
//                 //   if (!prevOrder) return prevOrder;
//                 //   if (prevOrder.list.includes(game.name)) return prevOrder;

//                 //   return {
//                 //     ...prevOrder,
//                 //     list: [...prevOrder.list, game],
//                 //   };
//                 // });
//                 setSelectedgames((prevOrder) => {
//                   if (!prevOrder) return prevOrder;

//                   const alreadyExists = prevOrder.list.some(
//                     (item) =>
//                       item.name.trim().toLowerCase() ===
//                       game.name.trim().toLowerCase(),
//                   );

//                   if (alreadyExists) return prevOrder;

//                   const updatedList = [...prevOrder.list, game];

//                   return {
//                     ...prevOrder,
//                     list: updatedList,
//                     totalSize: updatedList.reduce(
//                       (sum, item) => sum + (item.size || 0),
//                       0,
//                     ),
//                     totalPrice: updatedList.reduce(
//                       (sum, item) => sum + (item.price || 0),
//                       0,
//                     ),
//                   };
//                 });

//                 setSearch("");
//               }}
//               className="w-full px-3 py-2 text-right text-sm hover:bg-slate-50"
//             >
//               {game.name}{" "}
//               <span className="text-xs text-gray-500">( {game.size} mb )</span>
//             </button>
//           ))}
//         </div>
//       )}
//       {/* {console.log(order)} */}
//     </div>
//   );
// };

// export default GameDropdown;

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
            allGames.map((game) => [
              game._id ?? normalize(game.name),
              game,
            ]),
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
  }, [search]);

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
              key={game._id ?? game.name}
              type="button"
              onClick={() => {
                setSelectedgames((prevOrder) => {
                  if (!prevOrder) return prevOrder;

                  const alreadyExists = prevOrder.list.some(
                    (item) =>
                      (item._id && game._id && item._id === game._id) ||
                      normalize(item.name) === normalize(game.name),
                  );

                  if (alreadyExists) return prevOrder;

                  const newList = [...prevOrder.list, game];
                  const { totalSize, totalPrice } = calcTotals(newList);

                  return {
                    ...prevOrder,
                    list: newList,
                    totalSize,
                    totalPrice,
                    price: totalPrice,
                  };
                });

                setSearch("");
              }}
              className="w-full px-3 py-2 text-right text-sm hover:bg-slate-50"
            >
              <span>{game.name}</span>{" "}
              <span className="text-xs text-gray-500">
                ({(game.size || 0).toLocaleString("en-US")} MB)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameDropdown;
