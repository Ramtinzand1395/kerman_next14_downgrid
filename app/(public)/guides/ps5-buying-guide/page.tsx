import type { Metadata } from "next";
import {
  GuideContent,
  GuideHero,
  GuideNextSteps,
  QuickChoices,
} from "../_components/BuyingGuideView";
import GuideProducts from "../_components/GuideProducts";
import {
  getGuideReadingMinutes,
  PRODUCTION_SITE_URL,
  PS5_GUIDE_PATH,
  ps5BuyingGuide,
} from "@/lib/guides/ps5-buying-guide";
import { getPs5GuideProducts } from "@/lib/guides/related-products";

export const dynamic = "force-dynamic";

const canonicalUrl = `${PRODUCTION_SITE_URL}${PS5_GUIDE_PATH}`;
const socialImage = `${PRODUCTION_SITE_URL}/PS5%20Hero%20Banner%20with%20Game%20Cases-1.png`;

export const metadata: Metadata = {
  title: ps5BuyingGuide.seoTitle,
  description: ps5BuyingGuide.description,
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: ps5BuyingGuide.seoTitle,
    description: ps5BuyingGuide.description,
    url: canonicalUrl,
    type: "article",
    locale: "fa_IR",
    siteName: "کرمان آتاری",
    publishedTime: ps5BuyingGuide.publishedAt,
    modifiedTime: ps5BuyingGuide.modifiedAt,
    images: [
      {
        url: socialImage,
        width: 2172,
        height: 724,
        alt: ps5BuyingGuide.heroImage.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ps5BuyingGuide.seoTitle,
    description: ps5BuyingGuide.description,
    images: [socialImage],
  },
};

function safeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function getStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: ps5BuyingGuide.title,
        description: ps5BuyingGuide.description,
        image: [socialImage],
        datePublished: ps5BuyingGuide.publishedAt,
        dateModified: ps5BuyingGuide.modifiedAt,
        inLanguage: "fa-IR",
        mainEntityOfPage: canonicalUrl,
        publisher: {
          "@id": `${PRODUCTION_SITE_URL}/#organization`,
        },
        isPartOf: {
          "@id": `${PRODUCTION_SITE_URL}/#website`,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "خانه",
            item: PRODUCTION_SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "کنسول‌ها",
            item: `${PRODUCTION_SITE_URL}/products`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "راهنمای خرید PS5",
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq-schema`,
        mainEntity: ps5BuyingGuide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

export default async function Ps5BuyingGuidePage() {
  const productsResult = await getPs5GuideProducts();
  const readingMinutes = getGuideReadingMinutes(ps5BuyingGuide);

  return (
    <div className="overflow-x-clip bg-[#f3f8ff] pb-14 text-right text-[#0b1d48] sm:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(getStructuredData()) }}
      />
      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <GuideHero guide={ps5BuyingGuide} readingMinutes={readingMinutes} />
        <QuickChoices guide={ps5BuyingGuide} />
        <GuideContent guide={ps5BuyingGuide} />
        <GuideProducts
          result={productsResult}
          productsHref={ps5BuyingGuide.productHref}
        />
        <GuideNextSteps guide={ps5BuyingGuide} />
      </div>
    </div>
  );
}
