import dbConnect from "@/lib/mongodb";
import {
  parsePrinterDeviceName,
  parsePrinterScopes,
  requirePrinterSuperadmin,
} from "@/lib/printer/admin";
import { serializePrinterDevice } from "@/lib/printer/device";
import {
  generatePrinterDeviceId,
  generatePrinterToken,
  hashPrinterToken,
} from "@/lib/printer/token";
import PrinterDevice from "@/model/PrinterDevice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

export async function GET() {
  const authorization = await requirePrinterSuperadmin();
  if (!authorization.ok) return authorization.response;

  await dbConnect();
  const devices = await PrinterDevice.find({})
    .select("-tokenHash")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(
    { devices: devices.map((device) => serializePrinterDevice(device as never)) },
    { headers: noStoreHeaders },
  );
}

export async function POST(request: Request) {
  const authorization = await requirePrinterSuperadmin();
  if (!authorization.ok) return authorization.response;

  let body: { name?: unknown; scopes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const name = parsePrinterDeviceName(body.name);
  const scopes = parsePrinterScopes(body.scopes);
  if (!name || !scopes) {
    return NextResponse.json(
      { error: { code: "INVALID_PRINTER_DEVICE_INPUT" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const rawToken = generatePrinterToken();
  await dbConnect();
  const device = await PrinterDevice.create({
    deviceId: generatePrinterDeviceId(),
    name,
    scopes,
    tokenHash: hashPrinterToken(rawToken),
    createdBy: authorization.userId,
  });

  return NextResponse.json(
    {
      device: serializePrinterDevice(device.toObject()),
      token: rawToken,
      tokenShownOnce: true,
    },
    { status: 201, headers: noStoreHeaders },
  );
}
