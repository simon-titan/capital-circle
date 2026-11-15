/**
 * Reine Anzeige-Logik des CRM (`/crm`): nächster Schritt je Kontakt, Zeitangaben,
 * Fehlertexte, Labels. Ohne Abhängigkeiten zu React oder Datenbank —
 * Tests in `anzeige.test.ts`. Zeiten immer in Europe/Berlin.
 */

import { NO_SHOW_ANRUF_MINUTEN } from "@/config/crm";

const TZ = "Europe/Berlin";
const MIN = 60_000;
const STD = 60 * MIN;
const TAG = 24 * STD;

/* ─── Zeit ─────────────────────────────────────────────────────────────── */

export function berlinTag(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(ms);
}

export function uhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** „heute 15:00", „morgen 10:30", „Mo, 17.11. 14:00". */
export function wann(iso: string, jetzt: number): string {
  const ms = new Date(iso).getTime();
  const tag = berlinTag(ms);
  if (tag === berlinTag(jetzt)) return `heute ${uhrzeit(iso)}`;
  if (tag === berlinTag(jetzt + TAG)) return `morgen ${uhrzeit(iso)}`;
  if (tag === berlinTag(jetzt - TAG)) return `gestern ${uhrzeit(iso)}`;
  const d = new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: TZ });
  return `${d} ${uhrzeit(iso)}`;
}

/** „gerade eben", „vor 12 Min.", „vor 3 Std.", „vor 2 Tagen", „in 40 Min." */
export function relativ(iso: string | null | undefined, jetzt: number): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - jetzt;
  const ab = Math.abs(diff);
  const vor = diff < 0;
  if (ab < MIN) return "gerade eben";
  let t: string;
  if (ab < STD) t = `${Math.floor(ab / MIN)} Min.`;
  else if (ab < TAG) t = `${Math.floor(ab / STD)} Std.`;
  else {
    const n = Math.floor(ab / TAG);
    t = `${n} ${n === 1 ? "Tag" : "Tagen"}`;
  }
  return vor ? `vor ${t}` : `in ${t}`;
}

/* ─── Nächster Schritt ─────────────────────────────────────────────────── */

export type SchrittTermin = {
  id: string;
  start_am: string;
  status: string;
  join_url: string | null;
  hatErgebnis: boolean;
};

export type SchrittEingabe = {
  phase: string;
  wiedervorlage_am: string | null;
  telefon: string | null;
  termine: SchrittTermin[];
};

export type SchrittArt =
  | "gewonnen"
  | "termin_laeuft"
  | "termin_vorbei"
  | "termin_bald"
  | "ergebnis_fehlt"
  | "wiedervorlage"
  | "angebot"
  | "no_show"
  | "erstkontakt"
  | "termin_spaeter"
  | "verloren"
  | "wiedervorlage_geplant"
  | "offen";

export type Schritt = {
  art: SchrittArt;
  titel: string;
  text: string;
  ton: "danger" | "attention" | "success" | "neutral";
  terminId?: string;
  joinUrl?: string | null;
};

/**
 * Was der Closer bei diesem Kontakt als Nächstes tun sollte — eine Antwort,
 * nach Dringlichkeit: laufender oder verpasster Termin vor fehlendem Ergebnis
 * vor fälliger Wiedervorlage vor Erstkontakt.
 */
