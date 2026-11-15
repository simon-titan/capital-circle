import type { KontaktDetail, KontaktZeile, TerminKurz } from "@/lib/crm/daten";
import type { TeamMitglied } from "@/lib/crm/zuweisung";

/**
 * Beispieldaten für die CRM-Vorschau (`/vorschau/mentoring/crm`, nur lokal).
 * Alle Zeiten relativ zu „jetzt", damit Termin läuft / verpasst / später immer
 * zu sehen sind. Erfundene Personen, keine echten Kontakte.
 */

const MIN = 60_000;
const TAG = 24 * 60 * MIN;

export const TEAM: TeamMitglied[] = [
  { user_id: "u-simon", name: "Simon", kuerzel: "simon", calendly_email: null, block_von: "17:00:00", block_bis: "19:00:00", aktiv: true },
  { user_id: "u-kevin", name: "Kevin", kuerzel: "kevin", calendly_email: null, block_von: "15:00:00", block_bis: "17:00:00", aktiv: true },
  { user_id: "u-daniel", name: "Daniel", kuerzel: "daniel", calendly_email: null, block_von: "13:00:00", block_bis: "15:00:00", aktiv: true },
];

type Roh = [name: string, phase: string, closer: string | null, quelle: string, erstelltVorMin: number, aktivVorMin: number | null, wvInMin: number | null, terminInMin: number | null, wert?: number];

const ROH: Roh[] = [
  ["Lukas Brandt", "neu", null, "call_funnel", 12, null, null, null],
  ["Mara Schulte", "neu", null, "training", 47, null, null, null],
  ["Jonas Weber", "neu", "u-simon", "call_funnel", 26 * 60, null, null, null],
  ["Aylin Kaya", "neu", "u-kevin", "bewerbung", 3 * 60, null, null, null],
  ["Tobias Krüger", "kontaktiert", "u-simon", "call_funnel", 5 * TAG / MIN, 2 * 60, -45, null],
  ["Sophie Hartmann", "kontaktiert", "u-daniel", "training", 6 * TAG / MIN, 4 * TAG / MIN, null, null],
  ["Felix Wagner", "kontaktiert", "u-kevin", "call_funnel", 3 * TAG / MIN, 20 * 60, 18 * 60, null],
  ["Nina Scholz", "termin", "u-simon", "call_funnel", 2 * TAG / MIN, 30 * 60, null, -6],
  ["David Lehmann", "termin", "u-kevin", "training", 4 * TAG / MIN, 26 * 60, null, -38],
  ["Elena Fischer", "termin", "u-daniel", "call_funnel", 1 * TAG / MIN, 3 * 60, null, 95],
  ["Marco Richter", "termin", "u-simon", "termin_direct", 3 * TAG / MIN, 22 * 60, null, 200],
  ["Julia Neumann", "termin", "u-kevin", "call_funnel", 2 * TAG / MIN, 8 * 60, null, 26 * 60],
  ["Patrick Schmitz", "no_show", "u-daniel", "call_funnel", 5 * TAG / MIN, 3 * TAG / MIN, null, null],
  ["Lea Zimmermann", "gespraech", "u-simon", "call_funnel", 7 * TAG / MIN, 20 * 60, 16 * 60, null, 300_000],
  ["Kai Hoffmann", "gespraech", "u-kevin", "training", 9 * TAG / MIN, 4 * TAG / MIN, null, null, 500_000],
  ["Sarah Becker", "angebot", "u-simon", "call_funnel", 8 * TAG / MIN, 26 * 60, -120, null, 500_000],
  ["Tim Schäfer", "angebot", "u-daniel", "call_funnel", 10 * TAG / MIN, 3 * 60, 2 * 60, null, 300_000],
  ["Laura Koch", "spaeter", "u-kevin", "bewerbung", 20 * TAG / MIN, 6 * TAG / MIN, 4 * TAG / MIN, null],
  ["Ben Wolf", "gewonnen", "u-simon", "call_funnel", 14 * TAG / MIN, 2 * TAG / MIN, null, null, 500_000],
  ["Clara Meyer", "gewonnen", "u-daniel", "training", 12 * TAG / MIN, 5 * TAG / MIN, null, null, 79_900],
  ["Niklas Braun", "verloren", "u-kevin", "call_funnel", 15 * TAG / MIN, 7 * TAG / MIN, null, null],
  ["Hannah Vogel", "kontaktiert", null, "discord_funnel", 9 * TAG / MIN, 5 * TAG / MIN, null, null],
];

