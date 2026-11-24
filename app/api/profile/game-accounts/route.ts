import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getCustomerGameAccounts } from "@/lib/game-account-delivery";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "برای مشاهده اکانت‌ها وارد حساب کاربری شوید." },
        { status: 401, headers },
      );
    }

    return NextResponse.json(await getCustomerGameAccounts(session.user.id), { headers });
  } catch {
    return NextResponse.json(
      { error: "دریافت اکانت‌ها ممکن نشد. دوباره تلاش کنید." },
      { status: 500, headers },
    );
  }
}
