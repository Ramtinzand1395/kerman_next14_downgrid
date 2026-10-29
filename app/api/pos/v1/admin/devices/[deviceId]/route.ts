import dbConnect from "@/lib/mongodb";
import { requirePosSuperadmin } from "@/lib/pos/admin";
import { POS_DEVICE_ID_PATTERN } from "@/lib/pos/constants";
import { serializePosDevice } from "@/lib/pos/device";
import { generatePosToken, hashPosToken } from "@/lib/pos/token";
import PosDevice from "@/model/PosDevice";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { deviceId: string } },
) {
  const authorization = await requirePosSuperadmin();
  if (!authorization.ok) return authorization.response;

  const deviceId = params.deviceId;
  if (!POS_DEVICE_ID_PATTERN.test(deviceId)) {
    return NextResponse.json(
      { error: { code: "INVALID_DEVICE_ID" } },
      { status: 400 },
    );
  }

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  if (!['activate', 'deactivate', 'rotate'].includes(String(body.action))) {
    return NextResponse.json(
      { error: { code: "INVALID_DEVICE_ACTION" } },
      { status: 400 },
    );
  }

  await dbConnect();
  const device = await PosDevice.findOne({ deviceId });
  if (!device) {
    return NextResponse.json(
      { error: { code: "DEVICE_NOT_FOUND" } },
      { status: 404 },
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
    rawToken = generatePosToken();
    device.tokenHash = hashPosToken(rawToken);
    device.tokenVersion += 1;
    device.lastRotatedAt = new Date();
  }

  await device.save();

  return NextResponse.json(
    {
      device: serializePosDevice(device.toObject()),
      ...(rawToken ? { token: rawToken, tokenShownOnce: true } : {}),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
