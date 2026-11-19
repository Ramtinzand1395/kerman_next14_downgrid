import type { storeOrder } from "@/types";
import type { AppointmentItem } from "@/types/appointments";
import { gameKey, isCopyCourierInstallation } from "./games";

type AppointmentDetails = Pick<AppointmentItem,
  "device" | "installationType" | "serviceType" | "fulfillment" | "description" | "selectedGames" | "totalSizeGB"
>;

export function websiteOrderDetails(appointment: AppointmentDetails): Pick<storeOrder, "consoleType" | "list" | "description" | "totalSize"> {
  const { device, installationType } = appointment;
  const catalogPricing = isCopyCourierInstallation(appointment);
  let consoleType: storeOrder["consoleType"] = "";
  if (device === "ps5") consoleType = installationType === "copy" ? "ps5Copy" : "ps5";
  if (device === "ps4") consoleType = installationType === "copy" ? "copy" : "ps4";
  if (device === "xbox") consoleType = "xbox";

  return {
    consoleType,
    description: appointment.description || "",
    totalSize: appointment.totalSizeGB,
    list: (appointment.selectedGames ?? []).map((game) => ({
      _id: gameKey(game),
      name: game.name,
      size: game.sizeGB ?? undefined,
      price: catalogPricing ? game.price ?? undefined : undefined,
      imageUrl: game.imageUrl,
      imageAlt: game.imageAlt,
      appointmentGame: { platform: game.platform, gameId: game.gameId },
    })),
  };
}
