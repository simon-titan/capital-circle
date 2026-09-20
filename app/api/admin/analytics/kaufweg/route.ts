import { NextResponse, type NextRequest } from "next/server";
import {
  ABSCHNITTE,
  ABSCHNITT_TITEL,
  BAUTEILE,
  BAUTEIL_TITEL,
  istZeitraum,
  quote,
  tagesSchluessel,
  type Abschnitt,
  type Bauteil,
} from "@/lib/analytics/kaufweg";
import {
  baueTrichter,
  dauerVerteilung,
  fasseAbschnitte,
  nachBauteil,
  nachHerkunft,
  nachTag,
  scrollVerteilung,
  summiere,
} from "@/lib/analytics/aggregat";
import { aggregiereZeitraum, ladeTage, naechsterTag, tagVor } from "@/lib/analytics/speicher";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/kaufweg?tage=30[&neu=1]
 *
 * Alles, was die Ansicht `/admin/kaufweg` zeigt, in einer Antwort.
 *
 * ── Zwei Quellen, getrennt gehalten ────────────────────────────────────────
 *
 * Besuche, Verweildauer, Scrolltiefe und Klicks stammen aus der **eigenen
 * Messung** der Verkaufsseite (`funnel_tage`). Kassen, Käufe und Abbrüche
 * stammen aus **`checkout_sessions`**, fehlgeschlagene Zahlungen aus
 * **`payments`**. Das sind drei verschiedene Dinge, und sie decken sich
 * absichtlich nicht: In der Kasse landen auch Käufer, die nie auf der
 * Verkaufsseite waren (Upgrade aus `/billing`, Link aus einer E-Mail), und
 * eine Zahlung kann Monate nach dem Kauf scheitern.
 *
 * Deshalb trägt **jede** Kennzahl in dieser Antwort einen Satz mit, der sagt,
 * woher sie kommt (`hinweise`). Die Ansicht zeigt ihn. Ohne das vergleicht
 * irgendwann jemand Äpfel mit Birnen und hält eine Übergangsquote über 100 %
 * für einen Fehler.
 *
 * ── Warum hier gerechnet wird ──────────────────────────────────────────────
 *
 * Der Nachtlauf stellt die Tagesrechnung bis gestern auf. Heute fehlt dann
 * noch — und genau heute schaut man hin, wenn man etwas geändert hat. Diese
 * Route rechnet deshalb die letzten beiden Tage bei jedem Aufruf neu (das sind
 * wenige Zeilen und der Neuaufbau ist idempotent). `?neu=1` rechnet den ganzen
 * Zeitraum neu — für den Fall, dass der Nachtlauf ausgefallen ist.
 */

interface KassenZeile {
  id: string;
  plan: string;
  status: string;
  src: string | null;
  funnel_sitzung: string | null;
  created_at: string;
  bezahlt_am: string | null;
  abgebrochen_am: string | null;
}

interface ZahlungsZeile {
  created_at: string;
  amount_cents: number;
  failure_reason: string | null;
  user_id: string | null;
}

