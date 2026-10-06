import type { Metadata } from "next";
import Script from "next/script";
import {
  GuideContent,
  GuideHero,
  GuideNextSteps,
  QuickChoices,
} from "../_components/BuyingGuideView";
import GuideProducts from "../_components/GuideProducts";
import {
  PRODUCTION_SITE_URL,
  PS4_GUIDE_PATH,
  ps4BuyingGuide,
} from "@/lib/guides/ps4-buying-guide";
import { getGuideReadingMinutes } from "@/lib/guides/reading-time";
import { getPs4GuideProducts } from "@/lib/guides/related-products";

export const dynamic = "force-dynamic";

const canonicalUrl = `${PRODUCTION_SITE_URL}${PS4_GUIDE_PATH}`;
const socialImage = `${PRODUCTION_SITE_URL}/guides/ps4/ps4-fat-dualshock.jpg`;

export const metadata: Metadata = {
  title: ps4BuyingGuide.seoTitle,
  description: ps4BuyingGuide.description,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: ps4BuyingGuide.seoTitle,
    description: ps4BuyingGuide.description,
    url: canonicalUrl,
    type: "article",
    locale: "fa_IR",
    siteName: "کرمان آتاری",
    publishedTime: ps4BuyingGuide.publishedAt,
    modifiedTime: ps4BuyingGuide.modifiedAt,
    images: [
      {
        url: socialImage,
        width: 1600,
        height: 800,
        alt: ps4BuyingGuide.heroImage.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ps4BuyingGuide.seoTitle,
    description: ps4BuyingGuide.description,
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
        headline: ps4BuyingGuide.title,
        description: ps4BuyingGuide.description,
        image: [socialImage],
        datePublished: ps4BuyingGuide.publishedAt,
        dateModified: ps4BuyingGuide.modifiedAt,
        inLanguage: "fa-IR",
        mainEntityOfPage: canonicalUrl,
        publisher: { "@id": `${PRODUCTION_SITE_URL}/#organization` },
        isPartOf: { "@id": `${PRODUCTION_SITE_URL}/#website` },
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
            item: `${PRODUCTION_SITE_URL}/products?category=consoles`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: ps4BuyingGuide.breadcrumbLabel,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq-schema`,
        mainEntity: ps4BuyingGuide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

export default async function Ps4BuyingGuidePage() {
  const productsResult = await getPs4GuideProducts();
  const readingMinutes = getGuideReadingMinutes(ps4BuyingGuide);

  return (
    <div className="overflow-x-clip bg-[#f3f8ff] pb-14 text-right text-[#0b1d48] sm:pb-20">
      <Script
        id="ps4-buying-guide-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(getStructuredData()) }}
      />
      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <GuideHero guide={ps4BuyingGuide} readingMinutes={readingMinutes} />
        <QuickChoices guide={ps4BuyingGuide} />
        <GuideContent guide={ps4BuyingGuide} />
        <GuideProducts
          result={productsResult}
          productsHref={ps4BuyingGuide.productHref}
          title={ps4BuyingGuide.productsSectionTitle}
          emptyMessage={ps4BuyingGuide.productsEmptyMessage}
        />
        <GuideNextSteps guide={ps4BuyingGuide} />
      </div>
    </div>
  );
}
