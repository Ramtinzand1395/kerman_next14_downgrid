import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { setNotificationHandled } from "@/lib/notifications/service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "شناسه اعلان نامعتبر است." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.handled !== "boolean") {
    return NextResponse.json({ error: "وضعیت رسیدگی نامعتبر است." }, { status: 400 });
  }
  const notification = await setNotificationHandled(id, session.user.id, body.handled);
  if (!notification) return NextResponse.json({ error: "اعلان پیدا نشد." }, { status: 404 });
  return NextResponse.json({ notification });
}
