import type { SupabaseClient } from "@supabase/supabase-js";
import { istKassenProdukt, type KassenProdukt } from "@/config/mentoring";
import { KASSENLINK_SPALTEN, kassenlinkZustand, type Kassenlink, type KassenlinkZustand } from "@/lib/mentoring/kasse";
import { plusMonate } from "@/lib/mentoring/zugang";

/**
 * Kassenlinks und Mentoring-Käufe für `/admin/kassenlinks`.
 *
 * Die Typen hier liest auch die Client-Komponente (`AdminKassenlinks.tsx`),
 * aber nur per `import type` — das Modul selbst zieht über `kasse.ts`
 * `node:crypto` und Stripe nach und gehört nicht in den Browser.
 */

export interface KassenlinkZeile extends Kassenlink {
  /** Wie die Kassenseite den Link gerade sieht (abgelaufen ist kein gespeicherter Status). */
  zustand: KassenlinkZustand;
  url: string;
}

/**
 * Was an einem Kauf Aufmerksamkeit braucht, in absteigender Dringlichkeit:
 *
 *   `fehlgeschlagen`  Es gibt einen offenen Zahlungsfall zur Subscription
 *                     (Stripe hat eine Rate nicht einziehen können).
 *   `abgebrochen`     Raten-Kauf beendet, bevor alle Raten bezahlt waren.
 *   `ueberfaellig`    Die nächste Rate hätte laut Kaufdatum schon da sein
 *                     müssen, aber es gibt weder Zahlung noch Zahlungsfall —
 *                     meist ein verpasster Webhook, gehört geprüft.
 *   `letzte_offen`    Nur noch die letzte Rate fehlt. Kein Fehler, aber der
 *                     Moment, in dem Raten-Käufe am häufigsten platzen.
 */
export type KaufWarnung = "fehlgeschlagen" | "abgebrochen" | "ueberfaellig" | "letzte_offen";

export type KaufStatus = "aktiv" | "vollstaendig" | "beendet" | "erstattet";

export interface KaufZeile {
  id: string;
  produkt: KassenProdukt;
  zahlweise: "einmal" | "raten" | "abo";
  ratenGesamt: number | null;
  ratenBezahlt: number;
  rateCents: number | null;
  sollCents: number | null;
  status: KaufStatus;
  email: string | null;
  name: string | null;
  closer: string | null;
  gekauftAm: string;
  vollstaendigAm: string | null;
  /** Nur bei laufenden Raten: wann die nächste fällig ist bzw. war. */
  naechsteRateAm: string | null;
  warnung: KaufWarnung | null;
  /** Offener Zahlungsfall (`zahlungsfall`), falls Stripe eine Rate nicht einziehen konnte. */
  zahlungsfall: { status: string; frist: string | null } | null;
}

export interface KassenUebersicht {
  links: KassenlinkZeile[];
  kaeufe: KaufZeile[];
  /** Migration 108 nicht eingespielt: keine Tabelle, also auch kein leerer Bestand. */
  fehlt: boolean;
}

