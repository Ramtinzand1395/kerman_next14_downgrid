import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
 import { authOptions } from "@/app/api/auth/[...nextauth]/options";
const PRINTNODE_BASE = "https://api.printnode.com";

const getAuthHeader = () => {
  const apiKey = process.env.printernode;
  if (!apiKey) throw new Error("API_KEY تعریف نشده");

  return {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
  };
};

/* ===================== POST : Print PDF ===================== */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
 if (!session?.user)
   return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
 if (!["admin", "superadmin"].includes(session.user.role))
   return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
 
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "فایل ارسال نشده" },
        { status: 400 }
      );
    }

    // File → base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Content = buffer.toString("base64");

    const res = await fetch(`${PRINTNODE_BASE}/printjobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        printerId: 75151896, 
        title: "Ticket Print",
        contentType: "pdf_base64",
        content: base64Content,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Print Error:", err.message);

    return NextResponse.json(
      {
        error: "خطا در ارسال فایل PDF",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

// todo
// این کامتن پاک نشه برای دریافت پرینتر ها برو به ادرس 
// http://localhost:3000/api/admin/store-order/print


export const runtime = "nodejs";

const getAuthHeader2 = () => {
  const apiKey = process.env.printernode;
  if (!apiKey) throw new Error("PRINTNODE_API_KEY (یا printernode) تعریف نشده");

  return {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
  };
};

export async function GET() {
  try {
    const res = await fetch(`${PRINTNODE_BASE}/printers`, {
      method: "GET",
      headers: { ...getAuthHeader2() },
      cache: "no-store",
    });

    const raw = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "خطا از PrintNode", details: raw },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, printers: JSON.parse(raw) });
  } catch (err: any) {
    // مهم: علت دقیق خطا (DNS / TLS / Timeout / ...)
    const cause = err?.cause
      ? {
          name: err.cause.name,
          code: err.cause.code,
          message: err.cause.message,
          errno: err.cause.errno,
          syscall: err.cause.syscall,
          address: err.cause.address,
          port: err.cause.port,
        }
      : null;

    return NextResponse.json(
      {
        success: false,
        error: "خطا در گرفتن لیست پرینترها",
        details: err?.message || String(err),
        cause,
      },
      { status: 500 }
    );
  }
}