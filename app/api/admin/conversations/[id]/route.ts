import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getConversation, updateConversation } from "@/lib/notifications/conversations";

async function adminActor() {
  const session = await getServerSession(authOptions);
  return session?.user?.id && session.user.role === "superadmin"
    ? { id: session.user.id, role: session.user.role }
    : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await adminActor();
  if (!actor) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const result = await getConversation(id, actor);
  if (!result) return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await adminActor();
  if (!actor) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  try {
    const conversation = await updateConversation(id, actor, { status: body.status, orderId: body.orderId });
    if (!conversation) return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 });
    return NextResponse.json({ conversation });
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "ORDER_NOT_OWNED";
    return NextResponse.json({ error: forbidden ? "سفارش متعلق به این مشتری نیست." : "درخواست معتبر نیست." }, { status: forbidden ? 403 : 400 });
  }
}