/** Tabelle fehlt (PostgREST bzw. Postgres) — Migration nicht eingespielt. */
export function tabelleFehlt(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

const ANZEIGE_GRENZE = 300;

/**
 * Wie lange eine Rate nach dem rechnerischen Fälligkeitstag ausbleiben darf,
 * bevor sie als überfällig gilt. Stripe bucht nicht auf die Minute und
 * versucht bei einer abgelehnten Karte mehrfach — vorher Alarm zu schlagen,
 * hieße jede Zeitzonenverschiebung zu melden.
 */
const KULANZ_MS = 3 * 24 * 60 * 60 * 1000;

interface KaufRow {
  id: string;
  kassenlink_id: string | null;
  produkt: string;
  zahlweise: "einmal" | "raten" | "abo";
  raten_gesamt: number | null;
  raten_betrag_cents: number | null;
  soll_cents: number | null;
  stripe_subscription_id: string | null;
  status: KaufStatus;
  closer: string | null;
  email: string | null;
  gekauft_am: string;
  vollstaendig_am: string | null;
}

export function kassenlinkZeile(link: Kassenlink, appUrl: string, jetzt = Date.now()): KassenlinkZeile {
  return { ...link, zustand: kassenlinkZustand(link, jetzt), url: `${appUrl}/kasse/${link.token}` };
}

export async function ladeKassenUebersicht(service: SupabaseClient, appUrl: string): Promise<KassenUebersicht> {
  const jetzt = Date.now();

  const [linksRes, kaeufeRes] = await Promise.all([
    service.from("kassenlink").select(KASSENLINK_SPALTEN).order("erstellt_am", { ascending: false }).limit(ANZEIGE_GRENZE),
    service
      .from("mentoring_kauf")
      .select(
        "id,kassenlink_id,produkt,zahlweise,raten_gesamt,raten_betrag_cents,soll_cents,stripe_subscription_id,status,closer,email,gekauft_am,vollstaendig_am",
      )
      .order("gekauft_am", { ascending: false })
      .limit(ANZEIGE_GRENZE),
  ]);

  if (tabelleFehlt(linksRes.error) || tabelleFehlt(kaeufeRes.error)) {
    return { links: [], kaeufe: [], fehlt: true };
  }
  if (linksRes.error) throw new Error(`Kassenlinks nicht lesbar: ${linksRes.error.message}`);
  if (kaeufeRes.error) throw new Error(`Käufe nicht lesbar: ${kaeufeRes.error.message}`);

  const links = ((linksRes.data ?? []) as unknown as Kassenlink[])
    .filter((l) => istKassenProdukt(l.produkt))
    .map((l) => kassenlinkZeile(l, appUrl, jetzt));

  const kaufRows = ((kaeufeRes.data ?? []) as KaufRow[]).filter((k) => istKassenProdukt(k.produkt));
  const kaufIds = kaufRows.map((k) => k.id);
  const subIds = kaufRows.map((k) => k.stripe_subscription_id).filter((s): s is string => Boolean(s));

  // Bezahlte Raten je Kauf.
  const bezahlt = new Map<string, number>();
  if (kaufIds.length) {
    const { data, error } = await service.from("mentoring_rate").select("kauf_id").in("kauf_id", kaufIds);
    if (error && !tabelleFehlt(error)) throw new Error(`Raten nicht lesbar: ${error.message}`);
    for (const r of (data ?? []) as { kauf_id: string }[]) bezahlt.set(r.kauf_id, (bezahlt.get(r.kauf_id) ?? 0) + 1);
  }

  /*
    Geplatzte Raten stehen nicht in `mentoring_rate`, sondern als Zahlungsfall
    (Migration 080), denselben, den `/admin/zahlungsstoerungen` zeigt. Fehlt
    die Tabelle, bleibt die Spalte eben leer — die Liste selbst soll daran
    nicht scheitern.
  */
  const faelle = new Map<string, { status: string; frist: string | null }>();
  if (subIds.length) {
    const { data, error } = await service
      .from("zahlungsfall")
      .select("stripe_subscription_id,status,frist")
      .in("stripe_subscription_id", subIds)
      .in("status", ["offen", "aufschub"]);
    if (error && !tabelleFehlt(error)) console.warn(`[admin/kassenlinks] Zahlungsfälle nicht lesbar: ${error.message}`);
    for (const f of (data ?? []) as { stripe_subscription_id: string | null; status: string; frist: string | null }[]) {
      if (f.stripe_subscription_id) faelle.set(f.stripe_subscription_id, { status: f.status, frist: f.frist });
    }
  }

  const namen = new Map(links.map((l) => [l.id, l.name]));

  const kaeufe: KaufZeile[] = kaufRows.map((k) => {
    const ratenBezahlt = bezahlt.get(k.id) ?? 0;
    const ratenGesamt = k.zahlweise === "raten" ? k.raten_gesamt : null;
    const fall = k.stripe_subscription_id ? (faelle.get(k.stripe_subscription_id) ?? null) : null;

    let naechsteRateAm: string | null = null;
    let warnung: KaufWarnung | null = null;

    if (k.zahlweise === "raten" && ratenGesamt) {
      const offen = ratenBezahlt < ratenGesamt;
      if (k.status === "aktiv" && offen) {
        // Rate 1 wird beim Kauf fällig, Rate n einen Kalendermonat nach Rate n−1.
        const faellig = plusMonate(new Date(k.gekauft_am), ratenBezahlt);
        naechsteRateAm = faellig.toISOString();
        if (fall) warnung = "fehlgeschlagen";
        else if (faellig.getTime() + KULANZ_MS < jetzt) warnung = "ueberfaellig";
        else if (ratenBezahlt === ratenGesamt - 1) warnung = "letzte_offen";
      } else if (k.status === "beendet" && offen) {
        warnung = "abgebrochen";
      }
    } else if (fall) {
      // Live-Abo mit geplatzter Monatszahlung.
      warnung = "fehlgeschlagen";
    }

    return {
      id: k.id,
      produkt: k.produkt as KassenProdukt,
      zahlweise: k.zahlweise,
      ratenGesamt,
      ratenBezahlt,
      rateCents: k.raten_betrag_cents,
      sollCents: k.soll_cents,
      status: k.status,
      email: k.email,
      name: k.kassenlink_id ? (namen.get(k.kassenlink_id) ?? null) : null,
      closer: k.closer,
      gekauftAm: k.gekauft_am,
      vollstaendigAm: k.vollstaendig_am,
      naechsteRateAm,
      warnung,
      zahlungsfall: fall,
    };
  });

  return { links, kaeufe, fehlt: false };
}
