import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import { ReportRangeError, resolveReportRange } from "@/lib/dashboard-date-range";
import { loadCommerceSection, serializeReportMeta } from "@/lib/dashboard-report";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const range = resolveReportRange({
      range: searchParams.get("range"),
      start: searchParams.get("start"),
      end: searchParams.get("end"),
    });
    await dbConnect();
    const report = await loadCommerceSection(range);
    return NextResponse.json(
      {
        meta: serializeReportMeta(range),
        totals: report.totals,
        data: report.points.map((point) => ({
          label: point.label,
          startInclusive: point.startInclusive,
          endExclusive: point.endExclusive,
          value: point.grossPaidAmount,
          refundedAmount: point.refundedAmount,
          netValue: point.netPaidAmount,
          orderCount: point.ordersCreated,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof ReportRangeError ? 400 : 500;
    const message = error instanceof Error ? error.message : "خطا در گزارش مبلغ سفارش‌ها";
    return NextResponse.json({ error: message }, { status });
  }
}
