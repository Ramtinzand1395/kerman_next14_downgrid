// Production deploys may avoid a second memory-heavy type check only after the
// reusable validation job has passed for this exact Git commit. Normal builds
// always retain Next.js type checking.
const optimizedImages = require("./config/optimized-images.json");
const validatedSha = process.env.NEXT_DEPLOY_VALIDATED_SHA;
let validatedDeployment = false;
if (validatedSha) {
  const { execFileSync } = require("node:child_process");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/.test(validatedSha) || validatedSha !== head) {
    throw new Error("Deployment validation SHA does not match the source checkout");
  }
  validatedDeployment = true;
}

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
        source: "/category/services",
        destination: "/services",
        permanent: true,
      },
      // Preserve image URLs already indexed by search engines or saved in content.
      ...optimizedImages.map(({ source, destination }) => ({
        source: encodeURI(source),
        destination: encodeURI(destination),
        permanent: true,
      })),
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

  typescript: { ignoreBuildErrors: validatedDeployment },

  experimental: {
    ...(validatedDeployment ? { cpus: 1 } : {}),
    optimizePackageImports: ["lucide-react"],
  },

  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
