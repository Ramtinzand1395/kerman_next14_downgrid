import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deliveries, gameSlots, seal } from "@/lib/game-account-delivery";

export const dynamic = "force-dynamic";
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin") redirect("/");
}
async function deliver(form: FormData) {
  "use server";
  await requireAdmin();
  const id = String(form.get("slot") || "");
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!/^[a-f0-9]{24}:[a-f0-9]{24}:\d+$/.test(id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 512) throw new Error("اطلاعات اکانت معتبر نیست.");
  const slots = await gameSlots(undefined, id.split(":")[0]);
  if (!slots.some(slot => slot.id === id)) throw new Error("این خرید قابل تحویل نیست.");
  await deliveries().updateOne({ _id: id }, { $set: { encrypted: seal(id, email, password) } }, { upsert: true });
  revalidatePath("/dashboard/orders/accounts");
}
export default async function AccountDelivery() {
  await requireAdmin();
  const slots = await gameSlots();
  const assigned = new Set((await deliveries().find({ _id: { $in: slots.map(slot => slot.id) } }).project<{ _id: string }>({ _id: 1 }).toArray()).map(row => row._id));
  return <main dir="rtl" className="space-y-4 p-4"><h1>تحویل اکانت بازی</h1>
    {!slots.length && <p>خرید بازی آنلاین برای تحویل وجود ندارد.</p>}
    {slots.map(slot => <form key={slot.id} action={deliver} className="space-y-2 rounded-xl border p-4">
      <h2>{slot.title}</h2><p>سفارش <bdi>{slot.id.split(":")[0]}</bdi> • نسخه {Number(slot.id.split(":")[2]) + 1}</p>
      <input type="hidden" name="slot" value={slot.id} />
      <label>ایمیل اکانت <input dir="ltr" name="email" type="email" required maxLength={254} /></label>
      <label>رمز اکانت <input dir="ltr" name="password" type="password" autoComplete="new-password" required maxLength={512} /></label>
      <button>{assigned.has(slot.id) ? "به‌روزرسانی اطلاعات تحویل‌شده" : "تحویل به خریدار"}</button>
    </form>)}
  </main>;
}
