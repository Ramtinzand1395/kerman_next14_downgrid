import "@/app/globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import localFont from "next/font/local";
import Script from "next/script";
import { ToastContainer } from "react-toastify";
import AuthProvider from "../AuthProvider";
import Navbar from "./(navbar)/Navbar";
import Footer from "./Footer";
import { SITE_URL } from "@/lib/site";
const INSTAGRAM_URL =
   "https://www.instagram.com/kermanatari.ir?igsh=MTh4cmd3NnNib2N5dw==";

const vazir = localFont({
  src: "../Vazir.woff2",
  display: "swap",
  variable: "--font-vazir",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "کرمان آتاری | فروشگاه تخصصی بازی و لوازم گیمینگ در کرمان",
    description:
      "خرید بازی‌های PS4 و PS5، کنسول‌های سونی، هدفون، کیبورد و لوازم جانبی گیمینگ از کرمان آتاری — ارسال سریع و قیمت مناسب.",
   url: SITE_URL,
    siteName: "KermanAtari",
    locale: "fa_IR",
    type: "website",
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
          {/* <SpeedInsights /> */}
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
                  "@id":  `${SITE_URL}/#organization`,
                  name: "کرمان آتاری",
                   url: SITE_URL,
                 logo: `${SITE_URL}/atari-seeklogo.svg`,
                  sameAs: [
                      INSTAGRAM_URL,
                    "https://t.me/kermanatari",
                  ],
                },
                {
                  "@type": "WebSite",
                   "@id": `${SITE_URL}/#website`,
                 url: SITE_URL,
                  name: "کرمان آتاری",
                  inLanguage: "fa",
                  potentialAction: {
                    "@type": "SearchAction",
                    target:
                      `${SITE_URL}/search?q={search_term_string}`,
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
