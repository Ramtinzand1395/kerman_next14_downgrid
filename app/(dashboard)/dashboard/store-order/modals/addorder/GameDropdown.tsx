import GameCover from "@/app/components/games/GameCover";
import { GameItem, storeOrder } from "@/types";
import type { AppointmentItem } from "@/types/appointments";
import { gameKey, type InstallationGame } from "@/lib/appointments/games";
import { useEffect, useMemo, useState } from "react";

interface GameDropdownProps {
  appointment?: AppointmentItem;
  useInstallationCatalog?: boolean;
  Selectedgames: storeOrder | null;
  setSelectedgames: React.Dispatch<React.SetStateAction<storeOrder | null>>;
}

type GameResult = {
  item: GameItem;
  version?: InstallationGame["version"];
  sizeGB?: number | null;
};

const installationSelection = {
  ps5: { device: "ps5", installationType: "account" },
  ps4: { device: "ps4", installationType: "account" },
  ps5Copy: { device: "ps5", installationType: "copy" },
  copy: { device: "ps4", installationType: "copy" },
  xbox: { device: "xbox" },
};

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
  appointment,
  useInstallationCatalog = false,
  Selectedgames,
  setSelectedgames,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const consoleType = Selectedgames?.consoleType;
  const query = search.trim();

  useEffect(() => {
    setResults([]);
    setError(false);
    if (!consoleType || ((appointment || useInstallationCatalog) && !query)) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const getData = async () => {
      try {
        const endpoint = "/api/admin/store-order/game-list";
        const legacyParams = new URLSearchParams({ platform: consoleType, limit: query ? "100" : "5000" });
        if (query) legacyParams.set("search", query);

        let catalogUrl = `${endpoint}?${legacyParams}`;
        if (appointment) {
          catalogUrl = `/api/profile/appointments/games?${new URLSearchParams({
            device: appointment.device,
            installationType: appointment.installationType || "",
            search: query,
            limit: "48",
          })}`;
        } else if (useInstallationCatalog) {
          const params = new URLSearchParams({
            ...installationSelection[consoleType],
            catalog: "installation",
            search: query,
            page: String(page),
          });
          catalogUrl = `${endpoint}?${params}`;
        }

        const res = await fetch(catalogUrl, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("فهرست بازی‌ها دریافت نشد");
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (useInstallationCatalog && !appointment) {
          setResults(data.games);
          setPages(data.pages);
          return;
        }

        const gameList = data.gameList as GameData | undefined;
        const allGames = appointment ? (data.games as InstallationGame[]).map((game) => ({
          _id: gameKey(game),
          name: game.name,
          size: game.sizeGB ?? undefined,
          imageUrl: game.imageUrl,
          imageAlt: game.imageAlt,
          appointmentGame: { platform: game.platform, gameId: game.gameId },
        })) : gameList?.items ?? [];
        const uniqueGames = new Map(
          allGames.map((game) => [game._id ?? normalize(game.name), game]),
        );
        setResults(Array.from(uniqueGames.values(), (item) => ({ item })));
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const timer = useInstallationCatalog ? setTimeout(getData, 250) : undefined;
    if (!useInstallationCatalog) void getData();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [appointment, consoleType, page, query, useInstallationCatalog]);

  const filteredResults = useMemo(() => {
    if (useInstallationCatalog || !query) return results;
    return results.filter(({ item }) => normalize(item.name).includes(normalize(query)));
  }, [results, query, useInstallationCatalog]);

  function changeSearch(value: string) {
    if (useInstallationCatalog && (value.trim() !== query || page !== 1)) {
      setResults([]);
      setError(false);
      setLoading(Boolean(value.trim()));
    }
    setSearch(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setResults([]);
    setError(false);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={search}
        onChange={(e) => changeSearch(e.target.value)}
        maxLength={useInstallationCatalog ? 250 : undefined}
        placeholder="جستجوی بازی"
        disabled={!Selectedgames?.consoleType}
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-indigo-100 focus:ring-4"
      />

      {query && (filteredResults.length > 0 || useInstallationCatalog) && (
        <div className="absolute top-11 z-20 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {useInstallationCatalog && (loading || error || filteredResults.length === 0) && (
            <p role="status" className="px-3 py-2 text-slate-500">
              {loading ? "در حال جست‌وجو…" : error ? "فهرست بازی‌ها دریافت نشد." : "بازی‌ای با این نام پیدا نشد."}
            </p>
          )}
          {!loading && filteredResults.length > 0 && (
            <div className="max-h-56 overflow-auto">
              {filteredResults.map(({ item: game, version, sizeGB }) => (
                <button
                  key={game._id}
                  type="button"
                  onClick={() => {
                    setSelectedgames((prev) => {
                      if (!prev) return prev;

                      const exists = prev.list.some(
                        (item) =>
                          (item._id && game._id && item._id === game._id) ||
                          (!appointment && !useInstallationCatalog && normalize(item.name) === normalize(game.name)),
                      );

                      if (exists) return prev;

                      const newList = [...prev.list, game];
                      const { totalPrice, totalSize } = calcTotals(newList);

                      return {
                        ...prev,
                        list: newList,
                        totalPrice,
                        totalSize,
                        price: appointment ? prev.price : totalPrice,
                      };
                    });

                    changeSearch("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-slate-50"
                >
                  <GameCover game={game} />
                  <span dir="auto">{game.name}{game.appointmentGame && ` · ${game.appointmentGame.platform}`}</span>
                  {version && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold">{version}</span>}
                  <span className="mr-2 text-xs text-gray-500">
                    {sizeGB === null ? "حجم نامشخص" : `(${game.size} GB)`}
                  </span>
                </button>
              ))}
            </div>
          )}
          {useInstallationCatalog && !loading && !error && pages > 1 && (
            <nav aria-label="صفحه‌بندی بازی‌ها" className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs">
              <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="min-h-9 disabled:opacity-40">قبلی</button>
              <span>صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>
              <button type="button" disabled={page >= pages} onClick={() => changePage(page + 1)} className="min-h-9 disabled:opacity-40">بعدی</button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
};

export default GameDropdown;
