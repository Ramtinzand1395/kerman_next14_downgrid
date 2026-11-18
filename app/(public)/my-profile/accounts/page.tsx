import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";
import { deliveries, gameSlots, openDelivery } from "@/lib/game-account-delivery";

export const dynamic = "force-dynamic";
export default async function MyAccounts() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/my-profile");
  const slots = await gameSlots(session.user.id);
  const records = await deliveries().find({ _id: { $in: slots.map(slot => slot.id) } }).toArray();
  const accounts = new Map(records.map(record => [record._id, openDelivery(record)]));
  return <main dir="rtl" className="mx-auto max-w-2xl space-y-4 p-5">
    <h1 className="text-xl font-bold">اکانت‌های من</h1>
    {!slots.length && <p>هنوز بازی آنلاین خریداری نکرده‌اید.</p>}
    {slots.map(slot => {
      const account = accounts.get(slot.id);
      return <article className="rounded-xl border p-4" key={slot.id}><h2>{slot.title}</h2>
        {account ? <details><summary>نمایش اطلاعات اکانت</summary><p>ایمیل <bdi>{account.email}</bdi></p><p>رمز عبور <bdi>{account.password}</bdi></p></details> : <p>در انتظار تحویل اکانت</p>}
      </article>;
    })}
  </main>;
}
