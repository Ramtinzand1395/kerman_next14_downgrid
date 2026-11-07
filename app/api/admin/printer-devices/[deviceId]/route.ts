import dbConnect from "@/lib/mongodb";
import { requirePrinterSuperadmin } from "@/lib/printer/admin";
import { PRINTER_DEVICE_ID_PATTERN } from "@/lib/printer/constants";
import { serializePrinterDevice } from "@/lib/printer/device";
import { generatePrinterToken, hashPrinterToken } from "@/lib/printer/token";
import PrinterDevice from "@/model/PrinterDevice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

export async function PATCH(
  request: Request,
  { params }: { params: { deviceId: string } },
) {
  const authorization = await requirePrinterSuperadmin();
  if (!authorization.ok) return authorization.response;

  if (!PRINTER_DEVICE_ID_PATTERN.test(params.deviceId)) {
    return NextResponse.json(
      { error: { code: "INVALID_PRINTER_DEVICE_ID" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400, headers: noStoreHeaders },
    );
  }
  if (!["activate", "deactivate", "rotate"].includes(String(body.action))) {
    return NextResponse.json(
      { error: { code: "INVALID_PRINTER_DEVICE_ACTION" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  await dbConnect();
  const device = await PrinterDevice.findOne({ deviceId: params.deviceId });
  if (!device) {
    return NextResponse.json(
      { error: { code: "PRINTER_DEVICE_NOT_FOUND" } },
      { status: 404, headers: noStoreHeaders },
    );
  }

  let rawToken: string | undefined;
  if (body.action === "activate") {
    device.isActive = true;
    device.deactivatedAt = null;
  } else if (body.action === "deactivate") {
    device.isActive = false;
    device.deactivatedAt = new Date();
  } else {
    rawToken = generatePrinterToken();
    device.tokenHash = hashPrinterToken(rawToken);
    device.tokenVersion += 1;
    device.lastRotatedAt = new Date();
  }
  await device.save();

  return NextResponse.json(
    {
      device: serializePrinterDevice(device.toObject()),
      ...(rawToken ? { token: rawToken, tokenShownOnce: true } : {}),
    },
    { headers: noStoreHeaders },
  );
}
