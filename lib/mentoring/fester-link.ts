import type { SupabaseClient } from "@supabase/supabase-js";
import { CLOSER_AUSWAHL, type MentoringProdukt } from "@/config/mentoring";
import { KASSENLINK_SPALTEN, type Kassenlink } from "./kasse";
import { legeKassenlinkAn } from "./kassenlink-anlage";

/**
 * Feste Kassenlinks `/kasse/main` und `/kasse/premium` (seit 19.11.2026,
 * Entscheidung Simon). Ablauf: Closing-Call → Mentoringvertrag per SignWell →
 * der Kunde öffnet den festen Link, trägt Name, E-Mail und Raten ein und landet
 * auf seinem persönlichen Kassenlink (`/kasse/<token>`).
 *
 * Bewusst **kein eigener Kaufweg**: Der feste Link legt nur einen normalen
 * Kassenlink an (`legeKassenlinkAn`). Damit gelten Preis, Raten, Kasse,
 * Webhook, CRM-Phase und Provision unverändert. **Ohne Anrechnung der
 * Ausbildung** (`anrechnung: false`, Entscheidung Simon 19.11.2026): Der
 * Mentoringvertrag kennt keine Verrechnung, die Kasse muss den Vertragspreis zeigen. Den Closer trägt `?closer=<slug>` aus `CLOSER_AUSWAHL`.
 *
 * Wer denselben Link mehrmals abschickt (Zurück-Knopf, Doppeltipp), bekommt den
 * offenen Kassenlink derselben Adresse wieder statt eines neuen.
 */

export const FESTE_PRODUKTE = ["main", "premium"] as const satisfies readonly MentoringProdukt[];
export type FestesProdukt = (typeof FESTE_PRODUKTE)[number];

/** Wie lange der dabei angelegte Kassenlink gilt — kurz, der Kunde zahlt meist sofort. */
const GUELTIG_TAGE = 2;

export function istFestesProdukt(wert: unknown): wert is FestesProdukt {
  return typeof wert === "string" && (FESTE_PRODUKTE as readonly string[]).includes(wert);
}

/** `?closer=` aus der Adresse, nur wenn der Slug bekannt ist. */
export function gueltigerCloser(wert: unknown): string | null {
  const v = Array.isArray(wert) ? wert[0] : wert;
  if (typeof v !== "string") return null;
  const slug = v.trim().toLowerCase();
  return CLOSER_AUSWAHL.some((c) => c.id === slug) ? slug : null;
}

export async function oeffneFestenLink(
  service: SupabaseClient,
  eingabe: { produkt: FestesProdukt; raten: unknown; email: unknown; name: unknown; closer: string | null },
  appUrl: string,
): Promise<{ ok: true; token: string } | { ok: false; fehler: string; status: number }> {
  const email = typeof eingabe.email === "string" ? eingabe.email.trim().toLowerCase() : "";
  const raten = Number(eingabe.raten);

  // Offener, noch gültiger Link derselben Adresse mit gleichem Produkt und gleichen Raten → wiederverwenden.
  if (email && Number.isInteger(raten)) {
    const { data } = await service
      .from("kassenlink")
      .select(KASSENLINK_SPALTEN)
      .eq("email", email)
      .eq("produkt", eingabe.produkt)
      .eq("raten", raten)
      .eq("status", "offen")
      .gt("gueltig_bis", new Date().toISOString())
      .order("erstellt_am", { ascending: false })
      .limit(1);
    const vorhanden = (data as unknown as Kassenlink[] | null)?.[0];
    if (vorhanden && (vorhanden.closer ?? null) === eingabe.closer) return { ok: true, token: vorhanden.token };
  }

  const r = await legeKassenlinkAn(
    service,
    {
      produkt: eingabe.produkt,
      raten: eingabe.raten,
      email: eingabe.email,
      name: eingabe.name,
      closer: eingabe.closer,
      anrechnung: false,
      gueltig_tage: GUELTIG_TAGE,
      notiz: `Fester Link /kasse/${eingabe.produkt}`,
    },
    null,
    appUrl,
  );
  return r.ok ? { ok: true, token: r.item.token } : r;
}
