import type { Metadata } from "next";
import { CallFunnelClient } from "@/components/landing/call/CallFunnelClient";
import { meta } from "@/config/call-funnel";

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://www.capitalcircletrading.com"
).replace(/\/$/, "");

const SHARE_IMAGE = `${SITE_URL}${meta.shareImage}`;

/**
 * `/call` — Call-Funnel (Board von Emre, 17.10.2026): VSL, Fragebogen und
 * Calendly im Modal, Case Studies, belegte Auszahlungen.
 *
 * Öffentlich: `/call` steht in `PUBLIC_PREFIXES` von `proxy.ts`. Die Bilder
 * (`/cases/`, `/nachweise/`, `termin-og`) stehen im Matcher unter den
 * Ausnahmen, sonst käme dort Login-HTML an.
 *
 * `noindex`: Die Seite ist Ziel bezahlter Anzeigen, nicht der Suche — wie
 * `/termin` und `/discord`.
 *
 * Kein `searchParams` hier: Die UTM-Werte liest der Client selbst
 * (`readCallTracking`), so bleibt die Seite statisch.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: meta.title,
  description: meta.description,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Capital Circle",
    url: `${SITE_URL}/call`,
    title: meta.shareTitle,
    description: meta.shareDescription,
    locale: "de_DE",
    images: [{ url: SHARE_IMAGE, width: 1192, height: 752, alt: meta.shareImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: meta.shareTitle,
    description: meta.shareDescription,
    images: [SHARE_IMAGE],
  },
};

export default function CallPage() {
  return <CallFunnelClient />;
}
