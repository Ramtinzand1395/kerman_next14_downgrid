import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";

import TabSection from "./TabSection";
import type { Product } from "@/types";

type ProductResponse = Product & {
  id?: number;
  error?: string;
};

async function getProduct(slug: string): Promise<ProductResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`,
    {
      next: {
        revalidate: 300,
      },
    },
  );

  if (!res.ok) {
    return { error: "محصول موردنظر پیدا نشد" } as ProductResponse;
  }

  return res.json();
}

async function getRelatedProducts(
  id?: number,
): Promise<{ relatedProducts: Product[] }> {
  if (!id) {
    return { relatedProducts: [] };
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/related/${id}`,
    {
      next: {
        revalidate: 300,
      },
    },
  );

  if (!res.ok) {
    return { relatedProducts: [] };
  }

  return res.json();
}

const formatPrice = (price?: number | null) => {
  if (!price && price !== 0) return "-";
  return new Intl.NumberFormat("fa-IR").format(price);
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (product.error) {
    return {
      title: "محصول یافت نشد | کرمان آتاری",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const finalPrice = product.discountPrice ?? product.price;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/product/${product.slug}`;

  return {
    title: `${product.title} | خرید با بهترین قیمت`,
    description:
      product.shortDesc ||
      `${product.title} با قیمت ${formatPrice(finalPrice)} تومان در فروشگاه کرمان آتاری`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.title} | کرمان آتاری`,
      description: product.shortDesc || `مشاهده مشخصات، تصاویر و قیمت ${product.title}`,
      type: "website",
      url: canonicalUrl,
      images: [
        {
          url: product.mainImage,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | کرمان آتاری`,
      description: product.shortDesc || `قیمت روز و مشخصات کامل ${product.title}`,
      images: [product.mainImage],
    },
    keywords: [
      product.title,
      product.brand || "",
      product.category?.name || "",
      "خرید دسته بازی",
      "قیمت روز محصولات گیم",
    ].filter(Boolean),
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug);

  if (product.error) {
    notFound();
  }

  const { relatedProducts } = await getRelatedProducts(product.id);
  const finalPrice = product.discountPrice ?? product.price;
  const productUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/product/${product.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDesc || product.description,
    image: [product.mainImage, ...(product.images || [])],
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand || "Kerman Atari",
    },
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: finalPrice,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: productUrl,
    },
    aggregateRating:
      product.comments?.length > 0
        ? {
            "@type": "AggregateRating",
            ratingValue:
              product.comments.reduce((sum, comment) => sum + comment.rating, 0) /
              product.comments.length,
            reviewCount: product.comments.length,
          }
        : undefined,
  };

  return (
    <div className="container mx-auto px-3 md:px-6 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
        <nav aria-label="breadcrumb" className="text-sm text-zinc-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-zinc-800 transition-colors">
                خانه
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href="/products"
                className="hover:text-zinc-800 transition-colors"
              >
                محصولات
              </Link>
            </li>
            <li>/</li>
            <li className="text-zinc-900 font-medium">{product.title}</li>
          </ol>
        </nav>
        <h1 className="mt-3 text-xl md:text-3xl font-extrabold text-zinc-900">
          {product.title}
        </h1>
        <p className="mt-2 text-sm md:text-base text-zinc-600 leading-7 max-w-4xl">
          {product.shortDesc || "بررسی کامل، قیمت روز و مشخصات دقیق این محصول."}
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className="lg:col-span-9 space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 xl:gap-8">
              <div className="xl:col-span-5">
                <ProductGallery
                  productId={product._id}
                  mainImage={product.mainImage}
                  images={product.images}
                  title={product.title}
                />
              </div>
              <div className="xl:col-span-7 xl:border-r xl:pr-8 border-zinc-100">
                <ProductInfo product={product} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-4 md:p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-2">چرا این محصول؟</h2>
            <p className="text-zinc-600 leading-8 text-sm md:text-base">
              این محصول با تضمین اصالت، ارسال سریع و پشتیبانی کامل ارائه می‌شود.
              همچنین می‌توانید قبل از خرید، مشخصات فنی، نظرات کاربران و تصاویر محصول
              را به‌صورت کامل مشاهده کنید.
            </p>
          </div>

          <TabSection product={product} />
        </article>

        <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
            <h2 className="text-sm font-bold text-zinc-900 mb-4">خلاصه خرید</h2>
            <ul className="space-y-3 text-sm text-zinc-700">
              <li className="flex items-center justify-between">
                <span>قیمت نهایی</span>
                <strong>{formatPrice(finalPrice)} تومان</strong>
              </li>
              <li className="flex items-center justify-between">
                <span>موجودی</span>
                <span>{product.stock > 0 ? `${product.stock} عدد` : "ناموجود"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>برند</span>
                <span>{product.brand || "-"}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
            <h2 className="text-sm font-bold text-zinc-900 mb-4">محصولات مرتبط</h2>

            {relatedProducts.length === 0 ? (
              <p className="text-xs text-zinc-500">محصول مرتبطی پیدا نشد.</p>
            ) : (
              <div className="space-y-4">
                {relatedProducts.map((item: Product) => (
                  <Link
                    key={item._id}
                    href={`/product/${item.slug}`}
                    className="group flex items-start gap-3"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-100 bg-zinc-50 shrink-0">
                      <Image
                        width={160}
                        height={160}
                        src={item.mainImage}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs leading-5 text-zinc-700 group-hover:text-red-500 transition-colors line-clamp-2 font-medium">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-zinc-900">
                        {formatPrice(item.discountPrice ?? item.price)} تومان
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
