import "@/app/globals.css";
import "react-loading-skeleton/dist/skeleton.css";
// todo
// پاک بشه
import { SpeedInsights } from "@vercel/speed-insights/next"
import localFont from "next/font/local";
import Script from "next/script";
import { ToastContainer } from "react-toastify";
import AuthProvider from "../AuthProvider";
import Navbar from "./(navbar)/Navbar";
import Footer from "./Footer";

const vazir = localFont({
  src: "../Vazir.woff2",
  display: "swap",
  variable: "--font-vazir",
});

export const metadata = {
  title: {
    default: "کرمان آتاری | فروشگاه بازی و لوازم گیمینگ در کرمان",
    template: "%s | کرمان آتاری",
  },
  description:
    "کرمان آتاری — فروشگاه تخصصی بازی‌های PS4 و PS5، کنسول‌های سونی و لوازم جانبی گیمینگ در کرمان. ارسال سریع و پشتیبانی دقیق.",
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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "https://kermanatari.ir",
  },
  openGraph: {
    title: "کرمان آتاری | فروشگاه تخصصی بازی و لوازم گیمینگ در کرمان",
    description:
      "خرید بازی‌های PS4 و PS5، کنسول‌های سونی، هدفون، کیبورد و لوازم جانبی گیمینگ از کرمان آتاری — ارسال سریع و قیمت مناسب.",
    url: "https://kermanatari.ir",
    siteName: "KermanAtari",
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@kermanatari",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa-IR" dir="rtl" className={vazir.className}>
      <head>
        {/* Minimal extra head tags that are safe in app dir */}
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="robots" content="index,follow" />
        <script src="https://accounts.google.com/gsi/client" async></script>
      </head>
      <body>
        {/* Client-side wrappers (Auth, Navbar, Footer, Toast) are loaded dynamically */}
        <AuthProvider>
          <Navbar />
          <main id="content">{children}</main>
          <SpeedInsights />
          <Footer />
        </AuthProvider>

        {/* Toast notifications (client-only) */}
        <ToastContainer
          position="bottom-right"
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

        {/* Structured data for Organization + WebSite (SEO) */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://kermanatari.ir/#organization",
                  name: "کرمان آتاری",
                  url: "https://kermanatari.ir",
                  logo: "https://kermanatari.ir/logo.png",
                  sameAs: [
                    "https://instagram.com/kermanatari",
                    "https://t.me/kermanatari",
                  ],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://kermanatari.ir/#website",
                  url: "https://kermanatari.ir",
                  name: "کرمان آتاری",
                  inLanguage: "fa",
                  potentialAction: {
                    "@type": "SearchAction",
                    target:
                      "https://kermanatari.ir/search?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />

        {/* Analytics / other scripts can be added here with appropriate strategies */}
      </body>
    </html>
  );
}
