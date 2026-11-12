export type InstallationGameRef = { platform: string; gameId: string };
export type InstallationGame = InstallationGameRef & {
  name: string;
  version: "PS4" | "PS5" | "Xbox";
  sizeGB: number | null;
  imageUrl: string;
  imageAlt: string;
};
export type GameCatalogItem = { _id: unknown; name: string; size?: number | null; imageUrl?: string; imageAlt?: string };
export type GameCatalogDocument<Item extends GameCatalogItem = GameCatalogItem> = {
  platform: string;
  items?: Item[];
};

export const MAX_INSTALLATION_GAMES = 100;
export const gameKey = (game: InstallationGameRef) => `${game.platform}:${game.gameId}`;

function normalizeGamePlatform(platform: string) {
  const key = platform.trim().toLowerCase();
  if (["copy", "ps4copy"].includes(key)) return "copy";
  if (key === "ps5copy") return "ps5Copy";
  return key;
}

export function installationPlatforms(device: string, installationType?: string | null): string[] {
  if (device === "xbox" && !installationType) return ["xbox"];
  if (device === "ps5" && installationType === "account") return ["ps5", "ps4"];
  if (device === "ps5" && installationType === "copy") return ["ps5Copy", "copy"];
  if (device === "ps4" && installationType === "account") return ["ps4"];
  if (device === "ps4" && installationType === "copy") return ["copy"];
  return [];
}

export function catalogPlatformAliases(platforms: string[]) {
  return platforms.flatMap((p) => p === "copy" ? ["copy", "ps4copy", "ps4Copy"] : p === "ps5Copy" ? ["ps5Copy", "ps5copy"] : [p]);
}

export function installationCatalog(docs: GameCatalogDocument[], platforms: string[]): InstallationGame[] {
  return mapInstallationCatalog(docs, platforms, (game) => game);
}

export function mapInstallationCatalog<Item extends GameCatalogItem, Game extends InstallationGame>(
  docs: GameCatalogDocument<Item>[],
  platforms: string[],
  project: (game: InstallationGame, item: Item) => Game,
): Game[] {
  const games = new Map<string, Game>();
  for (const doc of docs) {
    const platform = normalizeGamePlatform(doc.platform);
    if (!platforms.includes(platform)) continue;
    for (const item of doc.items || []) {
      // Legacy imports can contain unnamed placeholder rows. They are not games.
      if (!item || typeof item.name !== "string" || !item.name.trim()) continue;
      const game: InstallationGame = {
        platform, gameId: String(item._id), name: item.name,
        version: platform === "xbox" ? "Xbox" : platform.startsWith("ps5") ? "PS5" : "PS4",
        sizeGB: typeof item.size === "number" && Number.isFinite(item.size) && item.size >= 0 ? item.size : null,
        imageUrl: item.imageUrl || "", imageAlt: item.imageAlt || "",
      };
      games.set(gameKey(game), project(game, item));
    }
  }
  return [...games.values()].sort((a, b) => a.name.localeCompare(b.name) || gameKey(a).localeCompare(gameKey(b)));
}

export function installationCatalogPage<Game extends InstallationGame>(catalog: Game[], params: URLSearchParams) {
  const integer = (key: string, fallback: number, max: number) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value > 0 ? Math.min(value, max) : fallback;
  };
  const page = integer("page", 1, 10000);
  const limit = integer("limit", 24, 48);
  const search = (params.get("search") || "").trim().slice(0, 250).toLocaleLowerCase();
  const games = catalog.filter((game) => !search || game.name.toLocaleLowerCase().includes(search));

  return {
    games: games.slice((page - 1) * limit, page * limit),
    total: games.length,
    pages: Math.max(1, Math.ceil(games.length / limit)),
    page,
  };
}

export function resolveInstallationGames(refs: InstallationGameRef[], catalog: InstallationGame[]) {
  if (!refs.length || refs.length > MAX_INSTALLATION_GAMES) throw new Error("بین ۱ تا ۱۰۰ بازی انتخاب کنید.");
  const byKey = new Map(catalog.map((game) => [gameKey(game), game]));
  const seen = new Set<string>();
  return refs.map((ref) => {
    const key = gameKey(ref);
    const game = byKey.get(key);
    if (!game || seen.has(key)) throw new Error("بازی تکراری، حذف‌شده یا ناسازگار انتخاب شده است؛ فهرست بازی‌ها را دوباره بررسی کنید.");
    seen.add(key);
    return game;
  });
}

export function installationSize(games: InstallationGame[]) {
  return {
    totalSizeGB: Math.round(games.reduce((sum, game) => sum + (game.sizeGB ?? 0), 0) * 100) / 100,
    unknownSizeCount: games.filter((game) => game.sizeGB === null).length,
  };
}
