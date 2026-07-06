import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react", "framer-motion", "@aws-sdk/client-s3", "react-icons", "lucide-react"],
    /** Große Uploads (Admin upload-proxy, Live-Session-Videos) — Standard ist 10 MB. */
    proxyClientMaxBodySize: "2gb",
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  async redirects() {
    return [
      {
        source: "/free-discord",
        destination: "https://whop.com/capital-circle/cc-kostenloser-discord/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
