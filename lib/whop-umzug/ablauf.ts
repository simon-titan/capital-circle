import type { SupabaseClient } from "@supabase/supabase-js";
import { ABLAUF_MAX_PRO_NACHT } from "@/config/whop-umzug";

/**
 * Der Zugang aus dem Whop-Umzug endet, wenn der bezahlte Zeitraum vorbei ist.
 *
 * ── Was hier passiert, und was ausdrücklich nicht ───────────────────────────
 *
 * Hier wird **nur `is_paid` auf falsch gesetzt**. Die Discord-Rolle nimmt
 * derselbe Nachtlauf eine Stufe später ab (`reconcileDiscordRoles` in
 * `app/api/cron/taeglich`), und zwar nach genau derselben Regel wie bei jedem
 * anderen beendeten Zugang: Wer `is_paid` verliert und ein `access_until` im
 * Profil stehen hat, verliert die Mitgliederrolle und kommt in den Warteraum.
 * Diese Datei darf Discord deshalb nicht selbst anfassen — täte sie es, gäbe
 * es zwei Stellen, die Rollen entziehen, mit zwei Obergrenzen und zwei
 * Protokollen.
 *
 * Aus demselben Grund bleibt `access_until` stehen: Es ist ab jetzt das Datum,
 * *seit wann* der Zugang ruht, und daran hängen Warteraum
 * (`app/api/admin/warteraum-rolle`) und die Karenz vor dem Rauswurf
 * (`lib/discord/aufraeumen.ts`, `KARENZ_TAGE`). Wer es hier löscht, nimmt
 * beiden ihre Uhr.
 *
 * `membership_tier` bleibt ebenfalls unverändert auf `'free'` — dieselbe
 * Stufe, auf der der Whop-Altbestand steht. Eine eigene Stufe („whop") hätte
 * an jeder Stelle mitgepflegt werden müssen, die Stufen kennt.
 *
 * ── Wer verschont bleibt ────────────────────────────────────────────────────
 *
 * Wer bei uns abgeschlossen hat. Das prüft die Funktion doppelt: über ein
 * laufendes Abo in `subscriptions` **und** über `membership_tier`. Doppelt,
 * weil beide Wege für sich genommen einen Fall offenlassen — ein Lifetime-Kauf
 * legt kein Abo an, und ein Abo, dessen Webhook noch unterwegs ist, hat die
 * Stufe noch nicht gesetzt. Ein zu viel verschonter Zugang kostet ein paar
 * Tage Inhalt; ein zu viel beendeter kostet einen zahlenden Kunden.
 */

/** Abos, die Geld bringen — dieselbe Liste wie in `lib/whop-umzug/kreis.ts`. */
const ZAHLENDE_STATI: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

/** Stufen, die für sich schon Zugang bedeuten. */
const EIGENE_STUFEN: ReadonlySet<string> = new Set(["monthly", "quarterly", "yearly", "lifetime", "ht_1on1"]);

export interface AblaufErgebnis {
  gelaufen: boolean;
  /** Wie viele fällig waren (unabhängig davon, ob geschrieben wurde). */
  faellig: number;
  /** Wie vielen der Zugang tatsächlich beendet wurde. */
  beendet: number;
  /** Fällig, aber verschont — weil bei uns abgeschlossen. */
  verschont: number;
  /** Gesetzt, wenn die Obergrenze griff und deshalb niemandem etwas genommen wurde. */
  ausgesetzt?: string;
  fehler: string[];
  /** Wen es betraf. Ohne Adressen — das hier landet in Protokollen. */
  zeilen: Array<{ userId: string; zugangBis: string | null; aktion: "beendet" | "verschont" | "fehler" }>;
}

/**
 * Abgelaufene Whop-Zugänge beenden.
 *
 * @param schreiben `false` zählt nur (Probe im Nachtlauf, `?probe=1`).
 */
