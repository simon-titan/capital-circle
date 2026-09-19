import { createServiceClient } from "@/lib/supabase/service";

/**
 * Bewertungsspiegel einer Landingpage — Anzahl und Durchschnitt.
 *
 * Bis zum 17.09.2026 standen „5,0 ★ · 21 Bewertungen" als feste Zahlen in
 * `config/landing-membership.ts`, während die Bewertungsliste auf derselben
 * Seite vier Einträge zeigte und ihren Knopf mit „Alle 4 Bewertungen anzeigen"
 * beschriftete. Für einen skeptischen Leser ist das der Beweis, dass gerundet
 * wird — und danach glaubt er auch den Auszahlungsbelegen nicht mehr.
 *
 * Deshalb kommt die Zahl jetzt aus derselben Tabelle wie die Liste
 * (`landing_reviews`, nur `visible`), serverseitig geholt und an beide
 * Sternezeilen weitergereicht. Gibt es keine Bewertungen, wird **nichts**
 * angezeigt: lieber keine Zahl als eine erfundene.
 */
export type Bewertungsspiegel = { anzahl: number; schnitt: string } | null;

/**
 * `slug` darf mehrere Kategorien tragen (`"membership,global"` oder ein Feld).
 * Der Spiegel muss dieselbe Menge zählen, die die Liste darunter zeigt —
 * sonst steht über vier Karten wieder eine Zahl, die dazu nicht passt.
 */
export async function ladeBewertungsspiegel(slug: string | string[]): Promise<Bewertungsspiegel> {
  const kategorien = (Array.isArray(slug) ? slug : slug.split(","))
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("landing_reviews")
      .select("rating")
      .in("landing_slug", kategorien.length > 0 ? kategorien : ["global"])
      .eq("visible", true);

    if (error || !data || data.length === 0) return null;

    const werte = data.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n > 0);
    if (werte.length === 0) return null;

    const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
    // Deutsche Schreibweise mit einer Nachkommastelle: „4,8" statt „4.8".
    return { anzahl: werte.length, schnitt: mittel.toFixed(1).replace(".", ",") };
  } catch {
    // Die Verkaufsseite darf an einer Bewertungszahl nicht scheitern.
    return null;
  }
}