const HINWEISE: Record<string, string> = {
  besuche:
    "Eigene Messung der Verkaufsseite: ein Browser-Tab = ein Besuch. Zufällige Sitzungskennung im sessionStorage, kein Cookie, keine IP. Bots und Vorabrufe sind aussortiert.",
  dauer:
    "Nur die Zeit, in der der Tab im Vordergrund war. Ein Tab, der im Hintergrund offen bleibt, zählt nicht mit — sonst misst man offene Tabs statt gelesener Seiten.",
  scroll:
    "Tiefster erreichter Punkt der Seite in Prozent, gemessen an der Unterkante des Fensters. „so weit und nicht weiter“ — die Fächer summieren sich auf die Zahl der Besuche.",
  abschnitte:
    "Der weiteste Abschnitt, der die Bildschirmmitte gekreuzt hat. „Gestoppt“ ist die Zahl der Besuche, die genau dort endeten.",
  klicks:
    "Jeder Klick auf „Capital Circle beitreten“ oder den Kauf-Knopf, mit der Stelle, an der er steht. Ein Besucher kann mehrfach klicken — deshalb steht daneben die Zahl der Besuche mit mindestens einem Klick.",
  kasse:
    "Tabelle checkout_sessions: eine Zeile je Aufruf von /go/<plan>. Enthält auch Käufe, die nicht über die Verkaufsseite begannen (Upgrade aus /billing).",
  abbruch:
    "„Zurück“ = Rückkehr über /checkout/zurueck (sofort belegt). „Abgelaufen“ = Stripe-Ereignis checkout.session.expired, bei uns nach zwei Stunden. „Offen“ ist weder das eine noch das andere — meist eine Kasse, die gerade läuft.",
  zahlungen:
    "Tabelle payments mit status = failed, geschrieben vom Stripe-Webhook invoice.payment_failed. Enthält auch Fehlbuchungen bei laufenden Abos — die haben mit dem Kaufweg nichts zu tun.",
  herkunft:
    "Ein Begriff aus drei Quellen, in dieser Rangfolge: eigener ?src=-Parameter, dann utm_source, dann der Host der verweisenden Seite, sonst „direkt“. Die Kassen-Spalte ordnet über checkout_sessions.src zu.",
  pakete: "Aus checkout_sessions, nach Laufzeit. Bezieht sich auf die Kasse, nicht auf die Verkaufsseite.",
  kette:
    "Anteil der Kassen, deren Sitzungskennung mitgekommen ist (?sid= an /go/<plan>). Nur diese lassen sich einem Besuch zuordnen; der Rest sind Käufe über andere Wege oder Browser ohne sessionStorage.",
};

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const params = new URL(request.url).searchParams;
  const rohTage = Number(params.get("tage") ?? 30);
  const tage = istZeitraum(rohTage) ? rohTage : 30;
  const alleNeu = params.get("neu") === "1";

  const bisTag = tagesSchluessel(new Date());
  const vonTag = tagVor(tage - 1);
  const vonIso = `${vonTag}T00:00:00.000Z`;
  const bisIso = `${naechsterTag(bisTag)}T00:00:00.000Z`;

  const supabase = createServiceClient();

  /*
    Erst rechnen, dann lesen. Fällt die Rechnung aus (Tabellen fehlen), ist das
    kein Fehler der Ansicht — sie zeigt dann den Hinweis auf die Migration.
  */
  let aktualisiert: Awaited<ReturnType<typeof aggregiereZeitraum>> | { gelaufen: false; grund: string };
  try {
    aktualisiert = await aggregiereZeitraum(supabase, alleNeu ? vonTag : tagVor(1), bisTag);
  } catch (err) {
    aktualisiert = { gelaufen: false, grund: err instanceof Error ? err.message : String(err) };
  }

  const { tage: tagesZeilen, bauteile: bauteilZeilen, abschnitte: abschnittsZeilen, fehlt } = await ladeTage(
    supabase,
    vonTag,
    bisTag,
  );

  /* ── Kasse und Zahlungen ───────────────────────────────────────────────── */

  const [kassenRes, zahlungenRes] = await Promise.all([
    supabase
      .from("checkout_sessions")
      .select("id,plan,status,src,funnel_sitzung,created_at,bezahlt_am,abgebrochen_am")
      .gte("created_at", vonIso)
      .lt("created_at", bisIso)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("created_at,amount_cents,failure_reason,user_id")
      .eq("status", "failed")
      .gte("created_at", vonIso)
      .lt("created_at", bisIso)
      .order("created_at", { ascending: true }),
  ]);

  /*
    `funnel_sitzung` gibt es erst mit Migration 101. Fehlt sie, wird die
    Abfrage ohne die Spalte wiederholt — sonst stünde im Adminbereich ein
    Fehler, wo nur eine Spalte fehlt.
  */
  let kassen = (kassenRes.data ?? []) as KassenZeile[];
  if (kassenRes.error) {
    const ersatz = await supabase
      .from("checkout_sessions")
      .select("id,plan,status,src,created_at,bezahlt_am,abgebrochen_am")
      .gte("created_at", vonIso)
      .lt("created_at", bisIso)
      .order("created_at", { ascending: true });
    kassen = ((ersatz.data ?? []) as Omit<KassenZeile, "funnel_sitzung">[]).map((z) => ({
      ...z,
      funnel_sitzung: null,
    }));
  }

  const zahlungen = (zahlungenRes.data ?? []) as ZahlungsZeile[];

  /* ── Rechnen ───────────────────────────────────────────────────────────── */

  const summe = summiere(tagesZeilen);
  const tagesVerlauf = nachTag(tagesZeilen);

  const bezahlt = kassen.filter((k) => k.status === "completed");
  const zurueck = kassen.filter((k) => k.status === "canceled");
  const abgelaufen = kassen.filter((k) => k.status === "expired");
  const offen = kassen.filter((k) => k.status === "started");

  const trichter = baueTrichter({
    summe,
    kassenGestartet: kassen.length,
    kassenBezahlt: bezahlt.length,
  });

  /* Kassen und Käufe je Tag — dieselbe Achse wie der Besuchsverlauf. */
  const verlaufKarte = new Map<
    string,
    { tag: string; besuche: number; klicks: number; kassen: number; kaeufe: number; abbrueche: number; fehlzahlungen: number }
  >();
  const holeTag = (tag: string) => {
    let eintrag = verlaufKarte.get(tag);
    if (!eintrag) {
      eintrag = { tag, besuche: 0, klicks: 0, kassen: 0, kaeufe: 0, abbrueche: 0, fehlzahlungen: 0 };
      verlaufKarte.set(tag, eintrag);
    }
    return eintrag;
  };
  /* Jeden Tag des Zeitraums anlegen, auch die leeren: Eine Kurve, die
     Nulltage überspringt, verdichtet eine ruhige Woche optisch zu einem
     Ausschlag. */
  for (let i = 0; i < tage; i += 1) holeTag(tagVor(tage - 1 - i));
  for (const t of tagesVerlauf) {
    const eintrag = holeTag(t.tag);
    eintrag.besuche = t.sitzungen;
    eintrag.klicks = t.klicks;
  }
  for (const k of kassen) holeTag(tagesSchluessel(k.created_at)).kassen += 1;
  for (const k of bezahlt) holeTag(tagesSchluessel(k.bezahlt_am ?? k.created_at)).kaeufe += 1;
  for (const k of [...zurueck, ...abgelaufen]) {
    holeTag(tagesSchluessel(k.abgebrochen_am ?? k.created_at)).abbrueche += 1;
  }
  for (const z of zahlungen) holeTag(tagesSchluessel(z.created_at)).fehlzahlungen += 1;
  const verlauf = [...verlaufKarte.values()].sort((a, b) => a.tag.localeCompare(b.tag));

  /* Herkunft: eigene Messung links, Kasse rechts. Zugeordnet über `src`. */
  const kassenNachSrc = new Map<string, { kassen: number; kaeufe: number }>();
  for (const k of kassen) {
    const schluessel = k.src?.trim() || "direkt";
    const eintrag = kassenNachSrc.get(schluessel) ?? { kassen: 0, kaeufe: 0 };
    eintrag.kassen += 1;
    if (k.status === "completed") eintrag.kaeufe += 1;
    kassenNachSrc.set(schluessel, eintrag);
  }
  const herkunft = nachHerkunft(tagesZeilen).map((h) => {
    const kasse = kassenNachSrc.get(h.herkunft) ?? { kassen: 0, kaeufe: 0 };
    return {
      herkunft: h.herkunft,
      sitzungen: h.sitzungen,
      sitzungenMitKlick: h.sitzungen_mit_klick,
      klicks: h.klicks,
      klickQuote: quote(h.sitzungen_mit_klick, h.sitzungen),
      kassen: kasse.kassen,
      kaeufe: kasse.kaeufe,
      kaufQuote: quote(kasse.kaeufe, h.sitzungen),
      mittlereDauerSek:
        h.sitzungen > 0 ? Math.round(h.sichtbare_ms_summe / h.sitzungen / 1000) : 0,
    };
  });
  /* Herkünfte, die nur in der Kasse auftauchen (z. B. `billing`), gehören
     sichtbar dazu — sonst fehlen Käufe im Herkunfts-Bild, die es gab. */
  for (const [schluessel, kasse] of kassenNachSrc) {
    if (herkunft.some((h) => h.herkunft === schluessel)) continue;
    herkunft.push({
      herkunft: schluessel,
      sitzungen: 0,
      sitzungenMitKlick: 0,
      klicks: 0,
      klickQuote: 0,
      kassen: kasse.kassen,
      kaeufe: kasse.kaeufe,
      kaufQuote: 0,
      mittlereDauerSek: 0,
    });
  }
  herkunft.sort((a, b) => b.sitzungen - a.sitzungen || b.kassen - a.kassen);

  /* Pakete */
  const paketKarte = new Map<string, { plan: string; kassen: number; kaeufe: number; zurueck: number; abgelaufen: number }>();
  for (const k of kassen) {
    const eintrag = paketKarte.get(k.plan) ?? { plan: k.plan, kassen: 0, kaeufe: 0, zurueck: 0, abgelaufen: 0 };
    eintrag.kassen += 1;
    if (k.status === "completed") eintrag.kaeufe += 1;
    if (k.status === "canceled") eintrag.zurueck += 1;
    if (k.status === "expired") eintrag.abgelaufen += 1;
    paketKarte.set(k.plan, eintrag);
  }
  const pakete = [...paketKarte.values()]
    .map((p) => ({ ...p, quote: quote(p.kaeufe, p.kassen) }))
    .sort((a, b) => b.kassen - a.kassen);

  /* Gründe der gescheiterten Zahlungen, zusammengefasst. */
  const gruendeKarte = new Map<string, number>();
  for (const z of zahlungen) {
    const grund = (z.failure_reason ?? "ohne Angabe").slice(0, 120);
    gruendeKarte.set(grund, (gruendeKarte.get(grund) ?? 0) + 1);
  }
  const gruende = [...gruendeKarte.entries()]
    .map(([grund, anzahl]) => ({ grund, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, 8);

  const mitSitzung = kassen.filter((k) => Boolean(k.funnel_sitzung));

  return NextResponse.json({
    ok: true,
    /* Ohne Migration 101 gibt es keine eigene Messung — die Kassen-Zahlen
       stehen trotzdem, sie kommen aus Migration 069. */
    bereit: !fehlt,
    zeitraum: { tage, von: vonTag, bis: bisTag },
    aktualisiert,
    trichter,
    besuche: {
      sitzungen: summe.sitzungen,
      sitzungenMitKlick: summe.sitzungen_mit_klick,
      klicks: summe.klicks,
      modalGeoeffnet: summe.modal_geoeffnet,
      laufzeitGewaehlt: summe.laufzeit_gewaehlt,
      /* Absprung = ein Besuch ohne einen einzigen Klick auf einen Kauf-Knopf. */
      absprung: Math.max(0, summe.sitzungen - summe.sitzungen_mit_klick),
      absprungQuote: quote(Math.max(0, summe.sitzungen - summe.sitzungen_mit_klick), summe.sitzungen),
      mittlereDauerSek:
        summe.sitzungen > 0 ? Math.round(summe.sichtbare_ms_summe / summe.sitzungen / 1000) : 0,
    },
    verlauf,
    herkunft,
    pakete,
    dauer: dauerVerteilung(summe),
    scroll: scrollVerteilung(summe),
    abschnitte: fasseAbschnitte(abschnittsZeilen, ABSCHNITTE).map((a) => ({
      ...a,
      titel: ABSCHNITT_TITEL[a.abschnitt as Abschnitt] ?? a.abschnitt,
      anteil: quote(a.erreicht, summe.sitzungen),
    })),
    bauteile: nachBauteil(bauteilZeilen, BAUTEILE).map((b) => ({
      ...b,
      titel: BAUTEIL_TITEL[b.bauteil as Bauteil] ?? b.bauteil,
    })),
    kasse: {
      gestartet: kassen.length,
      bezahlt: bezahlt.length,
      zurueck: zurueck.length,
      abgelaufen: abgelaufen.length,
      offen: offen.length,
      abbrueche: zurueck.length + abgelaufen.length,
      abbruchQuote: quote(zurueck.length + abgelaufen.length, kassen.length),
      kaufQuote: quote(bezahlt.length, kassen.length),
    },
    zahlungen: {
      fehlgeschlagen: zahlungen.length,
      betroffene: new Set(zahlungen.map((z) => z.user_id).filter(Boolean)).size,
      summeCents: zahlungen.reduce((n, z) => n + (z.amount_cents ?? 0), 0),
      gruende,
    },
    kette: {
      kassen: kassen.length,
      mitSitzung: mitSitzung.length,
      anteil: quote(mitSitzung.length, kassen.length),
      kaeufeMitSitzung: mitSitzung.filter((k) => k.status === "completed").length,
    },
    hinweise: HINWEISE,
  });
}