function iso(ms: number) {
  return new Date(ms).toISOString();
}

export function beispielKontakte(jetzt: number): KontaktZeile[] {
  return ROH.map(([name, phase, closer, quelle, erstellt, aktiv, wv, termin, wert], i) => {
    const vorname = name.split(" ")[0]!.toLowerCase();
    return {
      id: `k-${String(i + 1).padStart(2, "0")}`,
      email: `${vorname}.${name.split(" ")[1]!.toLowerCase().replace("ü", "ue").replace("ä", "ae")}@beispiel.de`,
      name,
      telefon: i % 5 === 3 ? null : `+49 15${i % 10} ${String(2_340_000 + i * 7_911).slice(0, 7)}`,
      quelle,
      quellen: [quelle],
      kanal: i % 3 === 0 ? "youtube" : i % 3 === 1 ? "instagram" : null,
      closer_id: closer,
      phase,
      wiedervorlage_am: wv === null ? null : iso(jetzt + wv * MIN),
      verlust_grund: phase === "verloren" ? "budget" : null,
      produkt: wert ? (wert === 500_000 ? "premium" : wert === 79_900 ? "ausbildung" : "main") : null,
      wert_cents: wert ?? null,
      letzte_aktivitaet_am: aktiv === null ? null : iso(jetzt - aktiv * MIN),
      created_at: iso(jetzt - erstellt * MIN),
      updated_at: iso(jetzt - (aktiv ?? erstellt) * MIN),
      naechsterTermin: termin === null ? null : iso(jetzt + termin * MIN),
    };
  });
}

export function beispielHeute(jetzt: number): { termine: TerminKurz[]; ohneErgebnis: TerminKurz[] } {
  const kontakte = beispielKontakte(jetzt);
  const t = (k: KontaktZeile, startInMin: number, status = "gebucht"): TerminKurz => ({
    id: `t-${k.id}-${startInMin}`,
    email: k.email,
    name: k.name,
    start_am: iso(jetzt + startInMin * MIN),
    status,
    berater_name: TEAM.find((m) => m.user_id === k.closer_id)?.name ?? null,
    join_url: "https://zoom.us/j/123",
    kontaktId: k.id,
    closerId: k.closer_id,
    telefon: k.telefon,
  });
  const k = (name: string) => kontakte.find((x) => x.name === name)!;
  return {
    termine: [
      t(k("Lea Zimmermann"), -240, "gefuehrt"),
      t(k("Patrick Schmitz"), -150, "no_show"),
      t(k("David Lehmann"), -38),
      t(k("Nina Scholz"), -6),
      t(k("Elena Fischer"), 95),
      t(k("Marco Richter"), 200),
      t(k("Julia Neumann"), 26 * 60),
    ],
    ohneErgebnis: [t(k("Kai Hoffmann"), -26 * 60, "gefuehrt")],
  };
}

