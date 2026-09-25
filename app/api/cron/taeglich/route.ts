import { NextResponse } from "next/server";
import { ENTFERNEN_MAX_PRO_NACHT, KARENZ_TAGE, ROLLENENTZUG_MAX_PRO_NACHT } from "@/config/discord";
import { ERINNERUNG_TAGE } from "@/config/zahlung";
import { AUFBEWAHRUNG_TAGE } from "@/lib/analytics/kaufweg";
import { aggregiereZeitraum, raeumeRohdatenAuf, tagVor } from "@/lib/analytics/speicher";
import { cronBefugt } from "@/lib/cron/auth";
import { discordBotConfigured } from "@/lib/discord/api";
import {
  baldFaellig,
  entferneFaelligeAutomatisch,
  faelligeEntfernungen,
  ladeAufraeumstand,
} from "@/lib/discord/aufraeumen";
import { mitgliedsRolleId } from "@/lib/discord/mitgliedschaft";
import { erkenneVorstellungen } from "@/lib/onboarding/vorstellung";
import { reconcileDiscordRoles, type ReconcileResult } from "@/lib/discord/reconcile";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { markiereTvEntzuege } from "@/lib/tradingview/ablauf";
import { createServiceClient } from "@/lib/supabase/service";
import { beendeAbgelaufeneWhopZugaenge } from "@/lib/whop-umzug/ablauf";
import { ladeUmzugKreis, zaehleKreis } from "@/lib/whop-umzug/kreis";
import { beendeAbgelaufeneAufschuebe, fuehreFristAus } from "@/lib/zahlung/fall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Der tägliche Lauf: was von selbst fällig wird.
 *
 * Übernommen aus MoonTrading (`app/api/admin/taeglich`). Ersetzt
 * `app/api/cron/process-dunning` (Mails nach 24/48 Stunden, Slack-Alarm nach
 * sieben Tagen) vollständig — die beiden laufen **nicht** parallel.
 *
 * ── Was hier läuft ──────────────────────────────────────────────────────────
 *
 * 1. **Abgelaufene Aufschübe beenden.** Zugang und Rolle weg, Warteraum,
 *    Nachricht, Verlauf.
 * 2. **Der Sieben-Tage-Ablauf.** An Tag 3 und Tag 5 eine Erinnerung, an Tag 7
 *    ruht der Zugang. Zahlen und Wortlaut stehen in `config/zahlung.ts`.
 * 2a. **Abgelaufene Whop-Zugänge beenden** (`lib/whop-umzug/ablauf.ts`): Wer
 *    aus dem Whop-Umzug stammt, dessen bei Whop bezahlter Zeitraum vorbei ist
 *    und der bei uns nichts abgeschlossen hat, verliert `is_paid`. Die Rolle
 *    nimmt ihm Schritt 3, nach derselben Regel wie jedem anderen — deshalb
 *    steht dieser Schritt davor und nicht danach.
 * 3. **Die Rollen nachziehen** (`lib/discord/reconcile.ts`), nach derselben
 *    Regel wie die Inhalte (`is_paid` oder Admin). Wer wieder Zugang hat,
 *    bekommt die Mitgliederrolle zurück und verlässt den Warteraum; wer keinen
 *    mehr hat und die Rolle noch trägt, verliert sie und kommt in den
 *    Warteraum — aber nur mit Enddatum im Profil. Das Netz für einen Webhook,
 *    der einmal ausblieb oder an Discord scheiterte. Über
 *    `ROLLENENTZUG_MAX_PRO_NACHT` wird niemandem etwas genommen (Datenfehler,
 *    keine Abwanderung).
 * 3a. **TradingView-Zugänge zum Entzug vormerken** (`lib/tradingview/ablauf.ts`):
 *    Wer keinen Plattformzugang mehr hat, landet in der Admin-Queue „Entziehen“,
 *    das Team bekommt eine Sammelmeldung. Ausgetragen wird von Hand auf
 *    TradingView. Gleiche Regel und gleiche Stelle wie beim Rollenabgleich.
 * 4. **Der Rauswurf nach der Karenz** (`lib/discord/aufraeumen.ts`): Wer seit
 *    `KARENZ_TAGE` keinen Zugang mehr hat, bekommt eine Abschiedsnachricht und
 *    wird vom Server entfernt. Die einzige Handlung hier, die sich nicht
 *    zurücknehmen lässt; die Schranken stehen in der Datei. Er läuft zuletzt,
 *    damit er auf dem Zustand arbeitet, den die Schritte davor hergestellt
 *    haben. **Vor dem ersten scharfen Lauf `?probe=1` ansehen.**
 * 5. **Die Kaufweg-Messung abschließen** (`lib/analytics/speicher.ts`): Die
 *    Tagesrechnung der letzten Tage neu aufstellen und Rohdaten älter als
 *    `AUFBEWAHRUNG_TAGE` löschen. Steht zuletzt, weil er als einziger Schritt
 *    niemanden betrifft — er darf ausfallen, ohne dass jemand etwas merkt, und
 *    soll deshalb keinem Schritt davor im Weg stehen.
 *
 * Die Reihenfolge ist Absicht: Ein Fall, dessen Aufschub gerade abgelaufen
 * ist, steht danach auf `beendet` und wird von der Frist nicht noch einmal
 * angefasst. Andersherum bekäme dieselbe Person zwei Nachrichten.
 *
 * ── Drei Zugänge ────────────────────────────────────────────────────────────
 *
 * Vercel-Cron per GET mit `Authorization: Bearer $CRON_SECRET` — **fail-closed**:
 * Fehlt `CRON_SECRET`, ist der Weg zu. Ein Mensch per POST über die
 * angemeldete Sitzung (Admin). `?probe=1` sagt, was passieren würde, und tut
 * nichts.
 *
 * ── Wann er läuft ───────────────────────────────────────────────────────────
 *
 * `0 2 * * *` (UTC) in `vercel.json`, also nachts. Ein Cron, der in ein
 * Deployment fällt, fällt still aus; weil jede Erinnerung über einen Zähler
 * läuft und jede Sperre über die Frist, holt der nächste Lauf alles nach.
 */

