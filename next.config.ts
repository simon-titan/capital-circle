import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react", "framer-motion", "@aws-sdk/client-s3", "react-icons", "lucide-react"],
  },
};

export default nextConfig;
