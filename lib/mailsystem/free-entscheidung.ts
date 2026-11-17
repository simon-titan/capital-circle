import { TAG_MS, STUNDE_MS } from "./zeit";
import { VORLAGEN, type VorlageId } from "./vorlagen";

/**
 * Welche Mail des Free-Kurses ist jetzt dran? — als reine Funktion, damit
 * dieselbe Regel im Cron läuft und in den Abnahmetests geprüft wird
 * (`free-entscheidung.test.ts`, Playbook Kapitel 13).
 *
 * Abgedeckt: S01/S02 (kein Lernstart), L01–L04 (Lernfortschritt), I01–I03
 * (Einladung ohne Anfrage), E01/E02/E04/E05 (Ende und Verlängerung).
 * A01–A03 und E03 hängen an einer Handlung (Absenden, Entscheidung,
 * Verlängerung) und gehen direkt dort raus, nicht über diese Funktion.
 *
 * Reihenfolge der Prüfung (Kapitel 07, „Vorrangfolge"):
 *   harte Zustell-/Kontaktgrenze → Vertrag/Recht → Sales-/Terminstatus →
 *   persönliche Pause → Einzelmail-Bedingung → Abstand → Versand.
 *
 * Jede Vorlage, die fällig wird, endet genau einmal im Protokoll: gesendet,
 * übersprungen (der Anlass ist überholt) oder gestoppt (der Weg ist zu).
 * Warten (Pause, Mindestabstand) hinterlässt nichts — bis die Verzögerung
 * 24 h überschreitet; dann wird übersprungen statt nachgeholt (Kapitel 08).
 */

export type FreeZustand = {
  jetzt: Date;
  /** Adresse gesperrt (Hard Bounce, Beschwerde). */
  gesperrt: boolean;
  /** Werbe-Mails abbestellt (`profiles.unsubscribed_at`). */
  abgemeldet: boolean;
  /** Persönliche Kontaktpause offen (`kontakt_pause`). */
  pause: boolean;
  /** Bezahltes Programm/Abo (Kauf ist harter Stopp, Regel 15). */
  gekauft: boolean;
  /** Gesprächsformular vollständig abgeschickt (nicht nur geöffnet). */
  anfrage: boolean;
  /** Termin gebucht und noch nicht vorbei, oder Gespräch geführt. */
  termin: boolean;
  zugang: {
    freigeschaltetAm: Date;
    originalEndeAm: Date;
    verlaengerungStatus: "keine" | "angefragt" | "aktiv";
    verlaengertAm: Date | null;
    verlaengerungEndeAm: Date | null;
    gestartetAm: Date | null;
    ausBestand: boolean;
  };
  /** Stand im Kurs. `fertig[n]` = Video n (1-basiert) abgeschlossen. */
  kurs: { videosDa: number; fertig: Record<number, boolean>; abgeschlossen: boolean };
  /** Bisherige Protokollzeilen dieser Einschreibung, je Vorlage. */
  protokoll: Partial<Record<VorlageId, { status: string; gesendetAm: Date | null }>>;
  /** Letzte automatische M/K-Sendung an diese Adresse (gleich welcher Weg), oder A02. */
  letzteMarketingAm: Date | null;
};

export type FreeErgebnis = {
  /** Höchstens eine Mail je Lauf und Kontakt. */
  senden: { vorlage: VorlageId; faelligAm: Date } | null;
  /** Endgültig erledigte Vorlagen ohne Versand — ins Protokoll. */
  protokoll: { vorlage: VorlageId; status: "uebersprungen" | "gestoppt"; grund: string; faelligAm: Date }[];
  /** Fällig, aber gerade zurückgehalten (nur zur Anzeige / Diagnose). */
  wartet: { vorlage: VorlageId; grund: string }[];
};

/** Reine Abstands- oder Pausenverzögerung: höchstens 24 h, dann überspringen. */
const MAX_VERZUG_MS = 24 * STUNDE_MS;
const MINDESTABSTAND_MS = 24 * STUNDE_MS;