export async function GET(request: Request) {
  if (!cronBefugt(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (new URL(request.url).searchParams.get("probe") === "1") return probe();
  return lauf();
}

export async function POST(request: Request) {
  if (!cronBefugt(request)) {
    const { error } = await requireAdminRole("admin");
    if (error) return error;
  }
  if (new URL(request.url).searchParams.get("probe") === "1") return probe();
  return lauf();
}

async function lauf() {
  const supabase = createServiceClient();
  const start = Date.now();

  const aufschuebe = await beendeAbgelaufeneAufschuebe(supabase);
  const frist = await fuehreFristAus(supabase);

  /*
    Der Whop-Umzug vor dem Rollenabgleich: Er nimmt nur `is_paid`, die Rolle
    nimmt der Abgleich gleich danach — mit seiner Obergrenze und seinem
    Protokoll. Zwei Stellen, die Discord-Rollen entziehen, soll es nicht geben.
  */
  const whopAblauf = await beendeAbgelaufeneWhopZugaenge(supabase, true);

  /*
    Die Rollen nach der Frist: Sie ist der Lauf, der Zugänge beendet, also ist
    hier der Zustand der Nacht vollständig.
  */
  const rollen = await rollenAbgleich(true);

  // Nach den Rollen: derselbe Zustand der Nacht, dieselbe Regel (`is_paid`).
  const tradingview = await markiereTvEntzuege(supabase, true);

  // Zuletzt der Rauswurf. Ohne Discord-Einrichtung übersprungen.
  const entfernt = discordBotConfigured()
    ? await entferneFaelligeAutomatisch(supabase)
    : { gelaufen: false, faellig: 0, entfernt: 0, ergebnisse: [], grund: "Discord-Bot nicht eingerichtet." };

  /*
    Der Lauf gilt nur als sauber, wenn keine Zeile Ärger gemacht hat. Ein
    `ok: true` neben einer Fehlerliste ist genau der stille Nuller, den man
    wochenlang übersieht.
  */
  /*
    Zuletzt die Messung. Ihr Ergebnis geht ausdrücklich **nicht** in `ok` ein:
    Eine fehlende Tagesrechnung ist keine Störung des Betriebs, und ein rot
    gefärbter Nachtlauf, hinter dem nur eine Statistik steckt, wäre genau der
    Alarm, den man nach dreimal nicht mehr liest.
  */
  const kaufweg = await kaufwegAbschluss();

  // Onboarding: Vorstellungen im Discord-Kanal abhaken. Statistik wie oben, nicht in `ok`.
  const vorstellungen = await erkenneVorstellungen(supabase);

  return NextResponse.json({
    ok:
      aufschuebe.fehler.length === 0 &&
      frist.fehler.length === 0 &&
      whopAblauf.fehler.length === 0 &&
      !whopAblauf.ausgesetzt &&
      !rollen.fehler &&
      !rollen.ausgesetzt &&
      tradingview.fehler.length === 0 &&
      (entfernt.gelaufen || !discordBotConfigured()),
    dauer_ms: Date.now() - start,
    aufschuebe,
    frist,
    whopAblauf,
    whopKampagne: await whopKampagneStand(),
    rollen,
    tradingview,
    entfernt,
    kaufweg,
    vorstellungen,
  });
}

/**
 * Die Kaufweg-Messung abschließen: Tagesrechnung aufstellen, Rohdaten aufräumen.
 *
 * ── Warum drei Tage und nicht einer ────────────────────────────────────────
 *
 * Gerechnet wird über `gestern` **und** die zwei Tage davor. Der Grund ist der
 * verspätete Beleg: Eine Sitzung, die um 23:58 beginnt, meldet ihren
 * Endstand nach Mitternacht; ein Kauf aus ihr trifft als Webhook noch später
 * ein. Wer nur den Vortag rechnet, friert diese Tage in einem halbfertigen
 * Stand ein. Der Neuaufbau ist idempotent (er löscht den Zeitraum und schreibt
 * ihn neu), deshalb kostet die Überlappung nichts außer ein paar Zeilen.
 *
 * Der heutige Tag wird hier **nicht** gerechnet — er ist noch nicht vorbei.
 * Die Admin-Ansicht rechnet ihn bei jedem Aufruf selbst.
 *
 * Wirft nie: Ohne Migration 101 gibt es die Tabellen nicht, und das ist kein
 * Grund, den Nachtlauf rot zu färben.
 */
async function kaufwegAbschluss() {
  try {
    const aggregat = await aggregiereZeitraum(createServiceClient(), tagVor(3), tagVor(1));
    const aufgeraeumt = await raeumeRohdatenAuf(createServiceClient());
    return { gelaufen: aggregat.gelaufen, aufbewahrungTage: AUFBEWAHRUNG_TAGE, aggregat, aufgeraeumt };
  } catch (err) {
    return { gelaufen: false, fehler: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Der Rollenabgleich als Schritt des Nachtlaufs. Wirft nie: Ohne Discord-
 * Einrichtung wird er übersprungen, ein Fehler landet im Bericht.
 */
async function rollenAbgleich(schreiben: boolean): Promise<{
  gelaufen: boolean;
  geprueft?: number;
  behoben?: number;
  entzugGeplant?: number;
  ausgesetzt?: string;
  fehler?: string;
  abweichungen?: Array<Pick<ReconcileResult["details"][number], "userId" | "desired" | "actual" | "fixed" | "note">>;
}> {
  if (!discordBotConfigured() || !mitgliedsRolleId()) return { gelaufen: false };
  try {
    const ergebnis = await reconcileDiscordRoles({
      apply: schreiben,
      triggeredBy: "script",
      maxEntzug: ROLLENENTZUG_MAX_PRO_NACHT,
      warteraumSetzen: true,
      // Die Probe schreibt nichts, auch keine Protokollzeile.
      ohneProtokoll: !schreiben,
      zurueckNurAusWarteraum: true,
    });
    const abweichungen = ergebnis.details
      .filter(
        (d) =>
          (d.desired === "regular" && d.actual === "waiting_room") ||
          (d.desired === "none" && d.actual === "regular"),
      )
      .map(({ userId, desired, actual, fixed, note }) => ({ userId, desired, actual, fixed, note }));
    return {
      gelaufen: true,
      geprueft: ergebnis.checkedCount,
      behoben: ergebnis.fixedCount,
      entzugGeplant: ergebnis.entzugGeplant,
      ausgesetzt: ergebnis.entzugAusgesetzt,
      abweichungen,
    };
  } catch (err) {
    return { gelaufen: false, fehler: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Was der Whop-Umzug heute bräuchte — **gemeldet, nicht verschickt**.
 *
 * Der Nachtlauf sagt, welche Stufe bei wie vielen fällig wäre; ausgelöst wird
 * sie von Hand über `/api/admin/whop-umzug` bzw. `npm run whop:umzug`. Die
 * Trennung ist Absicht: Ein Cron, der Kundenpost ohne Auslöser verschickt, ist
 * genau eine falsche Zeile davon entfernt, 29 Leuten dasselbe dreimal zu
 * schicken.
 *
 * Wirft nie: Ohne Migration 100 gibt es den Kreis nicht, und das ist kein
 * Grund, den Nachtlauf rot zu färben.
 */
async function whopKampagneStand() {
  try {
    return { gelaufen: true, ...zaehleKreis(await ladeUmzugKreis()) };
  } catch (err) {
    return { gelaufen: false, fehler: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Was der Lauf heute täte, ohne es zu tun: welche Fälle eine Erinnerung
 * bekämen, welche gesperrt würden, welche Aufschübe abliefen.
 *
 * Grob gerechnet: Ob die Person inzwischen einen anderen Zugang hat (dann
 * passiert gar nichts), prüft erst der echte Lauf.
 */
async function probe() {
  const supabase = createServiceClient();
  const jetzt = Date.now();

  const [offenRes, aufschubRes] = await Promise.all([
    supabase
      .from("zahlungsfall")
      .select("id,user_id,frist,erinnerungen,eroeffnet_am,betrag_cents")
      .is("geschlossen_am", null)
      .eq("status", "offen")
      .not("frist", "is", null),
    supabase
      .from("zahlungsfall")
      .select("id,user_id,aufschub_bis")
      .eq("status", "aufschub")
      .lt("aufschub_bis", new Date(jetzt).toISOString()),
  ]);

  if (offenRes.error || aufschubRes.error) {
    return NextResponse.json(
      { ok: false, error: offenRes.error?.message ?? aufschubRes.error?.message },
      { status: 502 },
    );
  }

  const faelle = (offenRes.data ?? []) as Array<{
    id: string;
    user_id: string;
    frist: string;
    erinnerungen: number;
    eroeffnet_am: string;
    betrag_cents: number;
  }>;

  const plan = faelle.map((f) => {
    const vergangen = Math.floor((jetzt - new Date(f.eroeffnet_am).getTime()) / 86_400_000);
    const faelligerTag = ERINNERUNG_TAGE[f.erinnerungen];
    const aktion =
      new Date(f.frist).getTime() <= jetzt
        ? "sperre"
        : faelligerTag !== undefined && vergangen >= faelligerTag
          ? `erinnerung ${f.erinnerungen + 1}`
          : "nichts";
    return { fallId: f.id, userId: f.user_id, tag: vergangen, frist: f.frist, aktion };
  });

  return NextResponse.json({
    ok: true,
    probe: true,
    offeneFaelleMitFrist: faelle.length,
    heute: plan.filter((p) => p.aktion !== "nichts"),
    aufschuebeAbgelaufen: (aufschubRes.data ?? []).length,
    whopAblauf: await beendeAbgelaufeneWhopZugaenge(supabase, false),
    whopKampagne: await whopKampagneStand(),
    rollen: await rollenAbgleich(false),
    tradingview: await markiereTvEntzuege(supabase, false),
    rauswurf: await rauswurfProbe(supabase),
    hinweis:
      "Grob gerechnet. Hat eine Person inzwischen einen anderen Zugang (neues Abo, Lifetime), " +
      "schliesst der echte Lauf den Fall statt zu erinnern oder zu sperren. Hat sie keinen Zugang mehr, " +
      "wird sofort gesperrt.",
  });
}

/**
 * Wen der Rauswurf heute träfe und wen in den nächsten sieben Tagen. Ändert
 * nichts. `wuerdeLaufen` ist falsch, sobald die Obergrenze überschritten ist
 * oder eine Schutzrolle fehlt — dann entfernt der echte Lauf niemanden.
 */
async function rauswurfProbe(supabase: ReturnType<typeof createServiceClient>) {
  if (!discordBotConfigured()) return { gelaufen: false, grund: "Discord-Bot nicht eingerichtet." };
  const stand = await ladeAufraeumstand(supabase);
  if (stand.fehler.length > 0) return { gelaufen: false, grund: stand.fehler.join(" ") };
  const faellig = faelligeEntfernungen(stand);
  return {
    gelaufen: true,
    karenzTage: KARENZ_TAGE,
    grenze: ENTFERNEN_MAX_PRO_NACHT,
    wuerdeLaufen: faellig.length <= ENTFERNEN_MAX_PRO_NACHT && stand.schutzrollenFehlend.length === 0,
    schutzrollenFehlend: stand.schutzrollenFehlend,
    zaehler: stand.zaehler,
    faellig: faellig.map((p) => ({ name: p.username, userId: p.userId, gesperrtSeit: p.gesperrtSeit, warteraum: p.warteraum })),
    demnaechst: baldFaellig(stand).map((p) => ({ name: p.username, userId: p.userId, faelligAm: p.faelligAm })),
  };
}
