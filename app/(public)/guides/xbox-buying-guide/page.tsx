import type { Metadata } from "next";
import {
  GuideContent,
  GuideHero,
  GuideNextSteps,
  QuickChoices,
} from "../_components/BuyingGuideView";
import GuideProducts from "../_components/GuideProducts";
import {
  XBOX_GUIDE_PATH,
  XBOX_PRODUCTION_SITE_URL,
  xboxBuyingGuide,
} from "@/lib/guides/xbox-buying-guide";
import { getGuideReadingMinutes } from "@/lib/guides/reading-time";
import { getXboxGuideProducts } from "@/lib/guides/related-products";

export const dynamic = "force-dynamic";

const canonicalUrl = `${XBOX_PRODUCTION_SITE_URL}${XBOX_GUIDE_PATH}`;
const socialImage = `${XBOX_PRODUCTION_SITE_URL}/guides/xbox/series-x-and-s.jpg`;

export const metadata: Metadata = {
  title: xboxBuyingGuide.seoTitle,
  description: xboxBuyingGuide.description,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: xboxBuyingGuide.seoTitle,
    description: xboxBuyingGuide.description,
    url: canonicalUrl,
    type: "article",
    locale: "fa_IR",
    siteName: "کرمان آتاری",
    publishedTime: xboxBuyingGuide.publishedAt,
    modifiedTime: xboxBuyingGuide.modifiedAt,
    images: [
      {
        url: socialImage,
        width: 1920,
        height: 1254,
        alt: xboxBuyingGuide.heroImage.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: xboxBuyingGuide.seoTitle,
    description: xboxBuyingGuide.description,
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
        headline: xboxBuyingGuide.title,
        description: xboxBuyingGuide.description,
        image: [socialImage],
        datePublished: xboxBuyingGuide.publishedAt,
        dateModified: xboxBuyingGuide.modifiedAt,
        inLanguage: "fa-IR",
        mainEntityOfPage: canonicalUrl,
        publisher: { "@id": `${XBOX_PRODUCTION_SITE_URL}/#organization` },
        isPartOf: { "@id": `${XBOX_PRODUCTION_SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "خانه",
            item: XBOX_PRODUCTION_SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "کنسول‌ها",
            item: `${XBOX_PRODUCTION_SITE_URL}/products?category=consoles`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: xboxBuyingGuide.breadcrumbLabel,
            item: canonicalUrl,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq-schema`,
        mainEntity: xboxBuyingGuide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

export default async function XboxBuyingGuidePage() {
  const productsResult = await getXboxGuideProducts();
  const readingMinutes = getGuideReadingMinutes(xboxBuyingGuide);

  return (
    <div className="overflow-x-clip bg-[#f3f8ff] pb-14 text-right text-[#0b1d48] sm:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(getStructuredData()) }}
      />
      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <GuideHero guide={xboxBuyingGuide} readingMinutes={readingMinutes} />
        <QuickChoices guide={xboxBuyingGuide} />
        <GuideContent guide={xboxBuyingGuide} />
        <GuideProducts
          result={productsResult}
          productsHref={xboxBuyingGuide.productHref}
          title={xboxBuyingGuide.productsSectionTitle}
          emptyMessage={xboxBuyingGuide.productsEmptyMessage}
        />
        <GuideNextSteps guide={xboxBuyingGuide} />
      </div>
    </div>
  );
}