export function naechsterSchritt(k: SchrittEingabe, jetzt: number): Schritt {
  if (k.phase === "gewonnen") {
    return { art: "gewonnen", titel: "Kunde", text: "Gekauft. Zugang und Onboarding laufen über die Plattform.", ton: "success" };
  }

  const gebucht = k.termine.filter((t) => t.status === "gebucht").sort((a, b) => a.start_am.localeCompare(b.start_am));
  const vorbei = gebucht.filter((t) => new Date(t.start_am).getTime() + NO_SHOW_ANRUF_MINUTEN * MIN <= jetzt).pop();
  const laeuft = gebucht.find((t) => {
    const s = new Date(t.start_am).getTime();
    return s <= jetzt && jetzt < s + NO_SHOW_ANRUF_MINUTEN * MIN;
  });
  const kommend = gebucht.find((t) => new Date(t.start_am).getTime() > jetzt);

  if (laeuft) {
    return {
      art: "termin_laeuft",
      titel: `Termin läuft seit ${uhrzeit(laeuft.start_am)}`,
      text: `Einwählen. Ist nach ${NO_SHOW_ANRUF_MINUTEN} Minuten niemand da: anrufen, dann den Status setzen.`,
      ton: "attention",
      terminId: laeuft.id,
      joinUrl: laeuft.join_url,
    };
  }
  if (vorbei) {
    return {
      art: "termin_vorbei",
      titel: `Termin ${wann(vorbei.start_am, jetzt)}: Status fehlt`,
      text: k.telefon
        ? "War das Gespräch? Dann „Geführt“ mit Ergebnis. Sonst erst anrufen, dann No-Show."
        : "War das Gespräch? Dann „Geführt“ mit Ergebnis, sonst No-Show. Keine Telefonnummer hinterlegt.",
      ton: "danger",
      terminId: vorbei.id,
    };
  }
  if (kommend && new Date(kommend.start_am).getTime() - jetzt <= 2 * STD) {
    return {
      art: "termin_bald",
      titel: `Termin ${wann(kommend.start_am, jetzt)} (${relativ(kommend.start_am, jetzt)})`,
      text: "Antworten unten lesen, dann pünktlich einwählen.",
      ton: "attention",
      terminId: kommend.id,
      joinUrl: kommend.join_url,
    };
  }

  const ohneErgebnis = k.termine.find((t) => t.status === "gefuehrt" && !t.hatErgebnis);
  if (ohneErgebnis) {
    return {
      art: "ergebnis_fehlt",
      titel: "Ergebnis des Gesprächs fehlt",
      text: "Ohne Ergebnis fehlt der Call in Abschlussquote, Verlustgründen und Follow-ups.",
      ton: "danger",
      terminId: ohneErgebnis.id,
    };
  }

  if (k.phase === "verloren") {
    return { art: "verloren", titel: "Abgeschlossen: verloren", text: "Eine neue Buchung öffnet den Kontakt wieder.", ton: "neutral" };
  }

  const wv = k.wiedervorlage_am ? new Date(k.wiedervorlage_am).getTime() : null;
  if (wv !== null && wv <= jetzt) {
    return {
      art: "wiedervorlage",
      titel: `Wiedervorlage fällig (${wann(k.wiedervorlage_am!, jetzt)})`,
      text: "Melden, Anruf festhalten und eine neue Wiedervorlage setzen.",
      ton: "danger",
    };
  }
  if (k.phase === "angebot") {
    return { art: "angebot", titel: "Kassenlink offen", text: "Nachfassen, bis bezahlt ist. Der Kauf setzt den Kontakt automatisch auf „Gewonnen“.", ton: "attention" };
  }
  if (k.phase === "no_show") {
    return { art: "no_show", titel: "Nicht erschienen", text: "Anrufen oder per WhatsApp einen neuen Termin vereinbaren.", ton: "attention" };
  }
  if (k.phase === "neu") {
    return {
      art: "erstkontakt",
      titel: "Erstkontakt",
      text: k.telefon ? "Jetzt anrufen. Je schneller nach der Anfrage, desto höher die Chance auf einen Termin." : "Keine Telefonnummer: per E-Mail melden.",
      ton: "attention",
    };
  }
  if (kommend) {
    return {
      art: "termin_spaeter",
      titel: `Termin ${wann(kommend.start_am, jetzt)}`,
      text: "Vorher die Antworten lesen.",
      ton: "neutral",
      terminId: kommend.id,
      joinUrl: kommend.join_url,
    };
  }
  if (wv !== null) {
    return { art: "wiedervorlage_geplant", titel: `Wiedervorlage ${wann(k.wiedervorlage_am!, jetzt)}`, text: "Bis dahin nichts zu tun.", ton: "neutral" };
  }
  return { art: "offen", titel: "Kein nächster Schritt", text: "Wiedervorlage setzen, damit der Kontakt nicht verloren geht.", ton: "attention" };
}

/* ─── Wiedervorlage-Schnellwahl ────────────────────────────────────────── */

/** Berliner Wandzeit → ISO (UTC), auch über die Zeitumstellung korrekt. */
export function berlinZuIso(tag: string, hhmm: string): string {
  const [y, m, d] = tag.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const geraten = Date.UTC(y!, m! - 1, d!, h!, mi!);
  const versatz = (ms: number) => {
    const teile = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(ms);
    const w = (t: string) => Number(teile.find((p) => p.type === t)?.value);
    return Date.UTC(w("year"), w("month") - 1, w("day"), w("hour"), w("minute")) - ms;
  };
  return new Date(geraten - versatz(geraten - versatz(geraten))).toISOString();
}

export type Schnellwahl = { label: string; iso: string };

/** In 2 Std., morgen 10:00, übermorgen 10:00, nächsten Montag 10:00. */
export function wiedervorlageVorschlaege(jetzt: number): Schnellwahl[] {
  const tag = (plus: number) => berlinTag(jetzt + plus * TAG);
  const wochentag = new Date(berlinZuIso(berlinTag(jetzt), "12:00")).getUTCDay(); // 0 = So
  const bisMontag = ((8 - wochentag) % 7) || 7;
  const rund = Math.ceil((jetzt + 2 * STD) / (15 * MIN)) * 15 * MIN;
  return [
    { label: "In 2 Std.", iso: new Date(rund).toISOString() },
    { label: "Morgen 10:00", iso: berlinZuIso(tag(1), "10:00") },
    { label: "Übermorgen 10:00", iso: berlinZuIso(tag(2), "10:00") },
    { label: "Nächster Montag", iso: berlinZuIso(tag(bisMontag), "10:00") },
  ];
}

