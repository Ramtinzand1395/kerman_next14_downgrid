import Link from "next/link";
import { ArrowLeft, ChevronLeft, PackageSearch } from "lucide-react";
import ProductImage from "@/app/components/ProductImage";
import Motion from "../../components/Motion";
import type { GuideProductsResult } from "@/lib/guides/related-products";

export default function GuideProducts({
  result,
  productsHref,
  title,
  emptyMessage,
}: {
  result: GuideProductsResult;
  productsHref: string;
  title: string;
  emptyMessage: string;
}) {
  return (
    <Motion distance={12} duration={0.4}>
      <section
        aria-labelledby="related-products-heading"
        className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_16px_45px_rgba(19,68,138,0.07)] sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-blue-600">از راهنما تا انتخاب واقعی</p>
            <h2 id="related-products-heading" className="mt-1 text-2xl font-black text-[#0a265b] sm:text-[28px]">
              {title}
            </h2>
          </div>
          <Link href={productsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            مشاهده همه <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {result.status === "error" ? (
          <div className="mt-5 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 text-center">
            <PackageSearch className="h-7 w-7 text-amber-600" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-amber-900">دریافت محصولات فعلاً ممکن نیست؛ متن راهنما همچنان کامل در دسترس است.</p>
          </div>
        ) : result.products.length === 0 ? (
          <div className="mt-5 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 text-center">
            <PackageSearch className="h-7 w-7 text-blue-600" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-slate-700">{emptyMessage}</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {result.products.map((product) => (
              <article key={product.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_8px_24px_rgba(20,67,134,0.06)]">
                <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-[#f5f8fd] focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <ProductImage
                    src={product.image}
                    alt={product.imageAlt}
                    width={420}
                    height={420}
                    loading="lazy"
                    sizes="(max-width: 639px) 44vw, (max-width: 1023px) 24vw, 280px"
                    className="h-full w-full object-contain p-3"
                  />
                </Link>
                <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-900 sm:text-base">
                  {product.title}
                </h3>
                <div className="mt-3 flex flex-1 flex-col justify-end">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-black text-[#0b4aa8] sm:text-base">{product.price.toLocaleString("fa-IR")} تومان</span>
                    {product.originalPrice && <span className="text-xs text-slate-400 line-through">{product.originalPrice.toLocaleString("fa-IR")}</span>}
                  </div>
                  <span className={`mt-2 w-fit rounded-full px-2.5 py-1 text-xs font-black ${product.inStock ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {product.inStock ? "موجود" : "ناموجود"}
                  </span>
                  <Link href={`/product/${product.slug}`} className="mt-3 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-blue-200 text-sm font-black text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    مشاهده محصول <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Motion>
  );
}
