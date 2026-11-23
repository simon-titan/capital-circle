import type { Metadata } from "next";
import { CallFunnelClient } from "@/components/landing/call/CallFunnelClient";
import { FunnelHimmel } from "@/components/landing/FunnelHimmel";
import { meta } from "@/config/call-funnel";
import { ladeFunnelVideos } from "@/lib/funnel-videos";

/**
 * Das Video wählt der Admin (`lib/funnel-videos.ts`). Die Seite bleibt statisch:
 * Speichern im Admin erzeugt sie per `revalidatePath` neu, `revalidate` ist das Netz.
 */
export const revalidate = 3600;

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://www.capitalcircletrading.com"
).replace(/\/$/, "");

/**
 * `/call` — Call-Funnel (Board von Emre, 17.10.2026; Aufbau seit 08.11.2026):
 * VSL, Brief von Emre, Member Wins (Case Studies, Auszahlungen, Bewertungen),
 * Fragebogen und Calendly im Modal.
 *
 * Öffentlich: `/call` steht in `PUBLIC_PREFIXES` von `proxy.ts`. Die Bilder
 * (`/community/`, `opengraph-image`) stehen im Matcher unter den Ausnahmen,
 * sonst käme dort Login-HTML an.
 *
 * Vorschaubild für geteilte Links: `app/call/opengraph-image.png` (Alt-Text
 * daneben), seit 20.11.2026 im Funnel-Look (Graphit, Gold-Akzent, Smaragd-Knopf).
 * Next hängt es nur an, solange `openGraph`/`twitter` hier **kein** `images`
 * setzen — X übernimmt es dann aus `og:image`.
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
  },
  twitter: {
    card: "summary_large_image",
    title: meta.shareTitle,
    description: meta.shareDescription,
  },
};

export default async function CallPage() {
  const { videos } = await ladeFunnelVideos();
  // Seit 08.11.2026 ohne Sternezeile unter den Knöpfen (Emres Mockup); die
  // Bewertungsliste im Block „Member Wins" lädt `ReviewSection` im Client.
  return (
    <FunnelHimmel>
      <CallFunnelClient video={videos.call} />
    </FunnelHimmel>
  );
}
