import dbConnect from "@/lib/mongodb";
import {
  parsePosDeviceName,
  parsePosScopes,
  requirePosSuperadmin,
} from "@/lib/pos/admin";
import { serializePosDevice } from "@/lib/pos/device";
import {
  generatePosDeviceId,
  generatePosToken,
  hashPosToken,
} from "@/lib/pos/token";
import PosDevice from "@/model/PosDevice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requirePosSuperadmin();
  if (!authorization.ok) return authorization.response;

  await dbConnect();
  const devices = await PosDevice.find({})
    .select("-tokenHash")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(
    { devices: devices.map((device) => serializePosDevice(device as never)) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const authorization = await requirePosSuperadmin();
  if (!authorization.ok) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  const input = body as { name?: unknown; scopes?: unknown };
  const name = parsePosDeviceName(input?.name);
  const scopes = parsePosScopes(input?.scopes);
  if (!name || !scopes) {
    return NextResponse.json(
      { error: { code: "INVALID_DEVICE_INPUT" } },
      { status: 400 },
    );
  }

  const rawToken = generatePosToken();
  await dbConnect();
  const device = await PosDevice.create({
    deviceId: generatePosDeviceId(),
    name,
    scopes,
    tokenHash: hashPosToken(rawToken),
    createdBy: authorization.userId,
  });

  return NextResponse.json(
    {
      device: serializePosDevice(device.toObject()),
      token: rawToken,
      tokenShownOnce: true,
    },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
