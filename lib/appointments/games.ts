export const MAX_APPOINTMENT_GAMES = 100;
export type GameSelection = { gameId: string; platform: string };
export type AppointmentGame = GameSelection & { name: string };
export type CatalogGame = AppointmentGame & { imageUrl?: string; imageAlt?: string; size?: number | null };

export function requiresInstallationType(device: string) {
  return device === "ps4" || device === "ps5";
}

export function installationGamePlatforms(device: string, installationType?: string | null): string[] {
  if (["xbox", "xbox-one", "xbox-series"].includes(device)) return ["xbox"];
  if (installationType !== "copy" && installationType !== "account") return [];
  if (device === "ps4") return installationType === "copy" ? ["copy"] : ["ps4"];
  if (device === "ps5") return installationType === "copy" ? ["ps5Copy", "copy"] : ["ps5", "ps4"];
  return [];
}

export function gameVersionLabel(platform: string) {
  if (platform === "ps4" || platform === "copy") return "نسخه PS4";
  if (platform === "ps5" || platform === "ps5Copy") return "نسخه PS5";
  return "Xbox";
}

export function gameSelectionKey(game: GameSelection) {
  return `${game.platform}:${game.gameId}`;
}

export function validateGameSelections(selections: GameSelection[], platforms: string[], catalog: AppointmentGame[]) {
  if (!selections.length || selections.length > MAX_APPOINTMENT_GAMES) return null;
  const available = new Map(catalog.map(game => [gameSelectionKey(game), game]));
  const keys = new Set<string>();
  const result: AppointmentGame[] = [];
  for (const selection of selections) {
    const key = gameSelectionKey(selection);
    const game = available.get(key);
    if (!platforms.includes(selection.platform) || keys.has(key) || !game) return null;
    keys.add(key);
    result.push({ gameId: game.gameId, platform: game.platform, name: game.name });
  }
  return result;
}
