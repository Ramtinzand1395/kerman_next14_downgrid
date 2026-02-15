import { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "تماس با ما | کرمان آتاری",
  description:
    "برای ارتباط با کرمان آتاری می‌توانید از طریق فرم تماس، شماره تلفن، ایمیل یا موقعیت مکانی ما اقدام کنید. پاسخ‌گویی سریع و محترمانه اولویت ماست.",
  keywords: [
    "تماس با کرمان آتاری",
    "آدرس کرمان آتاری",
    "بازی پلی استیشن در کرمان",
    "خرید کنسول پلی استیشن",
    "بازی PS5",
  ],
  openGraph: {
    title: "تماس با ما | کرمان آتاری",
    description:
      "راه‌های ارتباطی با کرمان آتاری شامل فرم تماس، شماره موبایل و موقعیت مکانی.",
    images: ["/1.webp"],
    type: "website",
  },
};

export default function Page() {
  return (
    <section className="container mx-auto px-5 py-16 text-right">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-10">
        تماس با ما
      </h1>

      <ContactForm />
    </section>
  );
}
