import Image from "next/image";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";

import TabSection from "./TabSection";
import { Product } from "@/types";

async function getProduct(slug: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/products/${slug}`, {
    cache: "no-store",
  });
  return res.json();
}

async function getRelatedProducts(id: number) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/products/related/${id}`,
    {
      cache: "no-store",
    }
  );
  return res.json();
}
export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const { relatedProducts } = await getRelatedProducts(product.id);

  if (product.error)
    return (
      <div className="p-10 text-center text-red-500 font-semibold">
        {product.error}
      </div>
    );

  return (
    <div className="md:container md:mx-auto mx-2">
      {/* Product Top Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 p-6 lg:p-8">
          {/* Right: Gallery (In RTL this is Right visually) */}
          <div className="lg:col-span-5 order-1">
            <ProductGallery
              productId={product.id}
              mainImage={product.mainImage}
              images={product.images}
              title={product.title}
            />
          </div>

          {/* Left: Info */}
          <div className="lg:col-span-7 order-2 lg:border-r lg:border-gray-100 lg:pr-8 pt-6 lg:pt-0">
            <ProductInfo product={product} />
          </div>
        </div>
      </div>
      {/* Tabs / Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Column */}
        <TabSection product={product} />

        {/* Sidebar / Recommendations */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">
              محصولات مشابه
            </h3>

            <div className="space-y-4">
              {relatedProducts.length === 0 && (
                <p className="text-xs text-gray-500">محصول مشابهی یافت نشد.</p>
              )}

              {relatedProducts.map((item: Product) => (
                <div
                  key={item.id}
                  className="group flex gap-3 items-start cursor-pointer"
                >
                  {/* Image */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <Image
                      width={200}
                      height={200}
                      src={item.mainImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>

                  {/* Info */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 leading-5 group-hover:text-red-500 transition-colors line-clamp-2">
                      {item.title}
                    </h4>

                    <div className="mt-2 text-left">
                      <span className="text-xs font-bold text-gray-900">
                        {item.discountPrice || item.price}
                      </span>
                      <span className="text-[10px] text-gray-400 mr-1">
                        تومان
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
