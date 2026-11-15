import { PRODUKTE, UPGRADE_ANRECHNUNG_CENTS, type KassenProdukt } from "@/config/mentoring";
import type { Kassenlink, KassenlinkZustand } from "@/lib/mentoring/kasse";

/**
 * Beispielangebote für die Vorschau unter `/vorschau/mentoring`.
 *
 * Jede Variante wird mit `KassenAnsicht` gerendert — demselben Baustein wie
 * die echte Kassenseite —, nur mit diesem Datensatz statt einem Link aus der
 * Datenbank. Preise kommen aus `config/mentoring.ts`, sie stimmen also immer
 * mit dem überein, was ein Closer im Admin anlegen kann.
 */

export interface Variante {
  slug: string;
  titel: string;
  produkt: KassenProdukt;
  raten: number;
  zustand: KassenlinkZustand;
  /** Live-Abo: Live-Zugang des Kunden läuft noch so viele Tage (erste Abbuchung erst dann). */
  liveBisTage?: number;
  /** Upgrade aus der Ausbildung: 499 € Anrechnung (Tracking-Playbook 2.3). */
  upgrade?: boolean;
}

export const VARIANTEN: Variante[] = [
  { slug: "ausbildung", titel: "Ausbildung, Einmalzahlung", produkt: "ausbildung", raten: 1, zustand: "offen" },
  { slug: "ausbildung-raten", titel: "Ausbildung, 2 Raten", produkt: "ausbildung", raten: 2, zustand: "offen" },
  { slug: "main", titel: "Main Mentoring, Einmalzahlung", produkt: "main", raten: 1, zustand: "offen" },
  { slug: "main-raten", titel: "Main Mentoring, 6 Raten", produkt: "main", raten: 6, zustand: "offen" },
  { slug: "main-upgrade", titel: "Main Mentoring, Upgrade aus der Ausbildung, 6 Raten", produkt: "main", raten: 6, zustand: "offen", upgrade: true },
  { slug: "premium", titel: "Premium Mentoring, Einmalzahlung", produkt: "premium", raten: 1, zustand: "offen" },
  { slug: "premium-raten", titel: "Premium Mentoring, 4 Raten", produkt: "premium", raten: 4, zustand: "offen" },
  // Restcent auf Rate 1 (seit 07.11.2026): 1 × 833,35 € + 5 × 833,33 €.
  { slug: "premium-6-raten", titel: "Premium Mentoring, 6 Raten", produkt: "premium", raten: 6, zustand: "offen" },
  { slug: "live", titel: "Live-Trading-Abo", produkt: "live", raten: 1, zustand: "offen" },
  {
    slug: "live-spaeter",
    titel: "Live-Trading-Abo, Live-Zugang läuft noch",
    produkt: "live",
    raten: 1,
    zustand: "offen",
    liveBisTage: 40,
  },
  { slug: "bezahlt", titel: "Link schon bezahlt", produkt: "main", raten: 1, zustand: "bezahlt" },
  { slug: "abgelaufen", titel: "Link abgelaufen", produkt: "main", raten: 1, zustand: "abgelaufen" },
];

/** Ende des Live-Zugangs für `liveBisTage`, sonst `null`. */
export function beispielLiveBis(v: Variante): string | null {
  return v.liveBisTage ? new Date(Date.now() + v.liveBisTage * 24 * 60 * 60 * 1000).toISOString() : null;
}

export function findeVariante(slug: string): Variante | null {
  return VARIANTEN.find((v) => v.slug === slug) ?? null;
}

/** Ein Kassenlink, wie ihn der Closer Kevin für „Max" anlegen würde. */
export function beispielLink(v: Variante): Kassenlink {
  const jetzt = Date.now();
  const tag = 24 * 60 * 60 * 1000;
  return {
    id: `vorschau-${v.slug}`,
    token: "vorschau",
    produkt: v.produkt,
    raten: v.raten,
    betrag_cents: PRODUKTE[v.produkt].preisCents - (v.upgrade ? UPGRADE_ANRECHNUNG_CENTS : 0),
    email: "max@beispiel.de",
    name: "Max",
    closer: "kevin",
    lead_id: null,
    notiz: null,
    erstellt_am: new Date(jetzt - tag).toISOString(),
    gueltig_bis: new Date(jetzt + (v.zustand === "abgelaufen" ? -tag : 6 * tag)).toISOString(),
    status: v.zustand === "bezahlt" ? "bezahlt" : "offen",
    stripe_session_id: null,
    bezahlt_am: v.zustand === "bezahlt" ? new Date(jetzt).toISOString() : null,
    kauf_id: null,
    anrechnung_cents: v.upgrade ? UPGRADE_ANRECHNUNG_CENTS : 0,
    upgrade_von_kauf_id: v.upgrade ? "vorschau-ausbildung" : null,
  };
}
