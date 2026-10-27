import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getConversation, updateConversation } from "@/lib/notifications/conversations";

async function actor() {
  const session = await getServerSession(authOptions);
  return session?.user?.id && session.user.role === "user"
    ? { id: session.user.id, role: session.user.role }
    : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await actor();
  if (!current) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const result = await getConversation(id, current);
  if (!result) return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await actor();
  if (!current) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  try {
    const conversation = await updateConversation(id, current, { status: body.status, orderId: body.orderId });
    if (!conversation) return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 });
    return NextResponse.json({ conversation });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    return NextResponse.json({ error: code === "ORDER_NOT_OWNED" ? "سفارش متعلق به این گفتگو نیست." : "درخواست معتبر نیست." }, { status: code === "ORDER_NOT_OWNED" ? 403 : 400 });
  }
}
