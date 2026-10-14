import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import {
  ReportRangeError,
  resolveReportRange,
} from "@/lib/dashboard-date-range";
import {
  loadAppointmentsSection,
  loadCommerceSection,
  loadLoyaltySection,
  loadManualOrdersSection,
  loadOperationsSection,
  loadOverviewSection,
  serializeReportMeta,
} from "@/lib/dashboard-report";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

type SectionResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

async function settleSection<T>(name: string, promise: Promise<T>): Promise<SectionResult<T>> {
  try {
    return { status: "ok", data: await promise };
  } catch (error) {
    console.error(`[dashboard-report] ${name} failed`, error);
    return { status: "error", error: "دریافت این بخش از گزارش ناموفق بود." };
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let range;
  try {
    range = resolveReportRange({
      range: searchParams.get("range"),
      start: searchParams.get("start"),
      end: searchParams.get("end"),
    });
  } catch (error) {
    if (error instanceof ReportRangeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }

  try {
    await dbConnect();
    const [overview, commerce, manualOrders, appointments, operations, loyalty] = await Promise.all([
      settleSection("overview", loadOverviewSection(range)),
      settleSection("commerce", loadCommerceSection(range)),
      settleSection("manualOrders", loadManualOrdersSection(range)),
      settleSection("appointments", loadAppointmentsSection(range)),
      settleSection("operations", loadOperationsSection()),
      settleSection("loyalty", loadLoyaltySection(range)),
    ]);

    return NextResponse.json(
      {
        meta: serializeReportMeta(range),
        sections: { overview, commerce, manualOrders, appointments, operations, loyalty },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[dashboard-report] connection failed", error);
    return NextResponse.json(
      { error: "اتصال به منبع دادهٔ گزارش ناموفق بود." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
