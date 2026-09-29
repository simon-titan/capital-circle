import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      /** YouTube-Vorschaubilder (Journal-Home). Werden serverseitig geholt,
       *  damit der Browser vor dem Klick keine Verbindung zu Google aufbaut. */
      { protocol: "https", hostname: "*.ytimg.com", pathname: "/vi/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@chakra-ui/react", "framer-motion", "@aws-sdk/client-s3", "react-icons", "lucide-react"],
    /** Große Uploads (Admin upload-proxy, Live-Session-Videos) — Standard ist 10 MB. */
    proxyClientMaxBodySize: "2gb",
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  /**
   * Das Hero-Video (`components/landing/membership/PlattformVideo.tsx`) liegt
   * unter `public/hero/`. Vercel liefert `public/` sonst mit `max-age=0` aus,
   * und jeder Besuch fragt die 1–2 MB neu an. Die Dateinamen tragen eine
   * Versionsziffer — wer eine Datei ersetzt, vergibt einen neuen Namen.
   */
  async headers() {
    return [
      {
        source: "/hero/:datei*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/free-discord",
        destination: "https://whop.com/capital-circle/cc-kostenloser-discord/",
        permanent: false,
      },
      /** Den Bewerbungsweg gibt es nicht mehr (20.09.2026): alte Links landen auf der Verkaufsseite. */
      {
        source: "/insight",
        destination: "/",
        permanent: true,
      },
      /** Trading Journal v2: Positionsrechner ist aus dem Journal-Teilbaum gewandert. */
      {
        source: "/trading-journal/position-calculator",
        destination: "/position-rechner",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
