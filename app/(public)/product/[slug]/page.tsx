import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductGallery } from "./ProductGallery";
import { ProductInfo } from "./ProductInfo";
import TabSection from "./TabSection";
import { ProductVariantProvider } from "./ProductVariantContext";
import ProductPurchaseSummary from "./ProductPurchaseSummary";
import type { Product } from "@/types";
import { SITE_URL, toAbsoluteUrl } from "@/lib/site";
import ProductImage from "@/app/components/ProductImage";
import { getStoreShippingSettings } from "@/lib/shippingSettings";
import { tomanToIrr } from "@/lib/currency";
import { formatLocalShippingPolicyText } from "@/lib/shipping";
import {
  getRelatedProducts,
  type RelatedProduct,
} from "@/lib/relatedProducts";

type ProductResponse = Product & {
  id?: string;
};

class ProductNotFoundError extends Error {}
class ProductRequestError extends Error {}

function hasStringProperty(value: object, property: string) {
  return property in value && typeof Reflect.get(value, property) === "string";
}

function hasNumberProperty(value: object, property: string) {
  return property in value && typeof Reflect.get(value, property) === "number";
}

function hasArrayProperty(value: object, property: string) {
  return property in value && Array.isArray(Reflect.get(value, property));
}

function isProductResponse(value: unknown): value is ProductResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    hasStringProperty(value, "_id") &&
    hasStringProperty(value, "slug") &&
    hasStringProperty(value, "title") &&
    hasStringProperty(value, "mainImage") &&
    hasNumberProperty(value, "price") &&
    hasNumberProperty(value, "stock") &&
    hasArrayProperty(value, "images") &&
    hasArrayProperty(value, "specifications") &&
    hasArrayProperty(value, "comments")
  );
}

const getProduct = cache(async (slug: string): Promise<ProductResponse> => {
  let res: Response;

  try {
    res = await fetch(`${SITE_URL}/api/products/${slug}`, {
      cache: "no-store",
    });
  } catch {
    throw new ProductRequestError("ارتباط با سرویس محصول برقرار نشد.");
  }

  if (res.status === 404) {
    throw new ProductNotFoundError("محصول موردنظر پیدا نشد.");
  }

  if (!res.ok) {
    throw new ProductRequestError(
      `دریافت محصول با وضعیت ${res.status} ناموفق بود.`,
    );
  }

  let payload: unknown;

  try {
    payload = await res.json();
  } catch {
    throw new ProductRequestError("پاسخ سرویس محصول معتبر نیست.");
  }

  if (!isProductResponse(payload)) {
    throw new ProductRequestError("ساختار اطلاعات محصول معتبر نیست.");
  }

  return payload;
});

