import { NavigationProvider } from "@/app/components/navigation/NavigationFeedback";
import { Suspense } from "react";
import NavigationScroll from "@/app/components/navigation/NavigationScroll";
import "@/app/globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import localFont from "next/font/local";
import Script from "next/script";
import { ToastContainer } from "react-toastify";
import AuthProvider from "../AuthProvider";
import Navbar from "./(navbar)/Navbar";
import PromotionModalHost from "./components/PromotionModalHost";
import Footer from "./Footer";
import { SITE_URL, STORE_ORGANIZATION_ID, WEBSITE_ID, toAbsoluteUrl } from "@/lib/site";
import { STORE_CONTACT } from "@/lib/store-contact";
import { buildMerchantReturnPolicy } from "@/lib/merchantSchema";
import type { Metadata, Viewport } from "next";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const storefrontSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "Store"],
      "@id": STORE_ORGANIZATION_ID,
      name: STORE_CONTACT.name,
      url: SITE_URL,
      logo: toAbsoluteUrl(STORE_CONTACT.logoPath),
      image: toAbsoluteUrl("/about-us.webp"),
      telephone: STORE_CONTACT.phoneNumbers.map((phone) => `+98${phone.slice(1)}`),
      email: STORE_CONTACT.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: STORE_CONTACT.address.replace(`${STORE_CONTACT.locality}، `, ""),
        addressLocality: STORE_CONTACT.locality,
        addressCountry: "IR",
      },
      openingHours: STORE_CONTACT.openingHours,
      hasMap: STORE_CONTACT.mapUrl,
      sameAs: [STORE_CONTACT.instagramUrl, "https://t.me/kermanatari"],
      hasMerchantReturnPolicy: buildMerchantReturnPolicy(SITE_URL),
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: STORE_CONTACT.name,
      url: SITE_URL,
      inLanguage: "fa",
      publisher: { "@id": STORE_ORGANIZATION_ID },
      potentialAction: {
        "@type": "SearchAction",
        target: toAbsoluteUrl("/products?q={search_term_string}"),
        "query-input": "required name=search_term_string",
      },
    },
  ],
};
const vazir = localFont({
  src: "../Vazir.woff2",
  display: "swap",
  variable: "--font-vazir",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "کرمان آتاری | فروشگاه بازی و لوازم گیمینگ در کرمان",
    template: "%s | کرمان آتاری",
  },
  description:
    "کرمان آتاری — فروشگاه تخصصی بازی‌های PS4 و PS5، کنسول‌های سونی و لوازم جانبی گیمینگ در کرمان؛ ارسال شهری و سراسری با شرایط شفاف.",
  keywords: [
    "خرید بازی پلی استیشن",
    "بازی ps4",
    "بازی ps5",
    "کنسول بازی",
    "هدفون گیمینگ",
    "کیبورد گیمینگ",
    "لوازم جانبی گیمینگ",
    "کرمان آتاری",
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "کرمان آتاری | فروشگاه تخصصی بازی و لوازم گیمینگ در کرمان",
    description:
      "خرید بازی‌های PS4 و PS5، کنسول‌های سونی، هدفون، کیبورد و لوازم جانبی گیمینگ از کرمان آتاری — ارسال براساس مقصد و قیمت مناسب.",
   url: SITE_URL,
    siteName: "KermanAtari",
    locale: "fa_IR",
    type: "website",
  },
  
};

export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa-IR" dir="rtl" className={`${vazir.className} [--mobile-nav-offset:calc(3.75rem+env(safe-area-inset-bottom))] scroll-pb-[var(--mobile-nav-offset)] xl:[--mobile-nav-offset:0px]`}>
      <head>
        {/* Minimal extra head tags that are safe in app dir */}
         <meta name="enamad" content="2601172" />
        <script src="https://accounts.google.com/gsi/client" async></script>
      </head>
      <body className="pb-[var(--mobile-nav-offset)]">
        <script
          id="storefront-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(storefrontSchema).replace(/</g, "\\u003c"),
          }}
        />
        {/* Client-side wrappers (Auth, Navbar, Footer, Toast) are loaded dynamically */}
        <AuthProvider>
        <NavigationProvider>
          <Suspense fallback={null}><NavigationScroll /></Suspense>
          <Navbar />
          <PromotionModalHost />
          <main id="content">{children}</main>
          {/* <SpeedInsights /> */}
          <Footer />
        </NavigationProvider>
        </AuthProvider>

        {/* Toast notifications (client-only) */}
        <ToastContainer
          position="bottom-right"
          style={{ bottom: "max(var(--toastify-toast-bottom), var(--mobile-nav-offset))" }}
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />

        {/* One Google tag per public page. GA4 handles enhanced measurement including SPA history changes. */}
        {GA_MEASUREMENT_ID && /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-config" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
              window.dispatchEvent(new Event('kerman:ga-ready'));
            `}</Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
