import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePosSuperadmin } from "@/lib/pos/admin";
import dbConnect from "@/lib/mongodb";
import PosSale from "@/model/PosSale";
import PosDevice from "@/model/PosDevice";
import PosInventoryMovement from "@/model/PosInventoryMovement";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const reasons: Record<string, string> = {
  price_mismatch: "اختلاف قیمت صندوق و سایت",
  offline_delay: "ارسال با تأخیر / فروش آفلاین",
  catalog_state: "تغییر وضعیت محصول یا مدل",
};
const money = (value: number) => `${value.toLocaleString("fa-IR")} تومان`;
const date = (value: Date) => new Date(value).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });

export default async function PosSalesPage({ searchParams }: {
  searchParams: { page?: string; status?: string };
}) {
  // Authorize before any sales query, matching device/product administration.
  const authorization = await requirePosSuperadmin();
  if (!authorization.ok) {
    if (authorization.response.status === 401) redirect("/auth/login");
    return <p role="alert">دسترسی به فروش‌های صندوق فقط برای مدیر ارشد مجاز است.</p>;
  }
  const page = /^\d{1,5}$/.test(searchParams.page ?? "")
    ? Math.max(1, Math.min(10000, Number(searchParams.page))) : 1;
  const status = ["synced", "review_required"].includes(searchParams.status ?? "")
    ? searchParams.status! : "";
  await dbConnect();
  const rows = await PosSale.find(status ? { syncStatus: status } : {})
    .select("saleId siteSaleId invoiceNumber deviceId soldAtUtc syncedAtUtc finalAmountToman cashier items syncStatus reviewReasons")
    .sort({ soldAtUtc: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
  const sales = rows.slice(0, 20);
  const [devices, movements] = sales.length ? await Promise.all([
    PosDevice.find({ deviceId: { $in: sales.map((sale) => sale.deviceId) } }).select("deviceId name").lean(),
    PosInventoryMovement.find({ posSale: { $in: sales.map((sale) => sale._id) } })
      .select("posSale itemIndex quantityDelta itemStockBefore itemStockAfter parentStockBefore parentStockAfter inventoryVersionBefore inventoryVersionAfter recordedAtUtc")
      .sort({ itemIndex: 1 }).lean(),
  ]) : [[], []];
  const deviceNames = new Map(devices.map((device) => [device.deviceId, device.name]));
  const movementsBySale = new Map<string, typeof movements>();
  for (const movement of movements) {
    const key = String(movement.posSale);
    const group = movementsBySale.get(key) ?? [];
    group.push(movement);
    movementsBySale.set(key, group);
  }
  const href = (target: number) => `/dashboard/pos-sales?page=${target}${status ? `&status=${status}` : ""}`;

  return <section className="space-y-5" dir="rtl">
    <h1 className="text-2xl font-bold">فروش‌های صندوق</h1>
    <p>مشاهده فاکتورها و گردش موجودی؛ مبلغ‌ها به تومان و زمان‌ها به وقت تهران هستند.</p>
    <form className="flex flex-wrap gap-3" action="/dashboard/pos-sales">
      <label>وضعیت <select name="status" defaultValue={status} className="rounded border bg-slate-900 p-2">
        <option value="">همه</option><option value="synced">همگام‌شده</option>
        <option value="review_required">نیازمند بررسی</option>
      </select></label><button className="rounded bg-blue-600 px-4" type="submit">نمایش</button>
    </form>
    {!sales.length && <p>فاکتوری در این صفحه وجود ندارد.</p>}
    {sales.map((sale) => <article key={String(sale._id)} className="space-y-3 rounded-xl border border-slate-700 p-4">
      <h2 className="font-bold break-all" dir="ltr">{sale.invoiceNumber}</h2>
      <p>شناسه صندوق: <bdi>{sale.saleId}</bdi> | شناسه سایت: <bdi>{sale.siteSaleId}</bdi></p>
      <p>فروش: {date(sale.soldAtUtc)} | ثبت در سایت: {date(sale.syncedAtUtc)} | {money(sale.finalAmountToman)}</p>
      <p>دستگاه: {deviceNames.get(sale.deviceId) ?? sale.deviceId} (<bdi>{sale.deviceId}</bdi>) | صندوقدار: {sale.cashier?.name} (<bdi>{sale.cashier?.cashierId}</bdi>)</p>
      <p>وضعیت: {sale.syncStatus === "synced" ? "همگام‌شده (synced)" : "نیازمند بررسی (review_required)"}</p>
      {sale.reviewReasons?.length > 0 && <p>{sale.reviewReasons.map((reason: string) => reasons[reason] ?? reason).join("، ")}</p>}
      <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr>
        <th scope="col">محصول / مدل</th><th scope="col">تعداد</th><th scope="col">مبلغ ردیف</th><th scope="col">قیمت واحد سایت / صندوق پس از تخفیف</th>
      </tr></thead><tbody>{sale.items.map((item: any, index: number) => <tr key={index}>
        <td>{item.productName} {item.variantName ?? ""}<small className="block" dir="ltr">{String(item.productId)}{item.variantId ? ` / ${item.variantId}` : ""}</small></td>
        <td>{item.quantity}</td><td>{money(item.finalAmountToman)}</td>
        <td>{money(item.priceSnapshot.siteEffectivePriceToman)} / {money(item.priceSnapshot.posNetUnitPriceToman)}</td>
      </tr>)}</tbody></table></div>
      <details><summary className="cursor-pointer">گردش موجودی مرتبط</summary>
        {(movementsBySale.get(String(sale._id)) ?? []).map((movement) => <p key={String(movement._id)}>
          ردیف {movement.itemIndex + 1}: تغییر {movement.quantityDelta}؛ موجودی مدل {movement.itemStockBefore} ← {movement.itemStockAfter}؛ موجودی محصول {movement.parentStockBefore} ← {movement.parentStockAfter}؛ نسخه {movement.inventoryVersionBefore} ← {movement.inventoryVersionAfter}؛ {date(movement.recordedAtUtc)}
        </p>)}
      </details>
    </article>)}
    <nav className="flex gap-5" aria-label="صفحه‌بندی فروش‌های صندوق">
      {page > 1 && <Link href={href(page - 1)}>صفحه قبل</Link>}<span>صفحه {page}</span>
      {rows.length > 20 && page < 10000 && <Link href={href(page + 1)}>صفحه بعد</Link>}
    </nav>
  </section>;
}
