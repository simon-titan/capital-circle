import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KassenAnsicht } from "@/components/kasse/KassenAnsicht";
import { kassenlinkZustand, ladeKassenlink, ladeKunde } from "@/lib/mentoring/kasse";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Dein Angebot · Capital Circle",
  robots: { index: false, follow: false },
  /*
    Der Token in der Adresse ist der Schlüssel zum Angebot. Ohne diese Angabe
    ginge er als Referer an jede Seite, die von hier aus geöffnet wird.
  */
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/**
 * Kassenseite nach dem Closing-Call (`/kasse/<token>`).
 *
 * Der Closer legt den Link im Admin an (`/admin/kassenlinks`), der Kunde
 * sieht hier, was er kauft, und geht über den Knopf in Stripes Kasse. Die
 * Seite steht außerhalb der Plattform und ohne Navigation: Der Käufer hat
 * meist noch kein Konto, ausgewiesen wird er über den Token (öffentlich laut
 * `PUBLIC_PREFIXES` in `proxy.ts`).
 *
 * Ein unbekannter Token landet in `not-found.tsx` daneben. Ein bekannter, aber
 * bezahlter, stornierter oder abgelaufener Link bekommt eine eigene Seite:
 * Den hat jemand bewusst geschickt, und der Kunde soll wissen, was er tun kann.
 *
 * Das Layout steht in `components/kasse/KassenAnsicht.tsx` — dieselbe Ansicht
 * zeigt die Vorschau unter `/vorschau/mentoring` mit Beispieldaten.
 */
export default async function KassePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ fehler?: string | string[] }>;
}) {
  const [{ token }, { fehler: fehlerRoh }] = await Promise.all([params, searchParams]);
  const service = createServiceClient();
  const link = await ladeKassenlink(service, token);
  if (!link) notFound();

  const zustand = kassenlinkZustand(link);
  // Live-Abo: Läuft der Live-Zugang aus dem Programm noch, bucht die Kasse erst
  // an dessen Ende ab — das Datum gehört auf die Seite.
  const liveBis = link.produkt === "live" && zustand === "offen" ? (await ladeKunde(service, link.email)).liveBis : null;

  const fehler = (Array.isArray(fehlerRoh) ? fehlerRoh[0] : fehlerRoh) ?? null;
  return <KassenAnsicht link={link} zustand={zustand} fehler={fehler} liveBis={liveBis} />;
}
