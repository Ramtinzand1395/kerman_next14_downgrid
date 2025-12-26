import { storeOrder } from "@/types";
import { useState, useEffect, useMemo } from "react";

interface GameDropdownProps {
  Selectedgames: storeOrder | null;
  setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
}

interface Game {
  name: string;
  // add other properties for a game if necessary
}

interface GameData {
  items: Game[];
}

const GameDropdown: React.FC<GameDropdownProps> = ({
  Selectedgames,
  setSelectedgames,
}) => {
  const [search, setSearch] = useState("");
  const [loading, setloading] = useState(false);

  const [GameData, setGameData] = useState<GameData>({ items: [] });

  useEffect(() => {
    setloading(true);
    const getdata = async () => {
      try {
        const res = await fetch(
          `/api/admin/store-order/game-list?consoleType=${Selectedgames?.consoleType}`
        );

        const data = await res.json();
        setGameData(data.gameList[0]);
      } catch (err) {
        console.log(err);
      } finally {
        setloading(false);
      }
    };
    getdata();
  }, [Selectedgames?.consoleType]);
  // Ensure items is always an array before calling filter
  const filteredGames = useMemo(() => {
    return GameData?.items?.filter((game) =>
      game.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, GameData]);
  return (
    <div className="relative max-w-52">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`جستجو ${Selectedgames?.consoleType}`}
        className="w-full p-2 border rounded-xl mt-1"
      />

      {loading
        ? // <Spiner />
          "loading"
        : search &&
          filteredGames?.length > 0 && (
            <div className="mt-2 space-y-1 absolute top-12 left-0 bg-white border shadow-md z-10 w-full max-h-60 overflow-auto">
              {filteredGames?.map((game, index) => (
                <div
                  key={index}
                  // onClick={() => {
                  //   {
                  //     setSelectedgames((prevOrder) => ({
                  //       ...prevOrder,
                  //       list: [...prevOrder.list, game.name],
                  //     }));
                  //     setSearch("");
                  //   }
                  // }}
                  onClick={() => {
                    if (!Selectedgames) return; // guard against null

                    setSelectedgames((prevOrder) => ({
                      ...prevOrder!,
                      list: [...prevOrder!.list, game.name],
                    }));
                    setSearch("");
                  }}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {game.name}
                </div>
              ))}
            </div>
          )}
    </div>
  );
};

export default GameDropdown;
