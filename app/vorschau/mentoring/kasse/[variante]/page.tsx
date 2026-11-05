import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KassenAnsicht } from "@/components/kasse/KassenAnsicht";
import { VorschauStreifen } from "../../VorschauStreifen";
import { VARIANTEN, beispielLink, beispielLiveBis, findeVariante } from "../../varianten";

export const metadata: Metadata = {
  title: "Vorschau Kassenseite · Capital Circle",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return VARIANTEN.map((v) => ({ variante: v.slug }));
}

/**
 * Kassenseite mit Beispieldaten (`/vorschau/mentoring/kasse/<variante>`).
 * Dasselbe Layout wie `/kasse/<token>`, ohne Datenbank; der Kaufknopf legt
 * keine Stripe-Kasse an. `?fehler=<code>` zeigt die Fehlerhinweise.
 */
export default async function KassenVorschau({
  params,
  searchParams,
}: {
  params: Promise<{ variante: string }>;
  searchParams: Promise<{ fehler?: string | string[] }>;
}) {
  const [{ variante }, { fehler: fehlerRoh }] = await Promise.all([params, searchParams]);
  const v = findeVariante(variante);
  if (!v) notFound();

  const fehler = (Array.isArray(fehlerRoh) ? fehlerRoh[0] : fehlerRoh) ?? null;
  return (
    <KassenAnsicht
      link={beispielLink(v)}
      zustand={v.zustand}
      fehler={fehler}
      liveBis={beispielLiveBis(v)}
      vorschau
      kopf={<VorschauStreifen text={`Vorschau mit Beispieldaten: ${v.titel}`} />}
    />
  );
}
