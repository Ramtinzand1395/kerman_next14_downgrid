import { formatPrice } from "@/helpers/Price";
import type { OrderMoneySummary } from "@/lib/orderSummary";

export default function OrderMoneySummaryView({
  summary,
  shippingLabel,
  shippingNote,
  compact = false,
}: {
  summary: OrderMoneySummary;
  shippingLabel?: string | null;
  shippingNote?: string | null;
  compact?: boolean;
}) {
  const rows = [
    ["جمع قیمت اصلی کالاها", summary.originalItemsTotal, "default"],
    ["تخفیف کالاها", summary.productDiscount, "discount"],
    ["تخفیف کوپن", summary.couponDiscount, "discount"],
  ] as const;

  return (
    <div className={compact ? "text-sm" : "text-sm md:text-base"}>
      <dl className="space-y-3">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">{label}</dt>
            <dd
              className={
                tone === "discount"
                  ? "font-bold text-emerald-700"
                  : "font-semibold text-slate-900"
              }
            >
              {formatPrice(value)} تومان
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">هزینه ارسال</dt>
          <dd className="font-semibold text-slate-900">
            {shippingLabel || `${formatPrice(summary.shippingCost)} تومان`}
          </dd>
        </div>
      </dl>

      {shippingNote && (
        <p className="mt-2 text-xs leading-6 text-amber-700">{shippingNote}</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <span className="font-black text-slate-900">مبلغ کل قابل پرداخت در سایت</span>
        <span className="text-lg font-black text-blue-800">
          {formatPrice(summary.payable)} تومان
        </span>
      </div>
    </div>
  );
}
