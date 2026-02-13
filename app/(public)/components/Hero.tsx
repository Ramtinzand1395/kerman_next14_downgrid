"use client";

import { Gift } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
// todo
// بعدا فریمر موشن اضافه بشه
// مشاوره خرید رایگان بره به تلگرام
const Hero = () => {
  return (
    <motion.section
      aria-label="بخش هدر و معرفی فروشگاه کرمان آتاری"
      className="mx-2 mt-4 rounded-3xl bg-gradient-to-br from-[#001A6E]  to-[#377dff] px-4 py-8 text-white md:mx-10 md:px-10 md:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          className="max-w-2xl space-y-5"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
        >
          <motion.span
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Gift size={16} />
            فروش ویژه هر روز
          </motion.span>

          <motion.h1
            className="text-3xl font-black leading-loose md:text-5xl md:leading-[4rem]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45 }}
          >
            فروشگاه تخصصی پلی‌استیشن، بازی و تجهیزات گیمینگ
          </motion.h1>

          <motion.p
            className="text-sm text-slate-200 md:text-base"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55 }}
          >
            از کنسول‌های نسل جدید تا اکسسوری‌های حرفه‌ای را با بهترین قیمت،
            ضمانت اصالت و ارسال سریع تهیه کنید.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.65 }}
          >
            <Link
              href="/products?sort=newest&page=1"
              className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
            >
              مشاهده محصولات
            </Link>

            <Link
              href="/contact-us"
              className="rounded-xl border border-white/40 px-5 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              مشاوره رایگان خرید
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="grid w-full max-w-sm grid-cols-2 gap-3 text-center"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.35, ease: "easeOut" }}
        >
          <motion.div
            className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <p className="text-2xl font-black md:text-3xl">1200</p>
            <p className="mt-1 text-xs text-slate-200">سفارش موفق</p>
          </motion.div>

          <motion.div
            className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <p className="text-2xl font-black md:text-3xl">340</p>
            <p className="mt-1 text-xs text-slate-200">محصول فعال</p>
          </motion.div>

          <motion.div
            className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <p className="text-2xl font-black md:text-3xl">24/7</p>
            <p className="mt-1 text-xs text-slate-200">پشتیبانی آنلاین</p>
          </motion.div>

          <motion.div
            className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <p className="text-2xl font-black md:text-3xl">%100</p>
            <p className="mt-1 text-xs text-slate-200">ضمانت اصالت</p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default Hero;
// !قبل از موشن
// "use client";
// import { Gift } from "lucide-react";
// import Link from "next/link";

// const Hero = () => {
//   return (
//     <section
//       aria-label="بخش هدر و معرفی فروشگاه کرمان آتاری"
//       className="mx-2 mt-4 rounded-3xl bg-gradient-to-br from-[#001A6E]  to-[#377dff] px-4 py-8 text-white md:mx-10 md:px-10 md:py-12"
//     >
//       <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
//         <div className="max-w-2xl space-y-5">
//           <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm">
//             <Gift size={16} />
//             فروش ویژه هر روز
//           </span>
//           <h1 className="text-3xl font-black leading-loose md:text-5xl md:leading-[4rem]">
//             فروشگاه تخصصی پلی‌استیشن، بازی و تجهیزات گیمینگ
//           </h1>
//           <p className="text-sm text-slate-200 md:text-base">
//             از کنسول‌های نسل جدید تا اکسسوری‌های حرفه‌ای را با بهترین قیمت،
//             ضمانت اصالت و ارسال سریع تهیه کنید.
//           </p>
//           <div className="flex flex-wrap items-center gap-3">
//             <Link
//               href="/products?sort=newest&page=1"
//               className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
//             >
//               مشاهده محصولات
//             </Link>
//             <Link
//               href="/contact-us"
//               className="rounded-xl border border-white/40 px-5 py-2 text-sm font-bold transition hover:bg-white/10"
//             >
//               مشاوره رایگان خرید
//             </Link>
//           </div>
//         </div>

//         <div className="grid w-full max-w-sm grid-cols-2 gap-3 text-center">
//           <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
//             <p className="text-2xl font-black md:text-3xl">1200</p>
//             <p className="mt-1 text-xs text-slate-200">سفارش موفق</p>
//           </div>
//           <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
//             <p className="text-2xl font-black md:text-3xl">340</p>
//             <p className="mt-1 text-xs text-slate-200">محصول فعال</p>
//           </div>
//           <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
//             <p className="text-2xl font-black md:text-3xl">24/7</p>
//             <p className="mt-1 text-xs text-slate-200">پشتیبانی آنلاین</p>
//           </div>
//           <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
//             <p className="text-2xl font-black md:text-3xl">%100</p>
//             <p className="mt-1 text-xs text-slate-200">ضمانت اصالت</p>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default Hero;