/* ─── Suche ────────────────────────────────────────────────────────────── */

/** Telefonnummern vergleichbar machen: nur Ziffern, 0049/+49/0 → 49. */
export function telefonZiffern(t: string): string {
  let z = t.replace(/\D/g, "");
  if (z.startsWith("00")) z = z.slice(2);
  else if (z.startsWith("0")) z = `49${z.slice(1)}`;
  return z;
}

export function passtZurSuche(k: { name: string | null; email: string; telefon: string | null }, suche: string): boolean {
  const q = suche.trim().toLowerCase();
  if (!q) return true;
  if (`${k.name ?? ""} ${k.email}`.toLowerCase().includes(q)) return true;
  const ziffern = q.replace(/\D/g, "");
  if (ziffern.length >= 4 && k.telefon) {
    const tel = telefonZiffern(k.telefon);
    return tel.includes(ziffern) || tel.includes(telefonZiffern(q));
  }
  return false;
}

/* ─── Labels und Fehler ────────────────────────────────────────────────── */

export const TERMIN_STATUS: Record<string, { label: string; ton: Schritt["ton"] }> = {
  gebucht: { label: "Gebucht", ton: "neutral" },
  umgebucht: { label: "Umgebucht", ton: "neutral" },
  gefuehrt: { label: "Geführt", ton: "success" },
  no_show: { label: "No-Show", ton: "danger" },
  abgesagt_kunde: { label: "Kunde hat abgesagt", ton: "neutral" },
  abgesagt_team: { label: "Wir haben abgesagt", ton: "neutral" },
};

export const AKTIVITAET_LABEL: Record<string, string> = {
  anruf: "Anruf",
  notiz: "Notiz",
  whatsapp: "WhatsApp",
  phase: "Phase",
  zuweisung: "Zuweisung",
  termin: "Termin",
  ergebnis: "Ergebnis",
  kassenlink: "Kassenlink",
  kauf: "Kauf",
  system: "System",
};

const FEHLER: Record<string, string> = {
  forbidden: "Kein Zugang zum CRM.",
  nur_admin: "Nur Admins dürfen das.",
  nicht_gefunden: "Kontakt nicht gefunden.",
  phase: "Unbekannte Phase.",
  gewonnen_nur_kauf: "„Gewonnen“ setzt der Kauf selbst. Kassenlink anlegen — sobald bezahlt ist, springt der Kontakt um.",
  verlust_grund: "Bitte einen Verlustgrund wählen.",
  wiedervorlage: "Bitte ein gültiges Datum für die Wiedervorlage setzen.",
  zuweisung_grund: "Bitte einen Grund für den Closer-Wechsel angeben.",
  closer: "Dieser Closer ist nicht im Team.",
  text: "Bitte einen Text eingeben.",
  ergebnis: "Bitte ein Anrufergebnis wählen.",
  grund: "Bitte einen Grund angeben.",
  naechster_schritt: "Bitte den nächsten Schritt festhalten.",
  termin: "Termin nicht gefunden.",
  nicht_gefuehrt: "Der Termin ist nicht als geführt markiert.",
  no_show_ueber_termin: "No-Show bitte direkt am Termin setzen.",
  noch_nicht_begonnen: "Der Termin hat noch nicht begonnen.",
  schon_begonnen: "Der Termin hat schon begonnen — Absage nicht mehr möglich.",
  status: "Der Termin hat schon einen anderen Status. Seite neu laden.",
  follow_up: "Bitte ein Follow-up setzen.",
  follow_up_vergangen: "Das Follow-up liegt in der Vergangenheit.",
  produkt: "Bitte ein Produkt wählen.",
  parallel_gespeichert: "Gleichzeitig von jemand anderem gespeichert. Seite neu laden.",
  produkt_ungueltig: "Unbekanntes Produkt.",
  raten_ungueltig: "Diese Ratenzahl geht für das Produkt nicht.",
  email_ungueltig: "E-Mail-Adresse prüfen.",
  kein_mentoring_konto: "Das Konto zu dieser Adresse hat schon eine andere Mitgliedschaft.",
  migration_fehlt: "Datenbank noch nicht vorbereitet (Migration fehlt).",
  raten_migration_111: "Mehr als 4 Raten brauchen Migration 111.",
  anlage_fehlgeschlagen: "Kassenlink konnte nicht angelegt werden.",
};

