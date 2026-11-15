export type InstallationGameRef = { platform: string; gameId: string };
export type InstallationGame = InstallationGameRef & {
  name: string;
  version: "PS4" | "PS5" | "Xbox";
  sizeGB: number | null;
  price?: number | null;
  imageUrl: string;
  imageAlt: string;
};
export type GameCatalogDocument = {
  platform: string;
  items?: Array<{ _id: unknown; name: string; size?: number | null; price?: number | null; imageUrl?: string; imageAlt?: string }>;
};

export const MAX_INSTALLATION_GAMES = 100;
export const INSTALLATION_GAME_FIELDS = "platform items._id items.name items.size items.price items.imageUrl items.imageAlt";
export const gameKey = (game: InstallationGameRef) => `${game.platform}:${game.gameId}`;

export function isCopyCourierInstallation(order: {
  fulfillment?: string | null; serviceType?: string | null; device?: string; installationType?: string | null;
}) {
  return order.fulfillment === "courier" && order.serviceType === "game_install" &&
    order.installationType === "copy" && (order.device === "ps4" || order.device === "ps5");
}

function isGamePrice(price: number | null | undefined): price is number {
  return typeof price === "number" && Number.isSafeInteger(price) && price >= 0;
}

export function installationGameTotal(games: readonly { price?: number | null }[]) {
  if (!games.length) return null;
  let total = 0;
  for (const game of games) {
    if (!isGamePrice(game.price)) return null;
    total += game.price;
  }
  return Number.isSafeInteger(total) ? total : null;
}

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

export function installationCatalog(docs: GameCatalogDocument[], platforms: string[], includePrices = true): InstallationGame[] {
  const games = new Map<string, InstallationGame>();
  for (const doc of docs) {
    const platform = normalizeGamePlatform(doc.platform);
    if (!platforms.includes(platform)) continue;
    const priced = includePrices && (platform === "copy" || platform === "ps5Copy");
    for (const item of doc.items || []) {
      // Legacy imports can contain unnamed placeholder rows. They are not games.
      if (!item || typeof item.name !== "string" || !item.name.trim()) continue;
      const game: InstallationGame = {
        platform, gameId: String(item._id), name: item.name,
        version: platform === "xbox" ? "Xbox" : platform.startsWith("ps5") ? "PS5" : "PS4",
        sizeGB: typeof item.size === "number" && Number.isFinite(item.size) && item.size >= 0 ? item.size : null,
        ...(priced && { price: isGamePrice(item.price) ? item.price : null }),
        imageUrl: item.imageUrl || "", imageAlt: item.imageAlt || "",
      };
      games.set(gameKey(game), game);
    }
  }
  return [...games.values()].sort((a, b) => a.name.localeCompare(b.name) || gameKey(a).localeCompare(gameKey(b)));
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