async function loadRelatedProducts(
  id?: string,
): Promise<{ relatedProducts: RelatedProduct[] }> {
  if (!id) {
    return { relatedProducts: [] };
  }

  return getRelatedProducts(`${SITE_URL}/api/products/related/${id}`);
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
  let product: ProductResponse;

  try {
    product = await getProduct(params.slug);
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return {
        title: "محصول یافت نشد | کرمان آتاری",
        robots: {
          index: false,
          follow: false,
        },
      };
    }
    throw error;
  }

  const finalPrice = product.discountPrice ?? product.price;
  const canonicalPath = `/product/${product.slug}`;

  const metaDescription = (
    product.metaDescription ||
    product.shortDesc ||
    `مشاهده مشخصات، تصاویر و قیمت ${product.title}`
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  const rawSeoTitle = (product.seoTitle || product.title).trim();
  const normalizedSeoTitle = rawSeoTitle.replace(/(?:\s*\|\s*کرمان آتاری)+\s*$/g, "").trim();

  return {
    title: normalizedSeoTitle || product.title,
    description: metaDescription,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: product.status !== "draft",
      follow: product.status !== "draft",
    },
    openGraph: {
      title: normalizedSeoTitle || product.title,
      description: metaDescription,
      type: "website",
      url: canonicalPath,
      images: [
        {
          url: product.mainImage,
          alt: product.mainImageAlt || product.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: normalizedSeoTitle || product.title,
      description: metaDescription,
      images: [product.mainImage],
    },

    keywords: [
      product.title,
      product.brand || "",
      product.category?.name || "",
      ...(product.tags?.map((tag) => tag.name) || []),
      `خرید ${product.title}`,
      `قیمت ${product.title}`,
    ].filter(Boolean),
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { variant?: string };
}) {
  let product: ProductResponse;

  try {
    product = await getProduct(params.slug);
  } catch (error) {
    if (error instanceof ProductNotFoundError) notFound();
    throw error;
  }

  const [{ relatedProducts }, shippingSettings] = await Promise.all([
    loadRelatedProducts(product._id || product.id),
    getStoreShippingSettings(),
  ]);
  const shippingNotices = [
    shippingSettings.localDelivery.enabled
      ? formatLocalShippingPolicyText(shippingSettings.localDelivery.feeToman)
      : null,
    shippingSettings.nationalCollect.enabled
      ? shippingSettings.nationalCollect.description
      : null,
    shippingSettings.tipax.enabled
      ? `${shippingSettings.tipax.title}: ${shippingSettings.tipax.description}`
      : null,
    shippingSettings.postPishtaz.enabled
      ? `${shippingSettings.postPishtaz.title}: ${shippingSettings.postPishtaz.description}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const finalPrice = product.discountPrice ?? product.price;
  const productUrl = toAbsoluteUrl(`/product/${product.slug}`);

  const activeVariants = (product.variants || []).filter(
    (v: any) => v.isActive !== false,
  );
  const pricesInIRR = activeVariants.map(
    (v: any) => tomanToIrr(Number((v.discountPrice ?? v.price) || 0)),
  );
  const minPriceInIRR =
    pricesInIRR.length > 0 ? Math.min(...pricesInIRR) : tomanToIrr(finalPrice);
  const maxPriceInIRR =
    pricesInIRR.length > 0 ? Math.max(...pricesInIRR) : tomanToIrr(finalPrice);
  const totalStock =
    product.productType === "multi" && activeVariants.length > 0
      ? activeVariants.reduce((s: number, v: any) => s + (v.stock || 0), 0)
      : product.stock;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDesc || product.description,
     image: [
    product.mainImage,
    ...((product.images || []).map((img) =>
      typeof img === "string" ? img : img.url,
    )),
  ],
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand || "Kerman Atari",
    },
    category: product.category?.name,
    offers:
      product.productType === "multi" && activeVariants.length > 0
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "IRR",
            lowPrice: minPriceInIRR,
            highPrice: maxPriceInIRR,
            offerCount: activeVariants.length,
            availability:
              totalStock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: productUrl,
          }
        : {
            "@type": "Offer",
            priceCurrency: "IRR",
            price: tomanToIrr(finalPrice),
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
              product.comments.reduce(
                (sum, comment) => sum + comment.rating,
                0,
              ) / product.comments.length,
            reviewCount: product.comments.length,
          }
        : undefined,
    additionalProperty: product.specifications?.flatMap((section) =>
      (section.items || []).map((item) => ({
        "@type": "PropertyValue",
        name: `${section.title} - ${item.key}`,
        value: item.value,
      })),
    ),
  };

  return (
    <div className="container mx-auto px-3 md:px-6 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {product.faqs && product.faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: product.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      ) : null}

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
          {product.metaDescription ||
            product.shortDesc ||
            "بررسی کامل، قیمت روز و مشخصات دقیق این محصول."}
        </p>
      </section>

      <ProductVariantProvider
        product={product}
        initialVariantId={searchParams?.variant}
      >
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
                     mainImageAlt={product.mainImageAlt}
                  />
                </div>
                <div className="xl:col-span-7 xl:border-r xl:pr-8 border-zinc-100">
                  <ProductInfo product={product} shippingNotices={shippingNotices} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-4 md:p-6">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">
                سوالات پرتکرار
              </h2>
              {product.faqs && product.faqs.length > 0 ? (
                <div className="space-y-3">
                  {product.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <summary className="cursor-pointer list-none text-sm md:text-base font-bold text-zinc-900 transition-colors group-open:text-blue-700">
                        {faq.question}
                      </summary>
                      <p className="mt-2 text-sm leading-7 text-zinc-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-600 leading-8 text-sm md:text-base">
                  این محصول با تضمین اصالت، ارسال براساس مقصد و پشتیبانی کامل ارائه
                  می‌شود.
                </p>
              )}
            </div>

            <TabSection product={product} />
          </article>

          <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-24 h-fit">
            <ProductPurchaseSummary />

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
              <h2 className="text-sm font-bold text-zinc-900 mb-4">
                محصولات مرتبط
              </h2>

              {relatedProducts.length === 0 ? (
                <p className="text-xs text-zinc-500">محصول مرتبطی پیدا نشد.</p>
              ) : (
                <div className="space-y-4">
                  {relatedProducts.map((item: RelatedProduct) => (
                    <Link
                      key={item._id}
                      href={`/product/${item.slug}`}
                      className="group flex items-start gap-3"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-100 bg-zinc-50 shrink-0">
                        <ProductImage
                          width={160}
                          height={160}
                          src={item.mainImage}
                          alt={item.title}
                          sizes="80px"
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
      </ProductVariantProvider>
    </div>
  );
}