export function beispielDetail(id: string, jetzt: number): KontaktDetail | null {
  const zeile = beispielKontakte(jetzt).find((k) => k.id === id);
  if (!zeile) return null;
  const { naechsterTermin: _termin, ...rest } = zeile;
  void _termin;
  const vor = (min: number) => iso(jetzt - min * MIN);
  const gestern = jetzt - TAG;
  return {
    kontakt: { ...rest, verlust_notiz: null, user_id: "user-1", gewonnen_am: null },
    pause: false,
    team: TEAM,
    aktivitaeten: [
      { id: "a1", art: "anruf", ergebnis: "erreicht", text: "Will bis morgen mit Partnerin sprechen, Premium interessant, Raten wichtig.", von: "u-simon", am: vor(20 * 60) },
      { id: "a2", art: "ergebnis", ergebnis: null, text: "Entscheidung offen · Premium Mentoring · Bedenkzeit", von: "u-simon", am: vor(25 * 60) },
      { id: "a3", art: "termin", ergebnis: null, text: "Termin als geführt markiert", von: "u-simon", am: vor(25 * 60 + 5) },
      { id: "a4", art: "notiz", ergebnis: null, text: "Tradet seit 8 Monaten nebenbei, Funded Account gescheitert. Sehr motiviert.", von: "u-simon", am: vor(3 * 1440) },
      { id: "a5", art: "phase", ergebnis: null, text: "Kontaktiert → Termin gebucht", von: null, am: vor(4 * 1440) },
      { id: "a6", art: "zuweisung", ergebnis: null, text: "Call-Block 17–19 Uhr → Simon", von: null, am: vor(4 * 1440 + 2) },
      { id: "a7", art: "anruf", ergebnis: "nicht_erreicht", text: null, von: "u-kevin", am: vor(5 * 1440) },
      { id: "a8", art: "system", ergebnis: null, text: "Kontakt aus dem Call-Funnel angelegt", von: null, am: zeile.created_at },
    ],
    antworten: [
      {
        quelle: "call_funnel",
        am: zeile.created_at,
        eintraege: [
          { frage: "Wie lange tradest du schon?", antwort: "6–12 Monate" },
          { frage: "Was ist dein Ziel?", antwort: "Funded Account bestehen und davon leben" },
          { frage: "Wie viel kannst du in deine Ausbildung investieren?", antwort: "3.000–5.000 €" },
          { frage: "Was ist deine größte Schwierigkeit?", antwort: "Ich halte meine Regeln nicht ein, sobald ich zwei Verluste hintereinander habe." },
        ],
      },
    ],
    termine: [
      {
        id: "t-1",
        start_am: iso(gestern - 60 * MIN),
        status: "gefuehrt",
        berater_name: "Simon",
        join_url: null,
        umbuchen_url: null,
        no_show_am: null,
        vorgaenger_id: null,
        ergebnis: {
          id: "e1",
          termin_id: "t-1",
          version: 1,
          outcome: "open_decision",
          produkt: "premium",
          grund: "consideration",
          notiz: "Spricht mit Partnerin",
          follow_up_am: iso(jetzt + 16 * 60 * MIN),
          von: "u-simon",
          am: iso(gestern),
        },
      },
      { id: "t-0", start_am: iso(jetzt - 6 * TAG), status: "no_show", berater_name: "Kevin", join_url: null, umbuchen_url: null, no_show_am: iso(jetzt - 6 * TAG), vorgaenger_id: null, ergebnis: null },
    ],
    mails: [
      { vorlage: "T01", status: "gesendet", grund: null, gesendet_am: vor(4 * 1440), created_at: vor(4 * 1440) },
      { vorlage: "T02", status: "gesendet", grund: null, gesendet_am: vor(2 * 1440), created_at: vor(2 * 1440) },
      { vorlage: "N01", status: "gestoppt", grund: "phase", gesendet_am: null, created_at: vor(1440) },
    ],
    kaeufe: [],
    kassenlinks: [{ id: "kl1", token: "x", produkt: "premium", raten: 4, status: "offen", created_at: vor(20 * 60), closer: "u-simon" }],
    training: { gestartetAm: vor(9 * 1440), endeAm: iso(jetzt + 21 * TAG), bewerbungStatus: "angenommen" },
  };
}

export function beispielAuswertung(): { stats: import("@/lib/crm/daten").CloserStat[] } {
  const s = (closerId: string, name: string, kontakte: number, termine: number, gefuehrt: number, noShow: number, gewonnen: number, verloren: number, main: number, premium: number, ausbildung: number, bezahlt: number) => ({
    closerId,
    name,
    kontakte,
    termine,
    gefuehrt,
    noShow,
    gewonnen,
    verloren,
    wertJeProdukt: {
      main: { anzahl: main, cents: main * 300_000 },
      premium: { anzahl: premium, cents: premium * 500_000 },
      ausbildung: { anzahl: ausbildung, cents: ausbildung * 79_900 },
    },
    wertCents: main * 300_000 + premium * 500_000 + ausbildung * 79_900,
    bezahltCents: bezahlt,
  });
  return {
    stats: [
      s("u-simon", "Simon", 34, 21, 17, 4, 6, 5, 3, 2, 1, 1_420_000),
      s("u-kevin", "Kevin", 29, 18, 13, 5, 4, 6, 2, 1, 1, 860_000),
      s("u-daniel", "Daniel", 22, 14, 11, 3, 3, 4, 1, 1, 1, 640_000),
    ],
  };
}