export async function beendeAbgelaufeneWhopZugaenge(
  supabase: SupabaseClient,
  schreiben: boolean,
  jetzt = new Date(),
): Promise<AblaufErgebnis> {
  const ergebnis: AblaufErgebnis = {
    gelaufen: true,
    faellig: 0,
    beendet: 0,
    verschont: 0,
    fehler: [],
    zeilen: [],
  };

  const { data, error } = await supabase
    .from("profiles")
    .select("id,membership_tier,access_until")
    .not("whop_umzug_am", "is", null)
    .eq("is_paid", true)
    .not("access_until", "is", null)
    .lt("access_until", jetzt.toISOString())
    .limit(1000);

  if (error) {
    /*
      Fehlt Migration 100, gibt es die Spalte nicht — dann ist „kein Ablauf"
      die richtige Antwort und kein Grund, den ganzen Nachtlauf rot zu färben.
      Unterschieden wird am Fehlertext, weil PostgREST für eine unbekannte
      Spalte denselben Weg nimmt wie für einen echten Lesefehler.
    */
    if (/whop_umzug_am|does not exist|schema cache/i.test(error.message)) {
      return { ...ergebnis, gelaufen: false, fehler: [] };
    }
    return { ...ergebnis, gelaufen: false, fehler: [`profiles nicht lesbar: ${error.message}`] };
  }

  const kandidaten = (data ?? []) as Array<{
    id: string;
    membership_tier: string | null;
    access_until: string | null;
  }>;
  ergebnis.faellig = kandidaten.length;
  if (kandidaten.length === 0) return ergebnis;

  // Wer bei uns ein laufendes Abo hat, wird verschont (siehe Kopfkommentar).
  const { data: abos, error: aboFehler } = await supabase
    .from("subscriptions")
    .select("user_id,status")
    .in(
      "user_id",
      kandidaten.map((k) => k.id),
    );
  if (aboFehler) {
    // Ohne diese Auskunft wird nichts beendet: Der Verschonungsgrund fehlt.
    return { ...ergebnis, gelaufen: false, fehler: [`subscriptions nicht lesbar: ${aboFehler.message}`] };
  }
  const mitAbo = new Set(
    ((abos ?? []) as Array<{ user_id: string; status: string }>)
      .filter((a) => ZAHLENDE_STATI.has(a.status))
      .map((a) => a.user_id),
  );

  const dran = kandidaten.filter((k) => {
    const umgezogen = mitAbo.has(k.id) || EIGENE_STUFEN.has(k.membership_tier ?? "free");
    if (umgezogen) {
      ergebnis.verschont++;
      ergebnis.zeilen.push({ userId: k.id, zugangBis: k.access_until, aktion: "verschont" });
    }
    return !umgezogen;
  });

  if (dran.length > ABLAUF_MAX_PRO_NACHT) {
    ergebnis.ausgesetzt =
      `${dran.length} Whop-Zugänge würden heute Nacht enden, erlaubt sind ${ABLAUF_MAX_PRO_NACHT}. ` +
      "Es wurde keiner beendet. Das ist fast immer ein Datenfehler (etwa ein falsch gesetztes access_until " +
      "beim Import). Bitte ansehen, bevor der nächste Lauf startet.";
    return ergebnis;
  }

  if (!schreiben) {
    for (const k of dran) ergebnis.zeilen.push({ userId: k.id, zugangBis: k.access_until, aktion: "beendet" });
    return ergebnis;
  }

  for (const k of dran) {
    /*
      `is_paid` noch einmal in der Bedingung: Zwischen Lesen und Schreiben kann
      ein Stripe-Webhook den Zugang erneuert haben. Trifft die Zeile dann nicht
      mehr zu, passiert schlicht nichts — besser als ein Zugang, der Sekunden
      nach der Zahlung wieder zufällt.
    */
    const { error: schreibFehler } = await supabase
      .from("profiles")
      .update({ is_paid: false })
      .eq("id", k.id)
      .eq("is_paid", true);

    if (schreibFehler) {
      ergebnis.fehler.push(`${k.id}: ${schreibFehler.message}`);
      ergebnis.zeilen.push({ userId: k.id, zugangBis: k.access_until, aktion: "fehler" });
      continue;
    }
    ergebnis.beendet++;
    ergebnis.zeilen.push({ userId: k.id, zugangBis: k.access_until, aktion: "beendet" });
  }

  return ergebnis;
}
