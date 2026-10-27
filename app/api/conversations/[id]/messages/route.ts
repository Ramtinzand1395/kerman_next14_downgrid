import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { addConversationMessage } from "@/lib/notifications/conversations";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "user") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  try {
    const message = await addConversationMessage(id, { id: session.user.id, role: session.user.role }, body.message);
    if (!message) return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const closed = error instanceof Error && error.message === "CONVERSATION_CLOSED";
    return NextResponse.json({ error: closed ? "این گفتگو بسته شده است." : "متن پیام معتبر نیست." }, { status: closed ? 409 : 400 });
  }
}
