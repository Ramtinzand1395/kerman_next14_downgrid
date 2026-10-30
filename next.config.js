/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.kermanatari\\.ir" }],
        destination: "https://kermanatari.ir/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          { type: "host", value: "kermanatari\\.ir" },
          { type: "header", key: "x-forwarded-proto", value: "http" },
        ],
        destination: "https://kermanatari.ir/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
