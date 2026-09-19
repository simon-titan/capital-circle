/**
 * Rechtstexte — eine Quelle für Anbieterangaben, Adressen und Versionsstand.
 *
 * Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung, die Zustimmung in
 * der Stripe-Kasse und die Bestätigungsmail lesen alle von hier. Stünde die
 * Anschrift an fünf Stellen, wäre nach dem ersten Umzug eine davon falsch —
 * und im Impressum ist eine falsche Anschrift abmahnfähig.
 *
 * **Keine Platzhalter.** Was noch nicht geliefert ist (USt-IdNr, Telefon),
 * steht als `null` und wird auf den Seiten weggelassen — eine Zeile
 * „Telefon: folgt" wäre schlechter als keine. Sobald der Wert da ist, reicht
 * es, ihn hier einzutragen.
 *
 * Wer einen Rechtstext inhaltlich ändert, erhöht `rechtstexteVersion`. Die
 * Version wandert als `rechtstexte_version` in die Metadaten jeder
 * Stripe-Session und belegt damit später, welcher Stand beim Kauf galt.
 */

/** Versionskennung der Rechtstexte (ISO-Datum des Stands). */
export const rechtstexteVersion = "2026-09-19";

/** Derselbe Stand als Lesedatum für die Seiten. */
export const rechtstexteStand = "19. September 2026";

export interface Anbieter {
  /** Vollständiger Name der natürlichen Person (Einzelunternehmen). */
  name: string;
  rechtsform: string;
  /** Marke, unter der das Angebot auftritt. */
  marke: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  email: string;
  /** `null` = noch nicht geliefert; die Zeile entfällt dann überall. */
  telefon: string | null;
  /** Umsatzsteuer-Identifikationsnummer nach § 27a UStG; `null` = noch nicht geliefert. */
  ustIdNr: string | null;
}

export const anbieter: Anbieter = {
  name: "Emre Kopal",
  rechtsform: "Einzelunternehmer",
  marke: "Capital Circle",
  strasse: "Wilhelmstraße 8",
  plz: "32602",
  ort: "Vlotho",
  land: "Deutschland",
  email: "contact@capitalcircletrading.com",
  telefon: null,
  ustIdNr: null,
};

/** Anschrift als Zeilen, für Blöcke im Impressum und in der Belehrung. */
export function anbieterAnschriftZeilen(): string[] {
  return [anbieter.strasse, `${anbieter.plz} ${anbieter.ort}`, anbieter.land];
}

/** Anschrift in einer Zeile (für Fließtext und Mails). */
export function anbieterAnschriftEinzeilig(): string {
  return `${anbieter.strasse}, ${anbieter.plz} ${anbieter.ort}, ${anbieter.land}`;
}

/** Zuständige Datenschutz-Aufsichtsbehörde am Sitz des Anbieters (NRW). */
export const aufsichtsbehoerde = {
  name: "Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen",
  strasse: "Kavalleriestraße 2–4",
  plzOrt: "40213 Düsseldorf",
  web: "https://www.ldi.nrw.de",
} as const;

/**
 * Pfade der Rechtstexte. `proxy.ts` führt dieselben Pfade in `PUBLIC_PATHS`
 * und in der Wartungs-Ausnahme — wer hier einen umbenennt, muss ihn dort
 * mitziehen.
 */
export const rechtsPfade = {
  impressum: "/impressum",
  datenschutz: "/datenschutz",
  agb: "/agb",
  widerruf: "/widerruf",
  /** Kündigungsbutton nach § 312k BGB (eigene Seite `app/kuendigen`). */
  kuendigen: "/kuendigen",
} as const;

/**
 * Elektronische Widerrufsfunktion nach § 356a BGB (Pflicht seit 19.06.2026
 * für online geschlossene Fernabsatzverträge, Beschriftung „Vertrag
 * widerrufen").
 *
 * **Gibt es noch nicht.** Solange der Wert `null` ist, fehlt in der
 * Widerrufsbelehrung der Satz nach Gestaltungshinweis 3 des gesetzlichen
 * Musters („Sie können Ihr Widerrufsrecht auch online unter … ausüben"), und
 * die Fußzeile zeigt keinen Eintrag „Vertrag widerrufen". Wird die Funktion
 * gebaut, genügt es, hier ihren Pfad einzutragen — Belehrung und Fußzeile
 * ziehen dann von selbst mit.
 */
export const widerrufsfunktionPfad: string | null = null;

/** Absolute Adresse eines Rechtstexts, z. B. für Mails und die Stripe-Kasse. */
export function rechtsUrl(pfad: string, basisUrl: string): string {
  return `${basisUrl.replace(/\/$/, "")}${pfad}`;
}
