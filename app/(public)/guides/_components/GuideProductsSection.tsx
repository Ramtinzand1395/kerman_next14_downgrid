import { Skeleton } from "@/app/components/loading/LoadingSystem";
import { ps4BuyingGuide } from "@/lib/guides/ps4-buying-guide";
import { ps5BuyingGuide } from "@/lib/guides/ps5-buying-guide";
import { xboxBuyingGuide } from "@/lib/guides/xbox-buying-guide";
import { getPs4GuideProducts, getPs5GuideProducts, getXboxGuideProducts } from "@/lib/guides/related-products";
import GuideProducts from "./GuideProducts";

export function GuideProductsLoading() {
  return (
    <div role="status" aria-busy="true" className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 sm:p-7">
      <span className="sr-only">در حال دریافت محصولات پیشنهادی…</span>
      <div aria-hidden="true"><Skeleton className="h-8 w-64 rounded-lg" /><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="rounded-2xl border border-slate-100 p-3"><Skeleton className="aspect-square rounded-xl" /><Skeleton className="mt-3 h-5 w-4/5 rounded" /><Skeleton className="mt-4 h-11 rounded-xl" /></div>)}</div></div>
    </div>
  );
}

async function ProductsSection({ kind }: { kind: "ps4" | "ps5" | "xbox" }) {
  const config = kind === "ps4" ? ps4BuyingGuide : kind === "ps5" ? ps5BuyingGuide : xboxBuyingGuide;
  const result = kind === "ps4" ? await getPs4GuideProducts() : kind === "ps5" ? await getPs5GuideProducts() : await getXboxGuideProducts();
  return <GuideProducts result={result} productsHref={config.productHref} title={config.productsSectionTitle} emptyMessage={config.productsEmptyMessage} />;
}

export async function Ps4GuideProductsSection() { return <ProductsSection kind="ps4" />; }
export async function Ps5GuideProductsSection() { return <ProductsSection kind="ps5" />; }
export async function XboxGuideProductsSection() { return <ProductsSection kind="xbox" />; }