type Kandidat = {
  vorlage: VorlageId;
  faellig: Date;
  /** Spätester sinnvoller Zeitpunkt (z. B. „endet morgen" nur vor dem Ende). */
  bis?: Date;
  /** Ohne Höchstverzug (vorgezogene L04: fällig „sobald erlaubt"). */
  ohneVerzug?: boolean;
};

const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

export function entscheideFree(z: FreeZustand): FreeErgebnis {
  const { jetzt, zugang, kurs, protokoll } = z;
  const ergebnis: FreeErgebnis = { senden: null, protokoll: [], wartet: [] };
  const erledigt = (id: VorlageId) => Boolean(protokoll[id]);
  const gesendetAm = (id: VorlageId) => (protokoll[id]?.status === "gesendet" ? protokoll[id]?.gesendetAm ?? null : null);

  // Bis 17.11.2026 „Video 5 oder Kurs fertig" — Video 5 ist raus, der Kurs endet mit Video 4.
  const v5 = kurs.abgeschlossen;
  const verlEnde = zugang.verlaengerungStatus === "aktiv" ? zugang.verlaengerungEndeAm : null;

  /* ── Kandidaten mit Fälligkeit ─────────────────────────────────────────── */
  const kandidaten: Kandidat[] = [
    { vorlage: "S01", faellig: plus(zugang.freigeschaltetAm, 24 * STUNDE_MS) },
    { vorlage: "S02", faellig: plus(zugang.freigeschaltetAm, 72 * STUNDE_MS) },
  ];
  if (zugang.gestartetAm) {
    const g = zugang.gestartetAm;
    kandidaten.push(
      { vorlage: "L01", faellig: plus(g, 2 * TAG_MS) },
      { vorlage: "L02", faellig: plus(g, 5 * TAG_MS) },
      { vorlage: "L03", faellig: plus(g, 8 * TAG_MS) },
    );
    // Kurs fertig zieht L04 auf den nächsten zulässigen Versand vor.
    kandidaten.push(v5 ? { vorlage: "L04", faellig: g, ohneVerzug: true } : { vorlage: "L04", faellig: plus(g, 10 * TAG_MS) });
  }
  const l04 = gesendetAm("L04");
  if (l04) {
    kandidaten.push(
      { vorlage: "I01", faellig: plus(l04, 2 * TAG_MS) },
      { vorlage: "I02", faellig: plus(l04, 5 * TAG_MS) },
      { vorlage: "I03", faellig: plus(l04, 9 * TAG_MS) },
    );
  }
  kandidaten.push(
    { vorlage: "E01", faellig: plus(zugang.originalEndeAm, -24 * STUNDE_MS), bis: zugang.originalEndeAm },
    { vorlage: "E02", faellig: zugang.originalEndeAm },
  );
  if (verlEnde) {
    kandidaten.push(
      { vorlage: "E04", faellig: plus(verlEnde, -24 * STUNDE_MS), bis: verlEnde },
      { vorlage: "E05", faellig: verlEnde },
    );
  }

  const sendbar: Kandidat[] = [];
  const endgueltig = (k: Kandidat, status: "uebersprungen" | "gestoppt", grund: string) =>
    ergebnis.protokoll.push({ vorlage: k.vorlage, status, grund, faelligAm: k.faellig });

  for (const k of kandidaten) {
    if (erledigt(k.vorlage)) continue;
    if (k.faellig.getTime() > jetzt.getTime()) continue;
    const id = k.vorlage;
    const lernfolge = id.startsWith("S") || id.startsWith("L") || id.startsWith("I");

    /* 1. Harte Grenzen */
    if (z.gesperrt) {
      endgueltig(k, "gestoppt", "zustellsperre");
      continue;
    }
    if (z.abgemeldet) {
      // Alle hier sind Klasse M — ohne Werbefreigabe nichts davon.
      endgueltig(k, "gestoppt", "abgemeldet");
      continue;
    }
    /* 2. Vertrag/Recht */
    if (z.gekauft) {
      endgueltig(k, "gestoppt", "kauf");
      continue;
    }
    /* 3. Sales-/Terminstatus und Weg-Ende */
    if (lernfolge) {
      if (zugang.ausBestand) {
        endgueltig(k, "gestoppt", "bestand");
        continue;
      }
      // Das ursprüngliche Free-Ende schließt S/L/I — auch nach einer Verlängerung.
      if (jetzt.getTime() >= zugang.originalEndeAm.getTime()) {
        endgueltig(k, "gestoppt", "free_ende");
        continue;
      }
      if (z.anfrage) {
        endgueltig(k, "gestoppt", "anfrage");
        continue;
      }
      if (z.termin) {
        endgueltig(k, "gestoppt", "termin");
        continue;
      }
    }

    /* 4. Einzelmail-Bedingungen */
    if ((id === "S01" || id === "S02") && zugang.gestartetAm) {
      endgueltig(k, "gestoppt", "lernstart");
      continue;
    }
    if ((id === "L01" || id === "L02" || id === "L03") && v5) {
      endgueltig(k, "uebersprungen", "video5_fertig");
      continue;
    }
    if (id === "L01" && kurs.fertig[3]) {
      endgueltig(k, "uebersprungen", "video3_fertig");
      continue;
    }
    if (id === "L02" && kurs.fertig[4]) {
      endgueltig(k, "uebersprungen", "video4_fertig");
      continue;
    }
    if ((id === "E01" || id === "E04") && kurs.abgeschlossen) {
      endgueltig(k, "uebersprungen", "kurs_fertig");
      continue;
    }
    if (id === "E01" && zugang.verlaengerungStatus !== "keine") {
      endgueltig(k, "uebersprungen", "verlaengert");
      continue;
    }
    if (id === "E02" && zugang.verlaengerungStatus !== "keine") {
      endgueltig(k, "uebersprungen", "verlaengerung");
      continue;
    }
    if (k.bis && jetzt.getTime() >= k.bis.getTime()) {
      endgueltig(k, "uebersprungen", "verpasst");
      continue;
    }
    // Ohne hochgeladene Videos gibt es nichts, wozu S/L einladen könnten.
    if (lernfolge && kurs.videosDa === 0) {
      ergebnis.wartet.push({ vorlage: id, grund: "keine_videos" });
      continue;
    }

    /* 5. Persönliche Pause und Termin-Hold (vorübergehend) */
    // E05 ist die ausdrückliche Ausnahme (Regel 19): Pause und Termin halten sie nicht auf.
    const haeltPause = z.pause && id !== "E05";
    const haeltTermin = z.termin && (id === "E01" || id === "E04");
    if (haeltPause || haeltTermin) {
      if (!k.ohneVerzug && jetzt.getTime() - k.faellig.getTime() > MAX_VERZUG_MS) {
        endgueltig(k, "uebersprungen", "verpasst");
      } else {
        ergebnis.wartet.push({ vorlage: id, grund: haeltPause ? "pause" : "termin" });
      }
      continue;
    }

    if (!k.ohneVerzug && jetzt.getTime() - k.faellig.getTime() > MAX_VERZUG_MS) {
      endgueltig(k, "uebersprungen", "verpasst");
      continue;
    }
    sendbar.push(k);
  }

  if (sendbar.length === 0) return ergebnis;

  /* 6. Priorität, dann der frühere reale Anlass */
  sendbar.sort(
    (a, b) => VORLAGEN[a.vorlage].prioritaet - VORLAGEN[b.vorlage].prioritaet || a.faellig.getTime() - b.faellig.getTime(),
  );

  /* 7. Mindestabstand 24 h zwischen automatischen M/K-Sendungen */
  if (z.letzteMarketingAm && jetzt.getTime() - z.letzteMarketingAm.getTime() < MINDESTABSTAND_MS) {
    for (const k of sendbar) ergebnis.wartet.push({ vorlage: k.vorlage, grund: "abstand" });
    return ergebnis;
  }

  const [erste, ...rest] = sendbar;
  ergebnis.senden = { vorlage: erste.vorlage, faelligAm: erste.faellig };
  for (const k of rest) ergebnis.wartet.push({ vorlage: k.vorlage, grund: "abstand" });
  return ergebnis;
}
