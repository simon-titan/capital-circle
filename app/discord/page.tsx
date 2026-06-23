import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscordLandingClient } from "@/components/landing/DiscordLandingClient";

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://www.capitalcircletrading.com"
).replace(/\/$/, "");

const SHARE_TITLE =
  "Lerne, wie du innerhalb weniger Wochen deinen ersten Payout erzielst";
const SHARE_DESCRIPTION =
  "Während andere für dieses Wissen hunderte Euro zahlen, bekommst du es hier kostenlos. Sichere dir jetzt deinen Zugang zur Capital-Circle-Discord-Community — 100% kostenlos, kein Risiko, sofortiger Zugang.";
const SHARE_IMAGE = `${SITE_URL}/discord-og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Kostenloser Discord-Zugang — Capital Circle",
  description: SHARE_DESCRIPTION,
  alternates: { canonical: "/discord" },
  openGraph: {
    type: "website",
    siteName: "Capital Circle",
    url: `${SITE_URL}/discord`,
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    locale: "de_DE",
    images: [
      {
        url: SHARE_IMAGE,
        width: 1381,
        height: 757,
        alt: "Capital Circle — Kostenloser Discord-Zugang für deinen ersten Payout",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export default function DiscordPage() {
  return (
    <Suspense fallback={null}>
      <DiscordLandingClient />
    </Suspense>
  );
}
