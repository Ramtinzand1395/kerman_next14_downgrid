import type { Customer, storeOrder } from "@/types";
import { toPersianDate } from "@/helpers/toPersianDate";

const printableStorage = (value: unknown) => {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "";
};

export const buildPrintPayload = (
  userOrder: Pick<storeOrder, "list" | "totalSize" | "consoleType" | "createdAt" | "price" | "description">,
  customer: Partial<Pick<Customer, "name" | "lastName" | "mobile" | "description">> | null,
  timeZone?: string,
) => {
  const gamesList = Array.isArray(userOrder.list)
    ? userOrder.list.map((item) => ({
        name: item?.name || "بدون نام",
        sizeGB: item?.size ?? 0,
        price: item?.price ?? 0,
        storage: printableStorage(item?.storage),
      }))
    : [];

  const calculatedTotalSize =
    userOrder.totalSize ??
    gamesList.reduce((acc, game) => acc + game.sizeGB, 0);

  return {
    receiptType: userOrder.consoleType || "store_order",
    fullName: customer
      ? `${customer.name || ""} ${customer.lastName || ""}`.trim()
      : "مشتری متفرقه",
    mobile: customer?.mobile || "---",
    date: toPersianDate(userOrder.createdAt, timeZone) || new Date().toISOString(),
    games: gamesList,
    price: userOrder.price ?? 0,
    totalSizeGB: calculatedTotalSize,
    customerDescription: userOrder.description || customer?.description || "",
  };
};
