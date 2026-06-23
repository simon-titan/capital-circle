import type { Metadata } from "next";
import { Suspense } from "react";
import { TerminDirectClient } from "@/components/landing/TerminDirectClient";

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://www.capitalcircletrading.com"
).replace(/\/$/, "");

const SHARE_TITLE =
  "Gehöre zu den 10% — sichere dir deinen Platz bei Capital Circle";
const SHARE_DESCRIPTION =
  "90% der Trader scheitern — du nicht. Schau das Video und sichere dir dein persönliches Gespräch für deine vollwertige Capital Circle Mitgliedschaft. Exklusiv & limitiert: Nur ausgewählte Trader werden aufgenommen. Buche jetzt deinen Termin.";
const SHARE_IMAGE = `${SITE_URL}/termin-og.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Sichere dir deinen Platz — Capital Circle",
  description: SHARE_DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Capital Circle",
    url: `${SITE_URL}/termin`,
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    locale: "de_DE",
    images: [
      {
        url: SHARE_IMAGE,
        width: 1192,
        height: 752,
        alt: "Capital Circle Framework — schau das Video und beantrage deinen Zugang",
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

export default function TerminPage() {
  return (
    <Suspense fallback={null}>
      <TerminDirectClient />
    </Suspense>
  );
}
