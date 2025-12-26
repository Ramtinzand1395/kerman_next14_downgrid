import { NextResponse } from "next/server";

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
        printerId: 74910088, 
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
