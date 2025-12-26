/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // بهینه‌سازی پکیج lucide (کاملاً امن)
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // فعال‌سازی فشرده‌سازی
  compress: true,

  // Vercel + Mongo + API stability
  output: "standalone",
};

module.exports = nextConfig;
