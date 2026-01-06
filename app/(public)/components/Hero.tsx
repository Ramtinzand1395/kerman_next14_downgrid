// "use client";
// import { motion } from "framer-motion";
// import Image from "next/image";
// import Link from "next/link";
// import Script from "next/script";

// const Hero = () => {
//   return (
//     <section
//       className="relative h-[90vh] bg-[url('/Hero1.webp')] bg-cover bg-center bg-no-repeat flex items-center justify-end"
//       aria-label="بخش هدر و معرفی فروشگاه کرمان آتاری"
//     >
//       {/* تصویر شخصیت */}
//       <motion.div
//         initial={{ opacity: 0, x: 40 }}
//         animate={{ opacity: 1, x: 0 }}
//         transition={{ duration: 1, ease: "easeOut" }}
//         className="absolute bottom-0 right-0 w-full h-full"
//       >
//         <Image
//           src="/charecture1.webp"
//           fill
//           alt="شخصیت بازی پلی‌استیشن در فروشگاه کرمان آتاری"
//           className="object-contain object-bottom-right"
//           priority
//         />
//       </motion.div>

//       {/* محتوای اصلی */}
//       <motion.div
//         initial={{ opacity: 0, x: -40 }}
//         animate={{ opacity: 1, x: 0 }}
//         transition={{ duration: 1, ease: "easeOut" }}
//         className="relative z-10 px-5 md:px-10 text-white max-w-xl"
//       >
//         <motion.p
//           initial={{ opacity: 0, x: -30 }}
//           animate={{ opacity: 1, x: 0 }}
//           transition={{ delay: 0.3, duration: 1 }}
//           className="text-3xl md:text-5xl font-bold mb-4 leading-snug"
//         >
//           دنیای بازی در دستان شما
//         </motion.p>

//         <motion.p
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.6, duration: 1 }}
//           className="text-sm md:text-lg text-gray-200 mb-6 leading-relaxed"
//         >
//           جدیدترین بازی‌ها، کنسول‌ها و اکسسوری‌های پلی‌استیشن را با بهترین قیمت
//           اینجاست.
//         </motion.p>

//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.9, duration: 0.8 }}
//           className="flex flex-col md:flex-row items-center gap-4"
//         >
//           <Link href="/products?sort=newest" aria-label="مشاهده محصولات فروشگاه">
//             <motion.button
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               className="bg-[#001A6E] hover:bg-[#010c32] text-white px-8 py-3 rounded-xl shadow-lg transition cursor-pointer"
//             >
//               مشاهده محصولات
//             </motion.button>
//           </Link>

//           <Link href="/contact" aria-label="تماس با فروشگاه">
//             <motion.button
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               className="bg-[#377dff] text-white hover:bg-[#0057f9] px-8 py-3 rounded-xl shadow-lg transition cursor-pointer"
//             >
//               تماس با ما
//             </motion.button>
//           </Link>
//         </motion.div>
//       </motion.div>

//       {/* Schema.org برای Hero Section */}
//       <Script
//         id="hero-schema"
//         type="application/ld+json"
//         strategy="afterInteractive"
//         dangerouslySetInnerHTML={{
//           __html: JSON.stringify({
//             "@context": "https://schema.org",
//             "@type": "WebPageElement",
//             name: "Hero Section",
//             description:
//               "معرفی فروشگاه کرمان آتاری با آخرین بازی‌ها و محصولات پلی‌استیشن",
//           }),
//         }}
//       />
//     </section>
//   );
// };

// export default Hero;

"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";

const Hero = () => {
  return (
    <section
      className="relative h-[90vh] flex items-center justify-end overflow-hidden"
      aria-label="بخش هدر و معرفی فروشگاه کرمان آتاری"
    >
      {/* 🔥 تصویر LCP (Hero Background) */}
      <Image
        src="/Hero1.webp"
        alt="فروشگاه کرمان آتاری - خرید بازی و کنسول پلی‌استیشن"
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-center -z-10"
      />

      {/* تصویر شخصیت (غیر LCP) */}
      <motion.div
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: 1, x: 300 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute bottom-0 right-0 w-full h-full"
      >
        <Image
          src="/charecture1.webp"
          fill
          alt="شخصیت بازی پلی‌استیشن در فروشگاه کرمان آتاری"
          className="object-contain object-bottom-right hidden md:block "
          loading="lazy"
          sizes="(max-width: 768px) 80vw, 40vw"
        />
      </motion.div>

      {/* محتوای متنی */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 px-5 md:px-10 text-white max-w-xl"
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-snug">
          دنیای بازی در دستان شما
        </h1>

        <p className="text-sm md:text-lg text-gray-200 mb-6 leading-relaxed">
          جدیدترین بازی‌ها، کنسول‌ها و اکسسوری‌های پلی‌استیشن را با بهترین قیمت
          اینجاست.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <Link href="/products?sort=newest">
            <button className="bg-[#001A6E] hover:bg-[#010c32] text-white px-8 py-3 rounded-xl shadow-lg transition">
              مشاهده محصولات
            </button>
          </Link>

          <Link href="/contact">
            <button className="bg-[#377dff] hover:bg-[#0057f9] text-white px-8 py-3 rounded-xl shadow-lg transition">
              تماس با ما
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Schema */}
      <Script
        id="hero-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPageElement",
            name: "Hero Section",
            description:
              "معرفی فروشگاه کرمان آتاری با آخرین بازی‌ها و محصولات پلی‌استیشن",
          }),
        }}
      />
    </section>
  );
};

export default Hero;