export function fehlerText(code: string | null | undefined): string {
  if (!code) return "Unbekannter Fehler.";
  if (code.startsWith("ergebnis_")) return fehlerText(code.slice("ergebnis_".length));
  return FEHLER[code] ?? `Fehler: ${code}`;
}

/* ─── Pipeline-Karten: nächste Aktivität und Stau ──────────────────────── */

type KarteEingabe = {
  phase: string;
  wiedervorlage_am: string | null;
  naechsterTermin?: string | null;
  letzte_aktivitaet_am: string | null;
  created_at: string;
};

export type NaechsteAktivitaet =
  | { art: "termin"; iso: string }
  | { art: "wv_faellig"; iso: string }
  | { art: "wv"; iso: string }
  | { art: "keine" };

/**
 * Was als Nächstes auf dem Kontakt steht — wie der Aktivitätsindikator auf einer
 * Pipedrive-Karte: Termin vor fälliger Wiedervorlage vor geplanter. „Keine"
 * heißt: offener Kontakt ohne geplanten Schritt, der rutscht sonst durch.
 */
export function naechsteAktivitaet(k: KarteEingabe, jetzt: number): NaechsteAktivitaet {
  if (k.naechsterTermin && new Date(k.naechsterTermin).getTime() > jetzt - 2 * STD) return { art: "termin", iso: k.naechsterTermin };
  if (k.wiedervorlage_am) {
    return new Date(k.wiedervorlage_am).getTime() <= jetzt ? { art: "wv_faellig", iso: k.wiedervorlage_am } : { art: "wv", iso: k.wiedervorlage_am };
  }
  return { art: "keine" };
}

/**
 * Ab wie vielen Tagen ohne Aktivität ein Kontakt je Phase „staut" (Pipedrive
 * nennt es Rotting). Neue Leads schon nach einem Tag — Speed to Lead. Termin,
 * Später und Abschlüsse stauen nicht: Dort steht ein Datum bzw. ist es vorbei.
 */
export const STAU_GRENZE_TAGE: Partial<Record<string, number>> = { neu: 1, kontaktiert: 3, no_show: 2, gespraech: 3, angebot: 2 };

/** Tage ohne Aktivität, wenn die Grenze der Phase erreicht ist und nichts geplant ist — sonst null. */
export function stauTage(k: KarteEingabe, jetzt: number): number | null {
  const grenze = STAU_GRENZE_TAGE[k.phase];
  if (!grenze) return null;
  const n = naechsteAktivitaet(k, jetzt);
  if (n.art === "termin" || n.art === "wv") return null;
  const tage = Math.floor((jetzt - new Date(k.letzte_aktivitaet_am ?? k.created_at).getTime()) / TAG);
  return tage >= grenze ? tage : null;
}

/* ─── Phasen-Pfad (Kontaktkopf) ────────────────────────────────────────── */

/**
 * Der Pfad oben im Kontakt, wie der Path in Salesforce: fünf Stationen plus
 * Abschluss. No-Show und Später sind Abzweige und stehen auf der Station, an der
 * sie hängen (No-Show am Termin, Später beim Kontakt), Gewonnen/Verloren auf dem
 * Abschluss.
 */
export const PFAD = [
  { id: "neu", label: "Neu" },
  { id: "kontaktiert", label: "Kontaktiert" },
  { id: "termin", label: "Termin" },
  { id: "gespraech", label: "Gespräch" },
  { id: "angebot", label: "Angebot" },
  { id: "abschluss", label: "Abschluss" },
] as const;

export function pfadStelle(phase: string): { index: number; label: string | null; ton: "normal" | "warnung" | "gewonnen" | "verloren" } {
  switch (phase) {
    case "spaeter":
      return { index: 1, label: "Später", ton: "warnung" };
    case "no_show":
      return { index: 2, label: "No-Show", ton: "warnung" };
    case "gewonnen":
      return { index: 5, label: "Gewonnen", ton: "gewonnen" };
    case "verloren":
      return { index: 5, label: "Verloren", ton: "verloren" };
    default: {
      const i = PFAD.findIndex((p) => p.id === phase);
      return { index: i < 0 ? 0 : i, label: null, ton: "normal" };
    }
  }
}

/** „Simon Paweletz" → „SP", „kevin@x.de" → „K". */
export function initialen(name: string | null | undefined): string {
  const teile = (name ?? "").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (!teile.length) return "?";
  const a = teile[0]![0] ?? "";
  const b = teile.length > 1 ? (teile[teile.length - 1]![0] ?? "") : "";
  return `${a}${b}`.toUpperCase();
}

/** Gruß nach Berliner Uhrzeit. */
export function gruss(jetzt: number): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).format(jetzt));
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}
